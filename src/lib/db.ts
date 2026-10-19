import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Server-only Prisma client. It connects as the table owner, so RLS does not
// apply: every query on creator data must be scoped to the signed-in user
// (see CLAUDE.md section 12).
function createClient() {
  // Keep idle connections for 2 minutes (pg's default is 10 s): opening a new one to Supabase
  // costs several network round trips, which the next click would wait for.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, idleTimeoutMillis: 120_000 });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
