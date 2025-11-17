import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { qrCodeData, claimedBy, packsClaimedCount, participantIds, password, claimType } = body || {};

    if (!qrCodeData) {
      return NextResponse.json({ error: 'Missing qrCodeData' }, { status: 400 });
    }

    // If this is a self-claim, require password (admin-known)
    if (claimType === 'self') {
      const secret = process.env.CLAIM_PASSWORD || process.env.ADMIN_PASS;
      if (!secret || password !== secret) {
        return NextResponse.json({ error: 'Invalid claim password' }, { status: 401 });
      }
    }

    // Find QR
    const qrCode = await prisma.qrCode.findUnique({
      where: { qrCodeData },
      include: {
        registration: {
          include: {
            participants: {
              include: { jersey: true, category: true },
              orderBy: { id: 'asc' },
            },
            user: true,
          },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    // If participantIds provided, validate them
    let toClaimParticipants = [];
    if (Array.isArray(participantIds) && participantIds.length > 0) {
      // Fetch provided participants and ensure they belong to this registration and are unclaimed
      const participants = await prisma.participant.findMany({
        where: {
          id: { in: participantIds.map((id: any) => Number(id)) },
          registrationId: qrCode.registrationId,
          packClaimed: false,
        },
      });

      if (participants.length !== participantIds.length) {
        return NextResponse.json({ error: 'Some participants are invalid or already claimed' }, { status: 400 });
      }

      if (participants.length > qrCode.scansRemaining) {
        return NextResponse.json({ error: `Not enough scans remaining. Only ${qrCode.scansRemaining} left.` }, { status: 400 });
      }

      toClaimParticipants = participants;
    } else {
      // fallback: claim `packsClaimedCount` number of first unclaimed participants
      const count = Number(packsClaimedCount) || 1;
      if (count > qrCode.scansRemaining) {
        return NextResponse.json({ error: `Not enough scans remaining. Only ${qrCode.scansRemaining} left.` }, { status: 400 });
      }
      toClaimParticipants = await prisma.participant.findMany({
        where: {
          registrationId: qrCode.registrationId,
          categoryId: qrCode.categoryId,
          packClaimed: false,
        },
        take: count,
        orderBy: { id: 'asc' },
      });

      if (toClaimParticipants.length < count) {
        return NextResponse.json({ error: `Not enough unclaimed packs. Only ${toClaimParticipants.length} available.` }, { status: 400 });
      }
    }

    // Create RacePackClaim with ClaimDetails mapping participant ids
    const claim = await prisma.racePackClaim.create({
      data: {
        qrCodeId: qrCode.id,
        claimedBy: claimedBy || 'anonymous',
        packsClaimedCount: toClaimParticipants.length,
        claimDetails: {
          create: toClaimParticipants.map((p: any) => ({ participantId: p.id })),
        },
      },
      include: { claimDetails: true },
    });

    // Mark participants as claimed
    await prisma.participant.updateMany({
      where: { id: { in: toClaimParticipants.map((p: any) => p.id) } },
      data: { packClaimed: true },
    });

    // Decrement scansRemaining
    await prisma.qrCode.update({
      where: { id: qrCode.id },
      data: { scansRemaining: qrCode.scansRemaining - toClaimParticipants.length },
    });

    return NextResponse.json({
      success: true,
      claim,
      claimedParticipantIds: toClaimParticipants.map((p: any) => p.id),
    });
  } catch (error: any) {
    console.error('Error claiming race pack:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
