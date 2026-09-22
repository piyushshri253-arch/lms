import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes('pool_timeout')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}pool_timeout=60&connection_limit=20`;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(getDatabaseUrl() ? { datasources: { db: { url: getDatabaseUrl() } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
