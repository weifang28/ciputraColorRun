// src/app/api/payments/route.ts

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Use singleton pattern for Prisma to avoid connection issues
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Configure Cloudinary (only if credentials exist)
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
  try {
    const uploadsDir = ensureUploadsDir(subDir);
    const filePath = path.join(uploadsDir, fileName);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    
    const apiPath = `/api/uploads/${subDir}/${fileName}`;
    console.log(`[L] Saved locally: ${apiPath} (${(file.size / 1024).toFixed(0)}KB)`);
    return apiPath;
  } catch (err: any) {
    console.error(`[saveFileLocally] Error:`, err?.message || err);
    throw new Error(`Failed to save file locally: ${err?.message || 'Unknown error'}`);
  }
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

  // Try Cloudinary first (only if configured)
  if (cloudinaryConfigured) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
      
      const uploadResult = await cloudinary.uploader.upload(base64, {
        folder: cloudinaryFolder,
        public_id: fileId,
        resource_type: "image",
      });

      console.log(`[C] Uploaded to Cloudinary: ${uploadResult.secure_url} (${(file.size / 1024).toFixed(0)}KB)`);
      return { url: uploadResult.secure_url, isLocal: false };
    } catch (cloudinaryErr: any) {
      console.warn(`[payments] Cloudinary upload failed:`, cloudinaryErr?.message || cloudinaryErr);
    }
  } else {
    console.log(`[payments] Cloudinary not configured, using local storage`);
  }

  // Fallback to local storage
  const localUrl = await saveFileLocally(file, localSubDir, fileName);
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
    if (!user || !pass) {
      console.warn("[sendRegistrationEmail] SMTP not configured");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: (process.env.EMAIL_SECURE) === "true",
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
    console.log(`[sendRegistrationEmail] Sent to ${email}`);
  } catch (err) {
    console.error("[sendRegistrationEmail] Failed:", err);
  }
}

