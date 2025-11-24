// src/app/api/payments/route.ts

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";

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
 * Generate a bib number with category-based prefix and participant ID suffix.
 * - 3km: "3" + 4-digit padded ID (e.g., "30001")
 * - 5km: "5" + 4-digit padded ID (e.g., "50002")
 * - 10km: "10" + 4-digit padded ID (e.g., "100003")
 * 
 * @param categoryName The race category name (e.g., "3km", "5km", "10km")
 * @param participantId The participant's unique ID from the database
 */
function generateBibNumber(categoryName: string | undefined, participantId: number): string {
  // Extract numeric prefix from category name
  const match = (categoryName || "").match(/^(\d{1,2})/);
  const prefix = match ? match[1] : "0"; // "3", "5", or "10"
  
  // Determine padding based on prefix length
  // "3" or "5" -> 4 digits (total 5), "10" -> 4 digits (total 6)
  const paddingLength = prefix === "10" ? 4 : 4;
  
  // Pad participant ID to ensure consistent length
  const paddedId = participantId.toString().padStart(paddingLength, "0");
  
  return `${prefix}${paddedId}`;
}

async function sendRegistrationEmail(email: string | undefined, name: string | undefined, registrationId: number) {
  if (!email) return;
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);
  const secure = (process.env.EMAIL_SECURE) === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('[sendRegistrationEmail] SMTP not configured, skipping email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const mailHtml = `
    <div style="font-family:Inter, Arial, sans-serif; color:#111827;">
      <h2>Your registration is received — Ciputra Color Run</h2>
      <p>Hi ${name || 'Participant'},</p>
      <p>Thank you for submitting your payment proof. We've received your registration (Order #: ${registrationId}). Our team will verify the payment shortly.</p>
      <p>If approved, you'll receive an access code and QR code via email. Meanwhile, join our WhatsApp group for updates: <a href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve">Join WhatsApp Group</a></p>
      <p>Regards,<br/>Ciputra Color Run Team</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Ciputra Color Run" <${user}>`,
      to: email,
      subject: 'Registration received — Ciputra Color Run',
      html: mailHtml,
    });
    console.log('[sendRegistrationEmail] Sent to', email);
  } catch (err) {
    console.error('[sendRegistrationEmail] error', err);
  }
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
    const proofSenderName = (form.get("proofSenderName") as string) || undefined;
    const groupName = (form.get("groupName") as string) || undefined;

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
          groupName: groupName || undefined, // Add group name
        },
      });

      // create participants based on cartItems
      const participantRows: Array<{
        registrationId: number;
        categoryId: number;
        jerseyId: number;
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
          participantRows.push({
            registrationId: registration.id,
            categoryId,
            jerseyId: jerseyId ?? (await prismaTx.jerseyOption.findFirst())?.id ?? 1,
          });
        } else if (item.type === "community" || item.type === "family") {
          const jerseysMap: Record<string, number> = item.jerseys || {};
          for (const [size, cnt] of Object.entries(jerseysMap)) {
            const count = Number(cnt) || 0;
            if (count <= 0) continue;
            const jOpt = await prismaTx.jerseyOption.findUnique({ where: { size } });
            const jerseyId = jOpt ? jOpt.id : (await prismaTx.jerseyOption.findFirst())?.id ?? 1;

            for (let i = 0; i < count; i++) {
              participantRows.push({
                registrationId: registration.id,
                categoryId,
                jerseyId,
              });
            }
          }
        }
      }

      // Create participants WITHOUT bib numbers first (to get their IDs)
      if (participantRows.length > 0) {
        await prismaTx.participant.createMany({
          data: participantRows.map((r) => ({
            registrationId: r.registrationId,
            categoryId: r.categoryId,
            jerseyId: r.jerseyId,
            bibNumber: null, // will be updated below
          })),
        });
      }

      // Now fetch the created participants and assign bib numbers based on their IDs
      const createdParticipants = await prismaTx.participant.findMany({
        where: { registrationId: registration.id },
        include: { category: true },
        orderBy: { id: 'asc' },
      });

      // Update each participant with their bib number
      for (const participant of createdParticipants) {
        const bibNumber = generateBibNumber(participant.category?.name, participant.id);
        await prismaTx.participant.update({
          where: { id: participant.id },
          data: { bibNumber },
        });
      }

      // --- NEW: create EarlyBirdClaim when applicable (for individual registrations) ---
      // This ensures categories API will reflect consumed early-bird slots immediately.
      if (registrationType === "individual") {
        const claimedByCategory = Array.from(new Set(createdParticipants.map((r: any) => r.categoryId)));
        for (const catId of claimedByCategory) {
          const cat = await prismaTx.raceCategory.findUnique({ where: { id: catId } });
          if (!cat) continue;
          const capacity = typeof cat.earlyBirdCapacity === "number" ? cat.earlyBirdCapacity : null;
          if (capacity && capacity > 0) {
            const claimsCount = await prismaTx.earlyBirdClaim.count({ where: { categoryId: catId } });
            const toCreate = Math.max(0, Math.min(
              createdParticipants.filter((r: any) => r.categoryId === catId).length,
              capacity - claimsCount
            ));
            if (toCreate > 0) {
              // create simple claim rows (schema only requires categoryId)
              await prismaTx.earlyBirdClaim.createMany({
                data: Array.from({ length: toCreate }, () => ({ categoryId: catId })),
              });
            }
          }
        }
      }
      // --- END NEW CODE ---

      // Group participants by category to create QR codes
      const grouped = createdParticipants.reduce((acc: Record<number, number>, r: any) => {
        const cid = typeof r.categoryId === "number" ? r.categoryId : 0;
        acc[cid] = (acc[cid] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const createdQrCodes: any[] = [];
      // Object.entries can produce loose types; assert tuple type and coerce values to number
      for (const [catIdStr, totalPacksRaw] of Object.entries(grouped) as [string, number][]) {
        const catId = Number(catIdStr);
        const totalPacks = Number(totalPacksRaw || 0);
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
        proofSenderName: proofSenderName, // NEW
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

    // fire-and-forget email (do not block main response)
    (async () => {
      try {
        await sendRegistrationEmail(result.registration.user?.email, result.registration.user?.name, result.registration.id);
      } catch (e) {
        console.error('[payments POST] sendRegistrationEmail failed', e);
      }
    })();

    return NextResponse.json({
      success: true,
      payment: result.payment,
      qrCodes: result.createdQrCodes,
    });
  } catch (error: any) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}