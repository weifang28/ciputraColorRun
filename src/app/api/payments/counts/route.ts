import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Count registrations by payment status
    const [pending, confirmed, declined] = await Promise.all([
      prisma.registration.count({ where: { paymentStatus: 'pending' } }),
      prisma.registration.count({ where: { paymentStatus: 'confirmed' } }),
      prisma.registration.count({ where: { paymentStatus: 'declined' } }),
    ]);

    return NextResponse.json({
      counts: {
        pending,
        confirmed,
        declined,
      },
    });
  } catch (error) {
    console.error('Error fetching payment counts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}