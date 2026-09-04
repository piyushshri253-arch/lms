import { prisma } from '../src/lib/prisma';

async function main() {
  const all: any = await prisma.$queryRawUnsafe("SELECT type, name, sql FROM sqlite_master");
  console.log(all.filter((a: any) => a.name.toLowerCase().includes('saas') || a.name.toLowerCase().includes('plan')));
  await prisma.$disconnect();
}

main().catch(console.error);
