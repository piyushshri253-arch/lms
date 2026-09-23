import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notification';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['REVIEWER', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;
    const body = await request.json();
    const { action, note } = body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT.' },
        { status: 400 }
      );
    }

    const trimmedNote = (note || '').trim();

    // Mandatory critique note on REJECT
    if (action === 'REJECT' && trimmedNote.length < 5) {
      return NextResponse.json(
        {
          error: 'A detailed critique note (minimum 5 characters) explaining what needs improvement is required so the instructor can fix it.'
        },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        status: newStatus,
        reviewFeedback: action === 'REJECT' ? trimmedNote : (trimmedNote || null),
        reviewedAt: new Date(),
        reviewedById: user.id
      }
    });

    // Notify the Instructor
    if (course.instructorId) {
      if (action === 'APPROVE') {
        await createNotification({
          organizationId: course.organizationId,
          userId: course.instructorId,
          title: `🎉 Course Approved: "${course.title}"`,
          message: trimmedNote
            ? `Your course has been approved! Reviewer note: "${trimmedNote}". You can now publish it live to students.`
            : `Congratulations! Your course "${course.title}" has been approved by the Review Team and is ready to be published live.`,
          type: 'COURSES',
          category: 'COURSES',
          link: '/instructor'
        });
      } else {
        await createNotification({
          organizationId: course.organizationId,
          userId: course.instructorId,
          title: `⚠️ Revision Requested: "${course.title}"`,
          message: `The Review Team requested updates: "${trimmedNote}". Please review the feedback, adjust your curriculum, and resubmit.`,
          type: 'COURSES',
          category: 'COURSES',
          link: `/instructor/courses/builder?courseId=${course.id}`
        });
      }
    }

    // Audit Log
    await createAuditLog({
      organizationId: course.organizationId || undefined,
      actorId: user.id,
      actorEmail: user.email,
      action: action === 'APPROVE' ? 'APPROVE_COURSE' : 'REJECT_COURSE',
      entity: 'Course',
      entityId: course.id,
      description: `${user.role} "${user.name}" ${action === 'APPROVE' ? 'approved' : 'rejected'} course "${course.title}". ${trimmedNote ? `Feedback: "${trimmedNote}"` : ''}`
    });

    return NextResponse.json({
      success: true,
      course: updatedCourse,
      message: action === 'APPROVE'
        ? `Course "${course.title}" approved successfully! Instructor has been notified.`
        : `Course "${course.title}" marked as Changes Requested. Feedback sent to instructor.`
    });
  } catch (err: any) {
    console.error('[Reviewer Decision Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
