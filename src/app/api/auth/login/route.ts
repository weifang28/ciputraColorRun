import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { accessCode } = await req.json();

    // Validasi input
    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 });
    }

    // Cari user di database
    const user = await prisma.user.findUnique({
      where: { accessCode: accessCode },
    });

    // Jika user tidak ditemukan
    if (!user) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
    }

    // PERBAIKAN: Tambahkan 'await' di sini
    const cookieStore = await cookies();
    
    cookieStore.set('auth-token', user.accessCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 minggu
    });

    return NextResponse.json({ success: true, name: user.name });

  } catch (err: unknown) { // Anda bisa ganti 'any' dengan 'unknown' jika ingin menghilangkan warning linter, tapi 'any' tidak akan mematikan aplikasi.
    console.error("Login API error:", err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}