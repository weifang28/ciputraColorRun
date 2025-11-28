// src/app/api/payments/base64/route.ts
// This endpoint accepts JSON with base64-encoded images to bypass nginx body size limits

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const cloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function ensureUploadsDir(subDir: string): string {
  const uploadsDir = path.join(process.cwd(), "uploads", subDir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

function saveBase64Locally(base64Data: string, subDir: string, fileName: string): string {
  const uploadsDir = ensureUploadsDir(subDir);
  const filePath = path.join(uploadsDir, fileName);
  
  // Remove data URL prefix if present
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Clean, "base64");
  
  fs.writeFileSync(filePath, buffer);
  
  const apiPath = `/api/uploads/${subDir}/${fileName}`;
  console.log(`[L] Saved locally: ${apiPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
  return apiPath;
}

async function uploadBase64WithFallback(
  base64Data: string,
  cloudinaryFolder: string,
  localSubDir: string,
  fileId: string,
  fileExt: string = "jpg"
): Promise<{ url: string; isLocal: boolean }> {
  const fileName = `${fileId}.${fileExt}`;

  // Try Cloudinary first
  if (cloudinaryConfigured) {
    try {
      const uploadResult = await cloudinary.uploader.upload(base64Data, {
        folder: cloudinaryFolder,
        public_id: fileId,
        resource_type: "image",
      });
      console.log(`[C] Uploaded to Cloudinary: ${uploadResult.secure_url}`);
      return { url: uploadResult.secure_url, isLocal: false };
    } catch (err: any) {
      console.warn(`[base64] Cloudinary failed, falling back to local:`, err?.message);
    }
  }

  // Fallback to local storage - THIS WILL ALWAYS WORK
  const localUrl = saveBase64Locally(base64Data, localSubDir, fileName);
  return { url: localUrl, isLocal: true };
}

async function generateAccessCode(fullName: string): Promise<string> {
  const normalized = (fullName || "user")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");

  const base = normalized || `user`;
  let code = base;
  let counter = 0;

  while (true) {
    const exists = await prisma.user.findUnique({ where: { accessCode: code } });
    if (!exists) return code;
    counter++;
    code = `${base}_${counter}`;
    if (counter > 1000) {
      code = `${base}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      break;
    }
  }
  return code;
}

function generateBibNumber(categoryName: string | undefined, participantId: number): string {
  const catLower = (categoryName || "").toLowerCase().replace(/\s+/g, "");
  let prefix = "0";
  if (catLower.includes("3k") || catLower === "3km") prefix = "3";
  else if (catLower.includes("5k") || catLower === "5km") prefix = "5";
  else if (catLower.includes("10k") || catLower === "10km") prefix = "10";
  return `${prefix}${String(participantId).padStart(4, "0")}`;
}

async function sendRegistrationEmail(email: string | undefined, name: string | undefined, registrationId: number) {
  if (!email) return;
  try {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!user || !pass) return;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Ciputra Color Run 2026" <${user}>`,
      to: email,
      subject: "Registration Received - Ciputra Color Run 2026",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Registration Received!</h2>
          <p>Dear ${name || "Participant"},</p>
          <p>Thank you for registering for Ciputra Color Run 2026!</p>
          <p>Your registration ID is: <strong>#${registrationId}</strong></p>
          <p>We have received your payment proof and will verify it shortly.</p>
          <a href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve" style="display: inline-block; background: #25D366; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Join WhatsApp Group</a>
          <br><br>
          <p>Best regards,<br>Ciputra Color Run Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[sendRegistrationEmail] Failed:", err);
  }
}

