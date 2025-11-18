// src/app/api/payments/route.ts

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generates a unique access code from a full name.
 * Example: "Felicia Angelie" -> "felicia_angelie"
 * Handles collisions by appending numbers: "felicia_angelie_1", "felicia_angelie_2", etc.
 * @param fullName The user's full name.
 * @param prismaTx A Prisma transaction client.
 */
async function generateAccessCode(
  fullName: string,
  prismaTx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >
): Promise<string> {
  // Normalize name -> ascii, lowercase, remove non-alphanumeric, spaces -> underscore
  const normalized = (fullName || "user")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // remove punctuation
    .trim()
    .replace(/\s+/g, "_") // spaces -> underscore
    .replace(/^_+|_+$/g, ""); // trim leading/trailing underscores

  const base = normalized || `user`;

  let code = base;
  let counter = 0;

  while (true) {
    const exists = await prismaTx.user.findUnique({ where: { accessCode: code } });
    if (!exists) return code;
    counter += 1;
    code = `${base}_${counter}`;
  }
}

/**
 * Generate a bib number with category-based prefix and ensure uniqueness.
 * Example: categoryName "3K" -> prefix "3" -> bib "3XXXX" (4 random digits)
 */
async function generateUniqueBib(
  categoryName: string | undefined,
  prismaTx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >
): Promise<string> {
  const prefixMatch = (categoryName || "").match(/^(\d{1,2})/);
  const prefix = prefixMatch ? prefixMatch[1] : "0"; // fallback prefix

  const makeCandidate = () => `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;

  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = makeCandidate();
    const exists = await prismaTx.participant.findFirst({ where: { bibNumber: candidate } });
    if (!exists) return candidate;
  }

  // Last resort: append timestamp
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    
    const registrationIdStr = form.get("registrationId") as string | null;
    const amountStr = (form.get("amount") as string) || undefined;
    const proofFile = form.get("proof") as File | null;
    const idCardPhotoFile = form.get("idCardPhoto") as File | null;
    const cartItemsJson =
      (form.get("items") as string) ||
      (form.get("cartItems") as string) ||
      undefined;

    // User details
    const fullName = (form.get("fullName") as string) || undefined;
    const email = (form.get("email") as string) || undefined;
    const phone = (form.get("phone") as string) || undefined;
    const birthDate = (form.get("birthDate") as string) || undefined;
    const gender = (form.get("gender") as string) || undefined;
    const currentAddress = (form.get("currentAddress") as string) || undefined;
    const nationality = (form.get("nationality") as string) || undefined;
    const emergencyPhone = (form.get("emergencyPhone") as string) || undefined;
    const medicalHistory = (form.get("medicalHistory") as string) || undefined;
    const registrationType =
      (form.get("registrationType") as string) || "individual";

    if (!proofFile) {
      return NextResponse.json(
        { error: "proof file is required" },
        { status: 400 }
      );
    }

    const amount =
      amountStr !== undefined && amountStr !== "" ? Number(amountStr) : undefined;

    const txId =
      typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Upload proof to Cloudinary
    let proofPath: string;
    try {
      const proofBuffer = Buffer.from(await proofFile.arrayBuffer());
      const proofBase64 = `data:${proofFile.type};base64,${proofBuffer.toString("base64")}`;
      
      const proofUpload = await cloudinary.uploader.upload(proofBase64, {
        folder: "ciputra-color-run/proofs",
        public_id: `${txId}_proof`,
        resource_type: "image",
      });

      proofPath = proofUpload.secure_url;
      console.log("[payments] Uploaded proof to Cloudinary:", proofPath);
    } catch (uploadErr) {
      console.error("Cloudinary proof upload failed:", uploadErr);
      return NextResponse.json(
        { error: "Failed to upload proof image. Please try again." },
        { status: 500 }
      );
    }

    // Upload ID card photo if provided
    let idCardPhotoPath: string | undefined;
    if (idCardPhotoFile) {
      try {
        const idBuffer = Buffer.from(await idCardPhotoFile.arrayBuffer());
        const idBase64 = `data:${idCardPhotoFile.type};base64,${idBuffer.toString("base64")}`;
        
        const idUpload = await cloudinary.uploader.upload(idBase64, {
          folder: "ciputra-color-run/id-cards",
          public_id: `${txId}_id`,
          resource_type: "image",
        });

        idCardPhotoPath = idUpload.secure_url;
        console.log("[payments] Uploaded ID card to Cloudinary:", idCardPhotoPath);
      } catch (uploadErr) {
        console.error("Cloudinary ID card upload failed:", uploadErr);
        // Don't fail the entire request, just log the error
      }
    }

    // parse cart items JSON (if provided)
    let cartItems: any[] = [];
    if (cartItemsJson) {
      try {
        cartItems = JSON.parse(cartItemsJson);
      } catch (e) {
        return NextResponse.json({ error: "invalid items JSON" }, { status: 400 });
      }
    }

    // transaction body extracted to a named async function to avoid parsing issues
    async function createRegistrationAndPayment(prismaTx: any) {
      // find user by email if available
      let user =
        email && email !== ""
          ? await prismaTx.user.findUnique({ where: { email } })
          : null;

      if (!user) {
        const accessCode = await generateAccessCode(fullName || "user", prismaTx);
        user = await prismaTx.user.create({
          data: {
            name: fullName,
            email: email || undefined,
            phone: phone || undefined,
            accessCode,
            role: "user",
            birthDate: birthDate ? new Date(birthDate) : undefined,
            gender: gender || undefined,
            currentAddress: currentAddress || undefined,
            nationality: nationality || undefined,
            idCardPhoto: idCardPhotoPath || undefined,
            emergencyPhone: emergencyPhone || undefined,
            medicalHistory: medicalHistory || undefined,
          },
        });
      } else {
        await prismaTx.user.update({
          where: { id: user.id },
          data: {
            birthDate: birthDate ? new Date(birthDate) : undefined,
            gender: gender || undefined,
            currentAddress: currentAddress || undefined,
            nationality: nationality || undefined,
            idCardPhoto: idCardPhotoPath || user.idCardPhoto,
            emergencyPhone: emergencyPhone || undefined,
            medicalHistory: medicalHistory || undefined,
          },
        });
      }

      // create registration
      const registration = await prismaTx.registration.create({
        data: {
          userId: user.id,
          registrationType,
          totalAmount: new Prisma.Decimal(String(amount ?? 0)),
        },
      });

      // create participants based on cartItems
      const participantRows: Array<{
        registrationId: number;
        categoryId: number;
        jerseyId: number;
        bibNumber?: string;
      }> = [];

      for (const item of cartItems || []) {
        const categoryId = Number(item.categoryId);
        if (Number.isNaN(categoryId)) continue;

        const category = await prismaTx.raceCategory.findUnique({
          where: { id: categoryId },
        });

        if (item.type === "individual") {
          let jerseyId: number | undefined = undefined;
          if (item.jerseySize) {
            const j = await prismaTx.jerseyOption.findUnique({
              where: { size: item.jerseySize },
            });
            if (j) jerseyId = j.id;
          }
          const bib = await generateUniqueBib(category?.name, prismaTx);
          participantRows.push({
            registrationId: registration.id,
            categoryId,
            jerseyId: jerseyId ?? (await prismaTx.jerseyOption.findFirst())?.id ?? 1,
            bibNumber: bib,
          });
        } else if (item.type === "community") {
          const jerseysMap: Record<string, number> = item.jerseys || {};
          for (const [size, cnt] of Object.entries(jerseysMap)) {
            const count = Number(cnt) || 0;
            if (count <= 0) continue;
            const jOpt = await prismaTx.jerseyOption.findUnique({ where: { size } });
            const jerseyId = jOpt ? jOpt.id : (await prismaTx.jerseyOption.findFirst())?.id ?? 1;
            for (let i = 0; i < count; i++) {
              const bib = await generateUniqueBib(category?.name, prismaTx);
              participantRows.push({
                registrationId: registration.id,
                categoryId,
                jerseyId,
                bibNumber: bib,
              });
            }
          }
        }
      }

      if (participantRows.length > 0) {
        await prismaTx.participant.createMany({
          data: participantRows.map((r) => ({
            registrationId: r.registrationId,
            categoryId: r.categoryId,
            jerseyId: r.jerseyId,
            bibNumber: r.bibNumber,
          })),
        });
      }

      // Group participants by category to create QR codes
      const grouped = participantRows.reduce<Record<number, number>>((acc, r) => {
        acc[r.categoryId] = (acc[r.categoryId] || 0) + 1;
        return acc;
      }, {});

      const createdQrCodes: any[] = [];
      for (const [catIdStr, totalPacks] of Object.entries(grouped)) {
        const catId = Number(catIdStr);
        const code =
          typeof crypto?.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const maxScans = totalPacks + 3;
        const qr = await prismaTx.qrCode.create({
          data: {
            registrationId: registration.id,
            categoryId: catId,
            qrCodeData: code,
            totalPacks,
            maxScans,
            scansRemaining: maxScans,
          },
        });
        createdQrCodes.push(qr);
      }

      // Create payment record with Cloudinary URLs
      const paymentData: any = {
        registrationId: registration.id,
        transactionId: txId,
        proofOfPayment: proofPath, // Cloudinary URL
        status: "pending",
        amount: new Prisma.Decimal(String(amount ?? 0)),
      };

      if (amount !== undefined && !Number.isNaN(amount)) {
        paymentData.amount = new Prisma.Decimal(String(amount));
      }

      const payment = await prismaTx.payment.create({ data: paymentData });

      return { registration, payment, createdQrCodes };
    }

    // run transaction (increase interactive transaction timeout to avoid 5s default)
    // configurable via PRISMA_TX_TIMEOUT (ms). Accelerate enforces a 15000 ms max.
    // Clamp to 15000 to avoid P6005 errors from the platform.
    const configured = Number(process.env.PRISMA_TX_TIMEOUT || 15000);
    const txTimeout = Math.min(Math.max(0, configured || 15000), 15000);
     const result = await prisma.$transaction((tx: any) => createRegistrationAndPayment(tx), { timeout: txTimeout });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      qrCodes: result.createdQrCodes,
    });
  } catch (err: unknown) {
    console.error("payments POST error:", err);
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : JSON.stringify(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}