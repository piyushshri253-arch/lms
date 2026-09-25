import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireReviewerAuth, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notification';
import {
  getCourseVersionState,
  saveCourseVersionState,
  applyApprovedVersionToLiveCourse
} from '@/lib/course-versioning';
import { getCourseSecurityPolicy } from '@/lib/content-security';
import {
  getCourseAuditMetadata,
  saveCourseAuditMetadata,
  SectionIssueItem
} from '@/lib/course-audit';

function computeVersionDiff(liveCourse: any, stagedSnap: any) {
  if (!stagedSnap) return null;
  const changes: Array<{
    type: 'ADDED' | 'UPDATED' | 'PRICING' | 'OUTCOMES';
    badge: string;
    title: string;
    before?: string;
    after?: string;
  }> = [];

  if (stagedSnap.price !== undefined && Number(stagedSnap.price) !== Number(liveCourse.price)) {
    changes.push({
      type: 'PRICING',
      badge: '~ Changed Pricing',
      title: 'Course Selling Price Updated',
      before: `₹${liveCourse.price}`,
      after: `₹${stagedSnap.price}`
    });
  }

  if (stagedSnap.title && stagedSnap.title !== liveCourse.title) {
    changes.push({
      type: 'UPDATED',
      badge: '~ Updated Title',
      title: 'Course Title Modified',
      before: liveCourse.title,
      after: stagedSnap.title
    });
  }

  const liveSections = liveCourse.sections || [];
  const stagedSections = Array.isArray(stagedSnap.sections) ? stagedSnap.sections : [];

  stagedSections.forEach((sSec: any, sIdx: number) => {
    const matchingLive = liveSections[sIdx];
    const sLessons = Array.isArray(sSec.lessons) ? sSec.lessons : [];
    const lLessons = matchingLive?.lessons || [];

    if (!matchingLive) {
      changes.push({
        type: 'ADDED',
        badge: `+ Added Module ${sIdx + 1}`,
        title: sSec.title || `Module ${sIdx + 1}`,
        before: 'Not in v1.0 Live',
        after: `${sLessons.length} lectures added in staged version`
      });
    } else if (sLessons.length !== lLessons.length || sSec.title !== matchingLive.title) {
      changes.push({
        type: 'UPDATED',
        badge: `~ Updated Module ${sIdx + 1}`,
        title: sSec.title || matchingLive.title,
        before: `v1.0: ${lLessons.length} lessons`,
        after: `v2.0: ${sLessons.length} lessons`
      });
    }

    sLessons.forEach((sLes: any, lIdx: number) => {
      const lLes = lLessons[lIdx];
      if (!lLes) {
        changes.push({
          type: 'ADDED',
          badge: `+ Added ${sLes.type || 'Lecture'}`,
          title: `${sSec.title} → ${sLes.title}`,
          before: 'None',
          after: `${sLes.type || 'VIDEO'} (${sLes.duration || '10:00'})`
        });
      } else if (sLes.videoUrl !== lLes.videoUrl && sLes.videoUrl) {
        changes.push({
          type: 'UPDATED',
          badge: `~ Changed Video ${lIdx + 1}`,
          title: `${sSec.title} → ${sLes.title}`,
          before: lLes.videoUrl || 'No video',
          after: sLes.videoUrl
        });
      } else if (sLes.pdfUrl !== lLes.pdfUrl && sLes.pdfUrl) {
        changes.push({
          type: 'ADDED',
          badge: `+ Updated PDF`,
          title: `${sSec.title} → ${sLes.title}`,
          before: lLes.pdfUrl || 'No PDF',
          after: sLes.pdfUrl
        });
      }
    });
  });

  if (changes.length === 0) {
    changes.push({
      type: 'UPDATED',
      badge: '~ Staged Curriculum Update',
      title: 'Curriculum & Lecture Metadata Staged for v2.0 Review',
      before: `v1.0 (${liveSections.length} modules)`,
      after: `v2.0 (${stagedSections.length} modules)`
    });
  }

  return changes;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id }, { slug: id }]
      },
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
        category: true,
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                quiz: {
                  include: {
                    questions: true
                  }
                }
              }
            }
          }
        },
        assignments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const isAuditorOrAdmin = ['REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role);
    const isCourseInstructor = user.id === course.instructorId;

    if (!isAuditorOrAdmin && !isCourseInstructor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Also fetch all quizzes belonging to this course via lesson.section.courseId
    const courseQuizzes = await prisma.quiz.findMany({
      where: {
        lesson: {
          section: {
            courseId: course.id
          }
        }
      },
      include: {
        questions: true
      }
    });

    const [versionState, securityPolicy, auditMeta] = await Promise.all([
      getCourseVersionState(course.id),
      getCourseSecurityPolicy(course.id),
      getCourseAuditMetadata(course.id)
    ]);

    let learningOutcomes: string[] = [];
    let requirementsList: string[] = [];
    let audienceList: string[] = [];
    try {
      learningOutcomes = JSON.parse(course.whatYouWillLearn || '[]');
    } catch {}
    try {
      requirementsList = JSON.parse(course.requirements || '[]');
    } catch {}
    try {
      audienceList = JSON.parse(course.targetAudience || '[]');
    } catch {}

    const hasPendingVersionReview =
      course.status === 'PUBLISHED' &&
      versionState.status === 'PENDING_REVIEW' &&
      Boolean(versionState.stagedSnapshot);

    let submissionType: 'NEW' | 'MAJOR_UPDATE' | 'RESUBMISSION' = auditMeta.submissionType || 'NEW';
    if (hasPendingVersionReview || (versionState.stagedSnapshot && course.status === 'PUBLISHED')) {
      submissionType = 'MAJOR_UPDATE';
    } else if (
      auditMeta.reviewHistory.some((h) => h.action === 'RESUBMITTED') ||
      (course.reviewFeedback && course.status === 'IN_REVIEW')
    ) {
      submissionType = 'RESUBMISSION';
    }

    const versionDiff = computeVersionDiff(course, versionState.stagedSnapshot);

    // Map Learning Outcomes -> Related Lessons automatically
    const allLessons = course.sections.flatMap((s) =>
      s.lessons.map((l) => ({
        ...l,
        moduleTitle: s.title
      }))
    );

    const outcomeMappings = learningOutcomes.map((outcome) => {
      const words = outcome
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3);
      const matched = allLessons.filter((les) =>
        words.some(
          (w) =>
            les.title.toLowerCase().includes(w) ||
            (les.description || '').toLowerCase().includes(w)
        )
      );
      return {
        outcome,
        relatedLessons: (matched.length > 0 ? matched : allLessons.slice(0, 2)).map((m) => ({
          id: m.id,
          title: m.title,
          moduleTitle: m.moduleTitle,
          type: m.type
        }))
      };
    });

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        learningOutcomes,
        requirementsList,
        audienceList,
        quizzes: courseQuizzes,
        outcomeMappings
      },
      submissionType,
      versionLabel: hasPendingVersionReview
        ? versionState.pendingVersionLabel || 'v2.0'
        : versionState.liveVersionLabel || 'v1.0',
      versionState,
      versionDiff,
      securityPolicy,
      auditMeta: {
        ...auditMeta,
        submissionType,
        // CRITICAL RBAC: Internal Auditor Notes are NEVER exposed to Instructors
        internalNotes: isAuditorOrAdmin ? auditMeta.internalNotes : []
      }
    });
  } catch (err: any) {
    console.error('[GET /api/reviewer/courses/[id]/review Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      action,
      note,
      internalNote,
      sectionStatuses,
      sectionIssues,
      confirmNonCompliance,
      mediaReviewedType
    } = body;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        sections: { include: { lessons: true } }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const auditMeta = await getCourseAuditMetadata(course.id);
    const versionState = await getCourseVersionState(course.id);

    // INSTRUCTOR RESUBMISSION FLOW (Requirement #20)
    if (action === 'RESUBMIT') {
      if (user.id !== course.instructorId && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const resubmitNote = (note || 'Instructor updated the course and resubmitted for audit.').trim();
      const updatedHistory = [
        {
          id: `hist_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: user.id,
          actorName: user.name,
          actorRole: 'INSTRUCTOR',
          action: 'RESUBMITTED' as const,
          versionLabel: versionState.pendingVersionLabel || versionState.liveVersionLabel || 'v1.0',
          submissionType: 'RESUBMISSION' as const,
          feedback: resubmitNote
        },
        ...auditMeta.reviewHistory
      ];

      await saveCourseAuditMetadata(course.id, {
        submissionType: 'RESUBMISSION',
        submittedAt: new Date().toISOString(),
        reviewHistory: updatedHistory
      });

      if (course.status === 'PUBLISHED' && versionState.stagedSnapshot) {
        await saveCourseVersionState(course.id, {
          status: 'PENDING_REVIEW'
        });
      } else {
        await prisma.course.update({
          where: { id: course.id },
          data: { status: 'IN_REVIEW' }
        });
      }

      await createAuditLog({
        organizationId: course.organizationId || undefined,
        actorId: user.id,
        actorEmail: user.email,
        action: 'RESUBMITTED',
        entity: 'Course',
        entityId: course.id,
        description: `Instructor "${user.name}" resubmitted course "${course.title}" for Auditor review.`
      });

      return NextResponse.json({
        success: true,
        message: 'Course resubmitted to the Auditor Review Queue! Previous review history is preserved.'
      });
    }

    // All other actions require Course Auditor / Reviewer privilege
    const auditor = await requireReviewerAuth();
    if (!validateTenantOwnership(course.organizationId, auditor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Save Internal Note / Section Issues / Media Reviewed (Requirement #12, #13, #22)
    if (action === 'SAVE_AUDIT_DRAFT') {
      const nextInternalNotes = internalNote?.trim()
        ? [
            {
              id: `inote_${Date.now()}`,
              authorName: auditor.name,
              authorRole: auditor.role,
              note: internalNote.trim(),
              createdAt: new Date().toISOString()
            },
            ...auditMeta.internalNotes
          ]
        : auditMeta.internalNotes;

      const nextHistory = [...auditMeta.reviewHistory];
      if (mediaReviewedType === 'VIDEO' || mediaReviewedType === 'PDF') {
        nextHistory.unshift({
          id: `hist_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: auditor.id,
          actorName: auditor.name,
          actorRole: auditor.role,
          action: mediaReviewedType === 'VIDEO' ? 'VIDEO_REVIEWED' : 'PDF_REVIEWED',
          versionLabel: versionState.pendingVersionLabel || versionState.liveVersionLabel || 'v1.0',
          submissionType: auditMeta.submissionType,
          feedback: `${mediaReviewedType} stream & DRM protection verified by Auditor.`
        });
      }

      const savedMeta = await saveCourseAuditMetadata(course.id, {
        reviewStartedAt: auditMeta.reviewStartedAt || new Date().toISOString(),
        sectionStatuses: sectionStatuses || auditMeta.sectionStatuses,
        sectionIssues: Array.isArray(sectionIssues) ? sectionIssues : auditMeta.sectionIssues,
        internalNotes: nextInternalNotes,
        reviewHistory: nextHistory
      });

      await createAuditLog({
        organizationId: course.organizationId || undefined,
        actorId: auditor.id,
        actorEmail: auditor.email,
        action: mediaReviewedType === 'VIDEO' ? 'VIDEO_REVIEWED' : mediaReviewedType === 'PDF' ? 'PDF_REVIEWED' : 'REVIEW_STARTED',
        entity: 'Course',
        entityId: course.id,
        description: `Auditor "${auditor.name}" updated audit notes/checklist for "${course.title}".`
      });

      return NextResponse.json({
        success: true,
        auditMeta: savedMeta,
        message: 'Auditor checklist, section issues, and internal notes saved.'
      });
    }

    if (!['APPROVE', 'REQUEST_CHANGES', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE, REQUEST_CHANGES, or REJECT.' },
        { status: 400 }
      );
    }

    const trimmedNote = (note || '').trim();
    const updatedIssues: SectionIssueItem[] = Array.isArray(sectionIssues)
      ? sectionIssues
      : auditMeta.sectionIssues;

    // Requirement #14: Mandatory Critique Note on REQUEST_CHANGES
    if (action === 'REQUEST_CHANGES' && trimmedNote.length < 10) {
      return NextResponse.json(
        {
          error:
            'Critique / Feedback note (minimum 10 characters) is mandatory when requesting changes.'
        },
        { status: 400 }
      );
    }

    // Requirement #15: Mandatory Reason + Confirmation Checkbox on REJECT
    if (action === 'REJECT') {
      if (trimmedNote.length < 10) {
        return NextResponse.json(
          { error: 'Mandatory rejection reason (minimum 10 characters) is required.' },
          { status: 400 }
        );
      }
      if (!confirmNonCompliance) {
        return NextResponse.json(
          {
            error:
              'Please confirm the compliance checkbox stating the course does not meet platform review requirements.'
          },
          { status: 400 }
        );
      }
    }

    const versionLabel =
      versionState.pendingVersionLabel || versionState.liveVersionLabel || 'v1.0';

    // Record in Review History
    const historyAction =
      action === 'APPROVE'
        ? course.status === 'PUBLISHED' && versionState.stagedSnapshot
          ? 'VERSION_APPLIED'
          : 'COURSE_APPROVED'
        : action === 'REQUEST_CHANGES'
        ? 'CHANGES_REQUESTED'
        : 'COURSE_REJECTED';

    const newHistoryEntry = {
      id: `hist_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: auditor.id,
      actorName: auditor.name,
      actorRole: auditor.role,
      action: historyAction as any,
      versionLabel,
      submissionType: auditMeta.submissionType,
      feedback: trimmedNote || 'Approved by Course Auditor.',
      sectionIssues: updatedIssues
    };

    // CASE A: Existing Published Course v2.0 Major Update (Requirement #17)
    if (course.status === 'PUBLISHED' && versionState.stagedSnapshot) {
      if (action === 'APPROVE') {
        // Archive previous v1.0 snapshot so rollback is always possible
        const archivedSnapshot = {
          versionLabel: versionState.liveVersionLabel || 'v1.0',
          status: 'ARCHIVED' as const,
          archivedAt: new Date().toISOString(),
          snapshot: {
            title: course.title,
            price: course.price,
            sectionsCount: course.sections.length
          }
        };

        await saveCourseAuditMetadata(course.id, {
          reviewedAt: new Date().toISOString(),
          sectionStatuses: sectionStatuses || auditMeta.sectionStatuses,
          sectionIssues: updatedIssues,
          reviewHistory: [newHistoryEntry, ...auditMeta.reviewHistory],
          archivedVersions: [archivedSnapshot, ...auditMeta.archivedVersions]
        });

        const applied = await applyApprovedVersionToLiveCourse(course.id, auditor, trimmedNote);

        await createAuditLog({
          organizationId: course.organizationId || undefined,
          actorId: auditor.id,
          actorEmail: auditor.email,
          action: 'VERSION_APPLIED',
          entity: 'Course',
          entityId: course.id,
          description: `Auditor "${auditor.name}" approved staged version ${applied.liveVersionLabel} for "${course.title}". Previous v1.0 archived.`
        });

        return NextResponse.json({
          success: true,
          versionState: applied,
          message: `Version ${applied.liveVersionLabel} approved and applied LIVE! Previous version archived for rollback.`
        });
      } else {
        const rejectedVer = await saveCourseVersionState(course.id, {
          status: 'VERSION_REJECTED',
          reviewedAt: new Date().toISOString(),
          reviewedBy: `${auditor.name} (${auditor.role})`,
          reviewerFeedback: trimmedNote
        });

        await saveCourseAuditMetadata(course.id, {
          reviewedAt: new Date().toISOString(),
          sectionStatuses: sectionStatuses || auditMeta.sectionStatuses,
          sectionIssues: updatedIssues,
          reviewHistory: [newHistoryEntry, ...auditMeta.reviewHistory]
        });

        if (course.instructorId) {
          await createNotification({
            organizationId: course.organizationId,
            userId: course.instructorId,
            title: `⚠️ Changes Requested on ${versionLabel}: "${course.title}"`,
            message: `Your course update requires changes before approval. Auditor feedback: "${trimmedNote}"`,
            type: 'COURSES',
            category: 'COURSES',
            link: `/instructor/course/${course.id}/review`
          });
        }

        await createAuditLog({
          organizationId: course.organizationId || undefined,
          actorId: auditor.id,
          actorEmail: auditor.email,
          action: action === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED' : 'COURSE_REJECTED',
          entity: 'Course',
          entityId: course.id,
          description: `Auditor "${auditor.name}" requested changes on staged version ${versionLabel} for "${course.title}".`
        });

        return NextResponse.json({
          success: true,
          versionState: rejectedVer,
          message: `Staged version ${versionLabel} marked as ${action}. Live course remains untouched.`
        });
      }
    }

    // CASE B: Standard Course Review (Requirement #14, #15, #16)
    const nextCourseStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updatedCourse = await prisma.course.update({
      where: { id: course.id },
      data: {
        status: nextCourseStatus,
        reviewFeedback: trimmedNote || null,
        reviewedAt: new Date(),
        reviewedById: auditor.id
      }
    });

    await saveCourseAuditMetadata(course.id, {
      reviewedAt: new Date().toISOString(),
      sectionStatuses: sectionStatuses || auditMeta.sectionStatuses,
      sectionIssues: updatedIssues,
      reviewHistory: [newHistoryEntry, ...auditMeta.reviewHistory]
    });

    // Requirement #18: Notify Instructor with link to /instructor/course/[id]/review
    if (course.instructorId) {
      if (action === 'APPROVE') {
        await createNotification({
          organizationId: course.organizationId,
          userId: course.instructorId,
          title: `🎉 Approved: "${course.title}"`,
          message: `Your course has been approved by the Course Auditor. You can now publish it live.`,
          type: 'COURSES',
          category: 'COURSES',
          link: `/instructor/course/${course.id}/review`
        });
      } else {
        await createNotification({
          organizationId: course.organizationId,
          userId: course.instructorId,
          title:
            action === 'REQUEST_CHANGES'
              ? `⚠️ Changes Requested: "${course.title}"`
              : `❌ Course Rejected: "${course.title}"`,
          message: `Your course requires changes before it can be approved. Please review the auditor feedback: "${trimmedNote}"`,
          type: 'COURSES',
          category: 'COURSES',
          link: `/instructor/course/${course.id}/review`
        });
      }
    }

    await createAuditLog({
      organizationId: course.organizationId || undefined,
      actorId: auditor.id,
      actorEmail: auditor.email,
      action:
        action === 'APPROVE'
          ? 'COURSE_APPROVED'
          : action === 'REQUEST_CHANGES'
          ? 'CHANGES_REQUESTED'
          : 'COURSE_REJECTED',
      entity: 'Course',
      entityId: course.id,
      description: `Auditor "${auditor.name}" (${action}) course "${course.title}". Note: "${trimmedNote}"`
    });

    return NextResponse.json({
      success: true,
      course: updatedCourse,
      message:
        action === 'APPROVE'
          ? `Course "${course.title}" is now APPROVED! The instructor has been notified and can now publish it live.`
          : action === 'REQUEST_CHANGES'
          ? `Changes Requested sent to instructor with ${updatedIssues.length} section feedback items.`
          : `Course "${course.title}" has been Rejected.`
    });
  } catch (err: any) {
    console.error('[POST /api/reviewer/courses/[id]/review Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
