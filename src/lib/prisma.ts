import { PrismaClient } from "@prisma/client";
import { neon } from "@neondatabase/serverless";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  if (process.env.DATABASE_URL?.includes("neon.tech")) {
    const sql = neon(process.env.DATABASE_URL);
    const adapter = new PrismaNeonHTTP(sql);
    return new PrismaClient({ adapter } as never);
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
