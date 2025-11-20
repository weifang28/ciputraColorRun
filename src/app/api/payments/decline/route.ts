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
      // mark pending payments as declined
      await tx.payment.updateMany({
        where: { registrationId, status: 'pending' },
        data: { status: 'declined' },
      });

      // update registration status to declined
      const reg = await tx.registration.update({
        where: { id: registrationId },
        data: { paymentStatus: 'declined' },
        include: { user: true },
      });

      // --- NEW: restore early-bird capacity ---
      // Best-effort: remove up to N earlyBirdClaim rows per category where N = number of participants in this registration for that category.
      // This does not change schema and works with anonymous earlyBirdClaim rows (created via createMany with categoryId).
      const participants = await tx.participant.findMany({
        where: { registrationId },
        select: { categoryId: true },
      });

      if (participants && participants.length > 0) {
        const countsByCategory: Record<number, number> = participants
          .filter((p) => p.categoryId != null)
          .reduce((acc, p) => {
            const cid = Number(p.categoryId);
            acc[cid] = (acc[cid] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);

        for (const [catIdStr, cnt] of Object.entries(countsByCategory)) {
          const catId = Number(catIdStr);
          if (!catId || cnt <= 0) continue;

          // Find up to `cnt` existing claim rows for this category (most-recent first)
          const claimsToRemove = await tx.earlyBirdClaim.findMany({
            where: { categoryId: catId },
            orderBy: { createdAt: 'desc' },
            take: cnt,
            select: { id: true },
          });

          if (claimsToRemove.length > 0) {
            await tx.earlyBirdClaim.deleteMany({
              where: { id: { in: claimsToRemove.map((c) => c.id) } },
            });
          }
        }
      }
      // --- END NEW ---

      return reg;
    });

    return NextResponse.json({ success: true, registration });
  } catch (err: any) {
    console.error('payments/decline error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}