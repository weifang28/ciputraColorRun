import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateAdmin, unauthorizedResponse } from '../../middleware/auth';
import QRCode from "qrcode";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

// Bib number generator (same logic used in other payment handlers)
function generateBibNumber(categoryName: string | undefined, participantId: number): string {
  const catLower = (categoryName || "").toLowerCase().replace(/\s+/g, "");
  let prefix = "0";
  if (catLower.includes("3k") || catLower === "3km") prefix = "3";
  else if (catLower.includes("5k") || catLower === "5km") prefix = "5";
  else if (catLower.includes("10k") || catLower === "10km") prefix = "10";
  return `${prefix}${String(participantId).padStart(4, "0")}`;
}

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
    // load registration with the singular payment relation (schema uses `payment`)
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { user: true, payment: true },
    });
    if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

    // CRITICAL: Use the userId from this specific registration, not from email lookup
    const userId = registration.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Registration has no associated user' }, { status: 400 });
    }

    console.log('[payments/confirm] Processing registration:', registrationId, 'for user ID:', userId);

    // Get the SPECIFIC user by ID (not by email)
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[payments/confirm] Found user:', user.id, 'Name:', user.name, 'Email:', user.email, 'Current accessCode:', user.accessCode);

    // 1) Ensure THIS specific user has an access code
    let accessCode = user.accessCode;
    
    // If THIS user doesn't have an access code yet, generate one specifically for them
    if (!accessCode) {
      console.log('[payments/confirm] User', userId, 'has no access code, generating new one');
      accessCode = await makeUniqueAccessCode(user.name || user.email || `user${Date.now()}`);
      console.log('[payments/confirm] Generated access code for user', userId, ':', accessCode);
    } else {
      console.log('[payments/confirm] User', userId, 'already has access code:', accessCode);
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
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // mark the transaction-level payment (if present) as confirmed
      if (registration.paymentId) {
        await tx.payment.updateMany({
          where: { id: registration.paymentId, status: 'pending' },
          data: { status: 'confirmed' },
        });
      }

      // CRITICAL: Update ONLY this specific user by their unique ID with their access code
      console.log('[payments/confirm] Updating user', userId, 'with access code:', accessCode);
      await tx.user.update({
        where: { id: userId }, // CRITICAL: Use the exact userId, not email
        data: { accessCode },
      });

      // update registration paymentStatus
      const reg = await tx.registration.update({
        where: { id: registrationId },
        data: { paymentStatus: 'confirmed' },
        include: { user: true, payment: true },
      });

      console.log('[payments/confirm] Updated registration', registrationId, 'payment status to confirmed');

      // --- Assign bib numbers for participants in this registration ---
      const participants = await tx.participant.findMany({
        where: { registrationId },
        include: { category: true },
        orderBy: { id: 'asc' },
      });
 
      // --- Global counter: scan DB for highest 4-digit suffix and start from max+1 ---
      const existingBibs = await tx.participant.findMany({
        where: { bibNumber: { not: null } as any },
        select: { bibNumber: true },
      });
      let maxSuffix = 0;
      for (const p of existingBibs) {
        const bn = String(p.bibNumber || "");
        if (bn.length < 4) continue;
        const suffix = bn.slice(-4); // last 4 digits are the numeric counter
        const n = parseInt(suffix, 10);
        if (!Number.isNaN(n) && n > maxSuffix) maxSuffix = n;
      }
      let globalCounter = maxSuffix + 1;
 
      const updatedParticipants: typeof participants = [];
      for (const participant of participants) {
        try {
          // defensive: ensure we have a numeric id
          const pid = Number(participant?.id);
          if (Number.isNaN(pid) || pid <= 0) {
            console.warn(`[payments/confirm] Skipping participant with invalid id:`, participant);
            continue;
          }

          if (!participant.bibNumber) {
            // compute prefix from category name
            const catLower = (participant.category?.name || "").toLowerCase().replace(/\s+/g, "");
            let prefix = "0";
            if (catLower.includes("3k") || catLower === "3km") prefix = "3";
            else if (catLower.includes("5k") || catLower === "5km") prefix = "5";
            else if (catLower.includes("10k") || catLower === "10km") prefix = "10";

            const bibNumber = `${prefix}${String(globalCounter).padStart(4, "0")}`;

            // Ensure we pass primitives to Prisma and not accidental objects
            const updated = await tx.participant.update({
              where: { id: pid },
              data: { bibNumber: String(bibNumber) },
            });

            globalCounter += 1; // advance global counter for next participant

            updatedParticipants.push({ ...updated, category: participant.category });
            console.log(`[payments/confirm] Assigned bib ${updated.bibNumber} -> participant ${pid}`);
          } else {
            updatedParticipants.push(participant);
            console.log(`[payments/confirm] Participant ${participant.id} already has bib ${participant.bibNumber}`);
          }
        } catch (e) {
          console.error(`[payments/confirm] Failed to set bib for participant ${participant?.id}:`, e);
          throw e; // rollback transaction if anything fails
        }
      }

      // attach participants to registration for response
      const regWithParticipants = { ...reg, participants: updatedParticipants };
 
      return regWithParticipants;
    });

    console.log('[payments/confirm] Transaction completed for user:', userId);

    // 4) Verify the user was updated correctly
    const verifyUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    console.log('[payments/confirm] Verification - User', userId, 'now has access code:', verifyUser?.accessCode);

    // 5) Fetch QR codes for all registrations that belong to the same payment (if any).
    // If this registration is part of a transaction-level payment, include QR codes for all registrations covered by that payment.
    const paymentId = registration.paymentId ?? null;
    let registrationsForPayment: any[] = [];
    let qrRecords: any[] = [];

    if (paymentId) {
      // fetch all registrations attached to this payment, include their qrCodes and category
      registrationsForPayment = await prisma.registration.findMany({
        where: { paymentId },
        include: {
          qrCodes: { include: { category: true } },
        },
        orderBy: { id: 'asc' },
      });
      // flatten qr records and keep registration context
      qrRecords = registrationsForPayment.flatMap(r => (r.qrCodes || []).map((q: any) => ({ ...q, _registration: r })));
    } else {
      // fallback: single registration
      const singleRegs = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { qrCodes: { include: { category: true } } },
      });
      registrationsForPayment = singleRegs ? [singleRegs] : [];
      qrRecords = (singleRegs?.qrCodes || []).map((q: any) => ({ ...q, _registration: singleRegs }));
    }

    // Build attachments (inline) and HTML grouped by registration
    const attachments: any[] = [];
    const qrHtmlPartsByReg: Record<number, string[]> = {};

    // Build absolute host once
    const hostHeader = request.headers.get('host') || 'ciputrarun.com';
    const protocol = hostHeader.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${hostHeader}`;

    for (const q of qrRecords) {
      const label = q.category?.name ? `<p style="margin:6px 0 8px;font-weight:600">${q.category?.name}</p>` : "";
      const rawToken = String(q.qrCodeData || "");
      const payload = rawToken.startsWith('http') ? rawToken : `${appUrl}/claim/${encodeURIComponent(rawToken)}`;

      console.log(`[confirm] Generated QR URL: ${payload} (reg ${q.registrationId})`);

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

      const regId = q._registration?.id ?? q.registrationId;
      qrHtmlPartsByReg[regId] = qrHtmlPartsByReg[regId] || [];
      qrHtmlPartsByReg[regId].push(
        `<div style="display:inline-block;margin:10px;text-align:center">
           ${label}
           <a href="${payload}" target="_blank" rel="noreferrer" style="text-decoration:none;color:inherit">
             <img src="cid:${cid}" alt="QR Code" style="max-width:300px;border-radius:8px;border:1px solid #e5e7eb" />
           </a>
         </div>`
      );
    }

    // Join QR parts grouped by registration with headings
    const qrHtmlParts: string[] = registrationsForPayment.map(r => {
      const regHeader = `<h3 style="margin-bottom:6px;">Registration #${r.id}${r.groupName ? ` — ${r.groupName}` : ''}</h3>`;
      const parts = (qrHtmlPartsByReg[r.id] || []).join('');
      return `<section style="margin-bottom:18px;">${regHeader}${parts || '<p>No QR codes available</p>'}</section>`;
    });
 
    // Build complete email HTML (include grouped registration QR sections)
    const mailHtml = `
      <div style="font-family: Inter, Arial, sans-serif; color:#111827; line-height:1.5; max-width:680px;">
        <h1 style="color:#0f172a;">Your Registration is Verified!</h1>
        <p>Thank you for registering! You are officially on the list for the most colorful event in Surabaya.</p>
        <p><strong>Order Number:</strong> #${updated.id}</p>
        <p><strong>Access Code (Login to profile): </strong>${accessHtml}</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>

        <h2 style="color:#059669;">Your QR Codes:</h2>
        <p>Below are your QR codes for race pack collection. You can also view them anytime by logging into your profile using your access code.</p>
        <div>${qrHtmlParts.join("")}</div>

        <p style="margin-top:20px;font-size:13px;color:#6b7280;">
          <strong>Important:</strong> Present these QR codes at the race pack collection point along with your valid ID (KTP/Birth Certificate/Passport).
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>

        <p style="margin:0 0 6px;"><strong>Need Help?</strong> If you did not register for this event or believe you received this email by mistake, please contact our support team immediately:</p>
        <p style="margin:4px 0 0;"><strong>Abel</strong><br/>WA: 0895410319676</p>
        <p style="margin:4px 0 0;"><strong>Elysian</strong><br/>WA: 0811306658</p>
      </div>
    `;

    try {
      // CRITICAL: Send email to the SPECIFIC user's email from the registration
      const mailOptions: any = {
        from: `"Ciputra Color Run 2026" <${emailUser}>`,
        to: user.email, // Use the specific user's email fetched by ID
        subject: 'Your Registration is Verified — Ciputra Color Run',
        html: mailHtml,
        attachments,
      };
      
      console.log('[confirm] Sending email to:', user.email, 'for user ID:', userId);
      
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