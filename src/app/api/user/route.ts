// src/app/api/user/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

async function getAccessCodeFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  return token?.value;
}

// Handler GET
export async function GET(req: Request) {
  try {
    const accessCode = await getAccessCodeFromCookie();
    // ... (kode Anda yang lain) ...
    if (!accessCode) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
        // ...
        where: { accessCode },
        // ...
    });
    // ... (kode Anda yang lain) ...
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });

  } catch (err: unknown) { // <-- UBAH KE UNKNOWN
    console.error("GET /api/user error:", err);
    
    // Periksa tipe sebelum digunakan
    let errorMessage = "Internal server error";
    if (err instanceof Error) {
        errorMessage = err.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Handler PUT
export async function PUT(req: Request) {
  try {
    const { email, phone } = await req.json();
    const accessCode = await getAccessCodeFromCookie();
    // ... (kode Anda yang lain) ...
    if (!accessCode) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!email || !phone) {
        return NextResponse.json(
          { error: "Missing required fields: email, or phone" },
          { status: 400 }
        );
    }
    // ... (logika validasi email Anda) ...
    const existingUserWithEmail = await prisma.user.findFirst({
        where: { email: email, NOT: { accessCode: accessCode } },
    });
    if (existingUserWithEmail) {
        return NextResponse.json(
            { error: "Email already in use by another account." },
            { status: 409 }
        );
    }
    
    const updatedUser = await prisma.user.update({
        where: { accessCode },
        data: { email, phone },
        select: { /* ... data Anda ... */ }
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (err: unknown) { // <-- UBAH KE UNKNOWN
    
    // Periksa apakah ini error Prisma (P2025)
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2025') {
      return NextResponse.json(
        { error: "User not found with the provided accessCode." },
        { status: 404 }
      );
    }

    // Tangani error umum
    console.error("PUT /api/user error:", err);
    let errorMessage = "Internal server error";
    if (err instanceof Error) {
        errorMessage = err.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}