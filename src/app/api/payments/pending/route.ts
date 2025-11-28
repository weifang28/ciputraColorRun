import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const registrations = await prisma.registration.findMany({
      where: { paymentStatus: "pending" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            birthDate: true,
            gender: true,
            currentAddress: true,
            nationality: true,
            emergencyPhone: true,
            medicalHistory: true,
            idCardPhoto: true, // Make sure this is included
          },
        },
        participants: {
          include: {
            category: true,
            jersey: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const payments = registrations.map((reg) => {
      const categoryCounts: Record<string, number> = {};
      const jerseySizes: Record<string, number> = {};
      
      reg.participants.forEach(p => {
        const catName = p.category?.name || 'Unknown';
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
        
        const jerseySize = p.jersey?.size || 'M';
        jerseySizes[jerseySize] = (jerseySizes[jerseySize] || 0) + 1;
      });

      return {
        registrationId: reg.id,
        userName: reg.user.name || "—",
        email: reg.user.email,
        phone: reg.user.phone,
        registrationType: reg.registrationType,
        groupName: reg.groupName || undefined,
        totalAmount: reg.totalAmount,
        createdAt: reg.createdAt,
        paymentStatus: reg.paymentStatus,
        participantCount: reg.participants.length,
        categoryCounts,
        jerseySizes,
        payments: reg.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          proofOfPayment: p.proofOfPayment,
          status: p.status,
        })),
        user: {
          birthDate: reg.user.birthDate,
          gender: reg.user.gender,
          currentAddress: reg.user.currentAddress,
          nationality: reg.user.nationality,
          emergencyPhone: reg.user.emergencyPhone,
          medicalHistory: reg.user.medicalHistory,
          idCardPhoto: reg.user.idCardPhoto, // MAKE SURE THIS IS HERE
        },
      };
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
