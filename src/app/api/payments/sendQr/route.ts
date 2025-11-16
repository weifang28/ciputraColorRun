import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { registrationId, email, accessCode } = await request.json().catch(() => ({}));
    if (!registrationId || !email) {
      return NextResponse.json({ error: 'Missing registrationId or email' }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id: Number(registrationId) },
      include: { user: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (accessCode && registration.user?.id) {
      try {
        await prisma.user.update({
          where: { id: registration.user.id },
          data: { accessCode },
        });
      } catch (e) {
        console.warn('[sendQr] failed to persist accessCode on user', e);
      }
    }

    const accessHtml = accessCode
      ? `<p><strong>Your access code:</strong> <code style="background:#f3f4f6;padding:4px 8px;border-radius:6px;">${accessCode}</code></p>
         <p>Use this code in the mobile app or profile page to manage your registration.</p>`
      : `<p>Your registration has been confirmed. No access code available.</p>`;

    // Build transporter using env
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = Number(process.env.EMAIL_PORT || 465);
    const secure = (process.env.EMAIL_SECURE || 'true') === 'true';
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      console.error('[sendQr] Missing EMAIL_USER or EMAIL_PASS environment variables');
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

    try {
      // verify transporter early to make error clearer
      await transporter.verify();
    } catch (err: any) {
      console.error('[sendQr] Email transporter verification failed:', err);
      return NextResponse.json(
        {
          error:
            'Email transporter verification failed. Check EMAIL_USER / EMAIL_PASS and provider settings. ' +
            (err?.message || String(err)),
        },
        { status: 500 }
      );
    }

    const mailOptions = {
      from: `"Ciputra Color Run" <${user}>`,
      to: email,
      subject: 'Ciputra Color Run - Your Access Code',
      html: `
        <h1>Thank you for registering!</h1>
        <p>Your payment has been confirmed.</p>
        ${accessHtml}
        <p>If you did not expect this email, please contact the event organiser.</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[sendQr] sendMail result:', {
      accepted: info.accepted,
      rejected: info.rejected,
      envelope: info.envelope,
      response: info.response,
    });

    return NextResponse.json({ success: true, sent: { accepted: info.accepted, rejected: info.rejected } });
  } catch (error) {
    console.error('[sendQr] Error sending access code email:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}