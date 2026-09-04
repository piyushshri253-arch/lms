import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: lessonId } = await params;
    const body = await request.json().catch(() => ({}));
    const watchedDuration = Number(body.watchedDuration) || 0;
    const durationSeconds = Number(body.durationSeconds) || 0;

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
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const course = lesson.section.course;

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id
        }
      }
    });

    const isPrivileged =
      user.role === 'SUPER_ADMIN' ||
      (user.role === 'ADMIN' && course.organizationId === user.organizationId) ||
      course.instructorId === user.id;

    if (!enrollment && !lesson.isFree && !lesson.isPreview && !isPrivileged) {
      return NextResponse.json(
        { error: 'You must be enrolled in this course to track lesson progress.' },
        { status: 403 }
      );
    }

    // Check video threshold: if watched >= 90% of duration, mark completed
    let autoCompletedByWatch = false;
    const effectiveDuration = durationSeconds || lesson.durationSeconds || 600;
    if (effectiveDuration > 0 && watchedDuration > 0) {
      if (watchedDuration / effectiveDuration >= 0.9) {
        autoCompletedByWatch = true;
      }
    }

    const existingProgress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id
        }
      }
    });

    let newCompletedState = existingProgress?.completed || false;
    if (body.completed !== undefined) {
      newCompletedState = !!body.completed;
    } else if (autoCompletedByWatch) {
      newCompletedState = true;
    } else if (body.toggle) {
      newCompletedState = !existingProgress?.completed;
    }

    const progressRecord = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lesson.id
        }
      },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        completed: newCompletedState,
        watchedDuration,
        completedAt: newCompletedState ? new Date() : null
      },
      update: {
        completed: newCompletedState,
        watchedDuration: Math.max(watchedDuration, existingProgress?.watchedDuration || 0),
        completedAt: newCompletedState ? existingProgress?.completedAt || new Date() : null
      }
    });

    // Compute overall dynamic progress for this course
    const allCourseLessons = course.sections.flatMap((s) => s.lessons);
    const requiredLessons = allCourseLessons.filter((l) => l.isRequired);
    const totalRequiredCount = requiredLessons.length > 0 ? requiredLessons.length : allCourseLessons.length;

    const completedProgresses = await prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        completed: true,
        lessonId: { in: allCourseLessons.map((l) => l.id) }
      }
    });

    const completedLessonIds = new Set(completedProgresses.map((p) => p.lessonId));
    const completedRequiredCount = requiredLessons.filter((l) => completedLessonIds.has(l.id)).length;

    const progressPercent =
      totalRequiredCount > 0
        ? Math.min(100, Math.round((completedRequiredCount / totalRequiredCount) * 100))
        : 100;

    let certificate = null;
    // If completed 100%, issue certificate and mark enrollment COMPLETED
    if (progressPercent >= 100 && enrollment) {
      const year = new Date().getFullYear();
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      const certNumber = `MT-${year}-${randomHex}`;

      certificate = await prisma.certificate.upsert({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: course.id
          }
        },
        create: {
          organizationId: course.organizationId,
          userId: user.id,
          courseId: course.id,
          certificateNumber: certNumber,
          status: 'VALID',
          certificateUrl: `/certificate/${certNumber}`,
          metadata: JSON.stringify({
            studentName: user.name,
            courseTitle: course.title,
            completionDate: new Date().toISOString()
          })
        },
        update: {
          status: 'VALID'
        }
      });

      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'COMPLETED'
        }
      });

      await createAuditLog({
        organizationId: course.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'COURSE_COMPLETED',
        entity: 'Certificate',
        entityId: certificate.id,
        description: `Student "${user.name}" completed course "${course.title}". Certificate ${certificate.certificateNumber} generated.`
      });
    }

    return NextResponse.json({
      success: true,
      lessonId: lesson.id,
      completed: progressRecord.completed,
      progressPercent,
      completedLessonsCount: completedLessonIds.size,
      totalLessonsCount: allCourseLessons.length,
      completedLessonIds: Array.from(completedLessonIds),
      certificate: certificate
        ? {
            id: certificate.id,
            certificateNumber: certificate.certificateNumber,
            url: `/certificate/${certificate.certificateNumber}`
          }
        : null
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
