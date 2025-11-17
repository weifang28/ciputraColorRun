// src/app/api/payments/route.ts

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { PrismaClient, Prisma } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();

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
  // 1. Create the base code: lowercase, replace non-alphanumeric with '_', trim trailing '_'
  const baseCode = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "_") // Replace one or more spaces with a single underscore
    .replace(/_$/, ""); // Remove trailing underscore if any

  let accessCode = baseCode;
  let counter = 0;

  // 2. Check for uniqueness and append a number if it already exists
  // We loop until we find a code that is not in the database.
  while (true) {
    const existingUser = await prismaTx.user.findUnique({
      where: { accessCode: accessCode },
    });

    if (!existingUser) {
      // This code is unique, we can use it.
      break;
    }

    // This code is taken, increment counter and try again
    counter++;
    accessCode = `${baseCode}_${counter}`;
  }

  return accessCode;
}

/**
 * Generate a bib number with category-based prefix and ensure uniqueness.
 * Example: categoryName "3K" -> prefix "3" -> bib "3XXXX" (4 random digits)
 */
async function generateUniqueBib(
  categoryName: string | undefined,
  prismaTx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >
): Promise<string> {
  const prefixMatch = (categoryName || "").match(/^(\d{1,2})/);
  const prefix = prefixMatch ? prefixMatch[1] : "0"; // fallback prefix

  const makeCandidate = () => `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;

  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = makeCandidate();
    const exists = await prismaTx.participant.findFirst({ where: { bibNumber: candidate } });
    if (!exists) return candidate;
  }

  // Last resort: append timestamp
  return `${prefix}${Date.now().toString().slice(-6)}`;
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

    const proofBuffer = Buffer.from(await proofFile.arrayBuffer());
    const proofExt = (proofFile.name?.split(".").pop() || "bin").replace(
      /[^a-zA-Z0-9]/g,
      ""
    );
    const proofFilename = `${txId}_proof.${proofExt}`;

    const S3_BUCKET = process.env.S3_BUCKET_NAME || "";
    const useS3 = !!S3_BUCKET;

    // hoist S3 client so we can reuse it for proof + id uploads
    let s3: S3Client | undefined;
    if (useS3) {
      s3 = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials:
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined,
      });
    }

    let proofPath: string;
    if (useS3 && s3) {
      // upload to S3 (or compatible) and set public URL or path
      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: `uploads/${proofFilename}`,
          Body: proofBuffer,
          ContentType: proofFile.type || `image/${proofExt}`,
          ACL: "public-read",
        })
      );

      // public URL (adjust if using a custom domain or non-AWS provider)
      const region = process.env.AWS_REGION || "us-east-1";
      proofPath = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/uploads/${proofFilename}`;
    } else {
      // fallback: write into ephemeral OS temp directory (works on serverless, not persistent)
      const uploadsDir = path.join(os.tmpdir(), "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });
      const proofFullPath = path.join(uploadsDir, proofFilename);
      await fs.writeFile(proofFullPath, proofBuffer);
      proofPath = `/tmp/uploads/${proofFilename}`; // store path/marker; note: not publicly accessible
    }

    // Save ID card photo if provided
    let idCardPhotoPath: string | undefined;
    if (idCardPhotoFile) {
      const idBuffer = Buffer.from(await idCardPhotoFile.arrayBuffer());
      const idExt = (idCardPhotoFile.name?.split(".").pop() || "bin").replace(
        /[^a-zA-Z0-9]/g,
        ""
      );
      const idFilename = `${txId}_id.${idExt}`;
      if (useS3 && s3) {
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `uploads/${idFilename}`,
            Body: idBuffer,
            ContentType: idCardPhotoFile.type || `image/${idExt}`,
            ACL: "public-read",
          })
        );
        idCardPhotoPath = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/uploads/${idFilename}`;
      } else {
        const idPath = path.join(os.tmpdir(), "uploads", idFilename);
        await fs.writeFile(idPath, idBuffer);
        idCardPhotoPath = `/tmp/uploads/${idFilename}`;
      }
    };

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

      // helper to create a quick access code if needed
      const quickAccessCode = (name?: string) =>
        `${(name || "u").replace(/\s+/g, "").slice(0, 6)}-${Date.now()
          .toString(36)
          .slice(-6)}`;

      if (!user) {
        const accessCode = quickAccessCode(fullName);
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
        },
      });

      // create participants based on cartItems
      const participantRows: Array<{
        registrationId: number;
        categoryId: number;
        jerseyId: number;
        bibNumber?: string;
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
          const bib = await generateUniqueBib(category?.name, prismaTx);
          participantRows.push({
            registrationId: registration.id,
            categoryId,
            jerseyId: jerseyId ?? (await prismaTx.jerseyOption.findFirst())?.id ?? 1,
            bibNumber: bib,
          });
        } else if (item.type === "community") {
          const jerseysMap: Record<string, number> = item.jerseys || {};
          for (const [size, cnt] of Object.entries(jerseysMap)) {
            const count = Number(cnt) || 0;
            if (count <= 0) continue;
            const jOpt = await prismaTx.jerseyOption.findUnique({ where: { size } });
            const jerseyId = jOpt ? jOpt.id : (await prismaTx.jerseyOption.findFirst())?.id ?? 1;
            for (let i = 0; i < count; i++) {
              const bib = await generateUniqueBib(category?.name, prismaTx);
              participantRows.push({
                registrationId: registration.id,
                categoryId,
                jerseyId,
                bibNumber: bib,
              });
            }
          }
        }
      }

      if (participantRows.length > 0) {
        await prismaTx.participant.createMany({
          data: participantRows.map((r) => ({
            registrationId: r.registrationId,
            categoryId: r.categoryId,
            jerseyId: r.jerseyId,
            bibNumber: r.bibNumber,
          })),
        });
      }

      // Group participants by category to create QR codes
      const grouped = participantRows.reduce<Record<number, number>>((acc, r) => {
        acc[r.categoryId] = (acc[r.categoryId] || 0) + 1;
        return acc;
      }, {});

      const createdQrCodes: any[] = [];
      for (const [catIdStr, totalPacks] of Object.entries(grouped)) {
        const catId = Number(catIdStr);
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

      // Create payment record
      const paymentData: any = {
        registrationId: registration.id,
        transactionId: txId,
        // store the actual uploaded path/URL (S3 URL or tmp path)
        proofOfPayment: proofPath,
        status: "pending",
        amount: new Prisma.Decimal(String(amount ?? 0)),
      };

      if (amount !== undefined && !Number.isNaN(amount)) {
        paymentData.amount = new Prisma.Decimal(String(amount));
      }

      const payment = await prismaTx.payment.create({ data: paymentData });

      return { registration, payment, createdQrCodes };
    }

    // run transaction (increase interactive transaction timeout to avoid 5s default)
    // configurable via PRISMA_TX_TIMEOUT (ms). Default: 120000 (2 minutes).
    const txTimeout = Number(process.env.PRISMA_TX_TIMEOUT || 120000);
    const result = await prisma.$transaction((tx: any) => createRegistrationAndPayment(tx), { timeout: txTimeout });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      qrCodes: result.createdQrCodes,
    });
  } catch (err) {
    console.error("Payment API error:", err);
    const message =
      err && (err as any).message ? (err as any).message : "internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}