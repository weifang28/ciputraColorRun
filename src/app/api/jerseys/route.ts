import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const jerseys = await prisma.jerseyOption.findMany({
      orderBy: [
        { id: "asc" }, // Order by ID
      ],
    });

    return NextResponse.json(jerseys);
  } catch (error: any) {
    console.error("[jerseys] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jersey options" },
      { status: 500 }
    );
  }
}