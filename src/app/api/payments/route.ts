// src/app/api/payments/route.ts

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to ensure uploads directory exists
function ensureUploadsDir(subDir: string): string {
  const uploadsDir = path.join(process.cwd(), "uploads", subDir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

// Helper function to save file locally
async function saveFileLocally(file: File, subDir: string, fileName: string): Promise<string> {
  const uploadsDir = ensureUploadsDir(subDir);
  const filePath = path.join(uploadsDir, fileName);
  
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  
  // Return the API route path (not filesystem path)
  return `/api/uploads/${subDir}/${fileName}`;
}

// Helper function to upload to Cloudinary with local fallback
async function uploadImageWithFallback(
  file: File,
  cloudinaryFolder: string,
  localSubDir: string,
  fileId: string
): Promise<{ url: string; isLocal: boolean }> {
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${fileId}.${fileExt}`;

  // Try Cloudinary first
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
    
    const uploadResult = await cloudinary.uploader.upload(base64, {
      folder: cloudinaryFolder,
      public_id: fileId,
      resource_type: "image",
    });

    // Log with "C" prefix for Cloudinary
    console.log(`[C] Uploaded to Cloudinary: ${uploadResult.secure_url} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    return { url: uploadResult.secure_url, isLocal: false };
  } catch (cloudinaryErr: any) {
    console.warn(`[payments] Cloudinary upload failed, falling back to local storage:`, cloudinaryErr?.message || cloudinaryErr);
    
    // Fallback to local storage
    try {
      const localUrl = await saveFileLocally(file, localSubDir, fileName);
      // Log with "L" prefix for Local
      console.log(`[L] Saved locally: ${localUrl} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return { url: localUrl, isLocal: true };
    } catch (localErr: any) {
      console.error(`[payments] Local storage also failed:`, localErr);
      throw new Error(`Failed to upload image`);
    }
  }
}

/**
 * Generates a unique access code from a full name.
 */
async function generateAccessCode(
  fullName: string,
  prismaTx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >
): Promise<string> {
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
    const exists = await prismaTx.user.findUnique({ where: { accessCode: code } });
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

/**
 * Generate a bib number with category-based prefix and participant ID suffix.
 */
function generateBibNumber(categoryName: string | undefined, participantId: number): string {
  const catLower = (categoryName || "").toLowerCase().replace(/\s+/g, "");
  let prefix = "0";
  
  if (catLower.includes("3k") || catLower === "3km") {
    prefix = "3";
  } else if (catLower.includes("5k") || catLower === "5km") {
    prefix = "5";
  } else if (catLower.includes("10k") || catLower === "10km") {
    prefix = "10";
  }
  
  const paddedId = String(participantId).padStart(4, "0");
  return `${prefix}${paddedId}`;
}

async function sendRegistrationEmail(email: string | undefined, name: string | undefined, registrationId: number) {
  if (!email) return;
  
  try {
    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = Number(process.env.EMAIL_PORT || 465);
    const secure = (process.env.EMAIL_SECURE || "true") === "true";
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      console.warn("[sendRegistrationEmail] SMTP not configured");
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
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
          <p>We have received your payment proof and will verify it shortly. You will receive a confirmation email once your payment has been verified.</p>
          <p>In the meantime, please join our WhatsApp group for updates:</p>
          <a href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve" style="display: inline-block; background: #25D366; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Join WhatsApp Group</a>
          <br><br>
          <p>Best regards,<br>Ciputra Color Run Team</p>
        </div>
      `,
    });
    
    console.log(`[sendRegistrationEmail] Sent to ${email}`);
  } catch (err) {
    console.error("[sendRegistrationEmail] Failed:", err);
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
    const medicationAllergy = (form.get("medicationAllergy") as string) || undefined;
    const registrationType = (form.get("registrationType") as string) || "individual";
    const proofSenderName = (form.get("proofSenderName") as string) || undefined;
    const groupName = (form.get("groupName") as string) || undefined;

    if (!proofFile) {
      return NextResponse.json(
        { error: "Payment proof is required" },
        { status: 400 }
      );
    }

    // Check file size - reject if too large even for local storage
    const MAX_FILE_SIZE = 50_000_000; // 50MB absolute max
    if (proofFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 413 }
      );
    }

    const amount = amountStr !== undefined && amountStr !== "" ? Number(amountStr) : undefined;

    const txId =
      typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Upload proof image with fallback
    let proofPath: string;
    try {
      const result = await uploadImageWithFallback(
        proofFile,
        "ciputra-color-run/proofs",
        "proofs",
        `${txId}_proof`
      );
      proofPath = result.url;
    } catch (uploadErr: any) {
      console.error("[payments] All upload methods failed:", uploadErr);
      return NextResponse.json(
        { error: "Unable to process your upload. Please try again." },
        { status: 500 }
      );
    }

    // Upload ID card photo if provided (with fallback)
    let idCardPhotoPath: string | undefined;
    if (idCardPhotoFile) {
      try {
        const result = await uploadImageWithFallback(
          idCardPhotoFile,
          "ciputra-color-run/id-cards",
          "id-cards",
          `${txId}_id`
        );
        idCardPhotoPath = result.url;
      } catch (uploadErr) {
        console.error("[payments] ID card upload failed:", uploadErr);
        // Don't fail the entire request, just log the error
      }
    }

    // parse cart items JSON (if provided)
    let cartItems: any[] = [];
    if (cartItemsJson) {
      try {
        cartItems = JSON.parse(cartItemsJson);
      } catch (e) {
        console.warn("[payments] Failed to parse cartItems:", e);
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
            medicationAllergy: medicationAllergy || undefined,
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
            medicationAllergy: medicationAllergy || undefined,
          },
        });
      }

      // create registration
      const registration = await prismaTx.registration.create({
        data: {
          userId: user.id,
          registrationType,
          paymentStatus: "pending",
          totalAmount: new Prisma.Decimal(String(amount ?? 0)),
          groupName: groupName || undefined,
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
            const jId = jOpt?.id ?? 1;
            for (let i = 0; i < count; i++) {
              participantRows.push({
                registrationId: registration.id,
                categoryId,
                jerseyId: jId,
              });
            }
          }
        }
      }

      if (participantRows.length > 0) {
        await prismaTx.participant.createMany({ data: participantRows });
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

      // Create EarlyBirdClaim when applicable (for individual registrations)
      if (registrationType === "individual") {
        for (const item of cartItems || []) {
          if (item.useEarlyBird === true) {
            const catId = Number(item.categoryId);
            if (!Number.isNaN(catId)) {
              const toCreate = item.type === "individual" ? 1 : Number(item.participants || 0);
              if (toCreate > 0) {
                await prismaTx.earlyBirdClaim.createMany({
                  data: Array.from({ length: toCreate }, () => ({ categoryId: catId })),
                });
              }
            }
          }
        }
      }

      // Group participants by category to create QR codes
      const grouped = createdParticipants.reduce((acc: Record<number, number>, r: any) => {
        const cid = typeof r.categoryId === "number" ? r.categoryId : 0;
        acc[cid] = (acc[cid] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const createdQrCodes: any[] = [];
      for (const [catIdStr, count] of Object.entries(grouped)) {
        const catId = Number(catIdStr);
        const token = `${registration.id}-${catId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const qr = await prismaTx.qrCode.create({
          data: {
            registrationId: registration.id,
            categoryId: catId,
            qrCodeData: token,
            participantCount: count as number,
          },
        });
        createdQrCodes.push(qr);
      }

      // Create payment record
      const paymentData: any = {
        registrationId: registration.id,
        transactionId: txId,
        proofOfPayment: proofPath,
        status: "pending",
        amount: new Prisma.Decimal(String(amount ?? 0)),
        proofSenderName: proofSenderName,
      };

      if (amount !== undefined && !Number.isNaN(amount)) {
        paymentData.amount = new Prisma.Decimal(String(amount));
      }

      const payment = await prismaTx.payment.create({ data: paymentData });

      return { registration, payment, createdQrCodes };
    }

    const { registration, payment, createdQrCodes } = await prisma.$transaction(
      createRegistrationAndPayment,
      { timeout: 30000 }
    );

    // Fire-and-forget email
    sendRegistrationEmail(email, fullName, registration.id).catch(console.error);

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      paymentId: payment.id,
      transactionId: txId,
      qrCodes: createdQrCodes,
    });
  } catch (err: any) {
    console.error("[payments] POST error:", err);
    // Return generic error message to user, log detailed error to console
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}