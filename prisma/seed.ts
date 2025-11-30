import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting database seeding...");

  try {
    // --- Seed Race Categories with Tiered Pricing ---
    console.log("📋 Seeding Race Categories...");
    
    const categories = [
      {
        name: "3km",
        basePrice: new Prisma.Decimal("150000"),
        earlyBirdPrice: new Prisma.Decimal("130000"),
        tier1Price: new Prisma.Decimal("140000"), // 10-29 people
        tier1Min: 10,
        tier1Max: 29,
        tier2Price: new Prisma.Decimal("135000"), // >30 people
        tier2Min: 30,
        tier2Max: null, // unlimited
        tier3Price: null, // 3K doesn't have tier 3
        tier3Min: null,
        bundlePrice: new Prisma.Decimal("145000"), // Family bundle
        bundleSize: 4,
        earlyBirdCapacity: 20, // NEW
      },
      {
        name: "5km",
        basePrice: new Prisma.Decimal("200000"),
        earlyBirdPrice: new Prisma.Decimal("180000"),
        tier1Price: new Prisma.Decimal("190000"), // 10-29 people
        tier1Min: 10,
        tier1Max: 29,
        tier2Price: new Prisma.Decimal("180000"), // 30-59 people
        tier2Min: 30,
        tier2Max: 59,
        tier3Price: new Prisma.Decimal("170000"), // >60 people
        tier3Min: 60,
        bundlePrice: null,
        bundleSize: null,
        earlyBirdCapacity: 50, // NEW
      },
      {
        name: "10km",
        basePrice: new Prisma.Decimal("250000"),
        earlyBirdPrice: new Prisma.Decimal("220000"),
        tier1Price: new Prisma.Decimal("235000"), // 10-29 people
        tier1Min: 10,
        tier1Max: 29,
        tier2Price: new Prisma.Decimal("225000"), // 30-59 people
        tier2Min: 30,
        tier2Max: 59,
        tier3Price: new Prisma.Decimal("215000"), // >60 people
        tier3Min: 60,
        bundlePrice: null,
        bundleSize: null,
        earlyBirdCapacity: 30, // NEW
      },
    ];

    for (const c of categories) {
      await prisma.raceCategory.upsert({
        where: { name: c.name },
        update: c,
        create: c,
      });
      console.log(`✅ Created/Updated category: ${c.name}`);
    }
    console.log("✅ Seeded RaceCategory table");

    // --- Seed Jersey Options (updated with extra sizes) ---
    console.log("👕 Seeding Jersey Options...");
    const jerseys = [
      // Adult sizes (standard - no extra charge)
      { size: "S", type: "adult", price: new Prisma.Decimal("0"), quantity: 10000, isExtraSize: false, description: null },
      { size: "M", type: "adult", price: new Prisma.Decimal("0"), quantity: 10000, isExtraSize: false, description: null },
      { size: "L", type: "adult", price: new Prisma.Decimal("0"), quantity: 10000, isExtraSize: false, description: null },
      { size: "XL", type: "adult", price: new Prisma.Decimal("0"), quantity: 10000, isExtraSize: false, description: null },
      { size: "XXL", type: "adult", price: new Prisma.Decimal("10000"), quantity: 10000, isExtraSize: true, description: null },
      { size: "3XL", type: "adult", price: new Prisma.Decimal("10000"), quantity: 10000, isExtraSize: true, description: null },
      { size: "4XL", type: "adult", price: new Prisma.Decimal("10000"), quantity: 10000, isExtraSize: true, description: null },
      { size: "5XL", type: "adult", price: new Prisma.Decimal("10000"), quantity: 10000, isExtraSize: true, description: null },
      
      // Adult sizes (extra - with 20k charge)
      { size: "6XL", type: "adult", price: new Prisma.Decimal("20000"), quantity: 10000, isExtraSize: true, description: "Extra size +Rp 20.000" },
      
      // Kids sizes (no extra charge)
      { size: "XS - KIDS", type: "kids", price: new Prisma.Decimal("0"), quantity: 10000, isExtraSize: false, description: null },
      { size: "S - KIDS", type: "kids", price: new Prisma.Decimal("0"), quantity: 10000, isExtraSize: false, description: null },
      { size: "M - KIDS", type: "kids", price: new Prisma.Decimal("0"), quantity: 10000, isExtraSize: false, description: null },
      { size: "L - KIDS", type: "kids", price: new Prisma.Decimal("0"), quantity: 10000, isExtraSize: false, description: null },
      { size: "XL - KIDS", type: "kids", price: new Prisma.Decimal("0"), quantity: 10000, isExtraSize: false, description: null },
    ];

    for (const j of jerseys) {
      await prisma.jerseyOption.upsert({
        where: { size: j.size },
        update: { 
          price: j.price, 
          isExtraSize: j.isExtraSize, 
          description: j.description 
        },
        create: j,
      });
      console.log(`✅ Created/Updated jersey size: ${j.size} (${j.type})${j.isExtraSize ? ' - Extra charge: Rp ' + j.price.toString() : ''}`);
    }
    console.log("✅ Seeded JerseyOption table");

    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("💥 Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
