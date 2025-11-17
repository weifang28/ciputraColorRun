import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const registrations = await prisma.registration.findMany({
      where: { paymentStatus: "confirmed" },
      include: {
        user: true,
        participants: {
          include: { jersey: true, category: true },
          orderBy: { id: "asc" },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ registrations });
  } catch (err: any) {
    console.error("GET /api/payments/confirmed error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}