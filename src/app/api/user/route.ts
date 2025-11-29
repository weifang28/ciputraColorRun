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
    
    if (!accessCode) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { accessCode },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({ user });

  } catch (err: unknown) {
    console.error("GET /api/user error:", err);
    
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
    
    if (!accessCode) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    if (!email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields: email, or phone" },
        { status: 400 }
      );
    }
    
    // Allow updating email and phone - no uniqueness check needed
    const updatedUser = await prisma.user.update({
      where: { accessCode },
      data: { email, phone },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (err: any) {
    console.error('PUT /api/user error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}