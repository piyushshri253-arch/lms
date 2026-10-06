import { prisma } from '../src/lib/prisma';

async function main() {
  const courseId = 'cmuwi6oqc0009k204sywmavv2';
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: { user: { select: { id: true, email: true, name: true, role: true } } }
  });
  console.log('Enrollments count:', enrollments.length);
  console.log('Enrollments:', JSON.stringify(enrollments, null, 2));

  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: { courseId }
      }
    },
    include: {
      items: true,
      user: { select: { id: true, email: true, name: true } }
    }
  });
  console.log('Orders count:', orders.length);
  console.log('Orders:', JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
