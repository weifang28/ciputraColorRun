"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";

// Update the CartItem type to include "family"
export interface CartItem {
  id: string;
  type: "individual" | "community" | "family";
  categoryId: number;
  categoryName: string;
  price: number;
  jerseySize?: string;
  participants?: number;
  jerseys?: Record<string, number>;
}

export interface UserDetails {
  fullName: string;
  email: string;
  phone: string;
  emergencyPhone?: string;
  birthDate: string;
  gender: string;
  currentAddress: string;
  nationality: string;
  medicalHistory?: string;
  idCardPhoto?: File;
  registrationType: string;
  groupName?: string; // Add this
}

interface CartContextType {
  items: CartItem[];
  userDetails: UserDetails | null;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number; // <- added
  setUserDetails: (details: UserDetails) => void;
  updateItem: (item: CartItem) => void; // <-- new helper to update items (price, participants, jerseys, etc.)
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [userDetails, setUserDetailsState] = useState<UserDetails | null>(null);

  // compute total number of participants/items for the navbar badge
  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.type === "individual") return sum + 1;
      if (item.type === "community") return sum + (Number(item.participants ?? 0) || 0);
      if (item.type === "family") return sum + (Number(item.participants ?? 0) || 4); // family bundle = 4 by default
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

  // NEW: update a single cart item (used to update recalculated prices)
  function updateItem(updated: CartItem) {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  }

  const totalPrice = items.reduce((sum, item) => {
    if (item.type === "individual") {
      return sum + item.price;
    } else {
      return sum + item.price * (item.participants || 0);
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
        totalItems, // <- expose here
        setUserDetails,
        updateItem, // <-- exposed
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