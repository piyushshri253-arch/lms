import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const databaseUrl = (process.env.DATABASE_URL || '').includes('pool_timeout')
  ? process.env.DATABASE_URL
  : (process.env.DATABASE_URL ? `${process.env.DATABASE_URL}&pool_timeout=60&connection_limit=20` : undefined);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
