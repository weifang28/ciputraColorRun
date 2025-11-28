import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email: string | undefined = body?.email;
    const name: string = body?.name || "Participant";

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = Number(process.env.EMAIL_PORT || 465);
    const secure = (process.env.EMAIL_SECURE || "true") === "true";
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
      // proceed to try sending — or return error:
      return NextResponse.json({ error: "Email transporter verification failed" }, { status: 500 });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Registration Received!</h2>
          <p>Dear ${name || "Participant"},</p>
          <p>Thank you for registering for Ciputra Color Run 2026!</p>
          <p>Your registration ID is: <strong>#${registrationId}</strong></p>
          <p>We have received your payment proof and will verify it shortly.</p>
          <a href="https://chat.whatsapp.com/HkYS1Oi3CyqFWeVJ7d18Ve" style="display: inline-block; background: #25D366; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Join WhatsApp Group</a>
          <br><br>
          <p>Best regards,<br>Ciputra Color Run Team</p>
        </div>
    `;

    await transporter.sendMail({
      from: `"Ciputra Color Run" <${user}>`,
      to: email,
      subject: "Registration received — awaiting confirmation",
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[notify/submission] error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}