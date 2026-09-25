import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notification';
import {
  getCourseVersionState,
  saveCourseVersionState,
  applyApprovedVersionToLiveCourse,
  classifyCourseChanges,
  CourseVersionState,
  StagedCourseSnapshot
} from '@/lib/course-versioning';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Instructor or Auditor access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseIdFilter = searchParams.get('courseId') || '';
    const statusFilter = (searchParams.get('status') || 'ALL').toUpperCase();

    const courseWhere: any = {};
    if (user.role === 'INSTRUCTOR') {
      courseWhere.instructorId = user.id;
    } else if (user.organizationId && user.role !== 'SUPER_ADMIN') {
      courseWhere.organizationId = user.organizationId;
    }
    if (courseIdFilter) {
      courseWhere.id = courseIdFilter;
    }

    const courses = await prisma.course.findMany({
      where: courseWhere,
      include: {
        instructor: {
          select: { id: true, name: true, email: true }
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' }
            }
          }
        },
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const items = [];
    for (const c of courses) {
      const ver = await getCourseVersionState(c.id);
      const liveLessonsCount = c.sections.reduce((acc, s) => acc + s.lessons.length, 0);
      const stagedLessonsCount =
        ver.stagedSnapshot?.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) ??
        liveLessonsCount;

      items.push({
        courseId: c.id,
        title: c.title,
        slug: c.slug,
        courseStatus: c.status,
        thumbnail: c.thumbnail,
        instructor: c.instructor,
        enrolledCount: c._count.enrollments || 0,
        liveStats: {
          price: c.price,
          discountPrice: c.discountPrice,
          modulesCount: c.sections.length,
          lessonsCount: liveLessonsCount
        },
        stagedStats: ver.stagedSnapshot
          ? {
              price: ver.stagedSnapshot.price,
              discountPrice: ver.stagedSnapshot.discountPrice,
              modulesCount: ver.stagedSnapshot.sections?.length || 0,
              lessonsCount: stagedLessonsCount
            }
          : null,
        versionState: ver
      });
    }

    const stats = {
      totalCourses: items.length,
      publishedCourses: items.filter((i) => i.courseStatus === 'PUBLISHED').length,
      draftVersions: items.filter((i) => i.versionState.status === 'DRAFT_VERSION').length,
      pendingAuditorReview: items.filter((i) => i.versionState.status === 'PENDING_REVIEW').length,
      rejectedVersions: items.filter((i) => i.versionState.status === 'VERSION_REJECTED').length
    };

    const filtered =
      statusFilter === 'ALL'
        ? items
        : items.filter((i) => i.versionState.status === statusFilter);

    return NextResponse.json({
      items: filtered,
      stats,
      viewerRole: user.role
    });
  } catch (err: any) {
    console.error('[GET /api/instructor/course-versions] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load course versions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, courseId, note } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required.' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only manage versions of courses you own.' },
        { status: 403 }
      );
    }

    const currentVer = await getCourseVersionState(course.id);

    // 1. SUBMIT_FOR_REVIEW
    if (action === 'SUBMIT_FOR_REVIEW') {
      if (!currentVer.stagedSnapshot) {
        return NextResponse.json(
          { error: 'No staged major changes found to submit for review.' },
          { status: 400 }
        );
      }

      const nextLabel = currentVer.pendingVersionLabel || `v${(currentVer.liveVersionNumber || 1) + 1}.0`;
      const updatedVer = await saveCourseVersionState(course.id, {
        status: 'PENDING_REVIEW',
        pendingVersionLabel: nextLabel,
        submittedAt: new Date().toISOString(),
        submittedBy: user.name,
        reviewerFeedback: null
      });

      // Notify Reviewers, Auditors & Super Admins
      const auditors = await prisma.user.findMany({
        where: {
          role: { in: ['REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE'
        },
        select: { id: true }
      });

      for (const aud of auditors) {
        if (aud.id !== user.id) {
          await createNotification({
            organizationId: course.organizationId,
            userId: aud.id,
            title: `🛡️ Course Version ${nextLabel} Ready for Auditor Approval`,
            message: `${user.name} submitted major updates (${currentVer.detectedChanges.map((c) => c.category).join(', ')}) for published course "${course.title}".`,
            type: 'COURSES',
            category: 'COURSES',
            link: `/instructor/course-versions?courseId=${course.id}`
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          organizationId: course.organizationId,
          adminId: user.id,
          adminEmail: user.email,
          action: 'SUBMIT_COURSE_VERSION_REVIEW',
          entity: 'Course',
          entityId: course.id,
          description: `Instructor submitted Version ${nextLabel} of "${course.title}" for Auditor review.`
        }
      });

      return NextResponse.json({
        success: true,
        versionState: updatedVer,
        message: `Version ${nextLabel} submitted for Auditor Review! Live Version ${currentVer.liveVersionLabel} remains active for students until approved.`
      });
    }

    // 2. DISCARD_DRAFT
    if (action === 'DISCARD_DRAFT') {
      const resetVer = await saveCourseVersionState(course.id, {
        pendingVersionNumber: null,
        pendingVersionLabel: null,
        status: 'LIVE_SYNCED',
        detectedChanges: [],
        stagedSnapshot: null,
        submittedAt: null,
        submittedBy: null,
        reviewerFeedback: null
      });

      return NextResponse.json({
        success: true,
        versionState: resetVer,
        message: `Draft version changes discarded. Course is synced with Live Version ${resetVer.liveVersionLabel}.`
      });
    }

    // 3. STAGE_MAJOR_EDIT (Allows staging a Price, Video, Curriculum, or Quiz change directly from the Version Studio)
    if (action === 'STAGE_MAJOR_EDIT') {
      const { newPrice, newVideoLessonId, newVideoUrl, newModuleTitle, newLessonTitle, quizUpdateSummary, submitNow = false } = body;

      const baseSnap: StagedCourseSnapshot = currentVer.stagedSnapshot || {
        title: course.title,
        description: course.description,
        shortDescription: course.shortDescription || '',
        price: course.price,
        discountPrice: course.discountPrice,
        currency: course.currency,
        level: course.level,
        language: course.language,
        durationHours: course.durationHours,
        thumbnail: course.thumbnail,
        banner: course.banner || '',
        accessType: course.accessType,
        accessDays: course.accessDays,
        sections: course.sections.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description || '',
          order: s.order,
          lessons: s.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            description: l.description || '',
            type: l.type,
            content: l.content,
            videoUrl: l.videoUrl,
            pdfUrl: l.pdfUrl,
            fileUrl: l.fileUrl,
            quizData: l.quizData,
            duration: l.duration,
            durationSeconds: l.durationSeconds,
            isFree: l.isFree,
            isPublished: l.isPublished,
            order: l.order
          }))
        }))
      };

      if (newPrice !== undefined && newPrice !== '' && !Number.isNaN(Number(newPrice))) {
        baseSnap.price = Number(newPrice);
      }

      if (newVideoLessonId && newVideoUrl) {
        for (const sec of baseSnap.sections) {
          for (const les of sec.lessons) {
            if (les.id === newVideoLessonId) {
              les.videoUrl = String(newVideoUrl).trim();
            }
          }
        }
      }

      if (newModuleTitle && String(newModuleTitle).trim()) {
        baseSnap.sections.push({
          title: String(newModuleTitle).trim(),
          order: baseSnap.sections.length + 1,
          lessons: newLessonTitle
            ? [
                {
                  title: String(newLessonTitle).trim(),
                  type: 'VIDEO',
                  videoUrl: newVideoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                  duration: '15:00',
                  durationSeconds: 900,
                  isFree: false,
                  isPublished: true,
                  order: 1
                }
              ]
            : []
        });
      }

      const classification = classifyCourseChanges(course, baseSnap);
      if (quizUpdateSummary && String(quizUpdateSummary).trim()) {
        classification.majorChanges.push({
          category: 'QUIZ',
          field: 'quiz',
          summary: String(quizUpdateSummary).trim()
        });
      }

      const nextVerNum = (currentVer.liveVersionNumber || 1) + 1;
      const nextVerLabel = `v${nextVerNum}.0`;
      const nextStatus = submitNow ? 'PENDING_REVIEW' : 'DRAFT_VERSION';

      const saved = await saveCourseVersionState(course.id, {
        pendingVersionNumber: nextVerNum,
        pendingVersionLabel: nextVerLabel,
        status: nextStatus,
        detectedChanges: [...classification.majorChanges, ...classification.minorChanges],
        stagedSnapshot: baseSnap,
        submittedAt: submitNow ? new Date().toISOString() : currentVer.submittedAt,
        submittedBy: user.name
      });

      return NextResponse.json({
        success: true,
        versionState: saved,
        message: submitNow
          ? `Staged Version ${nextVerLabel} and submitted for Auditor Approval!`
          : `Saved Major Changes as Draft Version ${nextVerLabel} without affecting Live Version ${currentVer.liveVersionLabel}!`
      });
    }

    // 4. APPROVE_VERSION (Auditor / Reviewer / Admin / Super Admin)
    if (action === 'APPROVE_VERSION') {
      if (!['REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden: Only an Auditor, Reviewer, or Administrator can approve and publish major course versions.' },
          { status: 403 }
        );
      }

      const applied = await applyApprovedVersionToLiveCourse(course.id, user, note);
      return NextResponse.json({
        success: true,
        versionState: applied,
        message: `Version ${applied.liveVersionLabel} approved and published LIVE!`
      });
    }

    // 5. REJECT_VERSION (Auditor / Reviewer / Admin / Super Admin)
    if (action === 'REJECT_VERSION') {
      if (!['REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden: Only an Auditor, Reviewer, or Administrator can reject course versions.' },
          { status: 403 }
        );
      }

      if (!String(note || '').trim()) {
        return NextResponse.json(
          { error: 'Please provide a critique/feedback note explaining what the instructor should adjust.' },
          { status: 400 }
        );
      }

      const rejected = await saveCourseVersionState(course.id, {
        status: 'VERSION_REJECTED',
        reviewedAt: new Date().toISOString(),
        reviewedBy: `${user.name} (${user.role})`,
        reviewerFeedback: String(note).trim()
      });

      if (course.instructorId) {
        await createNotification({
          organizationId: course.organizationId,
          userId: course.instructorId,
          title: `⚠️ Changes Requested for Version ${currentVer.pendingVersionLabel || 'v2.0'}`,
          message: `Auditor feedback on "${course.title}": "${String(note).trim()}". Live version ${currentVer.liveVersionLabel} remains unaffected.`,
          type: 'COURSES',
          category: 'COURSES',
          link: `/instructor/course-versions?courseId=${course.id}`
        });
      }

      return NextResponse.json({
        success: true,
        versionState: rejected,
        message: `Version marked as Revision Requested and instructor notified.`
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('[POST /api/instructor/course-versions] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process version action' }, { status: 500 });
  }
}
