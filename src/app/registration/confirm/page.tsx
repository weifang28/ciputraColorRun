"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

export default function ConfirmPaymentPage() {
	const search = useSearchParams();
	const router = useRouter();

	const categoryId = search.get("categoryId");
	const participants = Number(search.get("participants") ?? "0");

	// read from query first, then fall back to sessionStorage
	const [fullName, setFullName] = useState<string>(search.get("fullName") ?? "");
	const [email, setEmail] = useState<string>(search.get("email") ?? "");
	const [phone, setPhone] = useState<string>(search.get("phone") ?? "");
	const [registrationType, setRegistrationType] = useState<string>(
		search.get("registrationType") ?? "individual"
	);

	useEffect(() => {
		// fallback to sessionStorage values if query params are not present
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
			if (!registrationType) {
				const s = sessionStorage.getItem("reg_registrationType");
				if (s) setRegistrationType(s);
			}
		} catch (e) {
			// ignore sessionStorage errors
		}
	}, [fullName, email, phone, registrationType]);

	const [category, setCategory] = useState<
		{ id: number; name: string; price: string } | null
	>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!categoryId) return;
		(async () => {
			try {
				const res = await fetch("/api/categories");
				if (!res.ok) {
					console.error("/api/categories returned", res.status);
					setCategory(null);
					return;
				}
				const ct = res.headers.get("content-type") || "";
				if (!ct.includes("application/json")) {
					console.error("/api/categories returned non-json:", await res.text());
					setCategory(null);
					return;
				}
				const list = await res.json();
				const found = list.find((c: any) => String(c.id) === String(categoryId));
				setCategory(found || null);
			} catch (err) {
				console.error("Failed to fetch categories:", err);
				setCategory(null);
			}
		})();
	}, [categoryId]);

	const displayedPrice = category ? Number(category.price) * (participants || 1) : 0;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		// ensure form includes fallback values from sessionStorage if state is empty
		const form = new FormData(e.currentTarget);
		if (categoryId) form.set("categoryId", String(categoryId));

		const fn = fullName || (typeof window !== "undefined" && sessionStorage.getItem("reg_fullName")) || "";
		const em = email || (typeof window !== "undefined" && sessionStorage.getItem("reg_email")) || "";
		const ph = phone || (typeof window !== "undefined" && sessionStorage.getItem("reg_phone")) || "";
		const rtype =
			registrationType ||
			(typeof window !== "undefined" && sessionStorage.getItem("reg_registrationType")) ||
			"individual";

		form.set("fullName", String(fn));
		form.set("email", String(em));
		form.set("phone", String(ph));
		form.set("registrationType", String(rtype));
		form.set("amount", String(displayedPrice));

		try {
			const res = await fetch("/api/payments", {
				method: "POST",
				body: form,
			});
			if (!res.ok) {
				// defensive parse: server might return non-json
				let json;
				try {
					json = await res.json();
				} catch {
					const txt = await res.text();
					throw new Error(txt || res.statusText);
				}
				throw new Error(json?.error || res.statusText);
			}
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
						REGISTRATION FORM
					</h2>
					<p className="text-center text-sm text-gray-600 mb-6">
						Enter the details to get going.
					</p>

					{/* Payment details */}
					<div className="mb-6">
						<h3 className="font-semibold mb-3">Detail Payment :</h3>
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div>Kategori :</div>
							<div className="text-right">{category?.name}</div>

							<div>Harga (one ticket) :</div>
							<div className="text-right">
								Rp. {Number(category?.price).toLocaleString("id-ID")}
							</div>

							<div className="col-span-2 border-t my-2" />

							<div>Total yang harus dibayar :</div>
							<div className="text-right font-semibold">
								Rp. {displayedPrice.toLocaleString("id-ID")}
							</div>
						</div>
					</div>

					<form
						onSubmit={handleSubmit}
						encType="multipart/form-data"
						className="space-y-6"
					>
						<input type="hidden" name="categoryId" value={categoryId ?? ""} />
						<input type="hidden" name="amount" value={String(displayedPrice)} />
						<input type="hidden" name="fullName" value={fullName} />
						<input type="hidden" name="email" value={email} />
						<input type="hidden" name="phone" value={phone} />
						<input type="hidden" name="registrationType" value={registrationType} />

						<label className="block font-semibold">Upload Bukti*</label>

						{/* drag & drop / file input */}
						<label
							htmlFor="proof"
							className="block border border-gray-300 rounded-lg p-8 text-center cursor-pointer"
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
								<div className="mt-4 text-sm text-gray-700">
									{fileName ?? ""}
								</div>
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

						{error && <div className="text-red-600 text-sm">{error}</div>}

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full py-3 rounded-full bg-gradient-to-r from-emerald-200 to-emerald-100 text-white font-bold"
						>
							{isSubmitting ? "Uploading..." : "Next"}
						</button>
					</form>
				</section>
			</div>
		</main>
	);
}
