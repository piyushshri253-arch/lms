import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const reviewer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        role: true,
        customRole: true,
        status: true,
        createdAt: true,
        organizationId: true,
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    if (!reviewer || reviewer.role !== 'REVIEWER' || !validateTenantOwnership(reviewer.organizationId, admin)) {
      return NextResponse.json({ error: 'Course Reviewer not found' }, { status: 404 });
    }

    const reviewedCoursesCount = await prisma.course.count({
      where: { reviewedById: reviewer.id }
    });

    return NextResponse.json({
      success: true,
      reviewer: {
        ...reviewer,
        coursesReviewed: reviewedCoursesCount
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;
    const body = await request.json();

    const reviewer = await prisma.user.findUnique({ where: { id } });
    if (!reviewer || reviewer.role !== 'REVIEWER' || !validateTenantOwnership(reviewer.organizationId, admin)) {
      return NextResponse.json({ error: 'Course Reviewer not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name?.trim()) updateData.name = body.name.trim();
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body.bio !== undefined) updateData.bio = body.bio?.trim() || null;
    if (body.status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(body.status)) {
      updateData.status = body.status;
    }
    if (body.password?.trim()) {
      if (body.password.trim().length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
      }
      updateData.password = await hashPassword(body.password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        status: true,
        role: true,
        updatedAt: true
      }
    });

    await createAuditLog({
      organizationId: reviewer.organizationId || undefined,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'UPDATE_COURSE_REVIEWER',
      entity: 'User',
      entityId: reviewer.id,
      description: `Admin updated Reviewer "${updated.name}" (${updated.email}). Status: ${updated.status}.`
    });

    return NextResponse.json({
      success: true,
      reviewer: updated,
      message: `Course Reviewer "${updated.name}" updated successfully.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const reviewer = await prisma.user.findUnique({ where: { id } });
    if (!reviewer || reviewer.role !== 'REVIEWER' || !validateTenantOwnership(reviewer.organizationId, admin)) {
      return NextResponse.json({ error: 'Course Reviewer not found' }, { status: 404 });
    }

    const evaluatedCount = await prisma.course.count({
      where: { reviewedById: reviewer.id }
    });

    if (evaluatedCount > 0) {
      await prisma.user.update({
        where: { id },
        data: { status: 'INACTIVE' }
      });

      await createAuditLog({
        organizationId: reviewer.organizationId || undefined,
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'DEACTIVATE_COURSE_REVIEWER',
        entity: 'User',
        entityId: reviewer.id,
        description: `Admin deactivated Course Reviewer "${reviewer.name}" (${reviewer.email}) because they have historical reviews.`
      });

      return NextResponse.json({
        success: true,
        message: `Reviewer "${reviewer.name}" deactivated (historical review logs preserved).`
      });
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      organizationId: reviewer.organizationId || undefined,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'DELETE_COURSE_REVIEWER',
      entity: 'User',
      entityId: reviewer.id,
      description: `Admin permanently removed Course Reviewer "${reviewer.name}".`
    });

    return NextResponse.json({
      success: true,
      message: `Reviewer "${reviewer.name}" deleted successfully.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
