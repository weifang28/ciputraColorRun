// src/app/api/profile/purchases/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Helper function to get access code from cookie
async function getAccessCodeFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  return token?.value;
}

export async function GET(req: Request) {
  try {
    // Get access code from cookie (primary method)
    let accessCode = await getAccessCodeFromCookie();

    // Fallback: allow query param ?accessCode=... for development
    const url = new URL(req.url);
    const accessCodeQuery = url.searchParams.get('accessCode');
    if (!accessCode && accessCodeQuery) {
      accessCode = accessCodeQuery;
    }

    if (!accessCode) {
      console.error('[profile/purchases] No access code found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('[profile/purchases] Looking up user with access code:', accessCode);

    // 1. Find user by access code (NOT by email)
    const user = await prisma.user.findUnique({
      where: { accessCode },
    });

    if (!user) {
      console.error('[profile/purchases] User not found for access code:', accessCode);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[profile/purchases] Found user ID:', user.id, 'Name:', user.name);

    // 2. Fetch registrations ONLY for this specific user ID - INCLUDE payment status
    const registrations = await prisma.registration.findMany({
      where: { 
        userId: user.id  // CRITICAL: Filter by user ID, not email
      },
      include: {
        qrCodes: true,
        participants: {
          include: {
            category: true,
            jersey: true,
          },
        },
        payments: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[profile/purchases] Found registrations:', registrations.length, 'for user ID:', user.id);

    // Log registration IDs for debugging
    if (registrations.length > 0) {
      console.log('[profile/purchases] Registration IDs:', registrations.map(r => r.id));
      console.log('[profile/purchases] Payment statuses:', registrations.map(r => ({
        id: r.id,
        paymentStatus: r.paymentStatus,
        payments: r.payments
      })));
    }

    return NextResponse.json({ registrations });
  } catch (err: unknown) {
    console.error('GET /api/profile/purchases error:', err);
    let errorMessage = "Failed to fetch purchase data";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}