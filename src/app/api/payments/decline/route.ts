import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateAdmin, unauthorizedResponse } from '../../middleware/auth';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  // Authenticate admin
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
    const declineReason = body?.reason || "Payment proof was not valid or could not be verified.";
    
    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });
    }

    // Get registration details before updating (include payment relation to get payment id)
    const registrationBefore = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { user: true, payment: true },
    });
 
    if (!registrationBefore) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
 
    // Update both payment records and registration status inside a transaction
    const paymentIdForReg = registrationBefore.payment?.id ?? null;
    const registration = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
       // If this registration belongs to a transaction-level payment, decline that payment (by id)
       if (paymentIdForReg) {
         await tx.payment.updateMany({
           where: { id: paymentIdForReg, status: 'pending' },
           data: { status: 'declined' },
         });
       } else {
         // Fallback for legacy rows where Payment may have registrationId field
         await tx.payment.updateMany({
           where: { registrationId, status: 'pending' } as any,
           data: { status: 'declined' },
         });
       }
 
       // update registration status to declined
       const reg = await tx.registration.update({
         where: { id: registrationId },
         data: { paymentStatus: 'declined' },
         include: { user: true },
       });
 
      // Restore early-bird capacity
      const participants = await tx.participant.findMany({
        where: { registrationId },
        select: { categoryId: true },
      });

      if (participants && participants.length > 0) {
        const categoryMap: Record<number, number> = {};
        // avoid implicit `any` by typing the callback parameter
        participants.forEach((p: any) => {
          const cid = typeof p.categoryId === "number" ? p.categoryId : null;
          if (cid === null) return; // skip participants without a category
          categoryMap[cid] = (categoryMap[cid] || 0) + 1;
        });
 
        for (const [catIdStr, count] of Object.entries(categoryMap)) {
          const catId = Number(catIdStr);
          const claims = await tx.earlyBirdClaim.findMany({
            where: { categoryId: catId },
            orderBy: { id: 'desc' },
            take: count,
          });
          if (claims.length > 0) {
            const claimsToRemove = claims.slice(0, Math.min(count, claims.length));
            await tx.earlyBirdClaim.deleteMany({
              where: { id: { in: claimsToRemove.map((c: any) => c.id) } },
            });
          }
        }
      }

      return reg;
    });

    // Send decline notification email
    if (registration.user?.email) {
      try {
        await sendDeclineEmail(
          registration.user.email,
          registration.user.name || "Participant",
          registrationId,
          declineReason
        );
      } catch (emailError) {
        console.error('Failed to send decline email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ success: true, registration });
  } catch (err: any) {
    console.error('payments/decline error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

async function sendDeclineEmail(
  email: string,
  name: string,
  registrationId: number,
  reason: string
): Promise<void> {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);
  const secure = (process.env.EMAIL_SECURE) === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('EMAIL_USER or EMAIL_PASS not configured');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const mailOptions = {
    from: `"Ciputra Color Run 2026" <${user}>`,
    to: email,
    subject: 'Oops! Your Registration Didn’t Go Through 🛑',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; color:#111827;">
        <h1 style="margin:0 0 8px 0; font-size:22px; color:#0f172a;">We Could Not Complete Your Registration</h1>
        <p style="margin:0 0 14px 0; font-size:16px; color:#374151;">
          It looks like we hit a bump in the road. Unfortunately, your registration for <strong>Ciputra Color Run 2026</strong> was not successful and has not been verified.
        </p>

        <h3 style="margin-top:10px; margin-bottom:6px; color:#0b63a3;">Why did this happen?</h3>
        <ul style="margin:0 0 14px 18px; color:#374151; line-height:1.6;">
          <li><strong>Payment Timeout:</strong> The time limit to complete the payment expired.</li>
          <li><strong>Transaction Issue:</strong> The payment was declined by the bank or e-wallet (insufficient funds or system error).</li>
          <li><strong>Connection Error:</strong> An unstable internet connection interrupted the checkout process.</li>
        </ul>

        <h3 style="margin-top:6px; margin-bottom:6px; color:#0b63a3;">What should you do?</h3>
        <p style="margin:0 0 16px 0; color:#374151;">
          Don’t worry! If you were not charged, you can simply try registering again. If you believe a deduction was made from your account, please contact our support team immediately with your transaction proof.
        </p>

        <div style="text-align:center; margin:18px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/registration" 
             style="display:inline-block; padding:12px 28px; background:#059669; color:#fff; border-radius:999px; text-decoration:none; font-weight:600;">
            Try Registering Again
          </a>
        </div>

        <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />

        <p style="margin:0 0 6px 0; color:#374151;">Need help? Contact us at:</p>
        <p style="margin:4px 0 0 0; color:#374151;"><strong>Abel</strong><br/>WA: 0895410319676</p>
        <p style="margin:6px 0 0 0; color:#374151;"><strong>Elysian</strong><br/>WA: 0811306658</p>

        <p style="margin-top:18px; font-size:13px; color:#6b7280;">If you believe this is a mistake, reply to this email and include your payment proof so we can investigate.</p>
      </div>
    `,
  };
  
  await transporter.sendMail(mailOptions);
}