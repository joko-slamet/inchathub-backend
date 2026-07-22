import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

// `pg` derives strict (verify-full) SSL settings from `sslmode=require` in the
// connection string, which overrides any explicit `ssl` option we pass
// alongside it. Aiven's cert chain isn't in Node's trust store, so we strip
// `sslmode` from the string and set the (relaxed) SSL config ourselves.
const url = new URL(env.databaseUrl);
const needsSsl = url.searchParams.get("sslmode") !== null && url.searchParams.get("sslmode") !== "disable";
url.searchParams.delete("sslmode");

const adapter = new PrismaPg({
  connectionString: url.toString(),
  ...(needsSsl && { ssl: { rejectUnauthorized: false } }),
});

export const prisma = new PrismaClient({ adapter });
