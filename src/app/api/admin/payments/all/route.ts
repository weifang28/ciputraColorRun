import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Get status filter from query params
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const registrations = await prisma.registration.findMany({
      where: status ? {
        payment: {
          status: status
        }
      } : undefined,
      include: {
        user: true,
        payment: {
          select: { 
            id: true,
            amount: true,
            proofOfPayment: true,
            status: true,
            transactionId: true,
            proofSenderName: true,
          }
        },
        participants: {
          include: {
            category: true,
            jersey: true, // <-- add jersey relation so we can read jersey.size
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('[admin/payments/all] Sample payment object:', JSON.stringify(registrations[0]?.payment, null, 2));

    // Transform to match expected structure
    const payments = registrations.map(reg => {
      return {
        registrationId: reg.id,
        registrationIds: [reg.id],
        transactionId: reg.payment?.transactionId || '',
        userName: reg.user.name,
        email: reg.user.email,
        phone: reg.user.phone,
        registrationType: reg.registrationType,
        groupName: reg.groupName || undefined,
        totalAmount: Number(reg.totalAmount),
        createdAt: reg.createdAt.toISOString(),
        paymentStatus: reg.payment?.status || 'pending',
        participantCount: reg.participants.length,
        categoryCounts: reg.participants.reduce((acc, p) => {
          const catName = p.category?.name || 'Unknown';
          acc[catName] = (acc[catName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        jerseySizes: reg.participants.reduce((acc, p) => {
          const size = p.jersey?.size;
          if (size) {
            acc[size] = (acc[size] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        payments: reg.payment ? [{
          id: reg.payment.id,
          amount: Number(reg.payment.amount),
          proofOfPayment: reg.payment.proofOfPayment,  // ✅ MAKE SURE THIS IS INCLUDED
          proofSenderName: reg.payment.proofSenderName,
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
          idCardPhoto: reg.user.idCardPhoto,  // ✅ ID card works because this is here
        },
      };
    });

    console.log('[admin/payments/all] Returning payments:', payments.length);
    console.log('[admin/payments/all] First payment proof:', payments[0]?.payments?.[0]?.proofOfPayment);

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}