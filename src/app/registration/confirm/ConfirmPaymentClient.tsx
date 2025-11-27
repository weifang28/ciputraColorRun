"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useState, useEffect } from "react";
import PaymentSuccessModal from "../../components/PaymentSuccessModal";
import TutorialModal from "../../components/TutorialModal";
import { showToast } from "../../../lib/toast";

export default function ConfirmPaymentClient() {
    const [showPopup, setShowPopup] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    // NEW: sender name captured from payment proof (e.g. account name on receipt)
    const [proofSenderName, setProofSenderName] = useState<string>("");

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
    const [groupName, setGroupName] = useState<string>("");
    const [showUploadTutorial, setShowUploadTutorial] = useState(false);

    const [proofFile, setProofFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadTutorialSteps = [
      {
        title: "Upload Payment Confirmation",
        description: "Upload an image of the proof of payment (PNG, JPG, JPEG). Make sure the amount and sender name are visible.",
        image: "/images/tutorial/tut5.png",
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
            setNationality(userDetails.nationality);
            setEmergencyPhone(userDetails.emergencyPhone || "");
            setMedicalHistory(userDetails.medicalHistory || "");
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
            setGroupName(sessionStorage.getItem("reg_groupName") || "");
        }
    }, [userDetails, search]);

    // Redirect if cart is empty when coming from cart\
    useEffect(() => {
        if (!submitted && fromCart && items.length === 0) {
            router.push("/registration");
        }

    }, [fromCart, items, router]);

    async function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
        // Feature-detect APIs used by compression; if missing, return original file
        if (typeof createImageBitmap !== "function" || !HTMLCanvasElement.prototype.toBlob) {
            return file;
        }

        // If already small, return original
        if (file.size <= 1_200_000) return file;

        try {
            const imgBitmap = await createImageBitmap(file);
            const ratio = Math.min(1, maxWidth / imgBitmap.width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(imgBitmap.width * ratio);
            canvas.height = Math.round(imgBitmap.height * ratio);
            const ctx = canvas.getContext("2d");
            if (!ctx) return file;
            ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);

            return await new Promise<File>((resolve) => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return resolve(file);
                        // keep original name but ensure correct type
                        const compressed = new File([blob], file.name, { type: blob.type });
                        resolve(compressed);
                    },
                    "image/jpeg",
                    quality
                );
            });
        } catch (err) {
            console.warn("[compressImage] failed, returning original file:", err);
            return file;
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!proofFile) {
            const msg = "Please upload payment proof";
            setError(msg);
            showToast(msg, "error"); // show toast
            return;
        }

        if (!navigator.onLine) {
            const msg = "No network connection. Please try again when online.";
            setError(msg);
            showToast(msg, "error"); // show toast
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            // compress if possible; if compression fails we still continue with original
            let uploadFile = proofFile;
            try {
                uploadFile = await compressImage(proofFile, 1600, 0.78);
            } catch (compressErr) {
                console.warn("[compressImage] failed, using original file:", compressErr);
                uploadFile = proofFile;
            }

            // Enforce 5 MB limit (server expects <= 5MB)
            const MAX_UPLOAD_BYTES = 5_000_000;
            if (uploadFile.size > MAX_UPLOAD_BYTES) {
                const msg = `Selected image is too large (${(uploadFile.size / 1024 / 1024).toFixed(1)} MB). Please use an image under 5 MB.`;
                setError(msg);
                showToast(msg, "error"); // show toast
                setIsSubmitting(false);
                return;
            }

            const formData = new FormData();
            formData.append("proof", uploadFile);
            if (proofSenderName && proofSenderName.trim() !== "") {
                formData.append("proofSenderName", proofSenderName.trim());
            }
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
            if (groupName && groupName.trim() !== "") {
                formData.append("groupName", groupName.trim());
            }
            if (userDetails?.idCardPhoto) {
                formData.append("idCardPhoto", userDetails.idCardPhoto);
            }
            formData.append("items", JSON.stringify(items));

            // Important: include credentials so session cookies are sent on mobile (fixes auth-related silent failures)
            const res = await fetch("/api/payments", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            // Try to parse JSON safely
            let body: any = null;
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                body = await res.json().catch(() => ({}));
            } else {
                body = { message: await res.text().catch(() => res.statusText) };
            }

            if (!res.ok) {
                const serverMsg = body?.error || body?.message || res.statusText;
                const msg = serverMsg || `Upload failed (status ${res.status})`;
                showToast(String(msg), "error"); // show toast for server errors
                throw new Error(msg);
            }

            // success
            clearCart();
            setSubmitted(true);
            setShowPopup(true);

            showToast("Payment submitted — awaiting verification.", "success");
            // fire-and-forget notification
            (async () => {
                try {
                    await fetch("/api/notify/submission", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, name: fullName }),
                        credentials: "include",
                    });
                } catch (e) {
                    console.warn("[notify/submission] failed:", e);
                }
            })();
        } catch (err: any) {
            console.error("[ConfirmPayment] submit error:", err);
            const msg = err?.message || "Upload failed. Please try again.";
            setError(msg);
            showToast(String(msg), "error"); // surface toast for unexpected errors
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
                            {items.map((item) => {
                                // friendly size/participants display:
                                let secondaryLabel = "";
                                if (item.type === "community" || item.type === "family") {
                                    // prefer explicit jersey distribution if present
                                    const jerseysObj: Record<string, number> = item.jerseys || {};
                                    const pairs = Object.entries(jerseysObj)
                                        .filter(([, cnt]) => Number(cnt) > 0)
                                        .map(([size, cnt]) => `${size}(${cnt})`);

                                    if (pairs.length > 0) {
                                        secondaryLabel = pairs.join(", ");
                                    } else {
                                        // fallback to participants (family default 4)
                                        const fallbackCount = item.participants ?? (item.type === "family" ? 4 : 0);
                                        secondaryLabel = `${fallbackCount} participants`;
                                    }
                                } else {
                                    // individual
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
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                            <label className="block text-sm font-medium mb-2">Sender's Name (as shown on transfer) <strong className = "text-red-500">*</strong></label>
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

                           {/* small helper link to open the tutorial modal */}
                           {/* <div className="flex items-center justify-between mb-2">
                             <span className="text-xs text-gray-500">Accepted: PNG, JPG, JPEG (Max 10MB)</span>
                             <button
                               type="button"
                               onClick={() => setShowUploadTutorial(true)}
                               className="text-xs text-emerald-600 hover:underline"
                             >
                               How to upload?
                             </button>
                           </div> */}

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
                                    if (!file) return;

                                    const MAX_FILE_BYTES = 5_000_000; // 5 MB limit
                                    if (file.size > MAX_FILE_BYTES) {
                                        setProofFile(null);
                                        setFileName(null);
                                        const msg = "Selected file exceeds 5 MB. Please choose a smaller image.";
                                        setError(msg);
                                        showToast(msg, "error"); // show toast
                                        return;
                                    }

                                    // clear any previous error and accept file
                                    setError(null);
                                    setProofFile(file);
                                    setFileName(file.name);
                                }}
                                required
                            />

                           {/* Show upload errors inline */}
                           {error && (
                               <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                                   {error}
                               </div>
                           )}

                           {/* Tutorial modal for upload help */}
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
                                {isSubmitting ? "Uploading..." : "Submit Payment"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
            {showPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-xl animate-fadeIn">
                <h3 className="text-xl text-[#602d4e] font-bold mb-2">Pembayaran Berhasil!</h3>
                <p className="text-[#602d4e]/80 mb-4">
                    Terima kasih! Silakan gabung ke grup WhatsApp untuk info penting acara. Kode akses akan diberikan ketika pembayaran telah di cek kembali.
                </p>
                <p className="text-[#602d4e]/80 mb-4">
                    Kami juga telah mengirimkan email konfirmasi ke <strong>{email}</strong>. Mohon cek inbox (dan spam) untuk konfirmasi selanjutnya.
                </p>
    
                <a
                    href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve"
                    target="_blank"
                    className="block w-full bg-green-500 text-white py-3 rounded-full font-semibold hover:bg-green-600 transition"
                >
                    Join Grup WhatsApp
                </a>
            </div>
        </div>
    )}
        </main>
    );
}