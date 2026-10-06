import { prisma } from '../src/lib/prisma';

async function main() {
  const courseId = 'cmuwi6oqc0009k204sywmavv2';

  // 1. Lesson 1: Welcome & Course Orientation -> TEXT (Article)
  await prisma.lesson.update({
    where: { id: 'cmuwi6t1b000jk20490nfemjs' },
    data: {
      type: 'TEXT',
      videoUrl: null
    }
  });

  // 2. Lesson 2: Why Play Matters -> QUIZ
  await prisma.lesson.update({
    where: { id: 'cmuwi6twa000nk204gju3klih' },
    data: {
      type: 'QUIZ',
      videoUrl: null
    }
  });

  // 3. Lesson 4: Types of Play -> TEXT (Article)
  await prisma.lesson.update({
    where: { id: 'cmuwi6wh8000zk204kiz50un3' },
    data: {
      type: 'TEXT',
      videoUrl: null
    }
  });

  console.log('Successfully updated lessons for course', courseId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
