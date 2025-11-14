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
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data for dashboard display
    const payments = registrations.map(reg => ({
      registrationId: reg.id,
      userName: reg.user.name,
      email: reg.user.email,
      registrationType: reg.registrationType,
      groupName: reg.groupName || 'N/A',
      totalAmount: reg.totalAmount,
      createdAt: reg.createdAt,
    }));

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
