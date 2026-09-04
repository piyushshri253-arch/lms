import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notification';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantAuth();
    const { id: assignmentId } = await params;
    const body = await request.json();
    const { fileUrl, fileName, notes } = body;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: { select: { id: true, title: true, instructorId: true } }
      }
    });

    if (!assignment || assignment.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Assignment not found or closed for submissions.' }, { status: 404 });
    }

    // Verify enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId: assignment.courseId, status: 'ACTIVE' }
    });

    if (!enrollment && user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Active course enrollment required to submit assignments.' }, { status: 403 });
    }

    // Validate file format if file is provided
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      let allowed: string[] = [];
      try {
        allowed = JSON.parse(assignment.allowedFormats);
      } catch {
        allowed = ['pdf', 'zip', 'docx'];
      }

      if (allowed.length > 0 && !allowed.includes(ext)) {
        return NextResponse.json({
          error: `Invalid file format ".${ext}". Allowed formats: ${allowed.join(', ')}`
        }, { status: 400 });
      }
    }

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
        notes: notes || null,
        status: 'SUBMITTED',
        submittedAt: new Date()
      },
      update: {
        fileUrl: fileUrl !== undefined ? fileUrl : undefined,
        fileName: fileName !== undefined ? fileName : undefined,
        notes: notes !== undefined ? notes : undefined,
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    // Notify course instructor
    if (assignment.course.instructorId) {
      await createNotification({
        organizationId: assignment.organizationId || null,
        userId: assignment.course.instructorId,
        title: 'Assignment Submitted',
        message: `${user.name} submitted work for assignment "${assignment.title}".`,
        type: 'ASSIGNMENT',
        category: 'STUDENTS',
        link: `/instructor/dashboard`
      });
    }

    return NextResponse.json({
      success: true,
      submission,
      message: 'Assignment submitted successfully. Your instructor has been notified.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 });
  }
}
