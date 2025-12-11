import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const registrations = await prisma.registration.findMany({
      where: {
        paymentStatus: 'pending',
      },
      include: {
        user: true,
        // after schema change this is singular
        payment: true,
        participants: {
          include: {
            category: true,
            jersey: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Build per-registration response (backward compatible)
    const registrationsResp = registrations.map((reg: any) => {
      const categoryCounts: Record<string, number> = {};
      const jerseySizes: Record<string, number> = {};

      reg.participants.forEach((p: any) => {
        const catName = p.category?.name || 'Unknown';
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;

        const jerseySize = p.jersey?.size || 'M';
        jerseySizes[jerseySize] = (jerseySizes[jerseySize] || 0) + 1;
      });

      const p = (reg as any).payment;
      const paymentsArray = p ? [{
        id: p.id,
        amount: Number(p.amount || 0),
        proofOfPayment: p.proofOfPayment,
        proofSenderName: (p as any).proofSenderName,
        status: p.status,
        transactionId: p.transactionId,
        registrationId: reg.id,
      }] : [];

      return {
        registrationId: reg.id,
        userName: reg.user.name,
        email: reg.user.email,
        phone: reg.user.phone,
        registrationType: reg.registrationType,
        groupName: reg.groupName || undefined,
        totalAmount: Number(reg.totalAmount || 0),
        createdAt: reg.createdAt,
        paymentStatus: reg.paymentStatus,
        participantCount: reg.participants.length,
        categoryCounts: Object.keys(categoryCounts).length > 0 ? categoryCounts : undefined,
        jerseySizes: Object.keys(jerseySizes).length > 0 ? jerseySizes : undefined,
        payments: paymentsArray,
        user: {
          birthDate: reg.user.birthDate,
          gender: reg.user.gender,
          currentAddress: reg.user.currentAddress,
          nationality: reg.user.nationality,
          emergencyPhone: reg.user.emergencyPhone,
          medicalHistory: reg.user.medicalHistory,
          idCardPhoto: reg.user.idCardPhoto,
        },
      };
    });

    // Aggregate transactions by payment.transactionId
    const txMap = new Map<string, any>();
    registrations.forEach(reg => {
      const p = reg.payment;
      if (p) {
        const txId = p.transactionId || String(p.id);
        const entry = txMap.get(txId) || {
          transactionId: txId,
          totalAmount: 0,
          paymentStatus: p.status,
          createdAt: p.createdAt || reg.createdAt,
          registrationIds: new Set<number>(),
          payments: [] as any[],
          userName: reg.user?.name,
          email: reg.user?.email,
          phone: reg.user?.phone,
          registrationTypes: new Set<string>(),
          categoryCounts: {} as Record<string, number>,
          jerseySizes: {} as Record<string, number>,
          _amountAdded: false, // internal flag to avoid double-counting
        };

        // Ensure the transaction total is set only once (payment.amount is transaction-level)
        if (!entry._amountAdded) {
          entry.totalAmount = Number(p.amount || 0);
          entry._amountAdded = true;
        }

        entry.registrationIds.add(reg.id);
        // collect category & jersey aggregates for display
        reg.participants.forEach((pt: any) => {
          const cname = pt.category?.name || 'Unknown';
          entry.categoryCounts[cname] = (entry.categoryCounts[cname] || 0) + 1;
          const jsize = pt.jersey?.size || 'M';
          entry.jerseySizes[jsize] = (entry.jerseySizes[jsize] || 0) + 1;
        });

        entry.payments.push({
          id: p.id,
          transactionId: p.transactionId,
          amount: Number(p.amount || 0),
          status: p.status,
        });
        if (reg.registrationType) entry.registrationTypes.add(reg.registrationType);
        txMap.set(txId, entry);
      } else {
        // registrations without payment -> synthetic tx per registration
        const syntheticTx = `reg-${reg.id}`;
        if (!txMap.has(syntheticTx)) {
          txMap.set(syntheticTx, {
            transactionId: syntheticTx,
            totalAmount: Number(reg.totalAmount || 0),
            paymentStatus: reg.paymentStatus,
            createdAt: reg.createdAt,
            registrationIds: new Set([reg.id]),
            payments: [],
            userName: reg.user?.name,
            email: reg.user?.email,
            phone: reg.user?.phone,
            registrationTypes: new Set([reg.registrationType]),
            categoryCounts: {}, jerseySizes: {}
          });
        }
      }
    });

    const transactions = Array.from(txMap.values()).map((t: any) => ({
      transactionId: t.transactionId,
      totalAmount: t.totalAmount,
      paymentStatus: t.paymentStatus,
      createdAt: t.createdAt,
      registrationIds: Array.from(t.registrationIds),
      payments: t.payments,
      userName: t.userName,
      email: t.email,
      phone: t.phone,
      registrationTypes: Array.from(t.registrationTypes),
      categoryCounts: Object.keys(t.categoryCounts).length ? t.categoryCounts : undefined,
      jerseySizes: Object.keys(t.jerseySizes).length ? t.jerseySizes : undefined,
    }));

    return NextResponse.json({
      registrations: registrationsResp,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
