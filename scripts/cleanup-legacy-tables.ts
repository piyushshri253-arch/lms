import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "SaasPlan"');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "SaasSubscription"');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "SaasInvoice"');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "SaaSPlan"');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "PlatformOffer"');
    console.log('Cleaned up SaaS plan tables.');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
