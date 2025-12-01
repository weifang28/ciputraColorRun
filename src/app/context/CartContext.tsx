"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";

// Update the CartItem type to include jerseyCharges
export interface CartItem {
  id: string;
  type: "individual" | "community" | "family";
  categoryId: number;
  categoryName: string;
  price: number;
  jerseySize?: string;
  participants?: number;
  jerseys?: Record<string, number>;
  jerseyCharges?: number; // NEW: Extra charges for sizes above 5XL
  groupName?: string; // ADDED: carry community/group name (optional)
}

export interface UserDetails {
  fullName: string;
  email: string;
  phone: string;
  emergencyPhone?: string;
  birthDate: string;
  gender: string;
  currentAddress: string;
  nationality?: string;
  medicalHistory?: string;
  medicationAllergy?: string;
  idCardPhoto?: File;
  registrationType: string;
  groupName?: string;
}

interface CartContextType {
  items: CartItem[];
  userDetails: UserDetails | null;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  setUserDetails: (details: UserDetails) => void;
  updateItem: (item: CartItem) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [userDetails, setUserDetailsState] = useState<UserDetails | null>(null);

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.type === "individual") return sum + 1;
      if (item.type === "community") return sum + (Number(item.participants ?? 0) || 0);
      if (item.type === "family") return sum + (Number(item.participants ?? 0) || 4);
      return sum;
    }, 0);
  }, [items]);

  useEffect(() => {
    const stored = sessionStorage.getItem("cart");
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  function addItem(item: Omit<CartItem, "id">) {
    const newItem = { ...item, id: Date.now().toString() };
    setItems((prev) => [...prev, newItem]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function clearCart() {
    setItems([]);
  }

  function setUserDetails(details: UserDetails) {
    setUserDetailsState(details);
  }

  function updateItem(updated: CartItem) {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  }

  // UPDATED: Include jersey charges in total price calculation
  const totalPrice = items.reduce((sum, item) => {
    const jerseyCharge = Number(item.jerseyCharges || 0);
    
    if (item.type === "individual") {
      return sum + item.price + jerseyCharge;
    } else {
      const baseTotal = item.price * (item.participants || 0);
      return sum + baseTotal + jerseyCharge;
    }
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        userDetails,
        addItem,
        removeItem,
        clearCart,
        totalPrice,
        totalItems,
        setUserDetails,
        updateItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}