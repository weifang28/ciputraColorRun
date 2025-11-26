import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

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

    // Cloudinary URLs start with https:// - redirect to them directly
    if (proof.startsWith("http://") || proof.startsWith("https://")) {
      return NextResponse.redirect(proof);
    }

    // Fallback: if stored path is not a URL, return error
    console.error("payments/proof: non-URL path stored", { proof });
    return NextResponse.json({ 
      error: "file not accessible",
      message: "Proof must be a public URL (Cloudinary)"
    }, { status: 404 });
  } catch (err: any) {
    console.error("payments/proof error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}