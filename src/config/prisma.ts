import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

// Aiven's Postgres cert chain isn't in Node's default trust store, so plain
// `sslmode=require` still fails TLS verification unless we relax it here.
const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
  ...(env.databaseUrl.includes("sslmode=require") && { ssl: { rejectUnauthorized: false } }),
});

export const prisma = new PrismaClient({ adapter });
