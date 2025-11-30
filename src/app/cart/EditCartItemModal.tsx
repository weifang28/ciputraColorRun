import React, { useState, useMemo, useEffect } from "react";
import type { CartItem } from "../context/CartContext";
import "../styles/homepage.css"

export default function EditCartItemModal({
  item,
  onClose,
  onSave,
  onRemove,
}: {
  item: CartItem;
  onClose: () => void;
  onSave: (updated: CartItem) => void;
  onRemove: () => void;
}) {
  const sizes = useMemo(() => [
    "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL", "6XL",
    "XS - KIDS", "S - KIDS", "M - KIDS", "L - KIDS", "XL - KIDS"
  ], []);

  const [localJerseySize, setLocalJerseySize] = useState(item.jerseySize || "M");

  // initialise localJerseys and keep it in sync whenever the item or sizes change
  const [localJerseys, setLocalJerseys] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    sizes.forEach((s) => (base[s] = Number(item.jerseys?.[s] || 0)));
    return base;
  });

  useEffect(() => {
    // when item updates (parent changed), resync localJerseys ensuring all sizes exist
    const base: Record<string, number> = {};
    sizes.forEach((s) => {
      // prefer the item value if present, otherwise 0
      base[s] = Number(item.jerseys?.[s] ?? 0);
    });
    setLocalJerseySize(item.jerseySize || "M");
    setLocalJerseys(base);
  }, [item, sizes]);

  const [error, setError] = useState<string | null>(null);

  const participants = Number(item.participants || (item.type === "family" ? 4 : 1));

  function updateSizeCount(size: string, val: number) {
    setLocalJerseys((prev) => ({ ...prev, [size]: Math.max(0, Math.floor(Number(val) || 0)) }));
  }

  // NEW: map of extra-size charges (extend here if new sizes become chargeable)
  const EXTRA_SIZE_CHARGES: Record<string, number> = {
    "6XL": 10000, // 6XL has +Rp 10.000 per piece
  };

  async function handleSave() {
    setError(null);
    if (item.type === "community" || item.type === "family") {
      const total = Object.values(localJerseys).reduce((s, v) => s + Number(v || 0), 0);
      if (total !== participants) {
        setError(`Total jerseys (${total}) must equal participants (${participants}).`);
        return;
      }
    }

    // Normalise jerseys: ensure all sizes are present and numbers (no undefined)
    const normalized: Record<string, number> = {};
    sizes.forEach((s) => {
      normalized[s] = Number(localJerseys[s] || 0);
    });

    // NEW: compute jerseyCharges based on normalized counts and extra-size mapping
    let jerseyCharges = 0;
    if (item.type === "individual") {
      const size = localJerseySize;
      if (EXTRA_SIZE_CHARGES[size]) jerseyCharges = EXTRA_SIZE_CHARGES[size];
    } else {
      Object.entries(normalized).forEach(([size, count]) => {
        const c = Number(count || 0);
        if (c > 0 && EXTRA_SIZE_CHARGES[size]) {
          jerseyCharges += c * EXTRA_SIZE_CHARGES[size];
        }
      });
    }

    const updated: CartItem = {
      ...item,
      jerseySize: item.type === "individual" ? localJerseySize : undefined,
      jerseys: item.type === "individual" ? undefined : normalized,
      jerseyCharges, // NEW: include extra-size charges so CartContext totals update
    };

    // Pass updated item to parent/context which is responsible for persisting (see CartContext.updateItem)
    try {
      onSave(updated);
      // optional: you could call an API here if you keep a server-side cart endpoint.
      // Example (uncomment if you have an API): await fetch('/api/cart/item', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated), credentials: 'include' });
    } catch (err) {
      console.error("Failed to save cart item:", err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Edit {item.categoryName}</h3>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-gray-100 text-gray-700">Close</button>
        </div>

        {item.type === "individual" ? (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-800">Jersey Size</label>
            <select
              value={localJerseySize}
              onChange={(e) => setLocalJerseySize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900"
            >
              {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">Participants: <strong className="text-gray-900">{participants}</strong></p>
            <div className="grid grid-cols-3 gap-3">
              {sizes.map((s) => (
                <div key={s} className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-gray-700 mb-2">{s}</span>
                  <input
                    type="number"
                    min={0}
                    value={localJerseys[s] ?? 0}
                    onChange={(e) => updateSizeCount(s, Number(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 edit-jersey-input"
                    inputMode="numeric"
                    aria-label={`Count for size ${s}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="mt-3 p-2 bg-red-50 text-red-700 rounded">{error}</div>}

        <div className="mt-6 flex gap-3">
          <button onClick={handleSave} className="flex-1 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow">
            Save changes
          </button>
          <button onClick={onRemove} className="px-4 py-2 rounded-full border border-red-300 text-red-700 bg-red-50 hover:bg-red-100">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}