import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      emailVerified: true,
      status: true,
      isSuspended: true
    }
  });

  console.log('--- ALL DATABASE USERS ---');
  console.table(users);
  await prisma.$disconnect();
}

checkUsers();
