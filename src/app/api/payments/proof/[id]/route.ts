import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: any) {
  try {
    // handle both sync and Promise params shapes
    const params = context?.params instanceof Promise ? await context.params : context?.params || {};
    const id = Number(params?.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: "payment not found" }, { status: 404 });

    const proof = payment.proofOfPayment;
    if (!proof) return NextResponse.json({ error: "no proof stored" }, { status: 404 });

    // If proof is an absolute URL (S3), redirect to it
    if (proof.startsWith("http://") || proof.startsWith("https://")) {
      return NextResponse.redirect(proof);
    }

    // Otherwise attempt to serve local file (ephemeral on serverless)
    let filePath = proof;
    if (!path.isAbsolute(filePath)) {
      // allow either absolute "/tmp/..." or repo-relative "/public/..." paths
      filePath = path.join(process.cwd(), proof.replace(/^\//, ""));
    }

    try {
      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const contentType =
        ext === "png" ? "image/png" :
        ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
        "application/octet-stream";
      return new NextResponse(data, { headers: { "Content-Type": contentType } });
    } catch (readErr) {
      console.error("payments/proof: file read error", readErr);
      return NextResponse.json({ error: "file not accessible" }, { status: 404 });
    }
  } catch (err: any) {
    console.error("payments/proof error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}