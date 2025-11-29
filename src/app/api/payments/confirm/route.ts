import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin, unauthorizedResponse } from '../../middleware/auth';
import QRCode from "qrcode";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

async function makeUniqueAccessCode(baseName: string): Promise<string> {
  // Extract first name (first word before space)
  const firstName = (baseName || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)[0] || 'user';

  // Generate random string (8 characters)
  const randomStr = Math.random().toString(36).substring(2, 10);
  
  const accessCode = `${firstName}_${randomStr}`;
  
  // Check if code already exists (very unlikely but good practice)
  const exists = await prisma.user.findUnique({ where: { accessCode } });
  
  if (exists) {
    // If by chance it exists, add timestamp
    return `${firstName}_${randomStr}_${Date.now().toString(36)}`;
  }
  
  return accessCode;
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

    // 0) Load registration + user - CRITICAL: Get the specific userId from this registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { user: true, payments: true },
    });
    if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

    // CRITICAL: Use the userId from this specific registration, not from email lookup
    const userId = registration.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Registration has no associated user' }, { status: 400 });
    }

    // Get the user by ID (not by email)
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 1) Ensure we have an access code (use existing or generate new one)
    let accessCode = user.accessCode;
    
    // If user doesn't have an access code yet, generate one
    if (!accessCode) {
      accessCode = await makeUniqueAccessCode(user.name || user.email || `user${Date.now()}`);
    }

    // 2) Build email content
    const accessHtml = accessCode
      ? `<p><strong>Your access code:</strong> <code style="background:#f3f4f6;padding:4px 8px;border-radius:6px;">${accessCode}</code></p>
         <p>Use this code to log in at <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login</a> and view your registration details.</p>`
      : `<p>Your registration has been confirmed. No access code available.</p>`;

    // SMTP configuration
    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT);
    const secure = (process.env.EMAIL_SECURE) === 'true';
    const emailUser = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!emailUser || !pass) {
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
      auth: { user: emailUser, pass },
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

    // 3) Perform DB updates first, then send email
    const updated = await prisma.$transaction(async (tx) => {
      // mark payments as confirmed
      await tx.payment.updateMany({
        where: { registrationId, status: 'pending' },
        data: { status: 'confirmed' },
      });

      // CRITICAL: Update the specific user by ID with their access code
      await tx.user.update({
        where: { id: userId }, // Use userId, not email
        data: { accessCode },
      });

      // update registration paymentStatus
      const reg = await tx.registration.update({
        where: { id: registrationId },
        data: { paymentStatus: 'confirmed' },
        include: { user: true, payments: true },
      });

      // Deduct jersey quantities
      const participants = await tx.participant.findMany({
        where: { registrationId },
        include: { jersey: true },
      });

      const jerseyUpdates = participants.reduce((acc: Record<number, number>, p) => {
        if (p.jerseyId) {
          acc[p.jerseyId] = (acc[p.jerseyId] || 0) + 1;
        }
        return acc;
      }, {});

      for (const [jerseyIdStr, count] of Object.entries(jerseyUpdates)) {
        const jerseyId = Number(jerseyIdStr);
        const jersey = await tx.jerseyOption.findUnique({ where: { id: jerseyId } });
        if (jersey && jersey.quantity !== null) {
          const newQty = Math.max(0, jersey.quantity - count);
          await tx.jerseyOption.update({
            where: { id: jerseyId },
            data: { quantity: newQty },
          });
        }
      }

      return reg;
    });

    // 4) Fetch QR codes for this registration
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
      
      // FIX: Build absolute claim URL using request host instead of env variables
      const host = request.headers.get('host') || 'ciputrarun.com';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const appUrl = `${protocol}://${host}`;
      
      const payload = rawToken.startsWith('http') ? rawToken : `${appUrl}/claim/${encodeURIComponent(rawToken)}`;
      
      console.log(`[confirm] Generated QR URL: ${payload}`); // Debug log

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

    // Build complete email HTML
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
        from: `"Ciputra Color Run 2026" <${emailUser}>`,
        to: user.email, // CRITICAL: Send to the specific user's email from the registration
        subject: 'Your Registration is Verified — Ciputra Color Run',
        html: mailHtml,
        attachments,
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