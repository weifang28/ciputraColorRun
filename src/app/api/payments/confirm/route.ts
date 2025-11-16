import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin, unauthorizedResponse } from '../../middleware/auth';

const prisma = new PrismaClient();

/**
 * Generate a simple, readable access code from a name and ensure uniqueness.
 * Inspired by [`generateAccessCode`](src/app/api/payments/route.ts).
 */
async function makeUniqueAccessCode(baseName: string): Promise<string> {
  const base = (baseName || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_$/, '')
    .slice(0, 30) || `u${Date.now().toString(36).slice(-6)}`;

  let code = base;
  let counter = 0;
  while (true) {
    const existing = await prisma.user.findUnique({ where: { accessCode: code } });
    if (!existing) return code;
    counter += 1;
    code = `${base}_${counter}`;
  }
}

export async function POST(request: Request) {
  // Authenticate admin (keeps your existing dev bypass logic)
  const auth = await authenticateAdmin(request);
  if (!auth.authenticated) {
    const host = request.headers.get('host') || '';
    const devBypassHeader = request.headers.get('x-dev-bypass');
    const isDevHost = (process.env.NODE_ENV === 'development') || host.includes('localhost');
    const allowBypass = isDevHost || devBypassHeader === '1';
    if (!allowBypass) return unauthorizedResponse(auth.error);
    console.warn('payments/confirm: admin auth failed — using development bypass (do not use in production).');
  }

  try {
    const body = await request.json().catch(() => ({}));
    const registrationId = Number(body?.registrationId || body?.id);
    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });
    }

    // Update registration payment status to confirmed and include user
    const registration = await prisma.registration.update({
      where: { id: registrationId },
      data: { paymentStatus: 'confirmed' },
      include: { user: true },
    });

    // Ensure the user has an accessCode — create one if missing
    let accessCode = registration.user?.accessCode;
    if (!accessCode) {
      accessCode = await makeUniqueAccessCode(registration.user?.name || registration.user?.email || `user${registration.user?.id}`);
      await prisma.user.update({
        where: { id: registration.user.id },
        data: { accessCode },
      });
      // refresh registration.user.accessCode locally
      registration.user.accessCode = accessCode;
    }

    // Fire-and-forget: call sendQr endpoint and include accessCode so the email contains it.
    (async () => {
      try {
        const sendQrResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/payments/sendQr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationId, email: registration.user.email, accessCode }),
        });
        if (!sendQrResponse.ok) {
          const text = await sendQrResponse.text().catch(() => '');
          console.warn('payments/confirm: sendQr failed', sendQrResponse.status, text);
        }
      } catch (err) {
        console.error('payments/confirm: sendQr error', err);
      }
    })();

    return NextResponse.json({ success: true, registration });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}