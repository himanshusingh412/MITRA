import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 *
 * Next.js hot-reloads modules in development, and a fresh PrismaClient per reload
 * exhausts the Postgres connection pool within a few edits. In production each
 * serverless instance gets exactly one client, which is what the Neon pooled
 * connection string expects.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** The citizen the prototype acts as until Google OAuth lands in Phase 5. */
export const DEMO_CITIZEN_ID = process.env.DEMO_CITIZEN_ID ?? 'u-ravi';
