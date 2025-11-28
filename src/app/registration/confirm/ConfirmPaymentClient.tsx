"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useState, useEffect } from "react";
import TutorialModal from "../../components/TutorialModal";
import { showToast } from "../../../lib/toast";

export default function ConfirmPaymentClient() {
    const [showPopup, setShowPopup] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [proofSenderName, setProofSenderName] = useState<string>("");
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const search = useSearchParams();
    const router = useRouter();
    const { items, clearCart, totalPrice, userDetails } = useCart();

    const fromCart = search.get("fromCart") === "true";

    const [fullName, setFullName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [birthDate, setBirthDate] = useState<string>("");
    const [gender, setGender] = useState<string>("");
    const [currentAddress, setCurrentAddress] = useState<string>("");
    const [nationality, setNationality] = useState<string>("");
    const [emergencyPhone, setEmergencyPhone] = useState<string>("");
    const [medicalHistory, setMedicalHistory] = useState<string>("");
    const [medicationAllergy, setMedicationAllergy] = useState<string>("");
    const [groupName, setGroupName] = useState<string>("");
    const [showUploadTutorial, setShowUploadTutorial] = useState(false);

    const [proofFile, setProofFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>("");

    const uploadTutorialSteps = [
      {
        title: "Upload Payment Confirmation",
        description: "Upload an image of the proof of payment (PNG, JPG, JPEG). Make sure the amount and sender name are visible.",
        image: "/images/tutorial/tut5.jpg",
        tip: "Make sure to send the payment to the correct address and include the sender name as shown on the transfer."
      }
    ];

    useEffect(() => {
        // Load from context first, then fallback to sessionStorage
        if (userDetails) {
            setFullName(userDetails.fullName);
            setEmail(userDetails.email);
            setPhone(userDetails.phone);
            setBirthDate(userDetails.birthDate);
            setGender(userDetails.gender);
            setCurrentAddress(userDetails.currentAddress);
            setNationality(userDetails.nationality || "");
            setEmergencyPhone(userDetails.emergencyPhone || "");
            setMedicalHistory(userDetails.medicalHistory || "");
            setMedicationAllergy(userDetails.medicationAllergy || "");
            setGroupName(userDetails.groupName || "");
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
            setMedicationAllergy(sessionStorage.getItem("reg_medicationAllergy") || "");
            setGroupName(sessionStorage.getItem("reg_groupName") || "");
        }
    }, [userDetails, search]);

    // Redirect if cart is empty when coming from cart
    useEffect(() => {
        if (!submitted && fromCart && items.length === 0) {
            router.push("/registration");
        }
    }, [fromCart, items, router, submitted]);

    // Convert File to base64
    async function fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Upload file in chunks
    async function uploadFileInChunks(file: File): Promise<string> {
        const CHUNK_SIZE = 200 * 1024; // 200KB chunks (well under nginx limit)
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const newFileName = `${uploadId}_proof.${fileExt}`;
        
        console.log(`[uploadFileInChunks] Uploading ${file.name} in ${totalChunks} chunks`);
        
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            
            // Convert chunk to base64
            const chunkBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    // Remove data URL prefix
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(chunk);
            });
            
            setUploadStatus(`Uploading... ${Math.round((chunkIndex + 1) / totalChunks * 100)}%`);
            
            const res = await fetch('/api/payments/upload-chunk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chunk: chunkBase64,
                    fileName: newFileName,
                    chunkIndex,
                    totalChunks,
                    uploadId,
                }),
            });
            
            if (!res.ok) {
                throw new Error(`Chunk ${chunkIndex + 1} upload failed`);
            }
            
            const result = await res.json();
            
            // Last chunk returns the file URL
            if (chunkIndex === totalChunks - 1 && result.fileUrl) {
                return result.fileUrl;
            }
        }
        
        throw new Error('Upload failed - no file URL returned');
    }

    // Handle file selection - no compression, just accept the file
    async function handleProofSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Max 20MB
        if (file.size > 20_000_000) {
            setProofFile(null);
            setFileName(null);
            showToast("File too large. Maximum size is 20MB.", "error");
            return;
        }

        setProofFile(file);
        setFileName(`${file.name} (${(file.size / 1024).toFixed(0)}KB)`);
    }

    async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!proofFile) {
            showToast("Please upload a payment proof image.", "error");
            return;
        }

        setShowConfirmModal(true);
    }

    // Try FormData first, if 413 error, fallback to base64 JSON endpoint
    async function handleConfirmedSubmit() {
        if (!proofFile) {
            showToast("Please upload a payment proof image.", "error");
            return;
        }

        if (!navigator.onLine) {
            showToast("No internet connection. Please check your connection and try again.", "error");
            return;
        }

        setIsSubmitting(true);
        setShowConfirmModal(false);
        setUploadStatus("Preparing upload...");

        try {
            let proofUrl: string;
            
            // Try FormData first (fastest for small files)
            if (proofFile.size < 500_000) { // Under 500KB, try direct upload
                console.log("[handleConfirmedSubmit] Trying direct FormData upload...");
                
                const formData = new FormData();
                formData.append("proof", proofFile);
                if (proofSenderName?.trim()) formData.append("proofSenderName", proofSenderName.trim());
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
                formData.append("medicationAllergy", medicationAllergy || "");
                formData.append("registrationType", items[0]?.type || "individual");
                if (groupName?.trim()) formData.append("groupName", groupName.trim());
                if (userDetails?.idCardPhoto) formData.append("idCardPhoto", userDetails.idCardPhoto);
                formData.append("items", JSON.stringify(items));

                const res = await fetch("/api/payments", {
                    method: "POST",
                    body: formData,
                    credentials: "include",
                });

                if (res.ok) {
                    const body = await res.json();
                    // Success via FormData
                    clearCart();
                    setSubmitted(true);
                    setShowPopup(true);
                    showToast("Payment submitted — awaiting verification.", "success");
                    
                    // Fire-and-forget notification
                    fetch("/api/notify/submission", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, name: fullName }),
                        credentials: "include",
                    }).catch(() => {});
                    
                    setIsSubmitting(false);
                    setUploadStatus("");
                    return;
                }
            }
            
            // For large files or if FormData failed, use chunked upload
            console.log("[handleConfirmedSubmit] Using chunked upload...");
            setUploadStatus("Uploading in chunks...");
            
            proofUrl = await uploadFileInChunks(proofFile);
            console.log("[handleConfirmedSubmit] Proof uploaded:", proofUrl);
            
            // Now send metadata with proof URL
            setUploadStatus("Saving registration...");
            
            const res = await fetch("/api/payments/base64", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    proofUrl, // Send URL instead of base64
                    items,
                    amount: totalPrice,
                    fullName,
                    email,
                    phone,
                    birthDate,
                    gender,
                    currentAddress,
                    nationality,
                    emergencyPhone,
                    medicalHistory,
                    medicationAllergy: medicationAllergy || "",
                    registrationType: items[0]?.type || "individual",
                    proofSenderName: proofSenderName?.trim() || undefined,
                    groupName: groupName?.trim() || undefined,
                }),
                credentials: "include",
            });

            const body: any = await res.json().catch(() => ({}));

            if (!res.ok) {
                console.error("[handleConfirmedSubmit] Server error:", res.status, body);
                const errorMsg = body?.error || "An unexpected error occurred. Please try again.";
                showToast(errorMsg, "error");
                throw new Error("Upload failed");
            }

            // Success!
            clearCart();
            setSubmitted(true);
            setShowPopup(true);
            showToast("Payment submitted — awaiting verification.", "success");

            // Fire-and-forget notification
            fetch("/api/notify/submission", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, name: fullName }),
                credentials: "include",
            }).catch(() => {});

        } catch (err: any) {
            console.error("[ConfirmPayment] submit error:", err);
            showToast(err?.message || "Upload failed. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
            setUploadStatus("");
        }
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
                            {items.map((item) => {
                                let secondaryLabel = "";
                                if (item.type === "community" || item.type === "family") {
                                    const jerseysObj: Record<string, number> = item.jerseys || {};
                                    const pairs = Object.entries(jerseysObj)
                                        .filter(([, cnt]) => Number(cnt) > 0)
                                        .map(([size, cnt]) => `${size}(${cnt})`);

                                    if (pairs.length > 0) {
                                        secondaryLabel = pairs.join(", ");
                                    } else {
                                        const fallbackCount = item.participants ?? (item.type === "family" ? 4 : 0);
                                        secondaryLabel = `${fallbackCount} participants`;
                                    }
                                } else {
                                    secondaryLabel = `Size ${item.jerseySize || "—"}`;
                                }

                                const itemTotal = (item.type === "community" || item.type === "family")
                                    ? Number(item.price) * Number(item.participants || 0)
                                    : Number(item.price);

                                return (
                                    <div key={item.id} className="flex justify-between text-sm border-b pb-2">
                                        <div>
                                            <span className="font-medium">{item.categoryName}</span>
                                            <span className="text-gray-500 ml-2">{secondaryLabel}</span>
                                        </div>
                                        <span className="font-medium">Rp {Number(itemTotal).toLocaleString("id-ID")}</span>
                                    </div>
                                );
                            })}
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
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        {/* Transfer Address Section */}
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg mb-4">
                            <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Transfer Destination
                            </h3>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Bank Name:</span> BCA
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Account Number:</span> 8620762491
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Account Name:</span> LOUIE NATHANIEL CHRISTOPHER
                                </p>
                                <p className="text-xs text-emerald-700 mt-2 font-medium">
                                    ⚠️ Please transfer the exact amount and upload clear proof of payment below
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Sender&apos;s Name (as shown on transfer) <strong className="text-red-500">*</strong></label>
                            <input
                                type="text"
                                value={proofSenderName}
                                onChange={(e) => setProofSenderName(e.target.value)}
                                className="w-full px-4 py-3 border rounded-md"
                                placeholder="e.g. PT. Example / John Doe"
                            />
                        </div>
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
                                    {uploadStatus || fileName || "Click to upload payment proof (PNG, JPG, JPEG)"}
                                </span>
                            </label>
                            <input
                                id="proofUpload"
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                className="hidden"
                                onChange={handleProofSelect}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Max 20MB. Large files will be uploaded via alternative method.</p>

                           {showUploadTutorial && (
                             <TutorialModal
                               isOpen={showUploadTutorial}
                               steps={uploadTutorialSteps}
                               onClose={() => setShowUploadTutorial(false)}
                             />
                           )}
                        </div>

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
                                className={`flex-1 px-6 py-3 rounded-full font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                                    isSubmitting
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md'
                                }`}
                                style={{ letterSpacing: '0.2px' }}
                            >
                                {isSubmitting ? (uploadStatus || "Uploading...") : "Submit Payment"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                            <h3 className="text-2xl font-bold text-white">Confirm Payment Submission</h3>
                        </div>
                        
                        <div className="px-6 py-4 overflow-y-auto flex-1">
                            <div className="space-y-4">
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
                                    <p className="text-sm text-amber-900 font-medium">
                                        <strong className="font-bold">⚠️ Important:</strong> Please verify all information is correct before submitting. You cannot edit this after submission.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-900 text-base">Payment Details:</h4>
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                                        <p className="text-gray-900"><span className="font-semibold text-gray-700">Total Amount:</span> <span className="text-emerald-600 font-bold text-base">Rp {totalPrice.toLocaleString("id-ID")}</span></p>
                                        {proofSenderName && (
                                            <p className="text-gray-900"><span className="font-semibold text-gray-700">Sender Name:</span> <span className="font-medium">{proofSenderName}</span></p>
                                        )}
                                        <p className="text-gray-900"><span className="font-semibold text-gray-700">Payment Proof:</span> <span className="font-medium">{fileName}</span></p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-900 text-base">Your Information:</h4>
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                                        <p className="text-gray-900"><span className="font-semibold text-gray-700">Name:</span> <span className="font-medium">{fullName}</span></p>
                                        <p className="text-gray-900"><span className="font-semibold text-gray-700">Email:</span> <span className="font-medium">{email}</span></p>
                                        <p className="text-gray-900"><span className="font-semibold text-gray-700">Phone:</span> <span className="font-medium">{phone}</span></p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-900 text-base">Order Summary:</h4>
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                                        {items.map((item) => {
                                            let secondaryLabel = "";
                                            if (item.type === "community" || item.type === "family") {
                                                const jerseysObj: Record<string, number> = item.jerseys || {};
                                                const pairs = Object.entries(jerseysObj)
                                                    .filter(([, cnt]) => Number(cnt) > 0)
                                                    .map(([size, cnt]) => `${size}(${cnt})`);
                                                secondaryLabel = pairs.length > 0 ? pairs.join(", ") : `${item.participants || 0} participants`;
                                            } else {
                                                secondaryLabel = `Size ${item.jerseySize || "—"}`;
                                            }

                                            return (
                                                <div key={item.id} className="flex justify-between border-b border-gray-300 pb-2">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{item.categoryName}</p>
                                                        <p className="text-gray-600 text-xs">{secondaryLabel}</p>
                                                    </div>
                                                    <p className="font-semibold text-gray-900">
                                                        Rp {((item.type === "community" || item.type === "family") 
                                                            ? Number(item.price) * Number(item.participants || 0)
                                                            : Number(item.price)).toLocaleString("id-ID")}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 px-6 py-3 rounded-full border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Review Again
                                </button>
                                <button
                                    onClick={handleConfirmedSubmit}
                                    disabled={isSubmitting}
                                    className={`flex-1 px-6 py-3 rounded-full font-semibold transition-all ${
                                        isSubmitting
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md'
                                    }`}
                                >
                                    {isSubmitting ? "Submitting..." : "Confirm & Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPopup && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-xl animate-fadeIn">
                        <h3 className="text-xl text-[#602d4e] font-bold mb-2">Payment Successful!</h3>
                        <p className="text-[#602d4e]/80 mb-4">














}    );        </main>            )}                </div>                    </div>                        </button>                            Close                        >                            className="px-4 py-2 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"                            onClick={() => setShowPopup(false)}                        <button                        </p>                            Your payment has been submitted successfully. Our team will verify your payment shortly.                            Thank you! Please join the WhatsApp group for important event information. Access codes will be provided once the payment has been verified.
                        </p>
                        <p className="text-[#602d4e]/80 mb-4">
                            We have also sent a confirmation email to <strong>{email}</strong>. Please check your inbox (and spam) for further confirmation.
                        </p>
    
                        <a
                            href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve"
                            target="_blank"
                            className="block w-full bg-green-500 text-white py-3 rounded-full font-semibold hover:bg-green-600 transition"
                        >
                            Join WhatsApp Group
                        </a>
                    </div>
                </div>
            )}
        </main>
    );
}