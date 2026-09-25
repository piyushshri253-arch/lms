import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notification';
import {
  getAssignmentMeta,
  saveAssignmentMeta,
  getSubmissionHistory,
  saveSubmissionHistory,
  AssignmentExtendedMeta,
  AssignmentStatus,
  SubmissionType,
  LateSubmissionPolicy,
  SubmissionVersionItem
} from '@/lib/assessment-engine';

async function fetchAndAuthorizeAssignment(assignmentId: string, user: any) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: {
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: { lessons: { orderBy: { order: 'asc' } } }
          }
        }
      },
      submissions: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        },
        orderBy: { submittedAt: 'desc' }
      }
    }
  });

  if (!assignment) {
    return { error: 'Assignment not found.', status: 404, assignment: null };
  }

  if (user.role === 'INSTRUCTOR' && assignment.course.instructorId !== user.id) {
    return {
      error: 'Forbidden: You do not have permission to access another Instructor’s assignment.',
      status: 403,
      assignment: null
    };
  }

  return { error: null, status: 200, assignment, course: assignment.course };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const authCheck = await fetchAndAuthorizeAssignment(id, user);
    if (authCheck.error || !authCheck.assignment) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { assignment, course } = authCheck;
    const meta = await getAssignmentMeta(assignment.id);

    let allowedFileTypes: string[] = ['pdf', 'zip', 'docx', 'png', 'jpg'];
    try {
      allowedFileTypes = meta?.allowedFileTypes || JSON.parse(assignment.allowedFormats);
    } catch {}

    // Resolve Module & Lesson titles
    let moduleId = meta?.sectionId || '';
    let moduleTitle = 'General Module';
    let lessonTitle = '';

    for (const sec of course.sections) {
      if (sec.id === moduleId) {
        moduleTitle = sec.title;
      }
      for (const les of sec.lessons) {
        if (les.id === assignment.lessonId) {
          lessonTitle = les.title;
          if (!moduleId) {
            moduleId = sec.id;
            moduleTitle = sec.title;
          }
        }
      }
    }

    const rawStatus =
      meta?.status || (assignment.status === 'ACTIVE' ? 'PUBLISHED' : assignment.status);
    const status: AssignmentStatus =
      rawStatus === 'DRAFT'
        ? 'DRAFT'
        : rawStatus === 'ARCHIVED' || rawStatus === 'CLOSED'
        ? 'ARCHIVED'
        : 'PUBLISHED';

    // Format submissions with full multi-version history
    const formattedSubmissions = await Promise.all(
      assignment.submissions.map(async (sub) => {
        const history = await getSubmissionHistory(assignment.id, sub.userId);
        const isLate =
          sub.status === 'LATE' ||
          (assignment.dueDate ? new Date(sub.submittedAt) > new Date(assignment.dueDate) : false);
        const daysLate =
          isLate && assignment.dueDate
            ? Math.max(
                1,
                Math.ceil(
                  (new Date(sub.submittedAt).getTime() - new Date(assignment.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0;

        // Ensure at least version 1 exists in history
        const effectiveHistory: SubmissionVersionItem[] =
          history.length > 0
            ? history
            : [
                {
                  versionNumber: 1,
                  submissionId: sub.id,
                  submittedAt: sub.submittedAt.toISOString(),
                  fileUrl: sub.fileUrl,
                  fileName: sub.fileName,
                  files: sub.fileName
                    ? [{ fileName: sub.fileName, fileUrl: sub.fileUrl || '#' }]
                    : [],
                  textResponse: sub.notes || '',
                  isLate,
                  daysLate,
                  status: (sub.status as any) || 'SUBMITTED',
                  rawScore: sub.score,
                  latePenaltyDeducted: 0,
                  finalScore: sub.score,
                  maxMarks: assignment.maxScore,
                  feedback: sub.feedback,
                  gradedBy: sub.gradedBy,
                  gradedAt: sub.gradedAt ? sub.gradedAt.toISOString() : null
                }
              ];

        const latestVer = effectiveHistory[effectiveHistory.length - 1];

        return {
          id: sub.id,
          studentId: sub.userId,
          studentName: sub.user?.name || 'Student',
          studentEmail: sub.user?.email || '',
          studentAvatar: sub.user?.avatar || null,
          submittedAt: sub.submittedAt.toISOString(),
          dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
          isLate,
          daysLate,
          status: sub.status,
          fileUrl: sub.fileUrl,
          fileName: sub.fileName,
          textResponse: sub.notes || '',
          rawScore: latestVer?.rawScore !== undefined ? latestVer.rawScore : sub.score,
          latePenaltyDeducted: latestVer?.latePenaltyDeducted || 0,
          finalScore: sub.score,
          maxMarks: assignment.maxScore,
          feedback: sub.feedback || '',
          gradedBy: sub.gradedBy || '',
          gradedAt: sub.gradedAt ? sub.gradedAt.toISOString() : null,
          submissionCount: effectiveHistory.length,
          history: effectiveHistory
        };
      })
    );

    const totalSub = formattedSubmissions.length;
    const pendingRev = formattedSubmissions.filter(
      (s) => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW' || s.status === 'LATE'
    ).length;
    const gradedSub = formattedSubmissions.filter(
      (s) => s.status === 'GRADED' && s.finalScore !== null && s.finalScore !== undefined
    );
    const avgMarks =
      gradedSub.length > 0
        ? Number(
            (
              gradedSub.reduce((sum, s) => sum + Number(s.finalScore || 0), 0) / gradedSub.length
            ).toFixed(1)
          )
        : 0;

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        instructions: meta?.instructions || assignment.description,
        courseId: course.id,
        courseTitle: course.title,
        courseSlug: course.slug,
        moduleId,
        moduleTitle,
        lessonId: assignment.lessonId || '',
        lessonTitle,
        dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
        maxMarks: assignment.maxScore,
        submissionType: meta?.submissionType || 'FILE_AND_TEXT',
        allowedFileTypes,
        maxFileSizeMB:
          meta?.maxFileSizeMB || Math.round(assignment.maxFileSizeBytes / (1024 * 1024)),
        allowMultipleSubmissions: meta?.allowMultipleSubmissions ?? true,
        allowResubmission: meta?.allowResubmission ?? true,
        lateSubmissionPolicy: meta?.lateSubmissionPolicy || 'ALLOWED_WITH_PENALTY',
        latePenaltyPercentage: meta?.latePenaltyPercentage ?? 10,
        status,
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString()
      },
      submissions: formattedSubmissions,
      analytics: {
        totalSubmissions: totalSub,
        pendingReviews: pendingRev,
        gradedSubmissions: gradedSub.length,
        returnedSubmissions: formattedSubmissions.filter((s) => s.status === 'RETURNED').length,
        lateSubmissions: formattedSubmissions.filter((s) => s.isLate).length,
        avgMarks,
        avgGradePercent:
          assignment.maxScore > 0 && gradedSub.length > 0
            ? Number(((avgMarks / assignment.maxScore) * 100).toFixed(1))
            : 0
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load assignment details.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const authCheck = await fetchAndAuthorizeAssignment(id, user);
    if (authCheck.error || !authCheck.assignment) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { assignment, course } = authCheck;
    const body = await req.json();

    const {
      title,
      description,
      instructions,
      moduleId,
      lessonId,
      maxMarks = assignment.maxScore,
      dueDate,
      submissionType = 'FILE_AND_TEXT',
      allowedFileTypes = ['pdf', 'zip', 'docx', 'png', 'jpg'],
      maxFileSizeMB = 10,
      allowMultipleSubmissions = true,
      allowResubmission = true,
      lateSubmissionPolicy = 'ALLOWED_WITH_PENALTY',
      latePenaltyPercentage = 10,
      status = 'PUBLISHED'
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'Assignment Title is required.' }, { status: 400 });
    }

    const maxScoreNum = Number(maxMarks);
    if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
      return NextResponse.json(
        { error: 'Maximum Marks must be greater than 0.' },
        { status: 400 }
      );
    }

    const targetStatus: AssignmentStatus =
      status === 'DRAFT' ? 'DRAFT' : status === 'ARCHIVED' ? 'ARCHIVED' : 'PUBLISHED';
    const dbStatus = targetStatus === 'PUBLISHED' ? 'ACTIVE' : targetStatus;

    const cleanFileTypes = Array.isArray(allowedFileTypes)
      ? allowedFileTypes.map((f: string) => f.toLowerCase().replace(/^\./, ''))
      : ['pdf', 'zip', 'docx', 'png', 'jpg'];

    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        title: String(title).trim(),
        description: String(description || instructions).trim(),
        lessonId: lessonId !== undefined ? lessonId || null : assignment.lessonId,
        dueDate: dueDate ? new Date(dueDate) : null,
        maxScore: maxScoreNum,
        allowedFormats: JSON.stringify(cleanFileTypes),
        maxFileSizeBytes: Math.max(1, Number(maxFileSizeMB || 10)) * 1024 * 1024,
        status: dbStatus
      }
    });

    const existingMeta = await getAssignmentMeta(assignment.id);
    const updatedMeta: AssignmentExtendedMeta = {
      assignmentId: assignment.id,
      courseId: course.id,
      sectionId: moduleId || existingMeta?.sectionId || '',
      lessonId: lessonId !== undefined ? lessonId || null : assignment.lessonId,
      instructorId: user.id,
      instructions: String(instructions || description).trim(),
      submissionType: (submissionType as SubmissionType) || 'FILE_AND_TEXT',
      allowedFileTypes: cleanFileTypes,
      maxFileSizeMB: Math.max(1, Number(maxFileSizeMB || 10)),
      allowMultipleSubmissions: !!allowMultipleSubmissions,
      allowResubmission: !!allowResubmission,
      lateSubmissionPolicy:
        (lateSubmissionPolicy as LateSubmissionPolicy) || 'ALLOWED_WITH_PENALTY',
      latePenaltyPercentage: Number(latePenaltyPercentage ?? 10),
      status: targetStatus,
      createdAt: existingMeta?.createdAt || assignment.createdAt.toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveAssignmentMeta(assignment.id, updatedMeta);

    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'ASSIGNMENT_UPDATED',
      entity: 'Assignment',
      entityId: assignment.id,
      description: `Instructor "${user.name}" updated assignment "${title}" (${maxScoreNum} marks, status: ${targetStatus}).`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      assignmentId: assignment.id,
      message: `Assignment "${title}" updated successfully!`
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update assignment.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const authCheck = await fetchAndAuthorizeAssignment(id, user);
    if (authCheck.error || !authCheck.assignment) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { assignment, course } = authCheck;
    const body = await req.json();
    const { action } = body;

    const existingMeta = await getAssignmentMeta(assignment.id);

    // Action 1: Grade or Return a Student Submission
    if (action === 'GRADE_SUBMISSION') {
      const { studentId, rawScore, feedback = '', status = 'GRADED' } = body;

      if (!studentId) {
        return NextResponse.json({ error: 'Student ID is required.' }, { status: 400 });
      }

      const submission = await prisma.assignmentSubmission.findUnique({
        where: {
          assignmentId_userId: {
            assignmentId: assignment.id,
            userId: studentId
          }
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      if (!submission) {
        return NextResponse.json({ error: 'Submission not found for this student.' }, { status: 404 });
      }

      const targetReviewStatus =
        status === 'RETURNED'
          ? 'RETURNED'
          : status === 'UNDER_REVIEW'
          ? 'UNDER_REVIEW'
          : 'GRADED';

      const numericRawScore =
        rawScore !== undefined && rawScore !== null && rawScore !== ''
          ? Math.min(assignment.maxScore, Math.max(0, Number(rawScore)))
          : 0;

      // Server-Side Late Penalty Calculation
      const isLate =
        submission.status === 'LATE' ||
        (assignment.dueDate
          ? new Date(submission.submittedAt) > new Date(assignment.dueDate)
          : false);

      let latePenaltyDeducted = 0;
      const latePolicy = existingMeta?.lateSubmissionPolicy || 'ALLOWED_WITH_PENALTY';
      const penaltyPercent = Number(existingMeta?.latePenaltyPercentage ?? 10);

      if (isLate && latePolicy === 'ALLOWED_WITH_PENALTY' && targetReviewStatus === 'GRADED') {
        latePenaltyDeducted = Number(((numericRawScore * penaltyPercent) / 100).toFixed(2));
      }

      const finalScore =
        targetReviewStatus === 'GRADED'
          ? Number(Math.max(0, numericRawScore - latePenaltyDeducted).toFixed(2))
          : submission.score;

      const updatedSub = await prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: {
          score: finalScore,
          feedback: String(feedback).trim(),
          status: targetReviewStatus,
          gradedBy: user.name,
          gradedAt: new Date()
        }
      });

      // Update Submission History (preserve all versions!)
      const history = await getSubmissionHistory(assignment.id, studentId);
      const daysLate =
        isLate && assignment.dueDate
          ? Math.max(
              1,
              Math.ceil(
                (new Date(submission.submittedAt).getTime() -
                  new Date(assignment.dueDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : 0;

      if (history.length === 0) {
        history.push({
          versionNumber: 1,
          submissionId: submission.id,
          submittedAt: submission.submittedAt.toISOString(),
          fileUrl: submission.fileUrl,
          fileName: submission.fileName,
          files: submission.fileName
            ? [{ fileName: submission.fileName, fileUrl: submission.fileUrl || '#' }]
            : [],
          textResponse: submission.notes || '',
          isLate,
          daysLate,
          status: targetReviewStatus,
          rawScore: numericRawScore,
          latePenaltyDeducted,
          finalScore,
          maxMarks: assignment.maxScore,
          feedback: String(feedback).trim(),
          gradedBy: user.name,
          gradedAt: new Date().toISOString()
        });
      } else {
        const lastIdx = history.length - 1;
        history[lastIdx] = {
          ...history[lastIdx],
          status: targetReviewStatus,
          rawScore: numericRawScore,
          latePenaltyDeducted,
          finalScore,
          feedback: String(feedback).trim(),
          gradedBy: user.name,
          gradedAt: new Date().toISOString()
        };
      }

      await saveSubmissionHistory(assignment.id, studentId, history);

      // Course Completion Integration: if GRADED and assignment is linked to a lesson, mark LessonProgress completed!
      if (targetReviewStatus === 'GRADED' && assignment.lessonId) {
        await prisma.lessonProgress
          .upsert({
            where: {
              userId_lessonId: {
                userId: studentId,
                lessonId: assignment.lessonId
              }
            },
            create: {
              userId: studentId,
              lessonId: assignment.lessonId,
              completed: true,
              completedAt: new Date()
            },
            update: {
              completed: true,
              completedAt: new Date()
            }
          })
          .catch(() => {});
      }

      // Notify Student
      if (targetReviewStatus === 'RETURNED') {
        await createNotification({
          organizationId: course.organizationId,
          userId: studentId,
          title: 'Assignment Returned for Resubmission 🔄',
          message: `Your submission for "${assignment.title}" in "${course.title}" was returned by ${user.name}. Feedback: "${feedback}". You may submit an updated version.`,
          type: 'ASSIGNMENT',
          category: 'COURSES',
          link: `/learn/${course.slug || course.id}`
        }).catch(() => {});
      } else if (targetReviewStatus === 'GRADED') {
        await createNotification({
          organizationId: course.organizationId,
          userId: studentId,
          title: 'Assignment Graded 🎉',
          message: `Your assignment "${assignment.title}" in "${course.title}" has been graded: ${finalScore} / ${assignment.maxScore}${
            latePenaltyDeducted > 0
              ? ` (Original: ${numericRawScore}, Late Penalty: -${latePenaltyDeducted})`
              : ''
          }.${feedback ? ` Feedback: "${feedback}"` : ''}`,
          type: 'ASSIGNMENT',
          category: 'COURSES',
          link: `/learn/${course.slug || course.id}`
        }).catch(() => {});
      }

      await createAuditLog({
        organizationId: course.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        action:
          targetReviewStatus === 'RETURNED' ? 'ASSIGNMENT_RETURNED' : 'ASSIGNMENT_GRADED',
        entity: 'AssignmentSubmission',
        entityId: submission.id,
        description: `Instructor "${user.name}" ${
          targetReviewStatus === 'RETURNED'
            ? `returned assignment "${assignment.title}" for resubmission`
            : `graded assignment "${assignment.title}" (${finalScore}/${assignment.maxScore})`
        } for student "${submission.user?.name}".`,
        req
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        submission: updatedSub,
        rawScore: numericRawScore,
        latePenaltyDeducted,
        finalScore,
        status: targetReviewStatus,
        message:
          targetReviewStatus === 'RETURNED'
            ? `Assignment returned to ${submission.user?.name} for resubmission.`
            : `Assignment graded (${finalScore} / ${assignment.maxScore}) and student notified!`
      });
    }

    // Action 2: Duplicate Assignment
    if (action === 'DUPLICATE') {
      const dupAssignment = await prisma.assignment.create({
        data: {
          organizationId: course.organizationId,
          courseId: course.id,
          lessonId: assignment.lessonId,
          title: `${assignment.title} (Copy)`,
          description: assignment.description,
          dueDate: assignment.dueDate,
          maxScore: assignment.maxScore,
          allowedFormats: assignment.allowedFormats,
          maxFileSizeBytes: assignment.maxFileSizeBytes,
          status: 'DRAFT'
        }
      });

      if (existingMeta) {
        await saveAssignmentMeta(dupAssignment.id, {
          ...existingMeta,
          assignmentId: dupAssignment.id,
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      await createAuditLog({
        organizationId: course.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'ASSIGNMENT_DUPLICATED',
        entity: 'Assignment',
        entityId: dupAssignment.id,
        description: `Instructor "${user.name}" duplicated assignment "${assignment.title}".`,
        req
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        assignmentId: dupAssignment.id,
        message: `Assignment duplicated as "${dupAssignment.title}" (Draft).`
      });
    }

    // Action 3: Publish / Unpublish / Archive
    let nextStatus: AssignmentStatus = existingMeta?.status || 'PUBLISHED';
    if (action === 'PUBLISH') nextStatus = 'PUBLISHED';
    else if (action === 'UNPUBLISH') nextStatus = 'DRAFT';
    else if (action === 'ARCHIVE') nextStatus = 'ARCHIVED';
    else {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }

    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        status: nextStatus === 'PUBLISHED' ? 'ACTIVE' : nextStatus
      }
    });

    if (existingMeta) {
      await saveAssignmentMeta(assignment.id, {
        ...existingMeta,
        status: nextStatus
      });
    }

    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: `ASSIGNMENT_${nextStatus}`,
      entity: 'Assignment',
      entityId: assignment.id,
      description: `Instructor "${user.name}" changed assignment "${assignment.title}" status to ${nextStatus}.`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      status: nextStatus,
      message: `Assignment "${assignment.title}" is now ${nextStatus}.`
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to perform assignment action.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const confirmDelete = searchParams.get('confirm') === 'true';

    const authCheck = await fetchAndAuthorizeAssignment(id, user);
    if (authCheck.error || !authCheck.assignment) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { assignment, course } = authCheck;

    if (assignment.submissions.length > 0 && !confirmDelete) {
      return NextResponse.json(
        {
          error: `This assignment has ${assignment.submissions.length} student submission(s). Please Archive it instead, or explicitly confirm deletion.`,
          hasSubmissions: true,
          submissionsCount: assignment.submissions.length
        },
        { status: 409 }
      );
    }

    await prisma.assignment.delete({
      where: { id: assignment.id }
    });

    await prisma.platformSetting
      .delete({
        where: { key: `assignment_meta_${assignment.id}` }
      })
      .catch(() => {});

    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'ASSIGNMENT_DELETED',
      entity: 'Assignment',
      entityId: assignment.id,
      description: `Instructor "${user.name}" deleted assignment "${assignment.title}" from course "${course.title}".`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Assignment "${assignment.title}" deleted successfully.`
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete assignment.' },
      { status: 500 }
    );
  }
}
