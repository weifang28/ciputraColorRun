import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email: string | undefined = body?.email;
    const name: string = body?.name || "Participant";
    const registrationId: number | undefined = body?.registrationId;

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const host = process.env.EMAIL_HOST ;
    const port = Number(process.env.EMAIL_PORT);
    const secure = (process.env.EMAIL_SECURE) === "true";
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      console.error("[notify/submission] SMTP not configured");
      return NextResponse.json({ error: "SMTP not configured" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    // optional: verify transport (makes failure explicit)
    try {
      await transporter.verify();
    } catch (err) {
      console.error("[notify/submission] transporter verify failed:", err);
      return NextResponse.json({ error: "Email transporter verification failed" }, { status: 500 });
    }

    const html = `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            🎉 Registration Received!
          </h1>
          <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">
            Ciputra Color Run 2026
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px; line-height: 1.6;">
            Dear <strong>${name}</strong>,
          </p>
          
          <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
            Thank you for registering for <strong>Ciputra Color Run 2026</strong>! We're thrilled to have you join us for the most colorful event in Surabaya.
          </p>

          ${registrationId ? `
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">
              <strong>Registration ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #047857;">#${registrationId}</span>
            </p>
          </div>
          ` : ''}

          <!-- Status -->
          <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px;">⏳</div>
              <div>
                <p style="margin: 0 0 4px 0; color: #92400e; font-weight: bold; font-size: 15px;">
                  Payment Under Review
                </p>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.4;">
                  We have received your payment proof and will verify it within <strong>24 hours</strong>.
                </p>
              </div>
            </div>
          </div>

          <!-- What's Next -->
          <div style="margin: 28px 0;">
            <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: bold;">
              What happens next?
            </h3>
            <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
              <li style="margin-bottom: 8px;">
                Our admin will verify your payment (usually within 24 hours)
              </li>
              <li style="margin-bottom: 8px;">
                You'll receive an <strong>access code</strong> via email once approved
              </li>
              <li style="margin-bottom: 8px;">
                Use the access code to view your registration details and QR code on the website
              </li>
            </ol>
          </div>

          <!-- WhatsApp CTA -->
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
               style="display: inline-block; background: #25D366; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px rgba(37, 211, 102, 0.3); transition: all 0.3s;">
              <span style="display: inline-flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">📱</span>
                Join WhatsApp Group
              </span>
            </a>
          </div>

          <!-- Important Note -->
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: bold; font-size: 14px;">
              ⚠️ Important
            </p>
            <p style="margin: 0; color: #7f1d1d; font-size: 13px; line-height: 1.5;">
              If your payment is declined, you'll receive an email notification with the reason. You can then register again with the correct information.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 12px 0; color: #111827; font-weight: bold; font-size: 14px;">
            Need Help?
          </p>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
            If you have any questions, feel free to contact our support team:
          </p>
          <div style="display: flex; gap: 20px; margin-top: 12px;">
            <div>
              <p style="margin: 0; color: #374151; font-size: 13px;">
                <strong style="color: #111827;">Abel</strong><br/>
                WhatsApp: <a href="https://wa.me/6289541031967" style="color: #059669; text-decoration: none;">0895410319676</a>
              </p>
            </div>
            <div>
              <p style="margin: 0; color: #374151; font-size: 13px;">
                <strong style="color: #111827;">Elysian</strong><br/>
                WhatsApp: <a href="https://wa.me/62811306658" style="color: #059669; text-decoration: none;">0811306658</a>
              </p>
            </div>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
            © 2026 Ciputra Color Run. All rights reserved.<br/>
            <span style="color: #6b7280;">Organized by Student Council of Universitas Ciputra</span>
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Ciputra Color Run 2026" <${user}>`,
      to: email,
      subject: "🎉 Registration Received — Ciputra Color Run 2026",
      html,
    });

    console.log(`[notify/submission] Email sent successfully to ${email}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[notify/submission] error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}