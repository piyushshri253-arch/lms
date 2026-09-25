import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notification';
import {
  getAssignmentMeta,
  getSubmissionHistory,
  saveSubmissionHistory
} from '@/lib/assessment-engine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantAuth();
    const { id: assignmentId } = await params;
    const body = await request.json();
    const { fileUrl, fileName, fileSizeBytes, notes, textResponse } = body;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: { select: { id: true, title: true, slug: true, instructorId: true } }
      }
    });

    if (!assignment || assignment.status === 'CLOSED' || assignment.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Assignment not found or closed for submissions.' },
        { status: 404 }
      );
    }

    const meta = await getAssignmentMeta(assignment.id);

    // 1. Verify enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId: assignment.courseId, status: { in: ['ACTIVE', 'COMPLETED'] } }
    });

    if (!enrollment && user.role === 'STUDENT') {
      return NextResponse.json(
        { error: 'Active course enrollment required to submit assignments.' },
        { status: 403 }
      );
    }

    // 2. Check existing submission & resubmission eligibility
    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_userId: {
          assignmentId,
          userId: user.id
        }
      }
    });

    const allowMultiple = meta?.allowMultipleSubmissions ?? true;
    const allowResubmission = meta?.allowResubmission ?? true;

    if (existingSubmission) {
      const isReturned = existingSubmission.status === 'RETURNED';
      if (isReturned && !allowResubmission) {
        return NextResponse.json(
          { error: 'Resubmissions are not enabled for this assignment.' },
          { status: 400 }
        );
      }
      if (!isReturned && !allowMultiple) {
        return NextResponse.json(
          { error: 'Multiple submissions are disabled for this assignment.' },
          { status: 400 }
        );
      }
    }

    // 3. Deadline & Late Submission Policy Check
    const now = new Date();
    const isLate = assignment.dueDate ? now > new Date(assignment.dueDate) : false;
    const latePolicy = meta?.lateSubmissionPolicy || 'ALLOWED_WITH_PENALTY';

    if (isLate && latePolicy === 'NOT_ALLOWED') {
      return NextResponse.json(
        {
          error: `Submission deadline (${new Date(
            assignment.dueDate!
          ).toLocaleString()}) has passed, and late submissions are not allowed for this assignment.`
        },
        { status: 400 }
      );
    }

    // 4. Validate Submission Type & File Format / Size
    const subType = meta?.submissionType || 'FILE_AND_TEXT';
    const effectiveText = String(textResponse ?? notes ?? '').trim();

    if (subType === 'FILE_UPLOAD' && !fileName && !fileUrl) {
      return NextResponse.json(
        { error: 'Please upload a file for this assignment.' },
        { status: 400 }
      );
    }
    if (subType === 'TEXT_SUBMISSION' && !effectiveText) {
      return NextResponse.json(
        { error: 'Please provide your written text response for this assignment.' },
        { status: 400 }
      );
    }

    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      let allowed: string[] = [];
      try {
        allowed = meta?.allowedFileTypes || JSON.parse(assignment.allowedFormats);
      } catch {
        allowed = ['pdf', 'zip', 'docx', 'png', 'jpg'];
      }

      if (allowed.length > 0 && !allowed.includes(ext)) {
        return NextResponse.json(
          {
            error: `Invalid file format ".${ext}". Allowed formats: ${allowed.join(', ')}`
          },
          { status: 400 }
        );
      }
    }

    if (fileSizeBytes && Number(fileSizeBytes) > assignment.maxFileSizeBytes) {
      const maxMB = Math.round(assignment.maxFileSizeBytes / (1024 * 1024));
      return NextResponse.json(
        { error: `Uploaded file exceeds maximum allowed size of ${maxMB} MB.` },
        { status: 400 }
      );
    }

    const effectiveStatus = isLate ? 'LATE' : 'SUBMITTED';

    // 5. Upsert active AssignmentSubmission row in PostgreSQL
    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_userId: {
          assignmentId,
          userId: user.id
        }
      },
      create: {
        organizationId: assignment.organizationId || user.organizationId || null,
        assignmentId,
        userId: user.id,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        notes: effectiveText || null,
        status: effectiveStatus,
        submittedAt: now
      },
      update: {
        fileUrl: fileUrl !== undefined ? fileUrl : undefined,
        fileName: fileName !== undefined ? fileName : undefined,
        notes: effectiveText !== undefined ? effectiveText : undefined,
        status: effectiveStatus,
        submittedAt: now
      }
    });

    // 6. Append to Multi-Version Submission History (Preserve Submission 1, Submission 2, Submission 3...)
    const history = await getSubmissionHistory(assignment.id, user.id);
    const nextVersionNumber = history.length + 1;
    const daysLate =
      isLate && assignment.dueDate
        ? Math.max(
            1,
            Math.ceil(
              (now.getTime() - new Date(assignment.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        : 0;

    history.push({
      versionNumber: nextVersionNumber,
      submissionId: submission.id,
      submittedAt: now.toISOString(),
      fileUrl: fileUrl || submission.fileUrl,
      fileName: fileName || submission.fileName,
      files:
        fileName || submission.fileName
          ? [
              {
                fileName: (fileName || submission.fileName)!,
                fileUrl: (fileUrl || submission.fileUrl) || '#',
                fileSizeBytes: fileSizeBytes ? Number(fileSizeBytes) : undefined
              }
            ]
          : [],
      textResponse: effectiveText,
      isLate,
      daysLate,
      status: effectiveStatus,
      rawScore: null,
      latePenaltyDeducted: 0,
      finalScore: null,
      maxMarks: assignment.maxScore,
      feedback: null,
      gradedBy: null,
      gradedAt: null
    });

    await saveSubmissionHistory(assignment.id, user.id, history);

    // 7. Notify Course Instructor
    if (assignment.course.instructorId) {
      await createNotification({
        organizationId: assignment.organizationId || null,
        userId: assignment.course.instructorId,
        title:
          nextVersionNumber > 1
            ? `Assignment Resubmitted (Submission #${nextVersionNumber})`
            : `New Assignment Submission${isLate ? ' (LATE)' : ''}`,
        message: `${user.name} submitted work (Submission #${nextVersionNumber}) for "${assignment.title}" in "${assignment.course.title}".`,
        type: 'ASSIGNMENT',
        category: 'STUDENTS',
        link: `/instructor/assignments/${assignment.id}/submissions`
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      submission,
      versionNumber: nextVersionNumber,
      isLate,
      history,
      message:
        nextVersionNumber > 1
          ? `Submission #${nextVersionNumber} uploaded successfully! Previous submissions are preserved in history.`
          : `Assignment submitted successfully${
              isLate ? ' (marked as LATE)' : ''
            }. Your instructor has been notified.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 });
  }
}
