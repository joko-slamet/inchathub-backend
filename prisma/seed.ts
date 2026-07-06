import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/utils/password";
import { pricingPlans } from "./seed-data/pricing-plans";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedAdmin() {
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

async function seedPricingPlans() {
  for (const plan of pricingPlans) {
    const record = await prisma.pricingPlan.upsert({
      where: { key: plan.key },
      update: {
        sortOrder: plan.sortOrder,
        popular: plan.popular,
        originalPrice: plan.originalPrice,
        price: plan.price,
      },
      create: {
        key: plan.key,
        sortOrder: plan.sortOrder,
        popular: plan.popular,
        originalPrice: plan.originalPrice,
        price: plan.price,
      },
    });

    for (const translation of plan.translations) {
      await prisma.pricingPlanTranslation.upsert({
        where: { planId_locale: { planId: record.id, locale: translation.locale } },
        update: {
          name: translation.name,
          tagline: translation.tagline,
          features: translation.features,
        },
        create: {
          planId: record.id,
          locale: translation.locale,
          name: translation.name,
          tagline: translation.tagline,
          features: translation.features,
        },
      });
    }
  }

  console.log(`Seeded ${pricingPlans.length} pricing plans`);
}

async function main() {
  await seedAdmin();
  await seedPricingPlans();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
