// src/app/api/notify/access-code/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId: number | undefined = body?.userId;
    const registrationId: number | undefined = body?.registrationId;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Get user by ID (not by email)
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.email || !user.accessCode) {
      console.warn("[notify/access-code] User has no email or access code:", userId);
      return NextResponse.json({ error: "User has no email or access code" }, { status: 400 });
    }

    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT);
    const secure = (process.env.EMAIL_SECURE) === "true";
    const emailUser = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!emailUser || !pass) {
      console.error("[notify/access-code] SMTP not configured");
      return NextResponse.json({ error: "SMTP not configured" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: emailUser, pass },
    });

    // Verify transport
    try {
      await transporter.verify();
    } catch (err: any) {
      console.error("[notify/access-code] SMTP verification failed:", err);
      return NextResponse.json({ error: "SMTP verification failed" }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const loginUrl = `${appUrl}/auth/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              🎉 Registration Successful!
            </h1>
            <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">
              Ciputra Color Run 2026
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 32px 24px;">
            <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">
              Dear <strong>${user.name || 'Participant'}</strong>,
            </p>

            <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
              Thank you for registering for <strong>Ciputra Color Run 2026</strong>! We're thrilled to have you join the most colorful event in Surabaya.
            </p>

            ${registrationId ? `
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; color: #065f46; font-size: 14px;">
                <strong>Registration ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #047857;">#${registrationId}</span>
              </p>
            </div>
            ` : ''}

            <!-- Payment Status -->
            <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px;">⏳</div>
                <div>
                  <p style="margin: 0 0 4px 0; color: #92400e; font-weight: bold; font-size: 15px;">
                    Payment Under Review
                  </p>
                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.4;">
                    We have received your payment proof and will verify it within <strong>48 hours</strong>.
                  </p>
                </div>
              </div>
            </div>

            <!-- Access Code Section -->
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 3px solid #3b82f6; border-radius: 12px; padding: 28px; margin: 28px 0; text-align: center;">
              <p style="margin: 0 0 16px 0; color: #1e40af; font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                🔑 Your Access Code
              </p>
              <div style="background: #ffffff; border: 3px dashed #3b82f6; border-radius: 10px; padding: 20px; margin: 16px 0;">
                <code style="font-size: 32px; font-weight: bold; color: #1e40af; font-family: 'Courier New', Consolas, monospace; letter-spacing: 3px; display: block;">
                  ${user.accessCode}
                </code>
              </div>
              <p style="margin: 16px 0 0 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                <strong>⚠️ Save this code!</strong><br>
                Use it to check your payment status and view registration details
              </p>
            </div>

            <!-- Login Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                Login to Your Profile →
              </a>
            </div>

            <!-- What happens next -->
            <div style="margin: 28px 0;">
              <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold;">
                What happens next?
              </h3>
              <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                <li style="margin-bottom: 8px;">
                  Our admin will verify your payment (usually within <strong>48 hours</strong>).
                </li>
                <li style="margin-bottom: 8px;">
                  Once approved, you'll receive a <strong>confirmation email with your QR code</strong>.
                </li>
                <li style="margin-bottom: 8px;">
                  You can check your payment status anytime by logging in with your access code.
                </li>
              </ol>
            </div>

            <!-- WhatsApp Group CTA -->
            <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 24px; margin: 28px 0; text-align: center;">
              <div style="margin-bottom: 16px;">
                <div style="font-size: 32px; margin-bottom: 8px;">💬</div>
                <h3 style="margin: 0 0 8px 0; color: #065f46; font-size: 18px; font-weight: bold;">
                  Join Our WhatsApp Group
                </h3>
                <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.5;">
                  Get event updates, important announcements, and connect with other participants!
                </p>
              </div>
              <a href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve" 
                 style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px rgba(37, 211, 102, 0.3);">
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                  <span style="font-size: 20px;">📱</span>
                  Join WhatsApp Group
                </span>
              </a>
            </div>

            <!-- Important Warning -->
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: bold; font-size: 14px;">
                ⚠️ Important
              </p>
              <p style="margin: 0; color: #7f1d1d; font-size: 13px; line-height: 1.5;">
                If your payment is declined, you'll receive an email notification with the reason. You can then register again with the correct information.
              </p>
            </div>

            <!-- Support -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; color: #111827; font-weight: bold; font-size: 14px;">
                Need Help?
              </p>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                If you have any questions, feel free to contact our support team:
              </p>
              <div style="margin-top: 12px;">
                <p style="margin: 6px 0; color: #374151; font-size: 14px;">
                  <strong>📱 Abel</strong> — WhatsApp: <a href="https://wa.me/6289541031967" style="color: #059669; text-decoration: none;">0895410319676</a>
                </p>
                <p style="margin: 6px 0; color: #374151; font-size: 14px;">
                  <strong>📱 Elysian</strong> — WhatsApp: <a href="https://wa.me/62811306658" style="color: #059669; text-decoration: none;">0811306658</a>
                </p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
              © 2026 Ciputra Color Run. All rights reserved.
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
              This email was sent to ${user.email}
            </p>
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
              You received this because you registered for Ciputra Color Run 2026
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Ciputra Color Run 2026" <${emailUser}>`,
      to: user.email,
      subject: "🎉 Registration Successful — Your Access Code Inside!",
      html,
    });

    console.log(`[notify/access-code] Email sent successfully to user ${userId} (${user.email})`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[notify/access-code] error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}