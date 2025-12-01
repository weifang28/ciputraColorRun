import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // fetch registrations with the singular payment relation
    const rawRegs = await prisma.registration.findMany({
      where: { paymentStatus: "confirmed" },
      include: {
        user: true,
        participants: {
          include: { jersey: true, category: true },
          orderBy: { id: "asc" },
        },
        // use singular relation name after schema change
        payment: true,
        qrCodes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // normalize to keep the old `payments` array shape for consumers
    const registrations = rawRegs.map((r: any) => {
      const paymentsArr = r.payment
        ? [{
            id: r.payment.id,
            amount: r.payment.amount,
            status: r.payment.status,
            transactionId: r.payment.transactionId,
            proofOfPayment: r.payment.proofOfPayment,
            registrationId: r.id,
          }]
        : [];

      return {
        ...r,
        payments: paymentsArr,
      };
    });

    return NextResponse.json({ registrations });
  } catch (err: any) {
    console.error("GET /api/payments/confirmed error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}