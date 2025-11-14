import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const jerseys = await prisma.jerseyOption.findMany({
      orderBy: { id: "asc" },
      select: { id: true, size: true },
    });
    return NextResponse.json(jerseys);
  } catch (err: any) {
    console.error("GET /api/jerseys error:", err);
    return NextResponse.json(
      { error: "failed to load jersey options" },
      { status: 500 }
    );
  }
}