import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Get credentials from .env
  const adminAccessCode = process.env.ADMIN_ACCESS_CODE || "admin_access_2024";
  
  const admin = await prisma.user.upsert({
    where: { accessCode: adminAccessCode },
    update: { 
      role: "admin",
      name: "Admin"
    },
    create: {
      name: "Admin",
      email: "admin@ciputra.com",
      phone: "08123456789",
      accessCode: adminAccessCode,
      role: "admin",
    },
  });

  console.log("✅ Admin user created/updated successfully!");
  console.log("   Username:", process.env.ADMIN_USER);
  console.log("   Password:", process.env.ADMIN_PASS);
  console.log("   Access Code:", admin.accessCode);
  console.log("\nYou can now login at /admin/login");
  
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
