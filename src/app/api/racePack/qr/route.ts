import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qr = url.searchParams.get('qr') || url.searchParams.get('qrCodeData');
    if (!qr) {
      return NextResponse.json({ error: 'Missing qr query param' }, { status: 400 });
    }

    const qrCode = await prisma.qrCode.findUnique({
      where: { qrCodeData: qr },
      include: {
        registration: {
          include: {
            user: true,
            participants: {
              include: { jersey: true, category: true },
              orderBy: { id: 'asc' },
            },
          },
        },
        category: true,
      },
    });

    if (!qrCode) {
      return NextResponse.json({ error: 'QR not found' }, { status: 404 });
    }

    return NextResponse.json({ qrCode });
  } catch (err: any) {
    console.error('GET /api/racePack/qr error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}