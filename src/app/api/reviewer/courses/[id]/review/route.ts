import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getReviewerCurrentUser, requireReviewerAuth, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notification';
import { EmailService } from '@/lib/email';
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
    const user = (await getReviewerCurrentUser()) || (await getCurrentUser());
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

    const isAuditorOrAdmin = ['REVIEWER', 'AUDITOR', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role);
    const isCourseInstructor = user.id === course.instructorId;

    if (!isAuditorOrAdmin && !isCourseInstructor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Concurrently fetch all quizzes and metadata belonging to this course
    const [courseQuizzes, versionState, securityPolicy, auditMeta] = await Promise.all([
      prisma.quiz.findMany({
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
      }),
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
    const user = (await getReviewerCurrentUser()) || (await getCurrentUser());
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

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id }, { slug: id }]
      },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        category: { select: { name: true } },
        sections: { include: { lessons: true } }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    let instructor = course.instructor;
    if ((!instructor || !instructor.email) && course.instructorId) {
      const dbInstructor = await prisma.user.findUnique({
        where: { id: course.instructorId },
        select: { id: true, name: true, email: true }
      });
      if (dbInstructor) instructor = dbInstructor;
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
      if (mediaReviewedType === 'VIDEO' || mediaReviewedType === 'PDF' || mediaReviewedType === 'QUIZ') {
        nextHistory.unshift({
          id: `hist_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: auditor.id,
          actorName: auditor.name,
          actorRole: auditor.role,
          action: mediaReviewedType === 'VIDEO' ? 'VIDEO_REVIEWED' : mediaReviewedType === 'PDF' ? 'PDF_REVIEWED' : 'QUIZ_REVIEWED',
          versionLabel: versionState.pendingVersionLabel || versionState.liveVersionLabel || 'v1.0',
          submissionType: auditMeta.submissionType,
          feedback: `${mediaReviewedType} verified by Auditor.`
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
        action: mediaReviewedType === 'VIDEO' ? 'VIDEO_REVIEWED' : mediaReviewedType === 'PDF' ? 'PDF_REVIEWED' : mediaReviewedType === 'QUIZ' ? 'QUIZ_REVIEWED' : 'REVIEW_STARTED',
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
    const finalNote =
      trimmedNote ||
      (action === 'APPROVE'
        ? 'Course curriculum, video lessons, and resources approved by Auditor.'
        : action === 'REQUEST_CHANGES'
        ? 'Changes requested by Auditor: Please review curriculum sections and resubmit for evaluation.'
        : 'Course rejected: Does not meet platform review and quality standards.');

    const updatedIssues: SectionIssueItem[] = Array.isArray(sectionIssues)
      ? sectionIssues
      : auditMeta.sectionIssues;

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
      feedback: finalNote,
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

        const applied = await applyApprovedVersionToLiveCourse(course.id, auditor, finalNote);

        await createAuditLog({
          organizationId: course.organizationId || undefined,
          actorId: auditor.id,
          actorEmail: auditor.email,
          action: 'VERSION_APPLIED',
          entity: 'Course',
          entityId: course.id,
          description: `Auditor "${auditor.name}" approved staged version ${applied.liveVersionLabel} for "${course.title}". Previous v1.0 archived.`
        });

        if (instructor?.email) {
          console.log(`[Auditor Review] Sending VERSION APPROVED email to instructor ${instructor.email} for course "${course.title}"`);
          await EmailService.sendCourseReviewDecisionEmail({
            decision: 'APPROVED',
            course: { id: course.id, title: course.title, category: course.category?.name, slug: course.slug },
            instructor: { id: instructor.id, name: instructor.name, email: instructor.email },
            auditor: { name: auditor.name, role: auditor.role },
            feedback: finalNote,
            organizationId: course.organizationId
          }).catch((err) => console.error('[Version Approved Email Error]:', err));
        }

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
          reviewerFeedback: finalNote
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
            message: `Your course update requires changes before approval. Auditor feedback: "${finalNote}"`,
            type: 'COURSES',
            category: 'COURSES',
            link: `/instructor/course/${course.id}/review`
          });

          if (instructor?.email) {
            console.log(`[Auditor Review] Sending VERSION ${action} email to instructor ${instructor.email} for course "${course.title}"`);
            await EmailService.sendCourseReviewDecisionEmail({
              decision: action === 'REQUEST_CHANGES' ? 'REQUEST_CHANGES' : 'REJECTED',
              course: { id: course.id, title: course.title, category: course.category?.name, slug: course.slug },
              instructor: { id: instructor.id, name: instructor.name, email: instructor.email },
              auditor: { name: auditor.name, role: auditor.role },
              feedback: finalNote,
              organizationId: course.organizationId
            }).catch((err) => console.error('[Version Changes Requested Email Error]:', err));
          }
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
    const nextCourseStatus = action === 'APPROVE' ? 'APPROVED' : action === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED' : 'REJECTED';

    const updatedCourse = await prisma.course.update({
      where: { id: course.id },
      data: {
        status: nextCourseStatus,
        reviewFeedback: action === 'APPROVE' ? null : finalNote,
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

    // Synchronize Course Version State for Child & Parent Course
    try {
      if (course.parentCourseId) {
        if (action === 'APPROVE') {
          await saveCourseVersionState(course.id, {
            status: 'APPROVED',
            pendingVersionNumber: course.versionNumber || 2,
            pendingVersionLabel: course.versionLabel || `v${course.versionNumber || 2}.0`,
            reviewedAt: new Date().toISOString(),
            reviewedBy: `${auditor.name} (${auditor.role})`,
            reviewerFeedback: null
          });
          // Parent course (v1.0) remains LIVE_SYNCED and MUST NOT show "Approved by Auditor" or "Publish Live"
          await saveCourseVersionState(course.parentCourseId, {
            status: 'LIVE_SYNCED',
            pendingVersionNumber: null,
            pendingVersionLabel: null
          });
        } else {
          await saveCourseVersionState(course.id, {
            status: 'VERSION_REJECTED',
            reviewedAt: new Date().toISOString(),
            reviewedBy: `${auditor.name} (${auditor.role})`,
            reviewerFeedback: finalNote
          });
          await saveCourseVersionState(course.parentCourseId, {
            status: 'VERSION_REJECTED',
            reviewedAt: new Date().toISOString(),
            reviewedBy: `${auditor.name} (${auditor.role})`,
            reviewerFeedback: finalNote
          });
        }
      }
    } catch (vErr) {
      console.error('[Auditor Review Version Sync Error]:', vErr);
    }

    // Requirement #18: Notify Instructor with link to /instructor/course/[id]/review & Email
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

        if (instructor?.email) {
          console.log(`[Auditor Review] Sending STANDARD COURSE APPROVED email to instructor ${instructor.email} for course "${course.title}"`);
          await EmailService.sendCourseReviewDecisionEmail({
            decision: 'APPROVED',
            course: { id: course.id, title: course.title, category: course.category?.name, slug: course.slug },
            instructor: { id: instructor.id, name: instructor.name, email: instructor.email },
            auditor: { name: auditor.name, role: auditor.role },
            feedback: finalNote,
            organizationId: course.organizationId
          }).catch((err) => console.error('[Standard Course Approved Email Error]:', err));
        }
      } else {
        await createNotification({
          organizationId: course.organizationId,
          userId: course.instructorId,
          title:
            action === 'REQUEST_CHANGES'
              ? `⚠️ Changes Requested: "${course.title}"`
              : `❌ Course Rejected: "${course.title}"`,
          message: `Your course requires changes before it can be approved. Please review the auditor feedback: "${finalNote}"`,
          type: 'COURSES',
          category: 'COURSES',
          link: `/instructor/course/${course.id}/review`
        });

        if (instructor?.email) {
          console.log(`[Auditor Review] Sending STANDARD COURSE ${action} email to instructor ${instructor.email} for course "${course.title}"`);
          await EmailService.sendCourseReviewDecisionEmail({
            decision: action === 'REQUEST_CHANGES' ? 'REQUEST_CHANGES' : 'REJECTED',
            course: { id: course.id, title: course.title, category: course.category?.name, slug: course.slug },
            instructor: { id: instructor.id, name: instructor.name, email: instructor.email },
            auditor: { name: auditor.name, role: auditor.role },
            feedback: finalNote,
            organizationId: course.organizationId
          }).catch((err) => console.error('[Standard Course Rejected Email Error]:', err));
        }
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
      description: `Auditor "${auditor.name}" (${action}) course "${course.title}". Note: "${finalNote}"`
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