export async function POST(req: Request) {
  console.log("[payments] POST request received");
  
  let proofPath: string | undefined;
  let idCardPhotoPath: string | undefined;
  
  try {
    // Step 1: Parse form data
    console.log("[payments] Step 1: Parsing form data...");
    const form = await req.formData();
    
    const proofFile = form.get("proof") as File | null;
    const idCardPhotoFile = form.get("idCardPhoto") as File | null;
    const cartItemsJson = (form.get("items") as string) || (form.get("cartItems") as string) || undefined;
    const amountStr = (form.get("amount") as string) || undefined;
    
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

    console.log("[payments] Form parsed:", { 
      hasProof: !!proofFile, 
      proofSize: proofFile?.size,
      fullName, 
      email 
    });

    if (!proofFile) {
      return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
    }

    const amount = amountStr ? Number(amountStr) : undefined;
    const txId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Step 2: Upload proof image (BEFORE transaction to reduce transaction time)
    console.log("[payments] Step 2: Uploading proof image...");
    try {
      const result = await uploadImageWithFallback(
        proofFile,
        "ciputra-color-run/proofs",
        "proofs",
        `${txId}_proof`
      );
      proofPath = result.url;
      console.log("[payments] Proof uploaded:", proofPath);
    } catch (uploadErr: any) {
      console.error("[payments] Proof upload failed:", uploadErr);
      return NextResponse.json(
        { error: "Failed to upload payment proof. Please try again." },
        { status: 500 }
      );
    }

    // Step 3: Upload ID card if provided (BEFORE transaction)
    if (idCardPhotoFile) {
      console.log("[payments] Step 3: Uploading ID card...");
      try {
        const result = await uploadImageWithFallback(
          idCardPhotoFile,
          "ciputra-color-run/id-cards",
          "id-cards",
          `${txId}_id`
        );
        idCardPhotoPath = result.url;
        console.log("[payments] ID card uploaded:", idCardPhotoPath);
      } catch (uploadErr) {
        console.warn("[payments] ID card upload failed (non-fatal):", uploadErr);
      }
    }

    // Step 4: Parse cart items (BEFORE transaction)
    console.log("[payments] Step 4: Parsing cart items...");
    let cartItems: any[] = [];
    if (cartItemsJson) {
      try {
        cartItems = JSON.parse(cartItemsJson);
        console.log("[payments] Cart items:", cartItems.length);
      } catch (e) {
        console.warn("[payments] Failed to parse cartItems:", e);
      }
    }

    // Step 5: Pre-fetch jersey options BEFORE transaction to reduce transaction time
    console.log("[payments] Step 5: Pre-fetching jersey options...");
    const jerseyOptions = await prisma.jerseyOption.findMany();
    const jerseyMap = new Map(jerseyOptions.map(j => [j.size, j.id]));
    const defaultJerseyId = jerseyOptions[0]?.id ?? 1;

    // Step 6: Generate access code BEFORE transaction
    console.log("[payments] Step 6: Generating access code...");
    const accessCode = await generateAccessCode(fullName || "user");

    // Step 7: Database transaction - OPTIMIZED for Prisma Accelerate's 15s limit
    // Remove timeout option as Accelerate enforces its own limit
    console.log("[payments] Step 7: Starting database transaction...");
    
    const result = await prisma.$transaction(async (tx) => {
      // Find or create user
      let user = email ? await tx.user.findUnique({ where: { email } }) : null;

      // Build user data object - only include medicationAllergy if schema supports it
      const userData: any = {
        birthDate: birthDate ? new Date(birthDate) : undefined,
        gender: gender || undefined,
        currentAddress: currentAddress || undefined,
        nationality: nationality || undefined,
        emergencyPhone: emergencyPhone || undefined,
        medicalHistory: medicalHistory || undefined,
      };

      // Only add medicationAllergy if it's defined (schema might not have it yet)
      if (medicationAllergy !== undefined) {
        userData.medicationAllergy = medicationAllergy;
      }

      if (!user) {
        user = await tx.user.create({
          data: {
            name: fullName,
            email: email || `temp_${txId}@temp.com`, // Fallback email
            phone: phone || "",
            accessCode,
            role: "user",
            idCardPhoto: idCardPhotoPath || undefined,
            ...userData,
          },
        });
        console.log("[payments] Created user:", user.id);
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: {
            idCardPhoto: idCardPhotoPath || user.idCardPhoto,
            ...userData,
          },
        });
        console.log("[payments] Updated user:", user.id);
      }

      // Create registration
      const registration = await tx.registration.create({
        data: {
          userId: user.id,
          registrationType,
          paymentStatus: "pending",
          totalAmount: new Prisma.Decimal(String(amount ?? 0)),
          groupName: groupName || undefined,
        },
      });
      console.log("[payments] Created registration:", registration.id);

      // Build participant rows using pre-fetched jersey data
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

      // Batch create participants
      if (participantRows.length > 0) {
        await tx.participant.createMany({ data: participantRows });
        console.log("[payments] Created participants:", participantRows.length);
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          registrationId: registration.id,
          transactionId: txId,
          proofOfPayment: proofPath!,
          status: "pending",
          amount: new Prisma.Decimal(String(amount ?? 0)),
          proofSenderName: proofSenderName,
        },
      });
      console.log("[payments] Created payment:", payment.id);

      return { registration, payment, userId: user.id };
    });

    console.log("[payments] Transaction completed successfully");

    // Step 8: Post-transaction operations (bib numbers, QR codes) - OUTSIDE transaction
    console.log("[payments] Step 8: Assigning bib numbers and creating QR codes...");
    
    const createdParticipants = await prisma.participant.findMany({
      where: { registrationId: result.registration.id },
      include: { category: true },
      orderBy: { id: 'asc' },
    });

    // Update bib numbers (can be done outside transaction)
    for (const participant of createdParticipants) {
      const bibNumber = generateBibNumber(participant.category?.name, participant.id);
      await prisma.participant.update({
        where: { id: participant.id },
        data: { bibNumber },
      });
    }

    // Create QR codes (can be done outside transaction)
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
    console.log("[payments] Created QR codes:", createdQrCodes.length);

    // Fire-and-forget email
    sendRegistrationEmail(email, fullName, result.registration.id).catch(console.error);

    return NextResponse.json({
      success: true,
      registrationId: result.registration.id,
      paymentId: result.payment.id,
      transactionId: txId,
      qrCodes: createdQrCodes,
    });

  } catch (err: any) {
    console.error("[payments] POST error:", err?.message || err);
    console.error("[payments] Error stack:", err?.stack);
    console.error("[payments] Error code:", err?.code);
    
    // Check for specific Prisma errors
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: "A registration with this email already exists." },
        { status: 409 }
      );
    }
    
    if (err?.code === 'P2024' || err?.code === 'P6005' || err?.message?.includes('timed out') || err?.message?.includes('15000ms')) {
      return NextResponse.json(
        { error: "Server is busy. Please try again in a moment." },
        { status: 503 }
      );
    }

    // Handle unknown field errors (like medicationAllergy not existing)
    if (err?.message?.includes('Unknown argument')) {
      console.error("[payments] Schema mismatch - run prisma migrate");
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}