import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    if (!lessonId || lessonId === 'placeholder' || lessonId.startsWith('placeholder') || lessonId.length < 5) {
      return NextResponse.json({ allowed: false, error: 'No lesson specified' }, { status: 400 });
    }

    const user = await getCurrentUser();

    // 1. Fetch Lesson with Section and Course
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                status: true,
                instructorId: true
              }
            }
          }
        }
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    const course = lesson.section.course;

    // 2. Check if free preview lesson
    if (lesson.isFree) {
      return NextResponse.json({
        allowed: true,
        isFree: true,
        videoUrl: lesson.videoUrl,
        lessonTitle: lesson.title,
        courseTitle: course.title,
        duration: lesson.duration,
        durationSeconds: lesson.durationSeconds
      });
    }

    // 3. Paid Lesson Access Control
    if (!user) {
      return NextResponse.json(
        {
          allowed: false,
          locked: true,
          error: 'Authentication required. Please sign in to access course video streams.'
        },
        { status: 401 }
      );
    }

    // Super Admin & Admin have full access
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return NextResponse.json({
        allowed: true,
        isFree: false,
        videoUrl: lesson.videoUrl,
        lessonTitle: lesson.title,
        courseTitle: course.title,
        duration: lesson.duration,
        durationSeconds: lesson.durationSeconds,
        accessGrantedBy: 'ADMIN_ROLE'
      });
    }

    // Course Instructor has full access
    if (user.role === 'INSTRUCTOR' && course.instructorId === user.id) {
      return NextResponse.json({
        allowed: true,
        isFree: false,
        videoUrl: lesson.videoUrl,
        lessonTitle: lesson.title,
        courseTitle: course.title,
        duration: lesson.duration,
        durationSeconds: lesson.durationSeconds,
        accessGrantedBy: 'INSTRUCTOR_OWNER'
      });
    }

    // Check Student Active Enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id
        }
      }
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          allowed: false,
          locked: true,
          error: 'Active course enrollment required to watch this masterclass video.',
          courseSlug: course.slug
        },
        { status: 403 }
      );
    }

    // Enrollment verified successfully!
    return NextResponse.json({
      allowed: true,
      isFree: false,
      videoUrl: lesson.videoUrl,
      lessonTitle: lesson.title,
      courseTitle: course.title,
      duration: lesson.duration,
      durationSeconds: lesson.durationSeconds,
      accessGrantedBy: 'STUDENT_ENROLLMENT'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Stream authorization failed.' }, { status: 500 });
  }
}
