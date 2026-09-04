import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createNotification } from '@/lib/notification';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    const body = await request.json();

    const { studentIds, action, courseId, announcementTitle, announcementMessage } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'studentIds array is required' }, { status: 400 });
    }

    // Verify all student IDs belong to current organization
    const students = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        organizationId: orgId || undefined,
        role: 'STUDENT'
      }
    });

    const verifiedStudentIds = students.map((s) => s.id);
    let affectedCount = 0;

    if (action === 'SUSPEND') {
      const res = await prisma.user.updateMany({
        where: { id: { in: verifiedStudentIds } },
        data: { isSuspended: true, sessionVersion: { increment: 1 } }
      });
      affectedCount = res.count;
    } else if (action === 'ACTIVATE') {
      const res = await prisma.user.updateMany({
        where: { id: { in: verifiedStudentIds } },
        data: { isSuspended: false }
      });
      affectedCount = res.count;
    } else if (action === 'ENROLL') {
      if (!courseId) {
        return NextResponse.json({ error: 'courseId is required for bulk enrollment' }, { status: 400 });
      }

      // Verify course belongs to tenant
      const course = await prisma.course.findFirst({
        where: { id: courseId, organizationId: orgId || undefined }
      });

      if (!course) {
        return NextResponse.json({ error: 'Target course not found' }, { status: 404 });
      }

      for (const sId of verifiedStudentIds) {
        await prisma.enrollment.upsert({
          where: { userId_courseId: { userId: sId, courseId: course.id } },
          create: {
            organizationId: orgId,
            userId: sId,
            courseId: course.id,
            status: 'ACTIVE'
          },
          update: { status: 'ACTIVE' }
        });

        await createNotification({
          organizationId: orgId,
          userId: sId,
          title: `Enrolled in ${course.title} 🎓`,
          message: 'An administrator has granted you access to this course.',
          type: 'ENROLLMENT',
          category: 'COURSES',
          link: `/learn/${course.id}`
        });

        affectedCount++;
      }
    } else if (action === 'ANNOUNCEMENT') {
      if (!announcementTitle || !announcementMessage) {
        return NextResponse.json({ error: 'announcementTitle and announcementMessage are required' }, { status: 400 });
      }

      for (const sId of verifiedStudentIds) {
        await createNotification({
          organizationId: orgId,
          userId: sId,
          title: announcementTitle,
          message: announcementMessage,
          type: 'ANNOUNCEMENT',
          category: 'ANNOUNCEMENTS'
        });
        affectedCount++;
      }
    } else {
      return NextResponse.json({ error: `Unsupported bulk action: ${action}` }, { status: 400 });
    }

    // Record Audit Log
    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: `BULK_${action}_STUDENTS`,
      entity: 'User',
      description: `Bulk ${action} executed for ${affectedCount} students.`
    });

    return NextResponse.json({
      success: true,
      action,
      affectedStudentsCount: affectedCount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
