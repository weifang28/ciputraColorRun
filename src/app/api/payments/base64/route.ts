// src/app/api/payments/base64/route.ts
// This endpoint accepts JSON with base64-encoded images to bypass nginx body size limits

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function ensureUploadsDir(subDir: string): string {
  const uploadsDir = path.join(process.cwd(), "uploads", subDir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
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

export async function POST(req: Request) {
  const body = await req.json();
  const fullName = String(body.fullName || "");
  const email = String(body.email || "").trim();
  const forceCreate = Boolean(body.forceCreate);

  try {
    const {
      proofUrl,
      idCardUrl,
      items,
      amount,
      phone,                 // <-- added
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

    if (!proofUrl) {
      return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
    }

    // Prefer lookup by email first (use findFirst because email is not guaranteed unique)
    const existingByEmail = email ? await prisma.user.findFirst({ where: { email } }) : null;
    let existingUser;
    // Reuse only when email exists AND names match (case-insensitive)
    if (existingByEmail && existingByEmail.name && existingByEmail.name.toLowerCase() === (fullName || "").toLowerCase()) {
      existingUser = existingByEmail;
    } else {
      // Do not block on email/name mismatch — create a separate user in that case.
      const existingByName = await prisma.user.findFirst({
        where: {
          name: { equals: fullName, mode: 'insensitive' }
        }
      });
      existingUser = existingByName && (!email || (existingByName.email === email)) ? existingByName : undefined;

      if (existingByEmail && existingByEmail.name && existingByEmail.name.toLowerCase() !== (fullName || "").toLowerCase()) {
        // Log for audit/debug but proceed to create a new user as requested
        console.warn("[payments/base64] Email exists with different name; creating a separate user:", existingByEmail.email, "existingName:", existingByEmail.name);
      }
    }

    const txId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    let cartItems: any[] = [];
    if (items) {
      try {
        cartItems = typeof items === "string" ? JSON.parse(items) : items;
      } catch (e) {
        console.warn("[payments/base64] Failed to parse items:", e);
      }
    }

    const jerseyOptions = await prisma.jerseyOption.findMany();
    const jerseyMap = new Map(jerseyOptions.map((j) => [j.size, j.id]));
    const defaultJerseyId = jerseyOptions[0]?.id ?? 1;

    const accessCode = existingUser?.accessCode || await generateAccessCode(fullName || "user");

    console.log("[payments/base64] Starting transaction...");
    const result = await prisma.$transaction(async (tx) => {
      let user;
      
      if (existingUser) {
        // REUSE existing user and update their information
        console.log("[payments/base64] Reusing existing user:", existingUser.id);
        user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            email: email || existingUser.email,
            phone: phone || existingUser.phone,
            idCardPhoto: idCardUrl || existingUser.idCardPhoto,
            birthDate: birthDate ? new Date(birthDate) : existingUser.birthDate,
            gender: gender || existingUser.gender,
            currentAddress: currentAddress || existingUser.currentAddress,
            nationality: nationality || existingUser.nationality,
            emergencyPhone: emergencyPhone || existingUser.emergencyPhone,
            medicalHistory: medicalHistory || existingUser.medicalHistory,
            medicationAllergy: medicationAllergy || existingUser.medicationAllergy,
          },
        });
      } else {
        // CREATE new user if name doesn't exist
        console.log("[payments/base64] Creating new user with name:", fullName);
        user = await tx.user.create({
          data: {
            name: fullName,
            email: email || `temp_${txId}@temp.com`,
            phone: phone || "",
            accessCode,
            role: "user",
            idCardPhoto: idCardUrl || undefined,
            birthDate: birthDate ? new Date(birthDate) : undefined,
            gender: gender || undefined,
            currentAddress: currentAddress || undefined,
            nationality: nationality || undefined,
            emergencyPhone: emergencyPhone || undefined,
            medicalHistory: medicalHistory || undefined,
            medicationAllergy: medicationAllergy || undefined,
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
      }

      // NEW: Create early bird claims
      if (earlyBirdClaims.length > 0) {
        await tx.earlyBirdClaim.createMany({
          data: earlyBirdClaims
        });
        console.log("[payments/base64] Created early bird claims:", earlyBirdClaims.length);
      }

      const payment = await tx.payment.create({
        data: {
          registrationId: registration.id,
          transactionId: txId,
          proofOfPayment: proofUrl,
          status: "pending",
          amount: new Prisma.Decimal(String(amount ?? 0)),
          proofSenderName: proofSenderName,
        },
      });

      return { registration, payment, userId: user.id };
    });

    console.log("[payments/base64] Transaction completed");

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
          totalPacks: count as number,
          maxScans: count as number,
          scansRemaining: count as number,
        },
      });
      createdQrCodes.push(qr);
    }

    // RESTORED: Simple email notification that works
    const registeredUser = await prisma.user.findUnique({
      where: { id: result.userId }
    });

    if (registeredUser && registeredUser.email) {
      console.log("[payments/base64] Sending registration confirmation email to:", registeredUser.email);
      
      try {
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;
        
        if (emailUser && emailPass) {
          const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT),
            secure: (process.env.EMAIL_SECURE) === "true",
            auth: { user: emailUser, pass: emailPass },
          });

          await transporter.sendMail({
            from: `"Ciputra Color Run 2026" <${emailUser}>`,
            to: registeredUser.email,
            subject: "🎉 Registration Received — Ciputra Color Run 2026",
            html: `
              <!-- Same HTML as above -->
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎉 Registration Received!</h1>
                  <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">Ciputra Color Run 2026</p>
                </div>
                <div style="padding: 32px 24px;">
                  <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">Dear <strong>${registeredUser.name}</strong>,</p>
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px;">Thank you for registering! We have received your registration and payment proof.</p>
                  <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #065f46; font-size: 14px;"><strong>Registration ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #047857;">#${result.registration.id}</span></p>
                  </div>
                  <div style="background: linear-gradient(135deg, #cbe7d1 0%, #efc6c9 100%); border: 3px solid #3b82f6; border-radius: 12px; padding: 28px; margin: 28px 0; text-align: center;">
                    <p style="margin: 0 0 16px 0; color: #1e40af; font-size: 15px; font-weight: 600;">🔑 YOUR ACCESS CODE</p>
                    <div style="background: #ffffff; border: 3px dashed #3b82f6; border-radius: 10px; padding: 20px; margin: 16px 0;">
                      <code style="font-size: 32px; font-weight: bold; color: #1e40af; font-family: 'Courier New', monospace; letter-spacing: 3px; display: block;">${registeredUser.accessCode}</code>
                    </div>
                    <p style="margin: 16px 0 0 0; color: #1e40af; font-size: 14px;"><strong>⚠️ Save this code!</strong><br>Use it to check your payment status at <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login" style="color: #2563eb;">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login</a></p>
                  </div>
                  <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 24px; margin: 28px 0; text-align: center;">
                    <a href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve" style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: bold;">Join WhatsApp Group</a>
                  </div>
                </div>
              </div>
            `,
          });
          
          console.log("[payments/base64] Registration email sent successfully");
        }
      } catch (emailError: any) {
        console.error("[payments/base64] Email error:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      registrationId: result.registration.id,
      paymentId: result.payment.id,
      transactionId: txId,
      qrCodes: createdQrCodes,
    });
  } catch (err: any) {
    console.error("[payments/base64] Error:", err?.message || err);

    if (err?.code === "P6005" || err?.message?.includes("15000ms")) {
      return NextResponse.json({ error: "Server is busy. Please try again." }, { status: 503 });
    }

    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}