// src/app/api/profile/purchases/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Fungsi helper yang sama untuk membaca cookie
async function getAccessCodeFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  return token?.value;
}

export async function GET(req: Request) {
  try {
    // try cookie first (server-side)
    let accessCode = await getAccessCodeFromCookie();

    // fallback: allow query param ?accessCode=... for dev / client-side fetch
    const url = new URL(req.url);
    const accessCodeQuery = url.searchParams.get('accessCode');
    if (!accessCode && accessCodeQuery) {
      accessCode = accessCodeQuery;
    }

    if (!accessCode) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 1. Temukan user berdasarkan cookie / query param
    const user = await prisma.user.findUnique({
      where: { accessCode },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ambil registrasi + peserta + qrCodes untuk user ini
    const registrations = await prisma.registration.findMany({
      where: { userId: user.id },
      include: {
        qrCodes: true,
        participants: {
          include: {
            category: true,
            jersey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ registrations });
  } catch (err: unknown) {
    console.error('GET /api/profile/purchases error:', err);
    let errorMessage = "Failed to fetch purchase data";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}