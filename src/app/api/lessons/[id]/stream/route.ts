import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getCourseSecurityPolicy,
  createSignedMediaToken,
  buildStudentSignedMediaUrl
} from '@/lib/content-security';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    if (
      !lessonId ||
      lessonId === 'placeholder' ||
      lessonId.startsWith('placeholder') ||
      lessonId.length < 5
    ) {
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
                instructorId: true,
                accessType: true,
                accessDays: true
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
    const policy = await getCourseSecurityPolicy(course.id);

    // 2. Check if free preview lesson
    if (lesson.isFree) {
      const guestId = user?.id || 'guest-preview';
      const guestName = user?.name || 'Preview Visitor';
      const guestEmail = user?.email || 'preview@morena.lms';

      const signedVideoToken = createSignedMediaToken({
        userId: guestId,
        userEmail: guestEmail,
        userName: guestName,
        courseId: course.id,
        lessonId: lesson.id,
        resourceType: 'VIDEO',
        allowDownload: policy.allowVideoDownload && Boolean((lesson as any).allowDownload),
        ttlMinutes: policy.signedUrlExpiryMinutes
      });

      const signedPdfToken = createSignedMediaToken({
        userId: guestId,
        userEmail: guestEmail,
        userName: guestName,
        courseId: course.id,
        lessonId: lesson.id,
        resourceType: 'PDF',
        allowDownload: policy.allowPdfDownload && Boolean((lesson as any).allowDownload),
        ttlMinutes: policy.signedUrlExpiryMinutes
      });

      return NextResponse.json({
        allowed: true,
        isFree: true,
        videoUrl: policy.signedUrlEnabled
          ? buildStudentSignedMediaUrl(
              lesson.videoUrl,
              signedVideoToken.token,
              signedVideoToken.expiresAt,
              policy.allowVideoDownload,
              'VIDEO'
            )
          : lesson.videoUrl,
        pdfUrl: policy.signedUrlEnabled
          ? buildStudentSignedMediaUrl(
              (lesson as any).pdfUrl,
              signedPdfToken.token,
              signedPdfToken.expiresAt,
              policy.allowPdfDownload,
              'PDF'
            )
          : (lesson as any).pdfUrl,
        fileUrl:
          policy.allowResourceDownload && (lesson as any).allowDownload
            ? (lesson as any).fileUrl
            : null,
        allowDownload: Boolean(policy.allowResourceDownload && (lesson as any).allowDownload),
        lessonTitle: lesson.title,
        courseTitle: course.title,
        duration: lesson.duration,
        durationSeconds: lesson.durationSeconds,
        signedToken: signedVideoToken.token,
        expiresAt: signedVideoToken.expiresAt,
        securityPolicy: policy,
        watermark: {
          enabled: policy.dynamicWatermarkEnabled,
          text: `${guestName} • ${guestEmail} • Preview`
        }
      });
    }

    // 3. Paid Lesson Access Control
    if (!user) {
      return NextResponse.json(
        {
          allowed: false,
          locked: true,
          error: 'Authentication required. Please sign in to access encrypted course streams.'
        },
        { status: 401 }
      );
    }

    const isPrivileged =
      user.role === 'SUPER_ADMIN' ||
      user.role === 'ADMIN' ||
      user.role === 'LMS_ADMIN' ||
      user.role === 'REVIEWER' ||
      (user.role === 'INSTRUCTOR' && course.instructorId === user.id);

    if (!isPrivileged) {
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
            error: 'Active course enrollment required to unlock this protected lecture.',
            courseSlug: course.slug
          },
          { status: 403 }
        );
      }

      // Check LIMITED_DAYS course access expiration
      if (course.accessType === 'LIMITED_DAYS' && course.accessDays) {
        const expiryDate = new Date(enrollment.enrolledAt);
        expiryDate.setDate(expiryDate.getDate() + Number(course.accessDays));
        if (new Date() > expiryDate) {
          return NextResponse.json(
            {
              allowed: false,
              locked: true,
              expired: true,
              error: `Your ${course.accessDays}-day enrollment access window for this course expired on ${expiryDate.toLocaleDateString()}. Please renew enrollment to continue.`,
              courseSlug: course.slug
            },
            { status: 403 }
          );
        }
      }
    }

    // Generate student-specific signed tokens
    const allowVideoDl = Boolean(policy.allowVideoDownload && (lesson as any).allowDownload);
    const allowPdfDl = Boolean(policy.allowPdfDownload && (lesson as any).allowDownload);
    const allowResourceDl = Boolean(policy.allowResourceDownload && (lesson as any).allowDownload);

    const signedVideo = createSignedMediaToken({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      courseId: course.id,
      lessonId: lesson.id,
      resourceType: 'VIDEO',
      allowDownload: allowVideoDl,
      ttlMinutes: policy.signedUrlExpiryMinutes
    });

    const signedPdf = createSignedMediaToken({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      courseId: course.id,
      lessonId: lesson.id,
      resourceType: 'PDF',
      allowDownload: allowPdfDl,
      ttlMinutes: policy.signedUrlExpiryMinutes
    });

    return NextResponse.json({
      allowed: true,
      isFree: false,
      videoUrl: policy.signedUrlEnabled
        ? buildStudentSignedMediaUrl(
            lesson.videoUrl,
            signedVideo.token,
            signedVideo.expiresAt,
            allowVideoDl,
            'VIDEO'
          )
        : lesson.videoUrl,
      pdfUrl: policy.signedUrlEnabled
        ? buildStudentSignedMediaUrl(
            (lesson as any).pdfUrl,
            signedPdf.token,
            signedPdf.expiresAt,
            allowPdfDl,
            'PDF'
          )
        : (lesson as any).pdfUrl,
      fileUrl: allowResourceDl ? (lesson as any).fileUrl : null,
      allowDownload: allowResourceDl,
      lessonTitle: lesson.title,
      courseTitle: course.title,
      duration: lesson.duration,
      durationSeconds: lesson.durationSeconds,
      accessGrantedBy: isPrivileged ? `${user.role}_PRIVILEGE` : 'VERIFIED_ENROLLMENT',
      signedToken: signedVideo.token,
      expiresAt: signedVideo.expiresAt,
      securityPolicy: policy,
      watermark: {
        enabled: policy.dynamicWatermarkEnabled,
        text: `${user.name} • ${user.email} • UID:${user.id.slice(0, 8)}`
      }
    });
  } catch (error) {
    console.error('Stream verification error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error verifying stream access' },
      { status: 500 }
    );
  }
}
