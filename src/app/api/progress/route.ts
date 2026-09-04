import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { courseId, lessonId, completed = true } = await request.json();

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required.' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: {
              include: {
                sections: {
                  include: { lessons: true }
                }
              }
            }
          }
        }
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    const targetCourse = lesson.section.course;

    // 1. Update or create LessonProgress
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id
        }
      },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        completed,
        completedAt: completed ? new Date() : null
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null
      }
    });

    // 2. Fetch all completed lessons for this course
    const allCourseLessonIds = targetCourse.sections.flatMap((s) => s.lessons.map((l) => l.id));
    const completedProgresses = await prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: allCourseLessonIds },
        completed: true
      }
    });

    const completedLessonIds = completedProgresses.map((p) => p.lessonId);
    const totalLessons = allCourseLessonIds.length || 1;
    const progressPercent = Math.min(100, Math.round((completedLessonIds.length / totalLessons) * 100));

    // 3. Update Enrollment record
    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: targetCourse.id
        }
      },
      create: {
        userId: user.id,
        courseId: targetCourse.id,
        status: progressPercent >= 100 ? 'COMPLETED' : 'ACTIVE'
      },
      update: {
        status: progressPercent >= 100 ? 'COMPLETED' : 'ACTIVE'
      }
    });

    // 4. Auto-generate verified certificate if 100% completed
    let certificate = null;
    if (progressPercent >= 100) {
      const certificateNumber = `MT-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      certificate = await prisma.certificate.upsert({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: targetCourse.id
          }
        },
        create: {
          userId: user.id,
          courseId: targetCourse.id,
          certificateNumber
        },
        update: {}
      });
    }

    return NextResponse.json({
      success: true,
      completedLessonIds,
      progressPercent,
      isCompleted: progressPercent >= 100,
      certificate
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
