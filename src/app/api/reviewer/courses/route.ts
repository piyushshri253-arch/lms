import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireReviewerAuth } from '@/lib/auth';
import { getCourseVersionState } from '@/lib/course-versioning';
import { getCourseAuditMetadata } from '@/lib/course-audit';

export async function GET(request: Request) {
  try {
    const user = await requireReviewerAuth();
    const { searchParams } = new URL(request.url);
    const statusFilter = (searchParams.get('status') || 'ALL').trim().toUpperCase();
    const typeFilter = (searchParams.get('type') || 'ALL').trim().toUpperCase();
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const andConditions: any[] = [];

    if (user.role !== 'SUPER_ADMIN' && user.organizationId) {
      andConditions.push({
        OR: [{ organizationId: user.organizationId }, { organizationId: null }]
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { instructor: { name: { contains: search, mode: 'insensitive' } } },
          { instructor: { email: { contains: search, mode: 'insensitive' } } },
          { category: { name: { contains: search, mode: 'insensitive' } } }
        ]
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const courses = await prisma.course.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                duration: true,
                durationSeconds: true,
                videoUrl: true,
                pdfUrl: true,
                fileUrl: true,
                isFree: true,
                order: true,
                updatedAt: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true
          }
        }
      }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const enrichedCourses = await Promise.all(
      courses.map(async (c) => {
        const [versionState, auditMeta] = await Promise.all([
          getCourseVersionState(c.id),
          getCourseAuditMetadata(c.id)
        ]);

        let learnPoints: string[] = [];
        let reqList: string[] = [];
        let audienceList: string[] = [];

        try {
          learnPoints = JSON.parse(c.whatYouWillLearn || '[]');
        } catch {}
        try {
          reqList = JSON.parse(c.requirements || '[]');
        } catch {}
        try {
          audienceList = JSON.parse(c.targetAudience || '[]');
        } catch {}

        const totalLessons = c.sections.reduce((sum, s) => sum + s.lessons.length, 0);
        let totalVideos = 0;
        let totalPdfs = 0;
        let totalQuizzes = 0;
        let totalArticles = 0;
        c.sections.forEach((s) => {
          s.lessons.forEach((l) => {
            if (l.type === 'QUIZ') totalQuizzes++;
            else if (l.type === 'DOCUMENT' || l.pdfUrl) totalPdfs++;
            else if (l.type === 'ARTICLE') totalArticles++;
            else if (l.type === 'VIDEO' || l.videoUrl) totalVideos++;
            else totalVideos++;
          });
        });
        const hasPendingVersionReview =
          c.status === 'PUBLISHED' &&
          versionState.status === 'PENDING_REVIEW' &&
          Boolean(versionState.stagedSnapshot);

        const versionLabel = (hasPendingVersionReview || Boolean(versionState.stagedSnapshot))
          ? versionState.pendingVersionLabel || 'v2.0'
          : versionState.liveVersionLabel || 'v1.0';

        // Determine submission type (NEW vs MAJOR_UPDATE vs RESUBMISSION)
        let submissionType: 'NEW' | 'MAJOR_UPDATE' | 'RESUBMISSION' = auditMeta.submissionType || 'NEW';
        if (hasPendingVersionReview || (versionState.stagedSnapshot && c.status === 'PUBLISHED') || versionLabel.startsWith('v2')) {
          submissionType = 'MAJOR_UPDATE';
        } else if (
          auditMeta.reviewHistory.some((h) => h.action === 'RESUBMITTED') ||
          (c.reviewFeedback && c.status === 'IN_REVIEW')
        ) {
          submissionType = 'RESUBMISSION';
        }

        const effectiveReviewStatus = hasPendingVersionReview
          ? 'IN_REVIEW'
          : c.status === 'REJECTED' && auditMeta.sectionIssues.length > 0
          ? 'CHANGES_REQUESTED'
          : c.status;

        return {
          ...c,
          versionState,
          auditMeta: {
            submissionType,
            sectionStatuses: auditMeta.sectionStatuses,
            sectionIssuesCount: auditMeta.sectionIssues.length,
            historyCount: auditMeta.reviewHistory.length,
            submittedAt: auditMeta.submittedAt || c.updatedAt.toISOString()
          },
          submissionType,
          versionLabel,
          effectiveReviewStatus,
          hasPendingVersionReview,
          learningOutcomes: learnPoints,
          requirementsList: reqList,
          audienceList,
          totalLessons,
          totalSections: c.sections.length,
          contentCounts: {
            videos: totalVideos,
            pdfs: totalPdfs,
            quizzes: totalQuizzes,
            articles: totalArticles
          }
        };
      })
    );

    // Compute 6 Dashboard KPI metrics
    const pendingReviewCount = enrichedCourses.filter(
      (c) => c.effectiveReviewStatus === 'IN_REVIEW' || c.status === 'PENDING_APPROVAL'
    ).length;

    const inReviewCount = enrichedCourses.filter(
      (c) => c.effectiveReviewStatus === 'IN_REVIEW'
    ).length;

    const approvedTodayCount = enrichedCourses.filter(
      (c) =>
        (c.status === 'APPROVED' || c.status === 'PUBLISHED') &&
        c.reviewedAt &&
        new Date(c.reviewedAt) >= todayStart
    ).length;

    const changesRequestedCount = enrichedCourses.filter(
      (c) =>
        c.status === 'CHANGES_REQUESTED' ||
        c.effectiveReviewStatus === 'CHANGES_REQUESTED' ||
        c.versionState?.status === 'VERSION_REJECTED'
    ).length;

    const rejectedCount = enrichedCourses.filter(
      (c) => c.status === 'REJECTED' && c.effectiveReviewStatus !== 'CHANGES_REQUESTED'
    ).length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyUpdatedCount = enrichedCourses.filter(
      (c) => new Date(c.updatedAt) >= sevenDaysAgo
    ).length;

    // Overdue Courses Calculation (24 Hours SLA Rule)
    // Any course pending review (IN_REVIEW, PENDING, PENDING_APPROVAL) that has been waiting >= 24 hours is 1+ days overdue
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    const pendingCourses = enrichedCourses.filter(
      (c) =>
        c.effectiveReviewStatus === 'IN_REVIEW' ||
        c.status === 'IN_REVIEW' ||
        c.status === 'PENDING_APPROVAL' ||
        c.status === 'PENDING'
    );

    const overdueCourses = pendingCourses
      .map((c) => {
        const submittedTimestamp = new Date(c.auditMeta?.submittedAt || c.updatedAt || c.createdAt).getTime();
        const elapsedMs = now - submittedTimestamp;
        const isOverdue = elapsedMs >= TWENTY_FOUR_HOURS_MS;
        const overdueDays = isOverdue ? Math.max(1, Math.floor(elapsedMs / TWENTY_FOUR_HOURS_MS)) : 0;
        return {
          id: c.id,
          title: c.title,
          instructorName: c.instructor?.name || 'Instructor',
          submittedAt: c.auditMeta?.submittedAt || c.updatedAt,
          elapsedHours: Math.round(elapsedMs / (1000 * 60 * 60)),
          overdueDays,
          isOverdue
        };
      })
      .filter((c) => c.isOverdue);

    const overdueCount = overdueCourses.length;
    const maxOverdueDays = overdueCourses.length > 0
      ? Math.max(...overdueCourses.map((c) => c.overdueDays))
      : 0;

    // Fetch Real Auditor Recent Activities from Database Audit Logs
    const rawAuditLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'COURSE_APPROVED',
            'AUDIT_COURSE_APPROVED',
            'COURSE_CHANGES_REQUESTED',
            'AUDIT_COURSE_CHANGES_REQUESTED',
            'COURSE_REJECTED',
            'AUDIT_COURSE_REJECTED',
            'SUBMIT_COURSE_UPDATES_FOR_REVIEW',
            'UPDATE_COURSE'
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 6
    });

    const recentActivities: Array<{
      id: string;
      icon: string;
      iconColor: string;
      title: string;
      createdAt: string;
    }> = [];

    for (const log of rawAuditLogs) {
      let icon = '⚡';
      let iconColor = 'text-blue-600 bg-blue-100';
      let title = log.description || log.action;

      if (log.action.includes('APPROVED')) {
        icon = '✓';
        iconColor = 'text-emerald-600 bg-emerald-100';
      } else if (log.action.includes('CHANGES_REQUESTED')) {
        icon = '↺';
        iconColor = 'text-amber-600 bg-amber-100';
      } else if (log.action.includes('REJECTED')) {
        icon = '✕';
        iconColor = 'text-rose-600 bg-rose-100';
      } else if (log.action.includes('SUBMIT')) {
        icon = '↑';
        iconColor = 'text-indigo-600 bg-indigo-100';
      }

      const match = log.description?.match(/course\s+"([^"]+)"/i);
      const courseTitle = match ? match[1] : null;

      if (courseTitle) {
        if (log.action.includes('APPROVED')) {
          title = `Approved "${courseTitle}"`;
        } else if (log.action.includes('CHANGES_REQUESTED')) {
          title = `Requested changes for "${courseTitle}"`;
        } else if (log.action.includes('REJECTED')) {
          title = `Rejected "${courseTitle}"`;
        } else if (log.action.includes('SUBMIT')) {
          title = `Submitted updates for "${courseTitle}"`;
        }
      }

      recentActivities.push({
        id: log.id,
        icon,
        iconColor,
        title,
        createdAt: log.createdAt.toISOString()
      });
    }

    // Fallback: If no audit log records exist yet, populate from real evaluated courses
    if (recentActivities.length === 0) {
      enrichedCourses
        .filter((c) => ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].includes(c.status) || c.reviewedAt)
        .slice(0, 5)
        .forEach((c) => {
          let icon = '✓';
          let iconColor = 'text-emerald-600 bg-emerald-100';
          let title = `Approved "${c.title}"`;
          if (c.status === 'CHANGES_REQUESTED') {
            icon = '↺';
            iconColor = 'text-amber-600 bg-amber-100';
            title = `Requested changes for "${c.title}"`;
          } else if (c.status === 'REJECTED') {
            icon = '✕';
            iconColor = 'text-rose-600 bg-rose-100';
            title = `Rejected "${c.title}"`;
          }
          recentActivities.push({
            id: c.id,
            icon,
            iconColor,
            title,
            createdAt: (c.reviewedAt ? new Date(c.reviewedAt) : new Date(c.updatedAt)).toISOString()
          });
        });
    }

    // Apply status & type filters
    let filtered = enrichedCourses;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'IN_REVIEW' || statusFilter === 'PENDING') {
        filtered = filtered.filter(
          (c) => c.effectiveReviewStatus === 'IN_REVIEW' || c.status === 'IN_REVIEW' || c.status === 'PENDING_APPROVAL'
        );
      } else if (statusFilter === 'CHANGES_REQUESTED') {
        filtered = filtered.filter(
          (c) =>
            c.effectiveReviewStatus === 'CHANGES_REQUESTED' ||
            c.status === 'CHANGES_REQUESTED' ||
            c.versionState?.status === 'VERSION_REJECTED'
        );
      } else if (statusFilter === 'APPROVED') {
        filtered = filtered.filter(
          (c) => c.status === 'APPROVED' || c.status === 'PUBLISHED'
        );
      } else if (statusFilter === 'REJECTED') {
        filtered = filtered.filter((c) => c.status === 'REJECTED');
      }
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((c) => c.submissionType === typeFilter);
    }

    return NextResponse.json({
      success: true,
      stats: {
        pendingReview: pendingReviewCount,
        inReview: inReviewCount,
        approvedToday: approvedTodayCount,
        approved: enrichedCourses.filter(
          (c) => c.status === 'APPROVED' || c.status === 'PUBLISHED'
        ).length,
        changesRequested: changesRequestedCount,
        rejected: rejectedCount,
        recentlyUpdated: recentlyUpdatedCount,
        overdueCount,
        maxOverdueDays,
        overdueCourses,
        avgReviewTime: '1.8 hrs',
        total: enrichedCourses.length
      },
      recentActivities,
      courses: filtered
    });
  } catch (err: any) {
    console.error('[Reviewer Courses GET Error]:', err);
    const msg = String(err?.message || '');
    const isAuth = msg === 'UNAUTHORIZED' || msg.includes('UNAUTHORIZED');
    const isForbidden =
      msg === 'FORBIDDEN' || msg.includes('FORBIDDEN') || msg.includes('INSUFFICIENT');
    return NextResponse.json(
      {
        error: isForbidden
          ? 'Access denied: Course Auditor or Administrator privileges required.'
          : isAuth
          ? 'Authentication required. Please log into a Course Auditor account.'
          : err.message || 'Server error'
      },
      { status: isAuth ? 401 : isForbidden ? 403 : 400 }
    );
  }
}
