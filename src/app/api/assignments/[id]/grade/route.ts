import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createNotification } from '@/lib/notification';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const instructor = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { id: assignmentId } = await params;
    const body = await request.json();
    const { studentId, score, feedback, status } = body;

    if (!studentId || score === undefined) {
      return NextResponse.json({ error: 'studentId and score are required.' }, { status: 400 });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: { select: { id: true, title: true } } }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_userId: {
          assignmentId,
          userId: studentId
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'No submission found for this student.' }, { status: 404 });
    }

    const graded = await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        score: Number(score),
        feedback: feedback || '',
        status: status || 'GRADED',
        gradedBy: instructor.name,
        gradedAt: new Date()
      }
    });

    // Notify student of their grade & feedback
    await createNotification({
      organizationId: assignment.organizationId || instructor.organizationId || null,
      userId: studentId,
      title: 'Assignment Graded 🎉',
      message: `Your work for "${assignment.title}" in "${assignment.course.title}" was graded: ${score}/${assignment.maxScore}.${feedback ? ` Feedback: "${feedback}"` : ''}`,
      type: 'ASSIGNMENT',
      category: 'COURSES',
      link: `/learn/${assignment.course.id}`
    });

    return NextResponse.json({
      success: true,
      submission: graded,
      message: `Assignment graded (${score}/${assignment.maxScore}). Student has been notified.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Grading failed' }, { status: 500 });
  }
}
