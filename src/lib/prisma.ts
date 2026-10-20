import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  let finalUrl = url;
  if (!finalUrl.includes('pool_timeout')) {
    const sep = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${sep}pool_timeout=60&connection_limit=20`;
  }
  if (!finalUrl.includes('default_transaction_read_only')) {
    const sep = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${sep}options=-c%20default_transaction_read_only=off`;
  }
  return finalUrl;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(getDatabaseUrl() ? { datasources: { db: { url: getDatabaseUrl() } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
