// src/app/api/user/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";

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

const updateUserSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits" }).max(15, { message: "Phone number must be at most 15 digits" }),
});

// Handler PUT
export async function PUT(req: Request) {
  try {
    const accessCode = await getAccessCodeFromCookie();
    
    if (!accessCode) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", issues: validation.error.issues }, { status: 400 });
    }

    const { email, phone } = validation.data;
    
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