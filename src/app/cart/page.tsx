"use client";

import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";
import { ShoppingBag, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function CartPage() {
  const { items, removeItem, clearCart, totalPrice } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Load personal details from sessionStorage
  useEffect(() => {
    try {
      setFullName(sessionStorage.getItem("reg_fullName") || "");
      setEmail(sessionStorage.getItem("reg_email") || "");
      setPhone(sessionStorage.getItem("reg_phone") || "");
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const handleCheckout = () => {
    if (items.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    if (!fullName || !email || !phone) {
      alert("Please complete your personal information first!");
      router.push("/registration");
      return;
    }

    // Navigate to confirm page with cart data
    const qs = new URLSearchParams({
      fullName,
      email,
      phone,
      fromCart: "true",
    }).toString();
    router.push(`/registration/confirm?${qs}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold text-lg">
            Loading your cart...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex bg-gradient-to-br from-emerald-100/30 via-transparent to-rose-100/30 min-h-screen pt-28 pb-16">
      <div className="mx-auto w-full max-w-4xl px-4">
        <h1 className="text-4xl md:text-6xl text-center font-bold mb-8 tracking-wide text-white drop-shadow-lg">
          YOUR CART
        </h1>

        <section className="bg-white/95 backdrop-blur-md rounded-lg p-8 md:p-10 shadow-lg text-gray-800">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-20 h-20 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-6">Your cart is empty</p>
              <button
                onClick={() => router.push("/registration")}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-200 to-emerald-100 text-white font-bold shadow hover:shadow-lg transition-all"
              >
                Start Registration
              </button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                          {item.type === "community" ? "Community" : "Individual"}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {item.categoryName}
                        </span>
                      </div>

                      {item.type === "individual" ? (
                        <div className="text-sm text-gray-600">
                          <p>Jersey Size: {item.jerseySize}</p>
                          <p className="font-semibold text-gray-800 mt-1">
                            Rp {item.price.toLocaleString("id-ID")}
                          </p>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          <p>Participants: {item.participants}</p>
                          <p>
                            Jerseys:{" "}
                            {Object.entries(item.jerseys || {})
                              .filter(([, count]) => count > 0)
                              .map(([size, count]) => `${size}(${count})`)
                              .join(", ")}
                          </p>
                          <p className="font-semibold text-gray-800 mt-1">
                            Rp{" "}
                            {(
                              (item.participants || 0) * item.price
                            ).toLocaleString("id-ID")}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-4 p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-gray-300 pt-4 mb-6">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>Rp {totalPrice.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={clearCart}
                  className="flex-1 px-6 py-3 rounded-full border-2 border-red-300 text-red-600 font-semibold hover:bg-red-50 transition-colors"
                >
                  Clear Cart
                </button>
                <button
                  onClick={handleCheckout}
                  className="flex-1 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-200 to-emerald-100 text-white font-bold shadow hover:shadow-lg transition-all"
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}