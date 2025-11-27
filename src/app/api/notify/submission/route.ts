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
      <div style="font-family:Inter, Arial, sans-serif; color:#111827; max-width:680px; margin:0 auto;">
        <h2 style="color:#0f172a;">Registration Submitted</h2>
        <p>Hi ${name},</p>
        <p>We have received your payment submission for Ciputra Color Run. Your registration is now recorded and is awaiting verification by our team. You will receive another email once your payment is confirmed.</p>
        <p style="margin-top:12px;">Thank you,<br/>Ciputra Color Run Team</p>
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