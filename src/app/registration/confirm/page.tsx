"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useState, useEffect } from "react";

export default function ConfirmPaymentPage() {
    const [showPopup, setShowPopup] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const search = useSearchParams();
    const router = useRouter();
    const { items, clearCart, totalPrice, userDetails } = useCart();

    const fromCart = search.get("fromCart") === "true";

    // Personal info from context or query/sessionStorage
    const [fullName, setFullName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [birthDate, setBirthDate] = useState<string>("");
    const [gender, setGender] = useState<string>("");
    const [currentAddress, setCurrentAddress] = useState<string>("");
    const [nationality, setNationality] = useState<string>("");
    const [emergencyPhone, setEmergencyPhone] = useState<string>("");
    const [medicalHistory, setMedicalHistory] = useState<string>("");

    const [proofFile, setProofFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load from context first, then fallback to sessionStorage
        if (userDetails) {
            setFullName(userDetails.fullName);
            setEmail(userDetails.email);
            setPhone(userDetails.phone);
            setBirthDate(userDetails.birthDate);
            setGender(userDetails.gender);
            setCurrentAddress(userDetails.currentAddress);
            setNationality(userDetails.nationality);
            setEmergencyPhone(userDetails.emergencyPhone || "");
            setMedicalHistory(userDetails.medicalHistory || "");
        } else {
            setFullName(sessionStorage.getItem("reg_fullName") || search.get("fullName") || "");
            setEmail(sessionStorage.getItem("reg_email") || search.get("email") || "");
            setPhone(sessionStorage.getItem("reg_phone") || search.get("phone") || "");
            setBirthDate(sessionStorage.getItem("reg_birthDate") || "");
            setGender(sessionStorage.getItem("reg_gender") || "male");
            setCurrentAddress(sessionStorage.getItem("reg_currentAddress") || "");
            setNationality(sessionStorage.getItem("reg_nationality") || "WNI");
            setEmergencyPhone(sessionStorage.getItem("reg_emergencyPhone") || "");
            setMedicalHistory(sessionStorage.getItem("reg_medicalHistory") || "");
        }
    }, [userDetails, search]);

    // Redirect if cart is empty when coming from cart\
    useEffect(() => {
        if (!submitted && fromCart && items.length === 0) {
            router.push("/registration");
        }

    }, [fromCart, items, router]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!proofFile) {
            setError("Please upload payment proof");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("proof", proofFile);
            formData.append("amount", String(totalPrice));
            formData.append("fullName", fullName);
            formData.append("email", email);
            formData.append("phone", phone);
            formData.append("birthDate", birthDate);
            formData.append("gender", gender);
            formData.append("currentAddress", currentAddress);
            formData.append("nationality", nationality);
            formData.append("emergencyPhone", emergencyPhone);
            formData.append("medicalHistory", medicalHistory);
            formData.append("registrationType", items[0]?.type || "individual");

            // Upload ID card photo if available
            if (userDetails?.idCardPhoto) {
                formData.append("idCardPhoto", userDetails.idCardPhoto);
            }

            // Add cart items
            formData.append("items", JSON.stringify(items));

            const res = await fetch("/api/payments", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Upload failed");
            }

            clearCart();    
            setSubmitted(true);
            setShowPopup(true);
            
        } catch (err: any) {
            setError(err.message || "Upload failed");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main
            className="flex min-h-screen pt-28 pb-16"
            style={{
                backgroundImage: "url('/images/generalBg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <div className="mx-auto w-full max-w-2xl px-4">
                <h1 className="text-4xl md:text-6xl text-center font-bold mb-8 tracking-wide text-white drop-shadow-lg">
                    CIPUTRA COLOR RUN
                </h1>

                <section className="bg-white/95 backdrop-blur-md rounded-lg p-8 md:p-10 shadow-lg text-gray-800">
                    <h2 className="text-2xl font-bold text-center mb-1">
                        PAYMENT CONFIRMATION
                    </h2>
                    <p className="text-center text-sm text-gray-600 mb-6">
                        Upload your payment proof to complete registration.
                    </p>

                    {/* Order Summary */}
                    <div className="mb-6">
                        <h3 className="font-semibold mb-3">Order Summary:</h3>
                        <div className="space-y-2">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex justify-between text-sm border-b pb-2"
                                >
                                    <div>
                                        <span className="font-medium">{item.categoryName}</span>
                                        <span className="text-gray-500 ml-2">
                                            {item.type === "community"
                                                ? `${item.participants} participants`
                                                : `Size ${item.jerseySize}`}
                                        </span>
                                    </div>
                                    <span className="font-medium">
                                        Rp {(item.type === "community" ? item.price * (item.participants || 0) : item.price).toLocaleString("id-ID")}
                                    </span>
                                </div>
                            ))}
                            <div className="flex justify-between font-bold text-lg pt-2">
                                <span>Total:</span>
                                <span>Rp {totalPrice.toLocaleString("id-ID")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Personal Info Display */}
                    <div className="mb-6 p-4 bg-gray-50 rounded">
                        <h3 className="font-semibold mb-2">Participant Information:</h3>
                        <div className="text-sm space-y-1">
                            <p><span className="font-medium">Name:</span> {fullName}</p>
                            <p><span className="font-medium">Email:</span> {email}</p>
                            <p><span className="font-medium">Phone:</span> {phone}</p>
                            <p><span className="font-medium">Birth Date:</span> {birthDate}</p>
                            <p><span className="font-medium">Nationality:</span> {nationality}</p>
                            {emergencyPhone && <p><span className="font-medium">Emergency Contact:</span> {emergencyPhone}</p>}
                        </div>
                    </div>

                    {/* Upload Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Upload Payment Proof *
                            </label>
                            <label
                                htmlFor="proofUpload"
                                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 transition-colors flex items-center justify-center gap-3"
                            >
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span className="text-sm text-gray-600">
                                    {fileName || "Click to upload payment proof (PNG, JPG, JPEG)"}
                                </span>
                            </label>
                            <input
                                id="proofUpload"
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setProofFile(file);
                                        setFileName(file.name);
                                    }
                                }}
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 px-6 py-3 rounded-full border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`flex-1 px-6 py-3 rounded-full font-semibold transition-all ${
                                    isSubmitting
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-200 to-emerald-100 text-white hover:shadow-lg'
                                }`}
                            >
                                {isSubmitting ? "Uploading..." : "Submit Payment"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
            {showPopup && (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-xl animate-fadeIn">
            <h3 className="text-xl font-bold mb-2">Pembayaran Berhasil!</h3>
            <p className="text-gray-600 mb-6">
                Terima kasih! Silakan gabung ke grup WhatsApp untuk info penting acara.
            </p>

            <a
                href="https://chat.whatsapp.com/GROUP_LINK_DI_SINI"
                target="_blank"
                className="block w-full bg-green-500 text-white py-3 rounded-full font-semibold hover:bg-green-600 transition"
            >
                Join Grup WhatsApp
            </a>

            <button
                onClick={() => router.push("/")}
                className="mt-3 w-full py-3 rounded-full border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
            >
                Kembali ke Beranda
            </button>
        </div>
    </div>
)}
        </main>
    );
}
