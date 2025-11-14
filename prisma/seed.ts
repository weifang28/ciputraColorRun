import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // --- Seed Race Categories ---
	const categories = [
		{ name: "3km", price: new Prisma.Decimal("49000") },
		{ name: "5km", price: new Prisma.Decimal("69000") },
		{ name: "10km", price: new Prisma.Decimal("99000") },
	];

	for (const c of categories) {
		await prisma.raceCategory.upsert({
			where: { name: c.name },
			update: { price: c.price },
			create: c,
		});
	}
	console.log("Seeded RaceCategory table");

  // --- NEW: Seed Jersey Options ---
  const jerseys = [
    { size: "XS", price: new Prisma.Decimal("0"), quantity: 1000 },
    { size: "S", price: new Prisma.Decimal("0"), quantity: 1000 },
    { size: "M", price: new Prisma.Decimal("0"), quantity: 1000 },
    { size: "L", price: new Prisma.Decimal("0"), quantity: 1000 },
    { size: "XL", price: new Prisma.Decimal("0"), quantity: 1000 },
    { size: "XXL", price: new Prisma.Decimal("0"), quantity: 1000 },
  ];

  for (const j of jerseys) {
    await prisma.jerseyOption.upsert({
      where: { size: j.size },
      update: {}, // No updates needed if it exists
      create: j,
    });
  }
  console.log("Seeded JerseyOption table");
  // --- END OF NEW CODE ---
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});