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
    // Safe upsert: prefer existing by accessCode, then by email, otherwise create.
    const ADMIN_EMAIL = "admin@local";

    // 1) find by accessCode
    let adminUser = await prisma.user.findUnique({ where: { accessCode: ADMIN_ACCESS_CODE } });
    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { name: "Administrator", role: "admin", email: ADMIN_EMAIL, phone: ADMIN_PHONE },
      });
    } else {
      // 2) if someone already has ADMIN_EMAIL, update that row to become the admin (set accessCode)
      const byEmail = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
      if (byEmail) {
        await prisma.user.update({
          where: { id: byEmail.id },
          data: { accessCode: ADMIN_ACCESS_CODE, name: "Administrator", role: "admin", phone: ADMIN_PHONE },
        });
      } else {
        // 3) create new admin user
        try {
          await prisma.user.create({
            data: {
              name: "Administrator",
              role: "admin",
              email: ADMIN_EMAIL,
              accessCode: ADMIN_ACCESS_CODE,
              phone: ADMIN_PHONE,
            },
          });
        } catch (e: any) {
          // fallback: handle duplicate unique constraint races
          console.error("Failed creating admin user:", e);
          // If it's a P2002 duplicate error, attempt to recover by updating the existing record
          if (e.code === "P2002") {
            const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
            if (existing) {
              await prisma.user.update({
                where: { id: existing.id },
                data: { accessCode: ADMIN_ACCESS_CODE, name: "Administrator", role: "admin", phone: ADMIN_PHONE },
              });
            }
          } else {
            throw e;
          }
        }
      }
    }

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