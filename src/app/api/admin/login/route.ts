import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body || {};

    const ADMIN_USER = process.env.ADMIN_USER || "admin";
    const ADMIN_PASS = process.env.ADMIN_PASS || "admin";
    const ADMIN_ACCESS_CODE =
      process.env.ADMIN_ACCESS_CODE ||
      (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
        ? (crypto as any).randomUUID()
        : `adm-${Date.now().toString(36)}`);

    // ensure a phone value exists because prisma User.phone is required in this schema
    const ADMIN_PHONE = process.env.ADMIN_PHONE || "0000000000";

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Ensure admin user exists (upsert by accessCode). Adjust fields if your User model differs.
    await prisma.user.upsert({
      where: { accessCode: ADMIN_ACCESS_CODE },
      update: {
        name: "Administrator",
        role: "admin",
        email: "admin@local",
        phone: ADMIN_PHONE,
      },
      create: {
        name: "Administrator",
        role: "admin",
        email: "admin@local",
        accessCode: ADMIN_ACCESS_CODE,
        phone: ADMIN_PHONE,
      },
    });

    const res = NextResponse.json({ success: true, message: "Authenticated" }, { status: 200 });

    const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const cookie = `admin_access=${encodeURIComponent(ADMIN_ACCESS_CODE)}; Path=/; HttpOnly; SameSite=Strict; ${secureFlag}Max-Age=${maxAge}`;

    res.headers.set("Set-Cookie", cookie);
    return res;
  } catch (err: any) {
    console.error("POST /api/admin/login error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}