export async function POST(req: Request) {
  console.log("[payments/base64] POST request received");

  try {
    const body = await req.json();
    
    const {
      proofBase64,  // Keep for backwards compatibility
      proofUrl,     // NEW: Accept pre-uploaded file URL
      proofFileName,
      idCardBase64,
      idCardFileName,
      items,
      amount,
      fullName,
      email,
      phone,
      birthDate,
      gender,
      currentAddress,
      nationality,
      emergencyPhone,
      medicalHistory,
      medicationAllergy,
      registrationType,
      proofSenderName,
      groupName,
    } = body;

    // Use proofUrl if provided, otherwise fall back to base64
    let proofPath: string;
    
    if (proofUrl) {
      // File was already uploaded via chunks
      proofPath = proofUrl;
      console.log("[payments/base64] Using pre-uploaded proof:", proofPath);
    } else if (proofBase64) {
      // Legacy base64 upload
      if (!proofBase64) {
        return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
      }

      const txId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const proofExt = proofFileName?.split(".").pop()?.toLowerCase() || "jpg";

      console.log("[payments/base64] Uploading proof...");
      const proofResult = await uploadBase64WithFallback(
        proofBase64,
        "ciputra-color-run/proofs",
        "proofs",
        `${txId}_proof`,
        proofExt
      );
      proofPath = proofResult.url;
      console.log("[payments/base64] Proof saved:", proofPath);
    } else {
      return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
    }

    // Upload ID card if provided
    let idCardPhotoPath: string | undefined;
    if (idCardBase64) {
      console.log("[payments/base64] Uploading ID card...");
      const idExt = idCardFileName?.split(".").pop()?.toLowerCase() || "jpg";
      try {
        const idResult = await uploadBase64WithFallback(
          idCardBase64,
          "ciputra-color-run/id-cards",
          "id-cards",
          `${txId}_id`,
          idExt
        );
        idCardPhotoPath = idResult.url;
        console.log("[payments/base64] ID card saved:", idCardPhotoPath);
      } catch (err) {
        console.warn("[payments/base64] ID card upload failed (non-fatal):", err);
      }
    }

    // Parse cart items
    let cartItems: any[] = [];
    if (items) {
      try {
        cartItems = typeof items === "string" ? JSON.parse(items) : items;
      } catch (e) {
        console.warn("[payments/base64] Failed to parse items:", e);
      }
    }

    // Pre-fetch jersey options
    const jerseyOptions = await prisma.jerseyOption.findMany();
    const jerseyMap = new Map(jerseyOptions.map((j) => [j.size, j.id]));
    const defaultJerseyId = jerseyOptions[0]?.id ?? 1;

    // Generate access code
    const accessCode = await generateAccessCode(fullName || "user");

    // Database transaction
    console.log("[payments/base64] Starting transaction...");
    const result = await prisma.$transaction(async (tx) => {
      let user = email ? await tx.user.findUnique({ where: { email } }) : null;

      const userData: any = {
        birthDate: birthDate ? new Date(birthDate) : undefined,
        gender: gender || undefined,
        currentAddress: currentAddress || undefined,
        nationality: nationality || undefined,
        emergencyPhone: emergencyPhone || undefined,
        medicalHistory: medicalHistory || undefined,
      };

      if (medicationAllergy !== undefined) {
        userData.medicationAllergy = medicationAllergy;
      }

      if (!user) {
        user = await tx.user.create({
          data: {
            name: fullName,
            email: email || `temp_${txId}@temp.com`,
            phone: phone || "",
            accessCode,
            role: "user",
            idCardPhoto: idCardPhotoPath || undefined,
            ...userData,
          },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: {
            idCardPhoto: idCardPhotoPath || user.idCardPhoto,
            ...userData,
          },
        });
      }

      const registration = await tx.registration.create({
        data: {
          userId: user.id,
          registrationType: registrationType || "individual",
          paymentStatus: "pending",
          totalAmount: new Prisma.Decimal(String(amount ?? 0)),
          groupName: groupName || undefined,
        },
      });

      const participantRows: Array<{ registrationId: number; categoryId: number; jerseyId: number }> = [];

      for (const item of cartItems) {
        const categoryId = Number(item.categoryId);
        if (Number.isNaN(categoryId)) continue;

        if (item.type === "individual") {
          const jerseyId = (item.jerseySize && jerseyMap.get(item.jerseySize)) || defaultJerseyId;
          participantRows.push({ registrationId: registration.id, categoryId, jerseyId });
        } else if (item.type === "community" || item.type === "family") {
          const jerseysObj: Record<string, number> = item.jerseys || {};
          for (const [size, cnt] of Object.entries(jerseysObj)) {
            const count = Number(cnt) || 0;
            if (count <= 0) continue;
            const jerseyId = jerseyMap.get(size) || defaultJerseyId;
            for (let i = 0; i < count; i++) {
              participantRows.push({ registrationId: registration.id, categoryId, jerseyId });
            }
          }
        }
      }

      if (participantRows.length > 0) {
        await tx.participant.createMany({ data: participantRows });
      }

      const payment = await tx.payment.create({
        data: {
          registrationId: registration.id,
          transactionId: txId,
          proofOfPayment: proofPath,
          status: "pending",
          amount: new Prisma.Decimal(String(amount ?? 0)),
          proofSenderName: proofSenderName,
        },
      });

      return { registration, payment, userId: user.id };
    });

    console.log("[payments/base64] Transaction completed");

    // Post-transaction: bib numbers and QR codes
    const createdParticipants = await prisma.participant.findMany({
      where: { registrationId: result.registration.id },
      include: { category: true },
      orderBy: { id: "asc" },
    });

    for (const participant of createdParticipants) {
      const bibNumber = generateBibNumber(participant.category?.name, participant.id);
      await prisma.participant.update({
        where: { id: participant.id },
        data: { bibNumber },
      });
    }

    const grouped = createdParticipants.reduce((acc: Record<number, number>, r) => {
      const cid = r.categoryId ?? 0;
      acc[cid] = (acc[cid] || 0) + 1;
      return acc;
    }, {});

    const createdQrCodes: any[] = [];
    for (const [catIdStr, count] of Object.entries(grouped)) {
      const catId = Number(catIdStr);
      const token = `${result.registration.id}-${catId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const qr = await prisma.qrCode.create({
        data: {
          registrationId: result.registration.id,
          categoryId: catId,
          qrCodeData: token,
          totalPacks: count as number,      // CHANGED: use totalPacks instead of participantCount
          maxScans: count as number,         // CHANGED: set maxScans to the count
          scansRemaining: count as number,   // CHANGED: initialize scansRemaining to the count
        },
      });
      createdQrCodes.push(qr);
    }

    sendRegistrationEmail(email, fullName, result.registration.id).catch(console.error);

    return NextResponse.json({
      success: true,
      registrationId: result.registration.id,
      paymentId: result.payment.id,
      transactionId: txId,
      qrCodes: createdQrCodes,
    });
  } catch (err: any) {
    console.error("[payments/base64] Error:", err?.message || err);
    console.error("[payments/base64] Stack:", err?.stack);

    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A registration with this email already exists." }, { status: 409 });
    }

    if (err?.code === "P6005" || err?.message?.includes("15000ms")) {
      return NextResponse.json({ error: "Server is busy. Please try again." }, { status: 503 });
    }

    if (err?.message?.includes("Unknown argument")) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}