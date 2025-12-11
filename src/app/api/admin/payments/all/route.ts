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

    // Transform to match expected format
    const payments = registrations.map((reg: any) => {
      // Calculate category counts
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
        totalAmount: reg.totalAmount,
        createdAt: reg.createdAt,
        paymentStatus: reg.paymentStatus,
        participantCount: reg.participants.length,
        categoryCounts: Object.keys(categoryCounts).length > 0 ? categoryCounts : undefined,
        jerseySizes: Object.keys(jerseySizes).length > 0 ? jerseySizes : undefined,
        // Normalize singular `payment` relation to an array for consumers expecting `payments`
        payments: reg.payment ? [{
          id: reg.payment.id,
          amount: Number(reg.payment.amount ?? 0),
          proofOfPayment: reg.payment.proofOfPayment,
          // keep custom fields potentially present on the record
          proofSenderName: (reg.payment as any)?.proofSenderName,
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

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}