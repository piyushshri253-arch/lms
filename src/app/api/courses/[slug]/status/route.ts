import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, validateTenantOwnership, handleAuthError } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    if (!['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient privileges to update course status.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { status, active } = body;

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        organizationId: true,
        instructorId: true
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Tenant Isolation Check
    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify courses outside your organization.' },
        { status: 403 }
      );
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only change status for courses authored by your account.' },
        { status: 403 }
      );
    }

    let nextStatus = 'PUBLISHED';
    let isActivating = false;

    if (typeof active === 'boolean') {
      isActivating = active;
      nextStatus = active ? 'PUBLISHED' : 'INACTIVE';
    } else if (status) {
      const normalized = String(status).toUpperCase();
      if (normalized === 'INACTIVE' || normalized === 'DEACTIVATE' || normalized === 'ARCHIVED') {
        nextStatus = 'INACTIVE';
        isActivating = false;
      } else if (normalized === 'ACTIVE' || normalized === 'PUBLISHED' || normalized === 'ACTIVATE') {
        nextStatus = 'PUBLISHED';
        isActivating = true;
      } else {
        return NextResponse.json({ error: 'Invalid status. Must be ACTIVE or INACTIVE.' }, { status: 400 });
      }
    } else {
      // Toggle current status
      isActivating = course.status !== 'PUBLISHED';
      nextStatus = isActivating ? 'PUBLISHED' : 'INACTIVE';
    }

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: { status: nextStatus }
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: course.organizationId,
        adminId: user.id,
        adminEmail: user.email,
        action: isActivating ? 'COURSE_ACTIVATED' : 'COURSE_DEACTIVATED',
        entity: 'Course',
        entityId: course.id,
        description: isActivating
          ? `${user.role} "${user.name}" activated course "${course.title}" for new student enrollments.`
          : `${user.role} "${user.name}" deactivated course "${course.title}". Course is now hidden from new enrollments while preserving existing student progress.`
      }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      status: nextStatus,
      isPublished: nextStatus === 'PUBLISHED',
      message: isActivating
        ? `Course "${course.title}" is now Active and open for enrollments.`
        : `Course "${course.title}" is now Inactive. New enrollments are blocked. Existing students keep full access.`
    });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

export { POST as PATCH };
