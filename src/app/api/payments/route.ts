import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";

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
    const category = (form.get("category") as string) || undefined;
    const amountStr = (form.get("amount") as string) || undefined;
    const file = form.get("proof") as File | null;

    // optional user/registration fields (send these from the registration page)
    const fullName = (form.get("fullName") as string) || undefined;
    const email = (form.get("email") as string) || undefined;
    const phone = (form.get("phone") as string) || undefined;
    const registrationType =
      (form.get("registrationType") as string) || "individual";

    if (!file) {
      return NextResponse.json(
        { error: "proof file is required" },
        { status: 400 }
      );
    }

    // parse amount as number (may be total amount posted by client)
    const amount = amountStr !== undefined ? Number(amountStr) : undefined;

    // save uploaded file (unchanged)
    const txId =
      typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = (file.name?.split(".").pop() || "bin").replace(
      /[^a-zA-Z0-9]/g,
      ""
    );
    const filename = `${txId}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, buffer);

    // build payment base data
    const paymentData: any = {
      transactionId: txId,
      proofOfPayment: `/uploads/${filename}`,
      status: "pending",
      // don't set createdAt — DB will set timestamps
    };

    if (amount !== undefined && !Number.isNaN(amount)) {
      // if Payment.amount is Decimal in prisma/schema.prisma, use Prisma.Decimal
      paymentData.amount = new Prisma.Decimal(String(amount)); // { changed code }
    }

    // If registrationId provided and valid, use it; otherwise create registration (and user if needed)
    let registrationId: number | undefined;
    if (registrationIdStr && !Number.isNaN(Number(registrationIdStr))) {
      registrationId = Number(registrationIdStr);
    } else {
      // require basic user info to create registration
      if (!email || !fullName || !phone) {
        return NextResponse.json(
          {
            error:
              "Missing registration data (fullName, email, phone). Provide these to auto-create a registration.",
          },
          { status: 400 }
        );
      }

      // parse cart items JSON (if provided)
      const cartItemsStr = form.get("cartItems") as string | null;
      let cartItems: any[] = [];
      try {
        if (cartItemsStr) cartItems = JSON.parse(cartItemsStr);
      } catch (e) {
        cartItems = [];
      }

      // create/find user and create registration + participants inside a transaction
      const result = await prisma.$transaction(async (prismaTx) => {
        let user = await prismaTx.user.findUnique({ where: { email } });
        if (!user) {
          // --- THIS IS THE MODIFIED PART ---
          // 1. Generate the unique access code
          const newAccessCode = await generateAccessCode(fullName, prismaTx);
          
          // 2. Create the user with the new access code
          user = await prismaTx.user.create({
            data: {
              name: fullName,
              email,
              phone,
              accessCode: newAccessCode, // Use the new generated code
              role: "user",
            },
          });
          // --- END OF MODIFICATION ---
        }

        const registration = await prismaTx.registration.create({
          data: {
            userId: user.id,
            registrationType,
            totalAmount: new Prisma.Decimal(String(amount ?? 0)), // required Decimal
          },
        });

        // If cartItems provided, create Participant rows accordingly
        if (Array.isArray(cartItems) && cartItems.length > 0) {
          for (const item of cartItems) {
            try {
              const categoryId = Number(item.categoryId);

              // get category name for bib prefix
              const category = await prismaTx.raceCategory.findUnique({ where: { id: categoryId } });

              if (item.type === "individual") {
                // find jersey option by size if provided
                let jerseyId: number | undefined = undefined;
                if (item.jerseySize) {
                  const j = await prismaTx.jerseyOption.findUnique({ where: { size: item.jerseySize } });
                  if (j) jerseyId = j.id;
                }

                const bib = await generateUniqueBib(category?.name, prismaTx);

                await prismaTx.participant.create({
                  data: {
                    registrationId: registration.id,
                    categoryId: categoryId,
                    jerseyId: jerseyId ?? (await prismaTx.jerseyOption.findFirst())?.id ?? 1,
                    bibNumber: bib,
                  },
                });
              } else if (item.type === "community") {
                // item.jerseys is an object mapping size->count
                const jerseysMap: Record<string, number> = item.jerseys || {};
                for (const [size, cnt] of Object.entries(jerseysMap)) {
                  const count = Number(cnt) || 0;
                  if (count <= 0) continue;

                  const jOpt = await prismaTx.jerseyOption.findUnique({ where: { size } });
                  const jerseyId = jOpt ? jOpt.id : (await prismaTx.jerseyOption.findFirst())?.id ?? 1;

                  for (let i = 0; i < count; i++) {
                    const bib = await generateUniqueBib(category?.name, prismaTx);
                    await prismaTx.participant.create({
                      data: {
                        registrationId: registration.id,
                        categoryId: categoryId,
                        jerseyId,
                        bibNumber: bib,
                      },
                    });
                  }
                }
              }
            } catch (e) {
              // continue on participant creation errors to avoid blocking whole transaction
              console.error("Error creating participants for cart item:", e);
            }
          }
        }

        return { registration };
      });

      registrationId = result.registration.id;
    }

    paymentData.registrationId = registrationId;

    const created = await prisma.payment.create({
      data: paymentData,
    });

    return NextResponse.json({ success: true, payment: created });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "internal" },
      { status: 500 }
    );
  }
}