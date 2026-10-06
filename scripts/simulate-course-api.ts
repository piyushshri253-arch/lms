import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'your@yopmail.com' }
  });

  const course = await prisma.course.findFirst({
    where: {
      OR: [
        { slug: 'learning-through-play-designing-meaningful-play-based-learning-experiences-muwi6oq8' },
        { id: 'cmuwi6oqc0009k204sywmavv2' }
      ]
    },
    include: {
      sections: {
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              quiz: {
                include: {
                  questions: true
                }
              }
            }
          }
        },
        orderBy: { order: 'asc' }
      }
    }
  });

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: user?.id,
      courseId: course?.id
    }
  });

  console.log('User:', user?.id, user?.email);
  console.log('Course ID:', course?.id, 'Status:', course?.status);
  console.log('Enrollment:', enrollment);

  const isEnrolled = !!enrollment && enrollment.status === 'ACTIVE';
  console.log('isEnrolled:', isEnrolled);

  const formattedLessons = course?.sections.map(s => ({
    sectionTitle: s.title,
    lessons: s.lessons.map(l => ({
      id: l.id,
      title: l.title,
      type: l.type,
      videoUrl: l.videoUrl,
      quizData: l.quizData ? l.quizData.substring(0, 50) + '...' : null,
      content: l.content ? l.content.substring(0, 50) + '...' : null,
      pdfUrl: l.pdfUrl,
      isFree: l.isFree,
      isPublished: l.isPublished
    }))
  }));

  console.log('Formatted Sections & Lessons:');
  console.log(JSON.stringify(formattedLessons, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
