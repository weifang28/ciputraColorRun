import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Fetch all pending payments (paymentStatus = 'pending')
    const registrations = await prisma.registration.findMany({
      where: {
        paymentStatus: 'pending',
      },
      include: {
        user: true,
        payments: true, // include payment records (proofOfPayment, amount, etc.)
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

    // Transform data for dashboard display
    const payments = registrations.map(reg => {
      // Group participants by category
      const categoryCounts = reg.participants.reduce((acc, p) => {
        const catName = p.category?.name || 'Unknown';
        acc[catName] = (acc[catName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by jersey sizes
      const jerseySizes = reg.participants.reduce((acc, p) => {
        const size = p.jersey?.size || 'Unknown';
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        registrationId: reg.id,
        userName: reg.user.name,
        email: reg.user.email,
        phone: reg.user.phone,
        registrationType: reg.registrationType,
        groupName: reg.groupName || null,
        totalAmount: reg.totalAmount,
        createdAt: reg.createdAt,
        participantCount: reg.participants.length,
        categoryCounts,
        jerseySizes,
        // include payments array so frontend can show proof(s)
        payments: reg.payments.map(p => ({
          id: p.id,
          amount: p.amount,
          proofOfPayment: p.proofOfPayment, // e.g. "/uploads/xxx.png"
          status: p.status,
          createdAt: p.createdAt,
        })),
      };
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
