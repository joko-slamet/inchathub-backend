import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/utils/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await hashPassword(
    process.env.ADMIN_SEED_PASSWORD ?? "Admin123!",
  );

  const admin = await prisma.user.upsert({
    where: { email: "admin@inchathub.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@inchathub.com",
      password,
      phone: null,
      role: Role.ADMIN,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log("Seeded admin user:", admin);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
