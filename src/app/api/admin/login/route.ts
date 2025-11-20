import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body || {};

    // Get credentials from environment variables
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;
    const ADMIN_ACCESS_CODE =
      process.env.ADMIN_ACCESS_CODE;

    // Validate input
    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Verify credentials against environment variables
    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Verify admin user exists in database
    const adminUser = await prisma.user.findUnique({
      where: { accessCode: ADMIN_ACCESS_CODE },
    });

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json({ error: "Admin user not found in database" }, { status: 401 });
    }

    // Set secure cookie
    const res = NextResponse.json(
      {
        success: true,
        message: "Authenticated",
        user: { name: adminUser.name, role: adminUser.role },
      },
      { status: 200 }
    );

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