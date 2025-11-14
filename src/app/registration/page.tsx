"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../context/CartContext";

export default function RegistrationPage() {
    const router = useRouter();
    const { addItem, items } = useCart();
    const [type, setType] = useState<"individual" | "community">("community");

    // categories loaded from server
    const [categories, setCategories] = useState<Array<{ id: number; name: string; price: string }>>([]);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [participants, setParticipants] = useState<number | "">("");
    const [jerseys, setJerseys] = useState<Record<string, number | "">>({
        XS: "",
        S: "",
        M: "",
        L: "",
        XL: "",
        XXL: "",
    });
    const [selectedJerseySize, setSelectedJerseySize] = useState("M");

    // personal details
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [registrationType, setRegistrationType] = useState<"individual" | "community">("community");

    // modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/categories");
                const contentType = res.headers.get("content-type") || "";
                if (!res.ok) {
                    const text = await res.text();
                    console.error("/api/categories returned non-OK response:", res.status, text);
                    return;
                }
                if (!contentType.includes("application/json")) {
                    const text = await res.text();
                    console.error("/api/categories returned non-JSON response:", text);
                    return;
                }
                const data = await res.json();
                setCategories(data);
                if (data.length > 0) setCategoryId(data[0].id);
            } catch (err) {
                console.error("Failed to load categories:", err);
            }
        })();
    }, []);

    function updateJersey(size: string, value: number | "") {
        setJerseys((s) => ({ ...s, [size]: value }));
    }

    // Calculate total community participants across all cart items
    function getTotalCommunityParticipants(): number {
        return items
            .filter(item => item.type === "community")
            .reduce((sum, item) => sum + (item.participants || 0), 0);
    }

    // Add to cart without modal (for community)
    function handleAddToCart() {
        if (!fullName || !email || !phone) {
            alert("Please fill in your personal details (Name, Email, Phone)");
            return;
        }

        if (!categoryId) return;

        const currentParticipants = Number(participants || 0);
        
        if (currentParticipants <= 0) {
            alert("Please enter the number of participants for this category");
            return;
        }

        // Validate jersey distribution matches participant count
        const totalJerseys = Object.values(jerseys).reduce((sum, val) => sum + (Number(val) || 0), 0);
        if (totalJerseys !== currentParticipants) {
            alert(`Jersey count (${totalJerseys}) must match participant count (${currentParticipants}) for this category`);
            return;
        }

        const category = categories.find((c) => c.id === categoryId);
        if (!category) return;

        // Persist personal details
        try {
            sessionStorage.setItem("reg_fullName", fullName);
            sessionStorage.setItem("reg_email", email);
            sessionStorage.setItem("reg_phone", phone);
            sessionStorage.setItem("reg_registrationType", "community");
        } catch (e) {
            // ignore
        }

        // Add to cart
        addItem({
            type: "community",
            categoryId: category.id,
            categoryName: category.name,
            price: Number(category.price),
            participants: currentParticipants,
            jerseys: Object.fromEntries(
                Object.entries(jerseys).map(([k, v]) => [k, Number(v) || 0])
            ),
        });

        const newTotal = getTotalCommunityParticipants() + currentParticipants;
        alert(`Category added to cart! Total community participants: ${newTotal}/100`);
        
        // Reset community fields to allow adding another category
        setParticipants("");
        setJerseys({ XS: "", S: "", M: "", L: "", XL: "", XXL: "" });
    }

    // Checkout with modal (for both individual and community)
    function handleCheckout() {
        if (!fullName || !email || !phone) {
            alert("Please fill in your personal details (Name, Email, Phone)");
            return;
        }

        if (type === "individual") {
            // For individual, open modal immediately
            setAgreedToTerms(false);
            setIsModalOpen(true);
        } else {
            // For community, check if total meets minimum
            const currentParticipants = Number(participants || 0);
            const totalWithCurrent = getTotalCommunityParticipants() + currentParticipants;

            if (totalWithCurrent < 100) {
                alert(`Community registration requires minimum 100 total participants. You currently have ${getTotalCommunityParticipants()} in cart. ${currentParticipants > 0 ? `Adding ${currentParticipants} will give you ${totalWithCurrent} total.` : ''} Please add more participants or categories to reach 100.`);
                return;
            }

            // If there's a current category being filled, validate it before checkout
            if (currentParticipants > 0) {
                const totalJerseys = Object.values(jerseys).reduce((sum, val) => sum + (Number(val) || 0), 0);
                if (totalJerseys !== currentParticipants) {
                    alert(`Jersey count (${totalJerseys}) must match participant count (${currentParticipants}) for this category. Please complete or clear the current category before checkout.`);
                    return;
                }
            }

            // Open modal for terms agreement
            setAgreedToTerms(false);
            setIsModalOpen(true);
        }
    }

    // Execute checkout after terms accepted
    function executeCheckout() {
        if (!categoryId) return;

        const category = categories.find((c) => c.id === categoryId);
        if (!category) return;

        // Persist personal details
        try {
            sessionStorage.setItem("reg_fullName", fullName);
            sessionStorage.setItem("reg_email", email);
            sessionStorage.setItem("reg_phone", phone);
            sessionStorage.setItem("reg_registrationType", registrationType);
        } catch (e) {
            // ignore
        }

        if (type === "individual") {
            // Add individual item to cart
            addItem({
                type: "individual",
                categoryId: category.id,
                categoryName: category.name,
                price: Number(category.price),
                jerseySize: selectedJerseySize,
            });
        } else {
            // For community, add current category if filled
            const currentParticipants = Number(participants || 0);
            if (currentParticipants > 0) {
                addItem({
                    type: "community",
                    categoryId: category.id,
                    categoryName: category.name,
                    price: Number(category.price),
                    participants: currentParticipants,
                    jerseys: Object.fromEntries(
                        Object.entries(jerseys).map(([k, v]) => [k, Number(v) || 0])
                    ),
                });
            }
        }

        setIsModalOpen(false);
        // Redirect to cart
        router.push("/cart");
    }

    return (
        <main className="flex bg-gradient-to-br from-emerald-100/30 via-transparent to-rose-100/30 min-h-screen pt-28 pb-16">
            <div className="mx-auto w-full max-w-2xl px-4">
                <h1 className="text-4xl md:text-6xl text-center font-bold mb-8 tracking-wide text-white drop-shadow-lg font-moderniz">
                    CIPUTRA COLOR RUN
                </h1>

                <section className="bg-white/95 backdrop-blur-md rounded-lg p-8 md:p-10 shadow-lg text-gray-800">
                    <h2 className="text-2xl font-bold text-center mb-1 text-gray-800 font-moderniz">
                        REGISTRATION FORM
                    </h2>
                    <p className="text-center text-sm text-gray-600 mb-6 font-mustica">
                        Enter the details to get going.
                    </p>

                    {/* Personal details */}
                    <div className="space-y-4">
                        <div className="grid gap-3">
                            <label className="text-sm text-gray-700">Full Name *</label>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white placeholder-gray-400"
                                placeholder="Enter your full name"
                                required
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                            <div>
                                <label className="text-sm text-gray-700">Email *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white placeholder-gray-400"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-700">Phone Number *</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white placeholder-gray-400"
                                    placeholder="Enter your phone number"
                                    required
                                />
                            </div>
                        </div>

                        {/* Registration Type */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-1">
                            <label className="flex items-center gap-2 text-gray-700">
                                <input
                                    type="radio"
                                    name="regType"
                                    value="individual"
                                    checked={type === "individual"}
                                    onChange={() => { setType("individual"); setRegistrationType("individual"); }}
                                    className="accent-black"
                                />
                                <span className="font-medium">Individual</span>
                            </label>
                            <label className="flex items-center gap-2 text-gray-700">
                                <input
                                    type="radio"
                                    name="regType"
                                    value="community"
                                    checked={type === "community"}
                                    onChange={() => { setType("community"); setRegistrationType("community"); }}
                                    className="accent-black"
                                />
                                <span className="font-medium">Community (Min 100 Total Participants)</span>
                            </label>
                        </div>
                    </div>

                    {/* Individual layout */}
                    {type === "individual" && (
                        <div className="space-y-4 mt-6">
                            <div className="grid gap-3">
                                <label className="text-sm text-gray-700">Categories</label>
                                <select
                                    value={categoryId ?? ""}
                                    onChange={(e) => setCategoryId(Number(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name} - Rp {Number(cat.price).toLocaleString("id-ID")}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-3">
                                <label className="text-sm text-gray-700">Jersey Size</label>
                                <select
                                    value={selectedJerseySize}
                                    onChange={(e) => setSelectedJerseySize(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white"
                                >
                                    <option value="XS">XS</option>
                                    <option value="S">S</option>
                                    <option value="M">M</option>
                                    <option value="L">L</option>
                                    <option value="XL">XL</option>
                                    <option value="XXL">XXL</option>
                                </select>
                            </div>

                            <div className="flex justify-end items-center gap-3 mt-4">
                                <button
                                    onClick={handleCheckout}
                                    className="px-6 py-2 rounded-full bg-gradient-to-r from-emerald-200 to-emerald-100 text-white font-semibold shadow hover:shadow-lg transition-all"
                                >
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Community layout */}
                    {type === "community" && (
                        <div className="space-y-6 mt-6">
                            {/* Community Progress Indicator */}
                            {getTotalCommunityParticipants() > 0 && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-emerald-800">
                                            Community Progress
                                        </span>
                                        <span className="text-sm font-bold text-emerald-700">
                                            {getTotalCommunityParticipants()} / 100 participants
                                        </span>
                                    </div>
                                    <div className="w-full bg-emerald-200 rounded-full h-2">
                                        <div 
                                            className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min((getTotalCommunityParticipants() / 100) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-emerald-600 mt-2">
                                        {getTotalCommunityParticipants() >= 100 
                                            ? "✓ Minimum requirement met! You can add more or proceed to checkout."
                                            : `Add ${100 - getTotalCommunityParticipants()} more participants to meet the minimum.`}
                                    </p>
                                </div>
                            )}

                            <div className="rounded-lg border border-gray-300 p-5 bg-white">
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                        <p className="text-xs text-blue-700">
                                            💡 <strong>Tip:</strong> You can add multiple race categories to your community registration. 
                                            For example: 20 people in 3K + 50 in 5K + 30 in 10K = 100 total participants.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-700">Race Category *</label>
                                        <select
                                            value={categoryId ?? ""}
                                            onChange={(e) => setCategoryId(Number(e.target.value))}
                                            className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white"
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name} - Rp {Number(cat.price).toLocaleString("id-ID")} / person
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-700">Number of Participants (for this category) *</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={participants}
                                            onChange={(e) =>
                                                setParticipants(
                                                    e.target.value === "" ? "" : Number(e.target.value)
                                                )
                                            }
                                            className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white placeholder-gray-400"
                                            placeholder="Enter number of participants"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            This will be added to your community total ({getTotalCommunityParticipants()} currently in cart)
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-sm block mb-2 text-gray-700">
                                            Jersey Size Distribution * (Total must match participant count for this category)
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                                                <div key={size} className="flex flex-col items-center">
                                                    <span className="text-xs mb-1 text-gray-700">{size}</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={jerseys[size]}
                                                        onChange={(e) =>
                                                            updateJersey(
                                                                size,
                                                                e.target.value === ""
                                                                    ? ""
                                                                    : Number(e.target.value)
                                                            )
                                                        }
                                                        className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white placeholder-gray-400"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Total: {Object.values(jerseys).reduce((sum, val) => sum + (Number(val) || 0), 0)} / {participants || 0}
                                        </p>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={handleAddToCart}
                                            className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-emerald-200 to-emerald-100 text-white font-bold shadow hover:shadow-lg transition-all"
                                        >
                                            ADD CATEGORY TO CART
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={handleCheckout}
                                    className={`w-1/2 md:w-1/3 px-6 py-3 rounded-full font-semibold shadow hover:shadow-lg transition-all ${
                                        getTotalCommunityParticipants() >= 100
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                    disabled={getTotalCommunityParticipants() < 100}
                                >
                                    Proceed to Checkout
                                </button>
                            </div>
                            {getTotalCommunityParticipants() < 100 && (
                                <p className="text-center text-xs text-gray-500">
                                    Need {100 - getTotalCommunityParticipants()} more participants in cart to checkout
                                </p>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* Terms and Conditions Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-emerald-200 to-emerald-100 px-6 py-4">
                            <h3 className="text-2xl font-bold text-white text-center">
                                Terms & Conditions
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 text-gray-700">
                            <h4 className="font-bold text-lg text-gray-800">Registration Agreement</h4>
                            <p className="text-sm">
                                By proceeding with this registration, you acknowledge and agree to the following terms and conditions for participating in the Ciputra Color Run event:
                            </p>

                            <div className="space-y-3 text-sm">
                                <div>
                                    <h5 className="font-semibold text-gray-800">1. Participant Information</h5>
                                    <p>All information provided must be accurate and complete. False information may result in disqualification.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">2. Health & Safety</h5>
                                    <p>Participants must be in good health and physically fit to participate. Those with medical conditions should consult a physician before registering.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">3. Payment & Refunds</h5>
                                    <p>Registration fees are non-refundable. Payment must be completed within 24 hours of registration submission.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">4. Event Rules</h5>
                                    <p>Participants must follow all event rules and instructions from organizers and staff. Failure to comply may result in removal from the event.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">5. Liability Waiver</h5>
                                    <p>The organizer is not responsible for any injury, loss, or damage during the event. Participants join at their own risk.</p>
                                </div>

                                <div>
                                    <h5 className="font-semibold text-gray-800">6. Media Release</h5>
                                    <p>Participants consent to the use of their photos/videos taken during the event for promotional purposes.</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 px-6 py-4 space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="mt-1 w-5 h-5 accent-emerald-500 cursor-pointer"
                                />
                                <span className="text-sm text-gray-700">
                                    I have read and agree to the Terms & Conditions and confirm that all information provided is accurate.
                                </span>
                            </label>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setAgreedToTerms(false);
                                    }}
                                    className="flex-1 px-6 py-3 rounded-full border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeCheckout}
                                    disabled={!agreedToTerms}
                                    className={`flex-1 px-6 py-3 rounded-full font-semibold transition-all ${
                                        agreedToTerms
                                            ? 'bg-gradient-to-r from-emerald-200 to-emerald-100 text-white hover:shadow-lg'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Confirm & Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
