import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createSessionToken } from '../src/lib/auth';

const prisma = new PrismaClient();

async function testDirectLogin() {
  const email = 'superadmin@aadhyara.com';
  const password = 'superadmin123';

  const user = await prisma.user.findFirst({
    where: { email }
  });

  if (!user) {
    console.error('User not found!');
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  console.log(`Password match test for ${email}: ${isMatch ? '✅ MATCHED' : '❌ FAILED'}`);

  if (isMatch) {
    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as any
    });
    console.log(`✅ Session JWT Token generated successfully: ${token.substring(0, 30)}...`);
  }

  await prisma.$disconnect();
}

testDirectLogin();
