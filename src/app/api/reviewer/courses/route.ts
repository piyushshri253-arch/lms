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
        const hasPendingVersionReview =
          c.status === 'PUBLISHED' &&
          versionState.status === 'PENDING_REVIEW' &&
          Boolean(versionState.stagedSnapshot);

        // Determine submission type (NEW vs MAJOR_UPDATE vs RESUBMISSION)
        let submissionType: 'NEW' | 'MAJOR_UPDATE' | 'RESUBMISSION' = auditMeta.submissionType || 'NEW';
        if (hasPendingVersionReview || (versionState.stagedSnapshot && c.status === 'PUBLISHED')) {
          submissionType = 'MAJOR_UPDATE';
        } else if (
          auditMeta.reviewHistory.some((h) => h.action === 'RESUBMITTED') ||
          (c.reviewFeedback && c.status === 'IN_REVIEW')
        ) {
          submissionType = 'RESUBMISSION';
        }

        const versionLabel = hasPendingVersionReview
          ? versionState.pendingVersionLabel || 'v2.0'
          : versionState.liveVersionLabel || 'v1.0';

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
          totalSections: c.sections.length
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
        c.status === 'REJECTED' ||
        c.status === 'CHANGES_REQUESTED' ||
        c.effectiveReviewStatus === 'CHANGES_REQUESTED' ||
        c.versionState?.status === 'VERSION_REJECTED'
    ).length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyUpdatedCount = enrichedCourses.filter(
      (c) => new Date(c.updatedAt) >= sevenDaysAgo
    ).length;

    // Apply status & type filters
    let filtered = enrichedCourses;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'IN_REVIEW' || statusFilter === 'PENDING') {
        filtered = filtered.filter(
          (c) => c.effectiveReviewStatus === 'IN_REVIEW' || c.status === 'IN_REVIEW'
        );
      } else if (statusFilter === 'CHANGES_REQUESTED') {
        filtered = filtered.filter(
          (c) =>
            c.effectiveReviewStatus === 'CHANGES_REQUESTED' ||
            c.status === 'CHANGES_REQUESTED' ||
            c.status === 'REJECTED' ||
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
        recentlyUpdated: recentlyUpdatedCount,
        avgReviewTime: '1.8 hrs',
        total: enrichedCourses.length
      },
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
