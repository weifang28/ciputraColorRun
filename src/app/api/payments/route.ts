// src/app/api/payments/route.ts

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// --- DEFINISIKAN TIPE UNTUK CART ITEM ---
// Ini akan memperbaiki error 'any[]'
interface ApiCartItem {
  type: "individual" | "community" | "family";
  categoryId: number;
  jerseySize?: string;
  jerseys?: Record<string, number>;
  // Kita tidak perlu field lain seperti price, categoryName, dll. di backend ini
}

async function getAccessCodeFromCookie() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  return token?.value;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    
    const registrationIdStr = form.get("registrationId") as string | null;
    const amountStr = (form.get("amount") as string) || undefined;
    const proofFile = form.get("proof") as File | null;
    const idCardPhotoFile = form.get("idCardPhoto") as File | null;
    const cartItemsJson = (form.get("items") as string) || (form.get("cartItems") as string) || undefined;
    
    const fullName = (form.get("fullName") as string) || undefined;
    const email = (form.get("email") as string) || undefined;
    const phone = (form.get("phone") as string) || undefined;
    const birthDate = (form.get("birthDate") as string) || undefined;
    const gender = (form.get("gender") as string) || undefined;
    const currentAddress = (form.get("currentAddress") as string) || undefined;
    const nationality = (form.get("nationality") as string) || undefined;
    const emergencyPhone = (form.get("emergencyPhone") as string) || undefined;
    const medicalHistory = (form.get("medicalHistory") as string) || undefined;
    const registrationType = (form.get("registrationType") as string) || "individual";

    if (!proofFile) {
      return NextResponse.json({ error: "proof file is required" }, { status: 400 });
    }
    const amount = amountStr !== undefined ? Number(amountStr) : undefined;
    const txId = crypto.randomUUID();

    // --- Simpan file (Proof & ID Card) ---
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const proofBuffer = Buffer.from(await proofFile.arrayBuffer());
    const proofExt = (proofFile.name?.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "");
    const proofFilename = `${txId}_proof.${proofExt}`;
    await fs.writeFile(path.join(uploadsDir, proofFilename), proofBuffer);

    let idCardPhotoPath: string | undefined;
    if (idCardPhotoFile) {
      const idBuffer = Buffer.from(await idCardPhotoFile.arrayBuffer());
      const idExt = (idCardPhotoFile.name?.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "");
      const idFilename = `${txId}_id.${idExt}`;
      await fs.writeFile(path.join(uploadsDir, idFilename), idBuffer);
      idCardPhotoPath = `/uploads/${idFilename}`;
    }

    const generateAccessCode = (name?: string) => {
      return `${(name || "u").replace(/\s+/g, "").slice(0, 6)}-${Date.now().toString(36).slice(-6)}`;
    };

    // --- Transaksi Database ---
    const result = await prisma.$transaction(async (tx) => {
      let registrationId: number | undefined;
      let userId: number | undefined;

      // 1. Tentukan User & Registrasi
      if (registrationIdStr && !Number.isNaN(Number(registrationIdStr))) {
        registrationId = Number(registrationIdStr);
        const reg = await tx.registration.findUnique({ where: { id: registrationId }, select: { userId: true }});
        userId = reg?.userId;
      } else {
        if (!email || !fullName || !phone) {
          throw new Error("Missing registration data (fullName, email, phone).");
        }

        let user = await tx.user.findUnique({ where: { email } });
        if (!user) {
          user = await tx.user.create({
            data: {
              name: fullName,
              email,
              phone,
              accessCode: generateAccessCode(fullName),
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
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              birthDate: birthDate ? new Date(birthDate) : user.birthDate,
              gender: gender || user.gender,
              currentAddress: currentAddress || user.currentAddress,
              nationality: nationality || user.nationality,
              idCardPhoto: idCardPhotoPath || user.idCardPhoto,
              emergencyPhone: emergencyPhone || user.emergencyPhone,
              medicalHistory: medicalHistory || user.medicalHistory,
            },
          });
        }
        userId = user.id;

        const registration = await tx.registration.create({
          data: {
            userId: user.id,
            registrationType,
            totalAmount: new Prisma.Decimal(String(amount ?? 0)),
          },
        });
        registrationId = registration.id;
      }

      if (!registrationId || !userId) {
        throw new Error("Failed to create or resolve registration/user");
      }
      
      // 2. Buat Participants (Peserta)
      let totalParticipantsInTx = 0;
      if (cartItemsJson) {
        // --- PERBAIKAN ERROR 'any' DI SINI ---
        let cartItems: ApiCartItem[] = []; // Gunakan tipe yang sudah kita buat
        try { 
          cartItems = JSON.parse(cartItemsJson); 
        } catch (e: unknown) { // Gunakan 'unknown'
          throw new Error("invalid items JSON"); 
        }

        const participantRows: Array<{ registrationId: number; categoryId: number; jerseyId: number }> = [];

        for (const item of cartItems) {
          const categoryId = Number(item.categoryId);
          if (!categoryId) throw new Error("Missing categoryId in cart item");

          if (item.type === "individual") {
            const size = item.jerseySize;
            if (!size) throw new Error("Missing jerseySize for individual");
            const jersey = await tx.jerseyOption.findUnique({ where: { size } });
            if (!jersey) throw new Error(`Jersey option not found for size ${size}`);
            participantRows.push({ registrationId, categoryId, jerseyId: jersey.id });

          } else if (item.type === "community" || item.type === "family") {
            const jerseys: Record<string, number> = item.jerseys || {};
            for (const [size, count] of Object.entries(jerseys)) {
              const cnt = Number(count || 0);
              if (cnt <= 0) continue;
              const jersey = await tx.jerseyOption.findUnique({ where: { size } });
              if (!jersey) throw new Error(`Jersey option not found for size ${size}`);
              for (let i = 0; i < cnt; i++) {
                participantRows.push({ registrationId, categoryId, jerseyId: jersey.id });
              }
            }
          }
        }

        if (participantRows.length > 0) {
          await tx.participant.createMany({ data: participantRows });
        }
        totalParticipantsInTx = participantRows.length;
      }

      // 3. Buat SATU QR Code
      const qrCodeDataString = crypto.randomUUID(); 
      const maxScans = totalParticipantsInTx + 3; 
      
      const qrCode = await tx.qrCode.create({
        data: {
          registration: {
            connect: { id: registrationId }
          },
          // category: undefined, // <-- PAKSA undefined
          categoryId: null,    // <-- ATAU null
          qrCodeData: qrCodeDataString,
          totalPacks: totalParticipantsInTx,
          maxScans: maxScans,
          scansRemaining: maxScans,
        },
      });

      // 4. Buat data Pembayaran
      const paymentData: Prisma.PaymentCreateInput = {
        registration: { connect: { id: registrationId } },
        transactionId: txId,
        proofOfPayment: `/uploads/${proofFilename}`,
        status: "pending",
        amount: new Prisma.Decimal(String(amount ?? 0)),
      };

      const payment = await tx.payment.create({ data: paymentData });

      return { payment, qrCode: qrCode };
    });

    return NextResponse.json({ success: true, payment: result.payment, qrCode: result.qrCode });
  
  } catch (err: unknown) { // Gunakan 'unknown'
    console.error("Payment API error:", err);
    let errorMessage = "Internal server error";
    if (err instanceof Error) {
        errorMessage = err.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}