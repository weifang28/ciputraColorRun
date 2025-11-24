import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin, unauthorizedResponse } from '../../middleware/auth';
import QRCode from "qrcode";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

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
  // Authenticate admin (keeps your dev bypass logic)
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

    // 0) Load registration + user
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { user: true, payments: true },
    });
    if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

    // 1) Ensure we have an access code to email (generate but do not persist yet)
    const accessCode = registration.user?.accessCode || await makeUniqueAccessCode(registration.user?.name || registration.user?.email || `user${Date.now()}`);

    // 2) Build email content (same structure as sendQr route)
    const accessHtml = accessCode
      ? `<p><strong>Your access code:</strong> <code style="background:#f3f4f6;padding:4px 8px;border-radius:6px;">${accessCode}</code></p>
         <p>Use this code in the mobile app or profile page to manage your registration.</p>`
      : `<p>Your registration has been confirmed. No access code available.</p>`;

    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT);
    const secure = (process.env.EMAIL_SECURE) === 'true';
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      console.error('[confirm] Missing EMAIL_USER or EMAIL_PASS environment variables');
      return NextResponse.json(
        { error: 'SMTP credentials are not configured. Set EMAIL_USER and EMAIL_PASS.' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    // verify SMTP first (fail fast)
    try {
      await transporter.verify();
    } catch (err: any) {
      console.error('[confirm] Email transporter verification failed:', err);
      return NextResponse.json(
        { error: 'Email transporter verification failed. Check EMAIL_USER / EMAIL_PASS and provider settings.' },
        { status: 500 }
      );
    }

    // 3) Email will include QR images — perform DB updates first, then build & send the enriched email
    const updated = await prisma.$transaction(async (tx) => {
      // mark payments as confirmed
      await tx.payment.updateMany({
        where: { registrationId, status: 'pending' },
        data: { status: 'confirmed' },
      });

      // ensure user accessCode persisted if we generated one
      if (registration.user && !registration.user.accessCode) {
        await tx.user.update({
          where: { id: registration.user.id },
          data: { accessCode },
        });
      }

      // update registration paymentStatus
      const reg = await tx.registration.update({
        where: { id: registrationId },
        data: { paymentStatus: 'confirmed' },
        include: { user: true, payments: true },
      });

      return reg;
    });

    // fetch QR records for this registration and create image buffers & attachments
    const qrRecords = await prisma.qrCode.findMany({
      where: { registrationId },
      include: { category: true },
      orderBy: { id: 'asc' },
    });

    // Build attachments (inline) and HTML parts for each QR
    const attachments: any[] = [];
    const qrHtmlParts: string[] = [];
    for (const q of qrRecords) {
      const label = q.category?.name ? `<p style="margin:6px 0 8px;font-weight:600">${q.category?.name}</p>` : "";
      const rawToken = String(q.qrCodeData || "");
      // Build absolute claim URL (server-side). Use NEXT_PUBLIC_APP_URL / APP_URL fallback.
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
      const payload = rawToken.startsWith('http') ? rawToken : `${appUrl}/claim/${encodeURIComponent(rawToken)}`;

      // generate PNG buffer server-side
      let pngBuffer: Buffer;
      try {
        pngBuffer = await QRCode.toBuffer(payload, { type: "png", width: 400, margin: 1 });
      } catch (e) {
        console.error("[confirm] QR generation failed for", q.id, e);
        continue;
      }

      const cid = `qr-${q.id}@ciputra`;
      attachments.push({
        filename: `qr-${q.id}.png`,
        content: pngBuffer,
        cid,
      });

      // Wrap the inline image with a link that points to the claim page URL
      qrHtmlParts.push(
        `<div style="display:inline-block;margin:10px;text-align:center">
           ${label}
           <a href="${payload}" target="_blank" rel="noreferrer" style="text-decoration:none;color:inherit">
             <img src="cid:${cid}" alt="QR Code" style="max-width:300px;border-radius:8px;border:1px solid #e5e7eb" />
           </a>
         </div>`
      );
    }

    const mailHtml = `
      <div style="font-family: Inter, Arial, sans-serif; color:#111827; line-height:1.5; max-width:680px;">
        <h1 style="color:#0f172a;">Your Registration is Verified!</h1>
        <p>Thank you for registering! You are officially on the list for the most colorful event in Surabaya.</p>
        <p><strong>Order Number:</strong> #${updated.id}</p>
        <p><strong>Access Code (Login to profile): </strong>${accessHtml}</p>
        <p>Below is your unique QR Code. This is your ticket to joining the fun. Please present this code to our staff to claim your gear during the Race Pack Collection days.</p>
        <div style="margin:18px 0; display:flex; flex-wrap:wrap; gap:12px;">
          ${qrHtmlParts.join("\n")}
        </div>
        <div style="margin-top:12px; padding:12px; background:#fff7ed; border-radius:8px; border:1px solid #ffedd5;">
          <strong>Important Note:</strong>
          <p style="margin:6px 0 0;">Keep this QR Code private! Please do not share it with anyone unless they are a trusted person collecting the pack on your behalf. Treat it like a ticket; we don't want anyone else claiming your Race Pack!</p>
        </div>
        <hr style="margin:20px 0; border:none; border-top:1px solid #e5e7eb;" />
        <p style="margin:0 0 6px;"><strong>Need Help?</strong> If you did not register for this event or believe you received this email by mistake, please contact our support team immediately:</p>
        <p style="margin:4px 0 0;"><strong>Abel</strong><br/>WA: 0895410319676</p>
        <p style="margin:4px 0 0;"><strong>Elysian</strong><br/>WA: 0811306658</p>
      </div>
    `;

    try {
      const mailOptions: any = {
        from: `"Ciputra Color Run 2026" <${user}>`,
        to: updated.user?.email,
        subject: 'Your Registration is Verified — Ciputra Color Run',
        html: mailHtml,
        attachments, // inline QR images here
      };
      const info = await transporter.sendMail(mailOptions);
      console.log('[confirm] sendMail result:', { accepted: info.accepted, rejected: info.rejected });
    } catch (err: any) {
      console.error('[confirm] Error sending confirmation email with QR images:', err);
      // still return success because DB transaction succeeded; log error for manual retry
    }

    return NextResponse.json({ success: true, registration: updated });
  } catch (error: any) {
    console.error('payments/confirm error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}