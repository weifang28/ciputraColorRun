"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegistrationPage() {
    const router = useRouter();
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

    // personal details
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [registrationType, setRegistrationType] = useState<"individual" | "community">("community");

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

    function goToConfirm(params: { participants?: number }) {
        if (!categoryId) return;

        // persist personal details so confirm page can read them if query params are dropped
        try {
            sessionStorage.setItem("reg_fullName", fullName);
            sessionStorage.setItem("reg_email", email);
            sessionStorage.setItem("reg_phone", phone);
            sessionStorage.setItem("reg_registrationType", registrationType);
        } catch (e) {
            // ignore sessionStorage errors (e.g. SSR, privacy settings)
        }

        const qs = new URLSearchParams({
            categoryId: String(categoryId),
            ...(params.participants !== undefined ? { participants: String(params.participants) } : {}),
            fullName,
            email,
            phone,
            registrationType,
        }).toString();
        router.push(`/registration/confirm?${qs}`);
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

                    {/* -- Personal details (now controlled) */}
                    <div className="space-y-4">
                        <div className="grid gap-3">
                            <label className="text-sm text-gray-700">Full Name</label>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white placeholder-gray-400"
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                            <div>
                                <label className="text-sm text-gray-700">Email</label>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white placeholder-gray-400"
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-700">Phone Number</label>
                                <input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white placeholder-gray-400"
                                    placeholder="Enter your phone number"
                                />
                            </div>
                        </div>

                        {/* Registration Type moved directly under Phone Number */}
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
                                <span className="font-medium">Community (Min 100 Participant)</span>
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
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-3">
                                <label className="text-sm text-gray-700">Jersey Size</label>
                                <select className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white">
                                    <option>XS</option>
                                    <option>S</option>
                                    <option>M</option>
                                    <option>L</option>
                                    <option>XL</option>
                                    <option>XXL</option>
                                </select>
                            </div>

                            {/* Redirect Next to confirm page (now includes personal details) */}
                            <div className="flex justify-end items-center mt-4">
                                <button
                                    onClick={() =>
                                        goToConfirm({})
                                    }
                                    className="px-6 py-2 rounded-full bg-emerald-200/60 text-white font-semibold shadow"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Community layout */}
                    {type === "community" && (
                        <div className="space-y-6 mt-6">
                            <div className="rounded-lg border border-gray-300 p-5 bg-white">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-gray-700">Race Category</label>
                                        <select
                                            value={categoryId ?? ""}
                                            onChange={(e) => setCategoryId(Number(e.target.value))}
                                            className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white"
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm text-gray-700">Number of Participants</label>
                                        <input
                                            type="number"
                                            min={100}
                                            value={participants}
                                            onChange={(e) =>
                                                setParticipants(
                                                    e.target.value === "" ? "" : Number(e.target.value)
                                                )
                                            }
                                            className="w-full p-2 border border-gray-300 rounded text-sm text-gray-800 bg-white placeholder-gray-400"
                                            placeholder="Minimum 100"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm block mb-2 text-gray-700">Jersey Size</label>
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
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={() => {
                                                console.log("Added community to cart", {
                                                    categoryId,
                                                    participants,
                                                    jerseys,
                                                });
                                            }}
                                            className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-emerald-200 to-emerald-100 text-white font-bold shadow"
                                        >
                                            ADD TO CART
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={() =>
                                        goToConfirm({
                                            participants: Number(participants || 0),
                                        })
                                    }
                                    className="w-1/2 md:w-1/3 px-6 py-3 rounded-full bg-emerald-200/60 text-white font-semibold shadow"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
