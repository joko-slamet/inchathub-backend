import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

const adapter = new PrismaPg({ connectionString: env.databaseUrl }, { schema: env.databaseSchema });

export const prisma = new PrismaClient({ adapter });
