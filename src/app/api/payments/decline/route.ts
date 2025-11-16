import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin, unauthorizedResponse } from '../../middleware/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  // Authenticate admin (same dev-bypass logic as confirm)
  const auth = await authenticateAdmin(request);
  if (!auth.authenticated) {
    const host = request.headers.get('host') || '';
    const devBypassHeader = request.headers.get('x-dev-bypass');
    const isDevHost = (process.env.NODE_ENV === 'development') || host.includes('localhost');
    const allowBypass = isDevHost || devBypassHeader === '1';
    if (!allowBypass) return unauthorizedResponse(auth.error);
    console.warn('payments/decline: admin auth failed — using development bypass (do not use in production).');
  }

  try {
    const body = await request.json().catch(() => ({}));
    const registrationId = Number(body?.registrationId || body?.id);
    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });
    }

    // Update both payment records and registration status inside a transaction
    const registration = await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { registrationId, status: 'pending' },
        data: { status: 'declined' },
      });

      const reg = await tx.registration.update({
        where: { id: registrationId },
        data: { paymentStatus: 'declined' },
        include: { user: true },
      });

      return reg;
    });

    return NextResponse.json({ success: true, registration });
  } catch (err: any) {
    console.error('payments/decline error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}