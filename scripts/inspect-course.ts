import { prisma } from '../src/lib/prisma';

async function main() {
  const c = await prisma.course.findFirst({
    where: {
      OR: [
        { slug: 'learning-through-play-designing-meaningful-play-based-learning-experiences-muwi6oq8' },
        { id: 'cmuwi6oqc0009k204sywmavv2' }
      ]
    },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: { quiz: true }
          }
        }
      }
    }
  });

  if (!c) {
    console.log('Course not found');
    return;
  }

  console.log('COURSE:');
  console.log('ID:', c.id);
  console.log('Title:', c.title);
  console.log('Slug:', c.slug);
  console.log('Status:', c.status);
  console.log('Sections Count:', c.sections.length);

  for (const s of c.sections) {
    console.log(`\nSection [${s.id}] (order: ${s.order}): ${s.title}`);
    for (const l of s.lessons) {
      console.log(`  Lesson [${l.id}] (order: ${l.order}):`);
      console.log(`    Title: ${l.title}`);
      console.log(`    Type: ${l.type}`);
      console.log(`    isPublished: ${l.isPublished}`);
      console.log(`    isFree: ${l.isFree}`);
      console.log(`    videoUrl: ${l.videoUrl}`);
      console.log(`    pdfUrl: ${l.pdfUrl}`);
      console.log(`    quizData: ${l.quizData ? String(l.quizData).slice(0, 50) : null}`);
      console.log(`    hasQuizRelation: ${!!l.quiz}`);
      console.log(`    content length: ${l.content ? l.content.length : 0}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
