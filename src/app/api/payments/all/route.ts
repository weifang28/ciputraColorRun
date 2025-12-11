import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    // fetch registrations including their payment (new single-payment relation)
    const registrations = await prisma.registration.findMany({
      where: {
        paymentStatus: status as any,
      },
      include: {
        user: true,
        // use the relation name that matches your generated Prisma client
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

    // Transform per-registration response (keeps original shape for backward compatibility)
    const registrationsResp = registrations.map((reg: any) => {
      const categoryCounts: Record<string, number> = {};
      const jerseySizes: Record<string, number> = {};

      reg.participants.forEach((p: any) => {
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
        // payment (transaction) that covers this registration
        payments: reg.payment ? [{
          id: reg.payment.id,
          amount: Number(reg.payment.amount || 0),
          proofOfPayment: reg.payment.proofOfPayment,
          proofSenderName: (reg.payment as any).proofSenderName,
          status: reg.payment.status,
          transactionId: reg.payment.transactionId,
          registrationId: reg.id,
        }] : [],
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

    // Aggregate transactions by registration.payment.transactionId
    const txMap = new Map<string, any>();
    registrations.forEach((reg: any) => {
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
          // collect category & jersey aggregates
         reg.participants.forEach((p: any) => {
           const catName = p.category?.name || 'Unknown';
           entry.categoryCounts[catName] = (entry.categoryCounts[catName] || 0) + 1;
           const jerseySize = p.jersey?.size || 'M';
           entry.jerseySizes[jerseySize] = (entry.jerseySizes[jerseySize] || 0) + 1;
         });
         txMap.set(txId, entry);
       } else {
         // registrations without any payment -> synthetic per-registration transaction
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