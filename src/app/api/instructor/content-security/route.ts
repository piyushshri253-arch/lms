import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  getCourseSecurityPolicy,
  saveCourseSecurityPolicy,
  createSignedMediaToken,
  buildStudentSignedMediaUrl
} from '@/lib/content-security';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    const whereClause =
      user.role === 'INSTRUCTOR'
        ? { instructorId: user.id, ...(courseId ? { id: courseId } : {}) }
        : courseId
        ? { id: courseId }
        : {};

    const courses = await prisma.course.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { enrollments: true }
        },
        sections: {
          include: {
            lessons: {
              select: {
                id: true,
                title: true,
                type: true,
                isFree: true,
                videoUrl: true,
                pdfUrl: true,
                fileUrl: true,
                allowDownload: true
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    const items = await Promise.all(
      courses.map(async (course) => {
        const policy = await getCourseSecurityPolicy(course.id);
        const allLessons = course.sections.flatMap((s) => s.lessons);
        const videoCount = allLessons.filter((l) => l.videoUrl || l.type === 'VIDEO').length;
        const pdfCount = allLessons.filter((l) => l.pdfUrl || l.type === 'PDF').length;
        const resourceCount = allLessons.filter((l) => l.fileUrl || l.type === 'DOWNLOAD').length;
        const protectedPaidLessonsCount = allLessons.filter((l) => !l.isFree).length;
        const freePreviewLessonsCount = allLessons.filter((l) => l.isFree).length;

        return {
          id: course.id,
          title: course.title,
          slug: course.slug,
          price: course.price,
          status: course.status,
          accessType: course.accessType,
          accessDays: course.accessDays,
          enrollmentsCount: course._count.enrollments,
          mediaSummary: {
            totalLessons: allLessons.length,
            videoCount,
            pdfCount,
            resourceCount,
            protectedPaidLessonsCount,
            freePreviewLessonsCount
          },
          lessons: allLessons,
          securityPolicy: policy
        };
      })
    );

    return NextResponse.json({ courses: items });
  } catch (error) {
    console.error('GET /api/instructor/content-security error:', error);
    return NextResponse.json({ error: 'Failed to load course security settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      courseId,
      policy,
      accessType,
      accessDays,
      syncLessonDownloadFlag,
      lessonIdToToggle,
      lessonAllowDownload
    } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true, title: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only configure content security for your own courses.' },
        { status: 403 }
      );
    }

    // Optional: toggle download flag on a specific lesson
    if (lessonIdToToggle && typeof lessonAllowDownload === 'boolean') {
      await prisma.lesson.update({
        where: { id: lessonIdToToggle },
        data: { allowDownload: lessonAllowDownload }
      });
    }

    // Optional: update course accessType / accessDays
    if (accessType && ['LIFETIME', 'LIMITED_DAYS'].includes(accessType)) {
      await prisma.course.update({
        where: { id: courseId },
        data: {
          accessType,
          accessDays: accessType === 'LIMITED_DAYS' ? Math.max(1, Number(accessDays) || 365) : null
        }
      });
    }

    // Save course security policy
    const updatedPolicy = await saveCourseSecurityPolicy(courseId, policy || {}, user.id);

    // Optional: sync all lesson allowDownload flags in this course
    if (typeof syncLessonDownloadFlag === 'boolean') {
      await prisma.lesson.updateMany({
        where: {
          section: { courseId }
        },
        data: {
          allowDownload: syncLessonDownloadFlag
        }
      });
    }

    return NextResponse.json({
      success: true,
      securityPolicy: updatedPolicy,
      message: 'Course Content Security & DRM policy updated.'
    });
  } catch (error) {
    console.error('PUT /api/instructor/content-security error:', error);
    return NextResponse.json({ error: 'Failed to update course content security' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { courseId, lessonId, resourceType = 'VIDEO' } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          include: {
            lessons: true
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const policy = await getCourseSecurityPolicy(course.id);
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const targetLesson =
      (lessonId && allLessons.find((l) => l.id === lessonId)) ||
      allLessons[0] || {
        id: 'sample-lesson-id',
        title: 'Sample Protected Masterclass Lecture',
        videoUrl: 'https://cdn.morena.lms/private-vault/lecture-01.mp4',
        pdfUrl: 'https://cdn.morena.lms/private-vault/handbook-01.pdf'
      };

    const signed = createSignedMediaToken({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      courseId: course.id,
      lessonId: targetLesson.id,
      resourceType: resourceType === 'PDF' ? 'PDF' : 'VIDEO',
      allowDownload:
        resourceType === 'PDF' ? policy.allowPdfDownload : policy.allowVideoDownload,
      ttlMinutes: policy.signedUrlExpiryMinutes
    });

    const rawUrl =
      resourceType === 'PDF'
        ? (targetLesson as any).pdfUrl || 'https://cdn.morena.lms/private-vault/module-notes.pdf'
        : targetLesson.videoUrl || 'https://cdn.morena.lms/private-vault/masterclass-stream.mp4';

    const signedUrl = buildStudentSignedMediaUrl(
      rawUrl,
      signed.token,
      signed.expiresAt,
      resourceType === 'PDF' ? policy.allowPdfDownload : policy.allowVideoDownload,
      resourceType === 'PDF' ? 'PDF' : 'VIDEO'
    );

    return NextResponse.json({
      lessonTitle: targetLesson.title,
      rawUrlRedactedInPublicApi: true,
      signedUrl,
      signedToken: signed.token,
      expiresAt: signed.expiresAt,
      ttlMinutes: policy.signedUrlExpiryMinutes,
      watermarkPreview: `${user.name} • ${user.email} • UID:${user.id.slice(0, 8)}`
    });
  } catch (error) {
    console.error('POST /api/instructor/content-security error:', error);
    return NextResponse.json({ error: 'Failed to generate signed URL preview' }, { status: 500 });
  }
}
