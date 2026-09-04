import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initializing AADHYARA Multi-Tenant Seed ---');

  // 1. Ensure Default Primary Organization
  let mainOrg = await prisma.organization.findUnique({
    where: { slug: 'aadhyara-academy' }
  });

  if (!mainOrg) {
    mainOrg = await prisma.organization.create({
      data: {
        name: 'AADHYARA Academy',
        slug: 'aadhyara-academy',
        subdomain: 'academy',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        subscriptionStatus: 'ACTIVE',
        maxStudents: 10000,
        maxCourses: 500,
        maxStorageGB: 1000.0,
        primaryColor: '#4f46e5'
      }
    });
    console.log('✓ Created Default Organization:', mainOrg.name, mainOrg.id);
  } else {
    console.log('✓ Default Organization already exists:', mainOrg.name, mainOrg.id);
  }

  // 2. Associate existing non-superadmin users with mainOrg
  const updatedUsers = await prisma.user.updateMany({
    where: {
      organizationId: null,
      role: { not: 'SUPER_ADMIN' }
    },
    data: {
      organizationId: mainOrg.id
    }
  });
  console.log(`✓ Associated ${updatedUsers.count} existing users to default organization.`);

  // 3. Associate all existing courses with mainOrg
  const updatedCourses = await prisma.course.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });
  console.log(`✓ Associated ${updatedCourses.count} courses to default organization.`);

  // 4. Associate categories
  const updatedCategories = await prisma.category.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });
  console.log(`✓ Associated ${updatedCategories.count} categories to default organization.`);

  // 5. Associate enrollments, orders, certificates, announcements, notifications, etc.
  await prisma.enrollment.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });
  await prisma.order.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });
  await prisma.certificate.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });
  await prisma.announcement.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });
  await prisma.notification.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });
  await prisma.coupon.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });
  await prisma.review.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });
  await prisma.mediaAsset.updateMany({
    where: { organizationId: null },
    data: { organizationId: mainOrg.id }
  });

  console.log('--- AADHYARA Multi-Tenant Seed Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
