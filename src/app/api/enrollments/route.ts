import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'COMPLETED'] }
      },
      include: {
        course: {
          include: {
            instructor: { select: { name: true, avatar: true } },
            category: { select: { name: true } },
            sections: {
              include: {
                lessons: {
                  select: { id: true, isRequired: true }
                }
              }
            },
            certificates: {
              where: { userId: user.id }
            }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    // Fetch user's completed lesson progress across all enrolled courses
    const allLessonProgress = await prisma.lessonProgress.findMany({
      where: {
        userId: user.id,
        completed: true
      },
      select: { lessonId: true }
    });

    const completedLessonIds = new Set(allLessonProgress.map((p) => p.lessonId));

    const mapped = enrollments.map((enr) => {
      const allLessons = enr.course.sections.flatMap((s) => s.lessons);
      const totalCount = allLessons.length;
      const completedCount = allLessons.filter((l) => completedLessonIds.has(l.id)).length;
      const progressPercent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
      const cert = enr.course.certificates[0] || null;

      return {
        id: enr.id,
        courseId: enr.courseId,
        status: enr.status,
        enrolledAt: enr.enrolledAt,
        course: {
          id: enr.course.id,
          title: enr.course.title,
          slug: enr.course.slug,
          thumbnail: enr.course.thumbnail,
          category: enr.course.category?.name || 'General',
          instructor: enr.course.instructor,
          totalLessons: totalCount,
          completedLessons: completedCount,
          progressPercent
        },
        certificate: cert
          ? {
              id: cert.id,
              certificateNumber: cert.certificateNumber,
              url: `/certificate/${cert.certificateNumber}`
            }
          : null
      };
    });

    return NextResponse.json({ enrollments: mapped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch enrollments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }]
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Tenant Isolation Check
    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot enroll in courses outside your organization.' },
        { status: 403 }
      );
    }

    // Course status check
    if (course.status !== 'PUBLISHED' && user.role === 'STUDENT') {
      return NextResponse.json(
        { error: 'This course is currently in draft or unlisted status and not accepting enrollments.' },
        { status: 403 }
      );
    }

    // Create or find existing enrollment
    const enrollment = await prisma.enrollment.upsert({
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
        status: 'ACTIVE'
      },
      update: {
        status: 'ACTIVE'
      }
    });

    // Create In-App Notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        organizationId: course.organizationId,
        title: `Enrolled in ${course.title}!`,
        message: 'Your course access has been granted. Click to start learning.',
        type: 'ENROLLMENT',
        link: `/learn/${course.slug}`
      }
    });

    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'STUDENT_ENROLLED',
      entity: 'Enrollment',
      entityId: enrollment.id,
      description: `Student "${user.name}" (${user.email}) enrolled in "${course.title}".`,
      req: request
    });

    return NextResponse.json({
      success: true,
      message: 'Enrolled successfully!',
      enrollment: {
        id: enrollment.id,
        courseId: course.id,
        courseSlug: course.slug,
        status: enrollment.status
      },
      redirectUrl: `/learn/${course.slug}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Enrollment failed' }, { status: 500 });
  }
}
