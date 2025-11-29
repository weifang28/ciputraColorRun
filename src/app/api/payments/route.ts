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
  console.log("[payments] POST endpoint called");

  try {
    const formData = await req.formData();

    // Extract fields
    const fullName = String(formData.get("fullName") || "");
    const email = String(formData.get("email") || "");
    const phone = String(formData.get("phone") || "");
    const birthDate = String(formData.get("birthDate") || "");
    const gender = String(formData.get("gender") || "");
    const currentAddress = String(formData.get("currentAddress") || "");
    const nationality = String(formData.get("nationality") || "");
    const emergencyPhone = String(formData.get("emergencyPhone") || "");
    const medicalHistory = String(formData.get("medicalHistory") || "");
    const medicationAllergy = String(formData.get("medicationAllergy") || "");
    const registrationType = String(formData.get("registrationType") || "individual");
    const amount = Number(formData.get("amount") || 0);
    const proofSenderName = String(formData.get("proofSenderName") || "").trim();
    const groupName = String(formData.get("groupName") || "").trim();
    const cartItemsJson = String(formData.get("items") || "");

    // CHANGED: Find existing user by full name (case-insensitive) - reuse if exists
    const existingUser = await prisma.user.findFirst({
      where: {
        name: {
          equals: fullName,
          mode: 'insensitive'
        }
      }
    });

    // MOVED: Generate txId and accessCode BEFORE file operations
    const txId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const accessCode = existingUser?.accessCode || await generateAccessCode(fullName);
    console.log("[payments] Step 1: Generated transaction ID:", txId);

    let proofPath: string | undefined;
    let idCardPhotoPath: string | undefined;

    // File handling and validation
    const proofFile = formData.get("proof") as File | null;
    const idCardPhotoFile = formData.get("idCardPhoto") as File | null;

    if (!proofFile) {
      return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
    }

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

    // Database transaction
    console.log("[payments] Step 7: Starting database transaction...");
    
    const result = await prisma.$transaction(async (tx) => {
      let user;
      
      if (existingUser) {
        // REUSE existing user and update their information
        console.log("[payments] Reusing existing user:", existingUser.id);
        user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            email: email || existingUser.email,
            phone: phone || existingUser.phone,
            idCardPhoto: idCardPhotoPath || existingUser.idCardPhoto,
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
        console.log("[payments] Creating new user with name:", fullName);
        user = await tx.user.create({
          data: {
            name: fullName,
            email: email || `temp_${txId}@temp.com`,
            phone: phone || "",
            accessCode,
            role: "user",
            idCardPhoto: idCardPhotoPath || undefined,
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
      console.log("[payments] User ID:", user.id);

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

    // RESTORED: Simple email notification that works
    const registeredUser = await prisma.user.findUnique({
      where: { id: result.userId }
    });

    if (registeredUser && registeredUser.email) {
      console.log("[payments] Sending registration confirmation email to:", registeredUser.email);
      
      // Send simple confirmation email directly here (no external API call)
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
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎉 Registration Received!</h1>
                  <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">Ciputra Color Run 2026</p>
                </div>

                <div style="padding: 32px 24px;">
                  <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">
                    Dear <strong>${registeredUser.name}</strong>,
                  </p>

                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px;">
                    Thank you for registering! We have received your registration and payment proof.
                  </p>

                  <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #065f46; font-size: 14px;">
                      <strong>Registration ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #047857;">#${result.registration.id}</span>
                    </p>
                  </div>

                  <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 3px solid #3b82f6; border-radius: 12px; padding: 28px; margin: 28px 0; text-align: center;">
                    <p style="margin: 0 0 16px 0; color: #1e40af; font-size: 15px; font-weight: 600;">🔑 YOUR ACCESS CODE</p>
                    <div style="background: #ffffff; border: 3px dashed #3b82f6; border-radius: 10px; padding: 20px; margin: 16px 0;">
                      <code style="font-size: 32px; font-weight: bold; color: #1e40af; font-family: 'Courier New', monospace; letter-spacing: 3px; display: block;">
                        ${registeredUser.accessCode}
                      </code>
                    </div>
                    <p style="margin: 16px 0 0 0; color: #1e40af; font-size: 14px;">
                      <strong>⚠️ Save this code!</strong><br>
                      Use it to check your payment status at <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login" style="color: #2563eb;">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login</a>
                    </p>
                  </div>

                  <div style="margin: 28px 0;">
                    <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold;">What happens next?</h3>
                    <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                      <li style="margin-bottom: 8px;">Our admin will verify your payment (usually within <strong>48 hours</strong>).</li>
                      <li style="margin-bottom: 8px;">Once approved, you'll receive a <strong>confirmation email with your QR code</strong>.</li>
                      <li style="margin-bottom: 8px;">You can check your payment status anytime using your access code above.</li>
                    </ol>
                  </div>

                  <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 24px; margin: 28px 0; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">💬</div>
                    <h3 style="margin: 0 0 8px 0; color: #065f46; font-size: 18px; font-weight: bold;">Join Our WhatsApp Group</h3>
                    <p style="margin: 0 0 16px 0; color: #047857; font-size: 14px;">Get event updates and connect with other participants!</p>
                    <a href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve" 
                       style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: bold; font-size: 15px;">
                      Join WhatsApp Group
                    </a>
                  </div>

                  <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
                    <p style="margin: 0 0 12px 0; color: #111827; font-weight: bold; font-size: 14px;">Need Help?</p>
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Contact our support team:</p>
                    <div style="margin-top: 12px;">
                      <p style="margin: 6px 0; color: #374151; font-size: 14px;">
                        <strong>📱 Abel</strong> — WhatsApp: <a href="https://wa.me/6289541031967" style="color: #059669; text-decoration: none;">0895410319676</a>
                      </p>
                      <p style="margin: 6px 0; color: #374151; font-size: 14px;">
                        <strong>📱 Elysian</strong> — WhatsApp: <a href="https://wa.me/62811306658" style="color: #059669; text-decoration: none;">0811306658</a>
                      </p>
                    </div>
                  </div>
                </div>

                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">© 2026 Ciputra Color Run. All rights reserved.</p>
                  <p style="margin: 0; color: #9ca3af; font-size: 11px;">This email was sent to ${registeredUser.email}</p>
                </div>
              </div>
            `,
          });
          
          console.log("[payments] Registration email sent successfully to:", registeredUser.email);
        } else {
          console.warn("[payments] Email credentials not configured");
        }
      } catch (emailError: any) {
        console.error("[payments] Failed to send registration email:", emailError?.message || emailError);
        // Don't fail the whole request if email fails
      }
    } else {
      console.warn("[payments] Cannot send email - no user email found");
    }

    return NextResponse.json({
      success: true,
      registrationId: result.registration.id,
      paymentId: result.payment.id,
      transactionId: txId,
      qrCodes: createdQrCodes,
    });

  } catch (err: any) {
    console.error("[payments] POST error:", err?.message || err);
    
    if (err?.code === 'P6005' || err?.message?.includes("15000ms")) {
      return NextResponse.json({ error: "Server is busy. Please try again." }, { status: 503 });
    }

    return NextResponse.json({ error: err?.message || "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}