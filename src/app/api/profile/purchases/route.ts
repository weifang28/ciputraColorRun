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
    const accessCode = await getAccessCodeFromCookie();

    if (!accessCode) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 1. Temukan user berdasarkan cookie
    const user = await prisma.user.findUnique({
      where: { accessCode },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Gunakan Prisma untuk mengambil data registrasi
    // Penjelasan Prisma:
    // - findMany: Ambil semua data dari tabel 'registration'
    // - where: Yang 'userId'-nya sama dengan 'user.id' yang sedang login
    // - include: "Sertakan" juga data terkait berikut ini (seperti JOIN di SQL):
    //   - qrCodes: Ambil semua QR code yang terhubung ke registrasi ini
    //   - participants: Ambil semua peserta di registrasi ini
    //   - ...dan untuk setiap peserta, 'include' juga data 'category' dan 'jersey' mereka
    const registrations = await prisma.registration.findMany({
      where: { userId: user.id },
      include: {
        qrCodes: true, // Ambil QR codes
        participants: { // Ambil Peserta
          include: {
            category: true, // Sertakan info Kategori Lomba (3K, 5K, 10K)
            jersey: true,   // Sertakan info Jersey (S, M, L)
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Tampilkan pembelian terbaru di atas
      },
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