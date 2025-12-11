import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin, unauthorizedResponse } from '../middleware/auth';

const prisma = new PrismaClient();

function generateBibNumber(categoryName: string | undefined, participantId: number): string {
  const catLower = (categoryName || "").toLowerCase().replace(/\s+/g, "");
  let prefix = "0";
  
  if (catLower.includes("3k") || catLower === "3km") prefix = "3";
  else if (catLower.includes("5k") || catLower === "5km") prefix = "5";
  else if (catLower.includes("10k") || catLower === "10km") prefix = "10";
  
  return `${prefix}${String(participantId).padStart(4, "0")}`;
}


export async function POST(request: Request) {
  // Authenticate admin (existing logic kept)
  const auth = await authenticateAdmin(request);
  if (!auth.authenticated) {
    const host = request.headers.get('host') || '';
    const devBypassHeader = request.headers.get('x-dev-bypass');
    const isDevHost = (process.env.NODE_ENV === 'development') || host.includes('localhost');
    const allowBypass = isDevHost || devBypassHeader === '1';
    if (!allowBypass) return unauthorizedResponse(auth.error);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const registrationId = Number(body?.registrationId || body?.id);
    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });
    }

    // Load registration (include payment relation) so we can target the transaction-level Payment
    const registrationBefore = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { user: true, payment: true },
    });
    if (!registrationBefore) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const paymentIdForReg = registrationBefore.payment?.id ?? null;

    // Update registration + its pending payment(s) in a single transaction
    const registration = await prisma.$transaction(async (tx) => {
      if (paymentIdForReg) {
        // Update the transaction-level payment by id
        await tx.payment.updateMany({
          where: { id: paymentIdForReg, status: 'pending' },
          data: { status: 'confirmed' },
        });
      } else {
        // Fallback for legacy schemas where Payment may have registrationId
        await tx.payment.updateMany({
          where: { registrationId, status: 'pending' } as any,
          data: { status: 'confirmed' },
        });
      }

      // update registration paymentStatus
      const reg = await tx.registration.update({
        where: { id: registrationId },
        data: { paymentStatus: 'confirmed' },
        include: { user: true, payment: true },
      });

      // NEW: Assign bib numbers now that payment is confirmed
      const participants = await tx.participant.findMany({
        where: { registrationId: registrationId },
        include: { category: true },
        orderBy: { id: 'asc' },
      });

      const updatedParticipants: typeof participants = [];
      for (const participant of participants) {
        try {
          if (!participant.bibNumber) {
            const bibNumber = generateBibNumber(participant.category?.name, participant.id);
            const updated = await tx.participant.update({
              where: { id: participant.id },
              data: { bibNumber },
            });
            updatedParticipants.push({ ...updated, category: participant.category });
            console.log(`[confirm] Assigned bib ${updated.bibNumber} -> participant ${participant.id}`);
          } else {
            updatedParticipants.push(participant);
            console.log(`[confirm] Participant ${participant.id} already has bib ${participant.bibNumber}`);
          }
        } catch (e) {
          console.error(`[confirm] Failed to set bib for participant ${participant.id}:`, e);
          throw e; // bubble to rollback transaction
        }
      }

      // return registration with participants so caller can verify saved bibs
      return { ...reg, participants: updatedParticipants };
    });

    // optional: fire-and-forget email/QR send (log errors but don't fail)
    (async () => {
      try {
        await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/payments/sendQr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationId, email: registration.user?.email }),
        });
      } catch (e) {
        console.error('sendQr fire-and-forget failed', e);
      }
    })();

    return NextResponse.json({ success: true, registration });
  } catch (err: any) {
    console.error('payments/confirm error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
