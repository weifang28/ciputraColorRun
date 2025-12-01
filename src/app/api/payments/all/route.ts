import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const registrations = await prisma.registration.findMany({
      where: {
        paymentStatus: status as any,
      },
      include: {
        user: true,
        payments: true,
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

    // Transform per-registration response (keeps original shape for backward compatibility)
    const registrationsResp = registrations.map(reg => {
      const categoryCounts: Record<string, number> = {};
      const jerseySizes: Record<string, number> = {};

      reg.participants.forEach(p => {
        const catName = p.category?.name || 'Unknown';
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
        const jerseySize = p.jersey?.size || 'M';
        jerseySizes[jerseySize] = (jerseySizes[jerseySize] || 0) + 1;
      });

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
        payments: reg.payments.map(p => ({
          id: p.id,
          amount: Number(p.amount || 0),
          proofOfPayment: p.proofOfPayment,
          proofSenderName: (p as any).proofSenderName,
          status: p.status,
          transactionId: p.transactionId,
          registrationId: p.registrationId,
        })),
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

    // Aggregate transactions (group payments by transactionId)
    const txMap = new Map<string, any>();

    registrations.forEach(reg => {
      reg.payments.forEach((p: any) => {
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
        };

        entry.totalAmount += Number(p.amount || 0);
        entry.registrationIds.add(reg.id);
        entry.payments.push({
          id: p.id,
          registrationId: reg.id,
          amount: Number(p.amount || 0),
          status: p.status,
        });
        if (reg.registrationType) entry.registrationTypes.add(reg.registrationType);
        txMap.set(txId, entry);
      });

      // If a registration has no payments (theoretically) include it as single-reg transaction
      if (!reg.payments || reg.payments.length === 0) {
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
    }));

    return NextResponse.json({
      registrations: registrationsResp,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}