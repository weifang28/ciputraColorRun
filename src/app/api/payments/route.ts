// src/app/api/payments/route.ts

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
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

// Helper function to ensure uploads directory exists
function ensureUploadsDir(subDir: string): string {
  const uploadsDir = path.join(process.cwd(), "uploads", subDir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

// Save file locally and return API path
async function saveFileLocally(file: File, subDir: string, fileName: string): Promise<string> {
  try {
    const uploadsDir = ensureUploadsDir(subDir);
    const filePath = path.join(uploadsDir, fileName);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    
    const apiPath = `/api/uploads/${subDir}/${fileName}`;
    console.log(`[saveFileLocally] Saved: ${apiPath} (${(file.size / 1024).toFixed(0)}KB)`);
    return apiPath;
  } catch (err: any) {
    console.error(`[saveFileLocally] Error:`, err?.message || err);
    throw new Error(`Failed to save file locally: ${err?.message || 'Unknown error'}`);
  }
}

async function generateAccessCode(fullName: string): Promise<string> {
  // Extract first name (first word before space)
  const firstName = (fullName || "user")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)[0] || "user";

  // Generate random string (8 characters: mix of letters and numbers)
  const randomStr = Math.random().toString(36).substring(2, 10);
  
  const accessCode = `${firstName}_${randomStr}`;
  
  // Check if code already exists (very unlikely but good practice)
  const exists = await prisma.user.findUnique({ where: { accessCode } });
  
  if (exists) {
    // If by chance it exists, add timestamp
    return `${firstName}_${randomStr}_${Date.now().toString(36)}`;
  }
  
  return accessCode;
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

    if (!proofFile) {
      return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
    }

    const amount = amountStr ? Number(amountStr) : undefined;
    const txId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Save proof image locally
    console.log("[payments] Step 2: Saving proof image locally...");
    const proofExt = proofFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const proofFileName = `${txId}_proof.${proofExt}`;
    proofPath = await saveFileLocally(proofFile, "proofs", proofFileName);

    // Save ID card if provided
    if (idCardPhotoFile) {
      console.log("[payments] Step 3: Saving ID card locally...");
      const idExt = idCardPhotoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const idFileName = `${txId}_id.${idExt}`;
      idCardPhotoPath = await saveFileLocally(idCardPhotoFile, "id-cards", idFileName);
    }

    // Parse cart items
    console.log("[payments] Step 4: Parsing cart items...");
    let cartItems: any[] = [];
    if (cartItemsJson) {
      try {
        cartItems = JSON.parse(cartItemsJson);
      } catch (e) {
        console.warn("[payments] Failed to parse cartItems:", e);
      }
    }

    // Pre-fetch jersey options
    console.log("[payments] Step 5: Pre-fetching jersey options...");
    const jerseyOptions = await prisma.jerseyOption.findMany();
    const jerseyMap = new Map(jerseyOptions.map(j => [j.size, j.id]));
    const defaultJerseyId = jerseyOptions[0]?.id ?? 1;

    // Generate access code
    console.log("[payments] Step 6: Generating access code...");
    const accessCode = await generateAccessCode(fullName || "user");

    // Database transaction
    console.log("[payments] Step 7: Starting database transaction...");
    
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

      const participantRows: Array<{ registrationId: number; categoryId: number; jerseyId: number }> = [];

      // NEW: Track early bird claims
      const earlyBirdClaims: Array<{ categoryId: number }> = [];

      for (const item of cartItems) {
        const categoryId = Number(item.categoryId);
        if (Number.isNaN(categoryId)) continue;

        if (item.type === "individual") {
          const jerseyId = (item.jerseySize && jerseyMap.get(item.jerseySize)) || defaultJerseyId;
          participantRows.push({ registrationId: registration.id, categoryId, jerseyId });
          
          // NEW: Check if this is early bird pricing and claim it
          const category = await tx.raceCategory.findUnique({ where: { id: categoryId } });
          if (category?.earlyBirdPrice && category?.earlyBirdCapacity) {
            const currentClaims = await tx.earlyBirdClaim.count({ where: { categoryId } });
            if (currentClaims < category.earlyBirdCapacity) {
              earlyBirdClaims.push({ categoryId });
            }
          }
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
        console.log("[payments] Created participants:", participantRows.length);
      }

      // NEW: Create early bird claims
      if (earlyBirdClaims.length > 0) {
        await tx.earlyBirdClaim.createMany({
          data: earlyBirdClaims
        });
        console.log("[payments] Created early bird claims:", earlyBirdClaims.length);
      }

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

    // Post-transaction: bib numbers and QR codes
    console.log("[payments] Step 8: Assigning bib numbers and creating QR codes...");
    
    const createdParticipants = await prisma.participant.findMany({
      where: { registrationId: result.registration.id },
      include: { category: true },
      orderBy: { id: 'asc' },
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
          totalPacks: count as number,
          maxScans: count as number,
          scansRemaining: count as number,
        },
      });
      createdQrCodes.push(qr);
    }
    console.log("[payments] Created QR codes:", createdQrCodes.length);

    // Send email notification via dedicated endpoint
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify/submission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email, 
        name: fullName,
        registrationId: result.registration.id 
      }),
    }).catch(err => console.error("[payments] Email notification failed:", err));

    return NextResponse.json({
      success: true,
      registrationId: result.registration.id,
      paymentId: result.payment.id,
      transactionId: txId,
      qrCodes: createdQrCodes,
    });

  } catch (err: any) {
    console.error("[payments] POST error:", err?.message || err);
    
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: "A registration with this email already exists." },
        { status: 409 }
      );
    }
    
    if (err?.code === 'P6005' || err?.message?.includes('15000ms')) {
      return NextResponse.json(
        { error: "Server is busy. Please try again in a moment." },
        { status: 503 }
      );
    }

    if (err?.message?.includes('Unknown argument')) {
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