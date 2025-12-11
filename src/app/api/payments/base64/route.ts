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

    // Helper: normalize a name for robust comparison
    function normalizeName(n?: string | null) {
      const s = String(n || "");
      // NFD + strip combining marks (diacritics), collapse whitespace, trim, lower-case
      return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    // First try an exact email+name match (case-insensitive) to ensure reuse when both match
    const normalizedFullName = fullName.trim();
    let existingUser = null;
    if (email && normalizedFullName) {
      existingUser = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          name: { equals: normalizedFullName, mode: "insensitive" },
        },
      });
    }

    // Fallback to prior behavior if no exact match found
    if (!existingUser) {
      const existingByEmail = email
        ? await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })
        : null;

      if (existingByEmail) {
        if (normalizeName(existingByEmail.name) === normalizeName(fullName)) {
          existingUser = existingByEmail;
        } else {
          console.warn("[payments/base64] Email exists with different name; creating a separate user:", existingByEmail.email, "existingName:", existingByEmail.name);
          existingUser = undefined;
        }
      } else {
        const existingByName = await prisma.user.findFirst({
          where: { name: { equals: fullName, mode: "insensitive" } },
        });
        existingUser = existingByName && (!email || (existingByName.email === email)) ? existingByName : undefined;
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

    // Debug: log cart shape so we can see why items might be missing
    console.log("[payments/base64] cartItems:", Array.isArray(cartItems) ? cartItems.length : typeof cartItems, cartItems);

    const jerseyOptions = await prisma.jerseyOption.findMany();
    // avoid implicit any by typing the map callback param
    const jerseyMap = new Map(jerseyOptions.map((j: any) => [j.size, j.id]));
    const defaultJerseyId = jerseyOptions[0]?.id ?? 1;

    const accessCode = existingUser?.accessCode || await generateAccessCode(fullName || "user");

    console.log("[payments/base64] Starting transaction...");
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      // Create a registration & payment per cart item so each item keeps its own groupName/registrationType
      const createdRegistrations: Array<{ id: number; totalAmount: string }> = [];
      const allParticipantRows: Array<{ registrationId: number; categoryId: number; jerseyId: number }> = [];
      const earlyBirdClaims: Array<{ categoryId: number }> = [];
      const createdPayments: Array<any> = [];

      for (const item of cartItems) {
        const categoryId = Number(item.categoryId);
        if (Number.isNaN(categoryId)) {
          console.warn("[payments/base64] Invalid categoryId, skipping item:", item);
          continue;
        }

        // compute per-item total (trust client-provided price/charges)
        const itemPrice = Number(item.price || 0);
        const itemJerseyCharges = Number(item.jerseyCharges || 0);
        let itemTotal = 0;
        if (item.type === "individual") {
          itemTotal = itemPrice + itemJerseyCharges;
        } else {
          const cnt = Number(item.participants ?? item.participantCount ?? item.count ?? 0) || 0;
          itemTotal = (itemPrice * cnt) + itemJerseyCharges;
        }

        const reg = await tx.registration.create({
          data: {
            userId: user.id,
            registrationType: item.type,
            // Prefer per-item groupName, fallback to top-level groupName
            groupName: (item as any)?.groupName
              ? String((item as any).groupName).trim() || undefined
              : (groupName ? String(groupName).trim() || undefined : undefined),
            totalAmount: new Prisma.Decimal(String(itemTotal)),
            paymentStatus: "pending",
          },
        });
        createdRegistrations.push({ id: reg.id, totalAmount: String(itemTotal) });
        console.log("[payments/base64] Created registration for item:", item.type, "regId:", reg.id);

        // build participants for this registration
        if (item.type === "individual") {
          const jerseyId = (item.jerseySize && jerseyMap.get(item.jerseySize)) || defaultJerseyId;
          allParticipantRows.push({ registrationId: reg.id, categoryId, jerseyId });

          const category = await tx.raceCategory.findUnique({ where: { id: categoryId } });
          if (category?.earlyBirdPrice && category?.earlyBirdCapacity) {
            const currentClaims = await tx.earlyBirdClaim.count({ where: { categoryId } });
            if (currentClaims < category.earlyBirdCapacity) earlyBirdClaims.push({ categoryId });
          }
        } else if (item.type === "community" || item.type === "family") {
          const jerseysObj: Record<string, number> = item.jerseys || {};
          const jerseyEntries = Object.entries(jerseysObj).map(([k, v]) => [k, Number(v || 0)] as [string, number]);
          const totalFromJerseys = jerseyEntries.reduce((s, [, c]) => s + c, 0);
          let participantCount = Number(item.participants ?? item.participantCount ?? item.count ?? 0);
          if (item.type === "family" && (!participantCount || participantCount <= 0)) {
            participantCount = Number(item.participants || 4) || 4;
          }

          if (totalFromJerseys > 0) {
            // Use explicit jersey counts first
            for (const [size, count] of jerseyEntries) {
              if (count <= 0) continue;
              const jerseyId = jerseyMap.get(size) || defaultJerseyId;
              for (let i = 0; i < count; i++) {
                allParticipantRows.push({ registrationId: reg.id, categoryId, jerseyId });
              }
            }
            // Fill remaining participants with default jersey if necessary
            const remaining = Math.max(0, participantCount - totalFromJerseys);
            if (remaining > 0) {
              const jerseyId = defaultJerseyId;
              for (let i = 0; i < remaining; i++) {
                allParticipantRows.push({ registrationId: reg.id, categoryId, jerseyId });
              }
            }
          } else if (participantCount > 0) {
            // No jersey map provided — create participants with default jersey
            const jerseyId = defaultJerseyId;
            for (let i = 0; i < participantCount; i++) {
              allParticipantRows.push({ registrationId: reg.id, categoryId, jerseyId });
            }
          } else {
            console.warn("[payments/base64] Skipping community/family item because no jerseys and no participants:", item);
          }
        } else {
          console.warn("[payments/base64] Unknown item.type, skipping item:", item);
        }

        // create payment for this registration
        // const pay = await tx.payment.create({
        //   data: {
        //     registrationId: reg.id,
        //     transactionId: txId,
        //     proofOfPayment: proofUrl,
        //     status: "pending",
        //     amount: new Prisma.Decimal(String(itemTotal)),
        //     proofSenderName: proofSenderName,
        //   },
        // });
        // createdPayments.push(pay);
        // NOTE: Do NOT create per-registration payments here.        // We create one transaction-level payment after the loop and attach it to all created registrations.
       }
 
       // bulk create participants
       if (allParticipantRows.length > 0) {
         await tx.participant.createMany({ data: allParticipantRows });
       }
 
       if (earlyBirdClaims.length > 0) {
         await tx.earlyBirdClaim.createMany({ data: earlyBirdClaims });
         console.log("[payments/base64] Created early bird claims:", earlyBirdClaims.length);
       }
 
       // After loop: create one transaction-level payment and attach it to registrations
       const totalTxAmount = createdRegistrations.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
       const payment = await tx.payment.create({
         data: {
           transactionId: txId,
           proofOfPayment: proofUrl,
           status: "pending",
           amount: new Prisma.Decimal(String(totalTxAmount)),
           proofSenderName: proofSenderName,
         },
       });
       if (createdRegistrations.length > 0) {
         for (const r of createdRegistrations) {
           await tx.registration.update({
             where: { id: r.id },
             data: { paymentId: payment.id },
           });
         }
       }
       createdPayments.push(payment);
 
       return { registrations: createdRegistrations, payments: createdPayments, userId: user.id };
     });
 
     console.log("[payments/base64] Transaction completed");

    // Use all created registration IDs to generate QR codes
    const createdRegistrationIds = (result.registrations || []).map((r: any) => Number(r.id));
    const createdParticipants = await prisma.participant.findMany({
      where: { registrationId: { in: createdRegistrationIds } },
      include: { category: true },
      orderBy: { id: "asc" },
    });

    // Group by registrationId + categoryId to create QR per-registration
    const groupedByRegAndCat: Record<string, number> = {};
    for (const p of createdParticipants) {
      const key = `${p.registrationId}:${p.categoryId ?? 0}`;
      groupedByRegAndCat[key] = (groupedByRegAndCat[key] || 0) + 1;
    }

    const createdQrCodes: any[] = [];
    for (const [key, count] of Object.entries(groupedByRegAndCat)) {
      const [regIdStr, catIdStr] = key.split(":");
      const regId = Number(regIdStr);
      const catId = Number(catIdStr);
      const token = `${regId}-${catId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const qr = await prisma.qrCode.create({
        data: {
          registrationId: regId,
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
 

          const regListHtml = (result.registrations || []).map((r: any) => `<li>#${r.id} — Rp ${Number(r.totalAmount).toLocaleString('id-ID')}</li>`).join("");

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
                  <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">Dear <strong>${registeredUser.name}</strong>,</p>
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px;">Thank you for registering! We have received your registration and payment proof.</p>
                  <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #065f46; font-size: 14px;"><strong>Registrations:</strong></p>
                    <ul style="margin:8px 0 0 16px; color:#065f46">${regListHtml}</ul>
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
      registrations: result.registrations,
      payments: result.payments,
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