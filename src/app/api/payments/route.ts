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
    const email = String(formData.get("email") || "").trim();
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
    const itemsJson = String(formData.get("items") || "");
    const forceCreate = String(formData.get("forceCreate") || "") === "true";

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

    // Fallback: if no exact email+name match, keep previous logic
    if (!existingUser) {
      const existingByEmail = email
        ? await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })
        : null;

      if (existingByEmail) {
        if (normalizeName(existingByEmail.name) === normalizeName(fullName)) {
          existingUser = existingByEmail;
        } else {
          console.warn("[payments] Email exists with different name; creating a separate user:", existingByEmail.email, "existingName:", existingByEmail.name);
          existingUser = undefined;
        }
      } else {
        const existingByName = await prisma.user.findFirst({
          where: { name: { equals: fullName, mode: "insensitive" } },
        });
        existingUser = existingByName && (!email || (existingByName.email === email)) ? existingByName : undefined;
      }
    }

    // MOVED: Generate txId and accessCode BEFORE file operations
    const txId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const accessCode = existingUser?.accessCode || await generateAccessCode(fullName);
    console.log("[payments] Step 1: Generated transaction ID:", txId);

    let proofPath: string | undefined;
    let idCardPhotoPath: string | undefined;

    // File handling and validation
    const proofFile = formData.get("proof") as File | null;
    const idCardPhotoFile = formData.get("idCardPhoto") as File | null;

    // Support existing uploaded ID URL sent from the client (no File)
    const existingIdCardUrl = String(formData.get("existingIdCardUrl") || "").trim();

    if (!proofFile) {
      return NextResponse.json({ error: "Payment proof is required" }, { status: 400 });
    }
 
    // Save proof image locally
    console.log("[payments] Step 2: Saving proof image locally...");
    const proofExt = proofFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const proofFileName = `${txId}_proof.${proofExt}`;
    proofPath = await saveFileLocally(proofFile, "proofs", proofFileName);
 
    // Save ID card if provided
    // Only treat idCardPhotoFile as a real file if it has a name/size (not an empty FormData value)
    if (idCardPhotoFile && idCardPhotoFile.size > 0 && idCardPhotoFile.name) {
      console.log("[payments] Step 3: Saving ID card locally...");
      const idExt = idCardPhotoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const idFileName = `${txId}_id.${idExt}`;
      idCardPhotoPath = await saveFileLocally(idCardPhotoFile, "id-cards", idFileName);
    } 
    
    // If no valid file was uploaded, use the existing URL from session/client
    if (!idCardPhotoPath && existingIdCardUrl) {
      // If client passed an existing URL, reuse it (backend will store this path)
      idCardPhotoPath = existingIdCardUrl;
      console.log("[payments] Reusing existing ID card URL from client:", idCardPhotoPath);
    }

    // Parse registration items
    console.log("[payments] Step 4: Parsing registration items...");
    let items: any[] = [];
    if (itemsJson) {
      try {
        items = JSON.parse(itemsJson);
      } catch (e) {
        console.warn("[payments] Failed to parse items:", e);
      }
    }

    // Pre-fetch jersey options
    console.log("[payments] Step 5: Pre-fetching jersey options...");
    const jerseyOptions = await prisma.jerseyOption.findMany();
    // avoid implicit `any` by typing the map callback parameter
    const jerseyMap = new Map(jerseyOptions.map((j: any) => [j.size, j.id]));
    const defaultJerseyId = jerseyOptions[0]?.id ?? 1;

    // Database transaction
    console.log("[payments] Step 7: Starting database transaction...");
    
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      // Create separate registration + participants + payment for each item
      const createdRegistrations: Array<{ id: number; totalAmount: string }> = [];
      const allParticipantRows: Array<{ registrationId: number; categoryId: number; jerseyId: number }> = [];
      const earlyBirdClaims: Array<{ categoryId: number }> = [];
      const createdPayments: Array<any> = [];

      for (const item of items) {
        const categoryId = Number(item.categoryId);
        if (Number.isNaN(categoryId)) {
          console.warn("[payments] Invalid categoryId, skipping item:", item);
          continue;
        }

        // compute per-item total amount (trust client price fields, fallback to 0)
        let itemTotal = 0;
        const itemPrice = Number(item.price || 0);
        const itemJerseyCharges = Number(item.jerseyCharges || 0);
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
            // store Decimal-compatible value as string to avoid using Prisma.Decimal constructor
            totalAmount: String(itemTotal),
            paymentStatus: "pending",
          },
        });
        createdRegistrations.push({ id: reg.id, totalAmount: String(itemTotal) });
        console.log("[payments] Created registration for item:", item.type, "regId:", reg.id, "total:", itemTotal);

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
          if ((item.type === "family") && (!participantCount || participantCount <= 0)) {
            participantCount = Number(item.participants || 4) || 4;
          }

          if (totalFromJerseys > 0) {
            for (const [size, count] of jerseyEntries) {
              if (count <= 0) continue;
              const jerseyId = jerseyMap.get(size) || defaultJerseyId;
              for (let i = 0; i < count; i++) {
                allParticipantRows.push({ registrationId: reg.id, categoryId, jerseyId });
              }
            }
            const remaining = Math.max(0, participantCount - totalFromJerseys);
            if (remaining > 0) {
              const jerseyId = defaultJerseyId;
              for (let i = 0; i < remaining; i++) {
                allParticipantRows.push({ registrationId: reg.id, categoryId, jerseyId });
              }
            }
          } else if (participantCount > 0) {
            const jerseyId = defaultJerseyId;
            for (let i = 0; i < participantCount; i++) {
              allParticipantRows.push({ registrationId: reg.id, categoryId, jerseyId });
            }
          } else {
            console.warn("[payments] Skipping community/family item because no jerseys and no participants:", item);
          }
        } else {
          console.warn("[payments] Unknown item.type, skipping:", item);
        }

        // DO NOT create per-registration payment here.
        // A single transaction-level payment will be created after the loop and attached to all created registrations.
      }

      // bulk create participants for all registrations
      if (allParticipantRows.length > 0) {
        await tx.participant.createMany({ data: allParticipantRows });
        console.log("[payments] Created participants:", allParticipantRows.length);
      }

      // early bird claims
      if (earlyBirdClaims.length > 0) {
        await tx.earlyBirdClaim.createMany({ data: earlyBirdClaims });
        console.log("[payments] Created early bird claims:", earlyBirdClaims.length);
      }

      // Create one transaction-level payment that covers all registrations in this submission
      const totalTxAmount = createdRegistrations.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
      const payment = await tx.payment.create({
        data: {
          transactionId: txId,
          proofOfPayment: proofPath!,
          status: "pending",
          // use string for Decimal column
          amount: String(totalTxAmount),
          proofSenderName: proofSenderName,
        },
      });

      // Attach payment -> registrations (one-to-many): set registration.paymentId = payment.id
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
    
    console.log("[payments] Transaction completed successfully");
 
    // Post-transaction: QR codes for all created registrations
    console.log("[payments] Step 8: Creating QR codes...");
    const createdRegistrationIds = (result.registrations || []).map((r: any) => Number(r.id));
    const createdParticipants = await prisma.participant.findMany({
      where: { registrationId: { in: createdRegistrationIds } },
      include: { category: true },
      orderBy: { id: 'asc' },
    });

    // Group by registrationId + categoryId to create QR per-registration
    const groupedByRegAndCat: Record<string, number> = {};
    for (const p of createdParticipants) {
      const key = `${p.registrationId}:${p.categoryId || 0}`;
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
    console.log("[payments] Created QR codes:", createdQrCodes.length);
 
    // RESTORED: Simple email notification that works (include list of registration IDs)
    const registeredUser = await prisma.user.findUnique({ where: { id: result.userId } });
 
    if (registeredUser && registeredUser.email) {
      console.log("[payments] Sending registration confirmation email to:", registeredUser.email);
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

          // build registration list for email
          const regListHtml = (result.registrations || []).map((r: any) => `<li>#${r.id} — Rp ${Number(r.totalAmount).toLocaleString('id-ID')}</li>`).join("");
 
          await transporter.sendMail({
            from: `"Ciputra Color Run 2026" <${emailUser}>`,
            to: registeredUser.email,
            subject: "🎉 Registration Received — Ciputra Color Run 2026",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #059669;">Registration Received!</h2>
                <p>Dear ${registeredUser.name || "Participant"},</p>
                <p>Thank you for registering! We have received your payment proof and created the following registrations:</p>
                <ul>${regListHtml}</ul>
                <p>We will verify payments shortly.</p>
              </div>
            `,
          });
          console.log("[payments] Registration email sent successfully to:", registeredUser.email);
        } else {
          console.warn("[payments] Email credentials not configured");
        }
      } catch (emailError: any) {
        console.error("[payments] Failed to send registration email:", emailError?.message || emailError);
      }
    } else {
      console.warn("[payments] Cannot send email - no user email found");
    }
 
    return NextResponse.json({
      success: true,
      registrations: result.registrations,
      payments: result.payments,
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