import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: any) {
  try {
    const params = context?.params instanceof Promise ? await context.params : context?.params || {};
    const id = Number(params?.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: "payment not found" }, { status: 404 });

    const proof = payment.proofOfPayment;
    if (!proof) return NextResponse.json({ error: "no proof stored" }, { status: 404 });

    // Cloudinary URLs - redirect directly
    if (proof.startsWith("http://") || proof.startsWith("https://")) {
      return NextResponse.redirect(proof);
    }

    // Local API route path (e.g., /api/uploads/proofs/xxx.jpg)
    if (proof.startsWith("/api/uploads/")) {
      // Extract the actual file path from the API route
      const relativePath = proof.replace("/api/uploads/", "");
      const uploadsDir = path.join(process.cwd(), "uploads");
      const filePath = path.join(uploadsDir, relativePath);

      // Security check
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadsDir = path.resolve(uploadsDir);
      
      if (!resolvedPath.startsWith(resolvedUploadsDir)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
      }

      if (!fs.existsSync(resolvedPath)) {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(resolvedPath);
      const ext = path.extname(resolvedPath).toLowerCase();
      const contentTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentTypes[ext] || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Legacy: old local file paths (backwards compatibility)
    if (proof.startsWith("/uploads/") || proof.startsWith("uploads/")) {
      const relativePath = proof.replace(/^\//, "");
      const filePath = path.join(process.cwd(), relativePath);
      
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
        };
        
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": contentTypes[ext] || "application/octet-stream",
          },
        });
      }
    }

    console.error("payments/proof: unrecognized path format", { proof });
    return NextResponse.json({ 
      error: "file not accessible",
      message: "Proof path format not recognized"
    }, { status: 404 });
  } catch (err: any) {
    console.error("payments/proof error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}