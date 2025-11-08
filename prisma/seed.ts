import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
