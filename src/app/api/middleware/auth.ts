import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function authenticateAdmin(request: Request): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  try {
    const authHeader = request.headers.get("authorization") || "";
    let accessCode: string | undefined;

    if (authHeader.startsWith("Bearer ")) {
      accessCode = authHeader.substring(7).trim();
    } else {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|; )admin_access=([^;]+)/);
      if (match) accessCode = decodeURIComponent(match[1]);
    }

    if (!accessCode) return { authenticated: false, error: "Missing access code" };

    const user = await prisma.user.findFirst({
      where: { accessCode, role: "admin" },
    });

    if (!user) return { authenticated: false, error: "Invalid access code or not an admin" };

    return { authenticated: true, user };
  } catch (err: any) {
    console.error("authenticateAdmin error:", err);
    return { authenticated: false, error: "Authentication failed" };
  }
}

export function unauthorizedResponse(error?: string) {
  return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
}
