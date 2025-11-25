import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const claims = await prisma.racePackClaim.findMany({
      include: {
        qrCode: {
          include: {
            registration: { include: { user: true } },
            category: true,
          },
        },
        claimDetails: {
          include: {
            participant: { include: { category: true, jersey: true } },
          },
        },
      },
      // Use the actual timestamp field on the model. `createdAt` does not exist; use `claimedAt`.
      // Add id as a fallback to ensure a stable order when claimedAt is null.
      orderBy: [{ claimedAt: "desc" }, { id: "desc" }],
    });

    return NextResponse.json({
      success: true,
      claims,
      total: claims.length,
      totalPacks: claims.reduce((sum, c: any) => sum + (c.packsClaimedCount || 0), 0),
    });
  } catch (error: any) {
    console.error("[racePack/claims] Error fetching claims:", error);

    // Best-effort diagnostics: list available model names from the generated client
    const availableModels =
      (prisma as any)?._dmmf?.modelMap
        ? Object.keys((prisma as any)._dmmf.modelMap)
        : ((prisma as any)?._dmmf?.datamodel?.models || []).map((m: any) => m.name) || [];

    const message =
      error?.message ||
      "Unexpected error while fetching race pack claims. Check server logs.";

    return NextResponse.json(
      {
        error: `Failed to fetch claims: ${message}`,
        diagnostics: {
          availableModels,
          hint:
            "If the model you expect (e.g. RacePackClaim) is missing, confirm prisma/schema.prisma and run `npx prisma generate` / apply migrations.",
        },
      },
      { status: 500 }
    );
  }
}