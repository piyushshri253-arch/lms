import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { id } = await params;

    const sourceCourse = await prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                quiz: {
                  include: {
                    questions: {
                      orderBy: { order: 'asc' },
                      include: { options: { orderBy: { order: 'asc' } } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!sourceCourse || !validateTenantOwnership(sourceCourse.organizationId, user)) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const newSlug = `${sourceCourse.slug}-copy-${Date.now()}`;
    const newTitle = `${sourceCourse.title} — Copy`;

    // Deep duplicate course hierarchy inside a transaction
    const duplicatedCourse = await prisma.$transaction(async (tx) => {
      // 1. Create top-level course
      const newCourse = await tx.course.create({
        data: {
          organizationId: sourceCourse.organizationId,
          title: newTitle,
          slug: newSlug,
          shortDescription: sourceCourse.shortDescription,
          description: sourceCourse.description,
          thumbnail: sourceCourse.thumbnail,
          categoryId: sourceCourse.categoryId,
          instructorId: sourceCourse.instructorId,
          level: sourceCourse.level,
          language: sourceCourse.language,
          price: sourceCourse.price,
          currency: sourceCourse.currency,
          durationHours: sourceCourse.durationHours,
          status: 'DRAFT', // Always create duplicate in DRAFT status
          seoTitle: sourceCourse.seoTitle,
          seoDescription: sourceCourse.seoDescription
        }
      });

      // 2. Duplicate sections & lessons
      for (const section of sourceCourse.sections) {
        const newSection = await tx.courseSection.create({
          data: {
            courseId: newCourse.id,
            title: section.title,
            order: section.order
          }
        });

        for (const lesson of section.lessons) {
          const newLesson = await tx.lesson.create({
            data: {
              sectionId: newSection.id,
              title: lesson.title,
              type: lesson.type,
              content: lesson.content,
              videoUrl: lesson.videoUrl,
              fileUrl: lesson.fileUrl,
              duration: lesson.duration,
              durationSeconds: lesson.durationSeconds,
              order: lesson.order,
              isFree: lesson.isFree,
              isPreview: lesson.isPreview,
              isRequired: lesson.isRequired,
              isPublished: lesson.isPublished,
              resources: lesson.resources
            }
          });

          // 3. Duplicate Quiz if attached to lesson
          if (lesson.quiz) {
            const newQuiz = await tx.quiz.create({
              data: {
                organizationId: sourceCourse.organizationId,
                lessonId: newLesson.id,
                title: lesson.quiz.title,
                passingScore: lesson.quiz.passingScore,
                maxAttempts: lesson.quiz.maxAttempts,
                timeLimitMinutes: lesson.quiz.timeLimitMinutes
              }
            });

            for (const q of lesson.quiz.questions) {
              const newQ = await tx.quizQuestion.create({
                data: {
                  quizId: newQuiz.id,
                  question: q.question,
                  type: q.type,
                  explanation: q.explanation,
                  order: q.order
                }
              });

              for (const opt of q.options) {
                await tx.quizOption.create({
                  data: {
                    questionId: newQ.id,
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                    order: opt.order
                  }
                });
              }
            }
          }
        }
      }

      return newCourse;
    });

    // Record Audit Log
    await createAuditLog({
      organizationId: sourceCourse.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'DUPLICATE_COURSE',
      entity: 'Course',
      entityId: duplicatedCourse.id,
      description: `Duplicated course "${sourceCourse.title}" into "${duplicatedCourse.title}"`
    });

    return NextResponse.json({
      message: 'Course duplicated successfully',
      course: duplicatedCourse
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
