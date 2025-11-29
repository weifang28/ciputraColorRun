"use client";

import { useCart } from "../context/CartContext";
import type { CartItem } from "../context/CartContext";
import { useRouter } from "next/navigation";
import { ShoppingBag, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { showToast } from "../../lib/toast";
import EditCartItemModal from "./EditCartItemModal";

export default function CartPage() {
  const { items, removeItem, clearCart, updateItem, totalPrice } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

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

  // Load categories and recalculate prices on mount and whenever items change
  useEffect(() => {
    async function loadAndRecalculate() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const cats = await res.json();
          setCategories(cats);

          // Recalculate all community/family prices
          const communityTotal = items.reduce((sum, it) => {
            if (it.type === "community") return sum + (Number(it.participants) || 0);
            if (it.type === "family") return sum + (Number(it.participants) || 4);
            return sum;
          }, 0);

          for (const it of items) {
            if (it.type === "community" || it.type === "family") {
              const cat = cats.find((c: any) => Number(c.id) === Number(it.categoryId));
              const bundleType = it.type === "family" ? "family" : undefined;
              const newPrice = calculatePrice(cat, communityTotal, bundleType);
              if (Number(it.price) !== Number(newPrice)) {
                updateItem({ ...it, price: newPrice });
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAndRecalculate();
  }, [items.length]); // Re-run when number of items changes

  function calculatePrice(category: any, totalParticipants: number, bundleType?: "family"): number {
    if (!category) return 0;

    if (bundleType === "family" && category.bundlePrice) {
      return Number(category.bundlePrice);
    }

    if (category.tier3Price && category.tier3Min && totalParticipants >= category.tier3Min) {
      return Number(category.tier3Price);
    }

    if (category.tier2Price && category.tier2Min) {
      if (category.tier2Max) {
        if (totalParticipants >= category.tier2Min && totalParticipants <= category.tier2Max) {
          return Number(category.tier2Price);
        }
      } else {
        if (totalParticipants >= category.tier2Min) {
          return Number(category.tier2Price);
        }
      }
    }

    if (category.tier1Price && category.tier1Min && category.tier1Max) {
      if (totalParticipants >= category.tier1Min && totalParticipants <= category.tier1Max) {
        return Number(category.tier1Price);
      }
    }

    return Number(category.basePrice);
  }

  // Calculate real-time total price
  const totalPriceCalc = items.reduce((sum, item) => {
    if (item.type === "individual") {
      return sum + item.price;
    } else {
      return sum + item.price * (item.participants || 0);
    }
  }, 0);

  // NEW: Calculate total community participants (excluding individual and family)
  const totalCommunityParticipants = items
    .filter(item => item.type === "community")
    .reduce((sum, item) => sum + (item.participants || 0), 0);

  // NEW: Check if cart has community items
  const hasCommunityItems = items.some(item => item.type === "community");

  async function handleCheckout() {
    if (items.length === 0) {
      showToast("Your cart is empty!", "error");
      return;
    }

    if (!fullName || !email || !phone) {
      showToast("Please complete your personal information first!", "error");
      return;
    }

    // NEW: Validate community participants minimum
    if (hasCommunityItems && totalCommunityParticipants < 10) {
      showToast(
        `Community registration requires a minimum of 10 participants. You currently have ${totalCommunityParticipants} community participants in cart. Please add ${10 - totalCommunityParticipants} more community participants before checkout.`,
        "error"
      );
      return;
    }

    const qs = new URLSearchParams({
      fullName,
      email,
      phone,
      fromCart: "true",
    }).toString();
    router.push(`/registration/confirm?${qs}`);
  }

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
    <main
      className="flex min-h-screen pt-28 pb-16"
      style={{
        backgroundImage: "url('/images/generalBg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="mx-auto w-full max-w-4xl px-4 flex flex-col items-center justify-center">
        <h1 className="text-4xl md:text-6xl text-center font-bold mb-8 tracking-wide rounded-3xl px-12 py-6" style={{ backgroundImage: 'linear-gradient(to right, #5eead4, #E467A6FF)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties}>
          YOUR CART
        </h1>

        <section className="bg-white/95 backdrop-blur-md rounded-lg p-8 md:p-10 shadow-lg text-gray-800 w-full">
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
              {/* NEW: Community participants warning */}
              {hasCommunityItems && totalCommunityParticipants < 10 && (
                <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-amber-800 mb-1">
                        Community Minimum Not Met
                      </p>
                      <p className="text-sm text-amber-700">
                        You have {totalCommunityParticipants} community participants in cart. Need {10 - totalCommunityParticipants} more to meet the minimum of 10 participants for checkout.
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Note: Individual and Family Bundle participants don't count toward the community minimum.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                          {item.type === "community" ? "Community" : item.type === "family" ? "Family" : "Individual"}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {item.categoryName}
                        </span>
                      </div>

                      {/* Individual Item Display */}
                      {item.type === "individual" ? (
                        <>
                          <p className="text-sm text-gray-600">
                            Jersey Size: <span className="font-medium">{item.jerseySize}</span>
                          </p>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              Base Price: <span className="font-semibold text-gray-900">Rp {item.price.toLocaleString("id-ID")}</span>
                            </p>
                            {item.jerseyCharges && item.jerseyCharges > 0 && (
                              <p className="text-sm text-orange-600">
                                Extra Size Charge: <span className="font-semibold">+Rp {item.jerseyCharges.toLocaleString("id-ID")}</span>
                              </p>
                            )}
                            <p className="text-base font-bold text-emerald-700 mt-1">
                              Total: Rp {(item.price + (item.jerseyCharges || 0)).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </>
                      ) : item.type === "family" ? (
                        <>
                          <p className="text-sm text-gray-600">
                            {item.participants || 4} people (Family Bundle)
                          </p>
                          {item.jerseys && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Jersey Distribution:</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(item.jerseys)
                                  .filter(([_, count]) => count > 0)
                                  .map(([size, count]) => (
                                    <span key={size} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                      {size}: {count}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              Base: Rp {item.price.toLocaleString("id-ID")} × {item.participants || 4} = Rp {(item.price * (item.participants || 4)).toLocaleString("id-ID")}
                            </p>
                            {item.jerseyCharges && item.jerseyCharges > 0 && (
                              <p className="text-sm text-orange-600">
                                Extra Size Charges: <span className="font-semibold">+Rp {item.jerseyCharges.toLocaleString("id-ID")}</span>
                              </p>
                            )}
                            <p className="text-base font-bold text-purple-700 mt-1">
                              Total: Rp {((item.price * (item.participants || 4)) + (item.jerseyCharges || 0)).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </>
                      ) : (
                        /* Community Item Display */
                        <>
                          <p className="text-sm text-gray-600">
                            {item.participants || 0} participants
                          </p>
                          {item.jerseys && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Jersey Distribution:</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(item.jerseys)
                                  .filter(([_, count]) => count > 0)
                                  .map(([size, count]) => (
                                    <span key={size} className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs">
                                      {size}: {count}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              Base: Rp {item.price.toLocaleString("id-ID")} × {item.participants || 0} = Rp {(item.price * (item.participants || 0)).toLocaleString("id-ID")}
                            </p>
                            {item.jerseyCharges && item.jerseyCharges > 0 && (
                              <p className="text-sm text-orange-600">
                                Extra Size Charges: <span className="font-semibold">+Rp {item.jerseyCharges.toLocaleString("id-ID")}</span>
                              </p>
                            )}
                            <p className="text-base font-bold text-emerald-700 mt-1">
                              Total: Rp {((item.price * (item.participants || 0)) + (item.jerseyCharges || 0)).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="ml-4 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsEditOpen(true);
                        }}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-md hover:from-emerald-700 hover:to-teal-700 transition"
                        aria-label="Edit item"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-full hover:bg-red-100 text-red-600 transition"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-gray-300 pt-4 mb-6">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>Rp {totalPrice.toLocaleString("id-ID")}</span>
                </div>
                {/* NEW: Show community participant count if applicable */}
                {hasCommunityItems && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Community Participants: {totalCommunityParticipants} / 10 minimum</p>
                  </div>
                )}
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
                  disabled={hasCommunityItems && totalCommunityParticipants < 10}
                  className={`flex-1 px-6 py-3 rounded-full font-bold shadow transition-all ${
                    hasCommunityItems && totalCommunityParticipants < 10
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:from-emerald-700 hover:to-teal-700'
                  }`}
                >
                  Proceed to Checkout
                </button>
              </div>
              {/* NEW: Disabled button helper text */}
              {hasCommunityItems && totalCommunityParticipants < 10 && (
                <p className="text-center text-xs text-gray-500 mt-2">
                  Add {10 - totalCommunityParticipants} more community participants to proceed
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {/* Edit Modal */}
      {isEditOpen && editingItem && (
        <EditCartItemModal
          item={editingItem}
          onClose={() => {
            setIsEditOpen(false);
            setEditingItem(null);
          }}
          onSave={(updated) => {
            updateItem(updated);
            setIsEditOpen(false);
            setEditingItem(null);
            showToast("Item updated successfully!", "success");
          }}
          onRemove={() => {
            removeItem(editingItem.id);
            setIsEditOpen(false);
            setEditingItem(null);
            showToast("Item removed from cart", "success");
          }}
        />
      )}
    </main>
  );
}