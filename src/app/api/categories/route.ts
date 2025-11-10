import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
	try {
		const categories = await prisma.raceCategory.findMany({
			orderBy: { id: "asc" },
			select: { id: true, name: true, price: true },
		});
		return NextResponse.json(categories);
	} catch (err: any) {
		console.error("GET /api/categories error:", err);
		return NextResponse.json(
			{ error: "failed to load categories" },
			{ status: 500 }
		);
	} finally {
		// optional: prisma.$disconnect() if you prefer to disconnect here
	}
}
