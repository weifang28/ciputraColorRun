"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "../../context/CartContext";

export default function ConfirmPaymentPage() {
	const search = useSearchParams();
	const router = useRouter();
	const { items, clearCart, totalPrice } = useCart();

	const fromCart = search.get("fromCart") === "true";

	// Personal info from query/sessionStorage
	const [fullName, setFullName] = useState<string>(search.get("fullName") ?? "");
	const [email, setEmail] = useState<string>(search.get("email") ?? "");
	const [phone, setPhone] = useState<string>(search.get("phone") ?? "");

	useEffect(() => {
		try {
			if (!fullName) {
				const s = sessionStorage.getItem("reg_fullName");
				if (s) setFullName(s);
			}
			if (!email) {
				const s = sessionStorage.getItem("reg_email");
				if (s) setEmail(s);
			}
			if (!phone) {
				const s = sessionStorage.getItem("reg_phone");
				if (s) setPhone(s);
			}
		} catch (e) {
			// ignore
		}
	}, [fullName, email, phone]);

	const [fileName, setFileName] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Redirect if cart is empty when coming from cart
	useEffect(() => {
		if (fromCart && items.length === 0) {
			router.push("/registration");
		}
	}, [fromCart, items, router]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const form = new FormData(e.currentTarget);
		form.set("fullName", fullName);
		form.set("email", email);
		form.set("phone", phone);
		form.set("amount", String(totalPrice));
		form.set("registrationType", items[0]?.type || "individual");

		// Include cart items as JSON
		form.set("cartItems", JSON.stringify(items));

		try {
			const res = await fetch("/api/payments", {
				method: "POST",
				body: form,
			});
			if (!res.ok) {
				let json;
				try {
					json = await res.json();
				} catch {
					const txt = await res.text();
					throw new Error(txt || res.statusText);
				}
				throw new Error(json?.error || res.statusText);
			}

			// Clear cart after successful payment
			clearCart();
			router.push(`/registration/confirm?status=success`);
		} catch (err: any) {
			setError(err.message || "Upload failed");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<main className="flex bg-gradient-to-br from-emerald-100/30 via-transparent to-rose-100/30 min-h-screen pt-28 pb-16">
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
									<div>
										Rp{" "}
										{(
											item.type === "community"
												? (item.participants || 0) * item.price
												: item.price
										).toLocaleString("id-ID")}
									</div>
								</div>
							))}
						</div>

						<div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t">
							<span>Total:</span>
							<span>Rp {totalPrice.toLocaleString("id-ID")}</span>
						</div>
					</div>

					<form
						onSubmit={handleSubmit}
						encType="multipart/form-data"
						className="space-y-6"
					>
						<input type="hidden" name="amount" value={String(totalPrice)} />
						<input type="hidden" name="fullName" value={fullName} />
						<input type="hidden" name="email" value={email} />
						<input type="hidden" name="phone" value={phone} />

						<label className="block font-semibold">Upload Payment Proof*</label>

						<label
							htmlFor="proof"
							className="block border border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
						>
							<div className="flex flex-col items-center justify-center gap-2">
								<div className="w-12 h-12 text-gray-400">
									<Image
										src="/images/upload-icon.png"
										alt="upload"
										width={48}
										height={48}
									/>
								</div>
								<div className="font-medium">Drag & Drop Files or Browse</div>
								<div className="text-xs text-gray-500">
									Supported formats: PNG, JPG, JPEG — Files size under 5 MB
								</div>
								{fileName && (
									<div className="mt-4 text-sm text-green-600 font-medium">
										Selected: {fileName}
									</div>
								)}
							</div>
							<input
								id="proof"
								name="proof"
								type="file"
								accept="image/png,image/jpeg,image/jpg"
								className="hidden"
								onChange={(ev) => {
									const f = (ev.target as HTMLInputElement).files?.[0];
									setFileName(f?.name ?? null);
								}}
								required
							/>
						</label>

						{error && (
							<div className="text-red-600 text-sm bg-red-50 p-3 rounded">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full py-3 rounded-full bg-gradient-to-r from-emerald-200 to-emerald-100 text-white font-bold shadow hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? "Uploading..." : "Submit Payment"}
						</button>
					</form>
				</section>
			</div>
		</main>
	);
}
