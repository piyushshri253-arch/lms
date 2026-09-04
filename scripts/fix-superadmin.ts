import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixSuperAdminCredentials() {
  const hash = await bcrypt.hash('superadmin123', 10);

  // 1. Update superadmin@morenateach.com if exists
  await prisma.user.upsert({
    where: {
      email_platform: {
        email: 'superadmin@morenateach.com',
        platform: 'LMS'
      }
    },
    create: {
      name: 'Super Admin Officer',
      email: 'superadmin@morenateach.com',
      platform: 'LMS',
      password: hash,
      role: 'SUPER_ADMIN',
      customRole: 'Platform Owner',
      emailVerified: true,
      permissions: JSON.stringify(['ALL']),
      status: 'ACTIVE'
    },
    update: {
      password: hash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isSuspended: false,
      emailVerified: true
    }
  });

  // 2. Upsert superadmin@aadhyara.com
  await prisma.user.upsert({
    where: {
      email_platform: {
        email: 'superadmin@aadhyara.com',
        platform: 'LMS'
      }
    },
    create: {
      name: 'AADHYARA Platform Owner',
      email: 'superadmin@aadhyara.com',
      platform: 'LMS',
      password: hash,
      role: 'SUPER_ADMIN',
      customRole: 'Platform Owner',
      emailVerified: true,
      permissions: JSON.stringify(['ALL']),
      status: 'ACTIVE'
    },
    update: {
      password: hash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isSuspended: false,
      emailVerified: true
    }
  });

  console.log('✅ Super Admin credentials normalized:');
  console.log('   - superadmin@aadhyara.com / superadmin123');
  console.log('   - superadmin@morenateach.com / superadmin123');
}

fixSuperAdminCredentials()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
