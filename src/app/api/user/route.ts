import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Handler for GET request to fetch user profile
export async function GET(req: Request) {
  try {
    // In a real app, this accessCode would come from a secure session/cookie.
    // For this demonstration, we read it from the query parameters.
    const { searchParams } = new URL(req.url);
    const accessCode = searchParams.get("accessCode");

    if (!accessCode) {
      return NextResponse.json(
        { error: "Missing required query parameter: accessCode" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { accessCode },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessCode: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("GET /api/user error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

// Handler for PUT request to update user profile
export async function PUT(req: Request) {
  try {
    const { accessCode, email, phone } = await req.json();

    if (!accessCode || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields: accessCode, email, or phone" },
        { status: 400 }
      );
    }

    // 1. Check if the new email is already taken by another user
    const existingUserWithEmail = await prisma.user.findFirst({
      where: {
        email: email,
        NOT: { accessCode: accessCode }, // exclude the current user
      },
    });

    if (existingUserWithEmail) {
      return NextResponse.json(
        { error: "Email already in use by another account." },
        { status: 409 }
      );
    }

    // 2. Find the user by accessCode and update their details
    const updatedUser = await prisma.user.update({
      where: { accessCode },
      data: {
        email,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessCode: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: any) {
    if (err.code === "P2025") {
      // P2025: Record to update not found (i.e., invalid accessCode)
      return NextResponse.json(
        { error: "User not found with the provided accessCode." },
        { status: 404 }
      );
    }
    console.error("PUT /api/user error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}