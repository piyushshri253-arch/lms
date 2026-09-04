import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const instructor = await prisma.user.findUnique({
      where: { id },
      include: {
        coursesAuthored: {
          include: {
            enrollments: true,
            orders: { where: { status: { in: ['PAID', 'SUCCESS'] } } },
            reviews: true
          }
        },
        organizationMemberships: {
          where: user.organizationId ? { organizationId: user.organizationId } : undefined
        }
      }
    });

    if (!instructor || !validateTenantOwnership(instructor.organizationId, user)) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    const totalStudents = instructor.coursesAuthored.reduce((sum, c) => sum + c.enrollments.length, 0);
    const totalRevenue = instructor.coursesAuthored.reduce(
      (sum, c) => sum + c.orders.reduce((oSum, ord) => oSum + (ord.total || ord.amount), 0),
      0
    );

    return NextResponse.json({
      instructor: {
        id: instructor.id,
        name: instructor.name,
        email: instructor.email,
        avatar: instructor.avatar,
        bio: instructor.bio,
        role: instructor.role,
        status: instructor.status,
        permissions: instructor.permissions ? JSON.parse(instructor.permissions) : [],
        totalCourses: instructor.coursesAuthored.length,
        totalStudents,
        totalRevenue,
        courses: instructor.coursesAuthored.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          status: c.status,
          price: c.price,
          enrollmentsCount: c.enrollments.length
        }))
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
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;
    const body = await request.json();

    const instructor = await prisma.user.findUnique({ where: { id } });
    if (!instructor || !validateTenantOwnership(instructor.organizationId, user)) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.bio) updateData.bio = body.bio;
    if (body.status) updateData.status = body.status;
    if (body.permissions && Array.isArray(body.permissions)) {
      updateData.permissions = JSON.stringify(body.permissions);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    await createAuditLog({
      organizationId: instructor.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'UPDATE_INSTRUCTOR_PERMISSIONS',
      entity: 'User',
      entityId: instructor.id,
      description: `Updated permissions for instructor ${instructor.name}.`
    });

    return NextResponse.json({
      message: 'Instructor updated successfully',
      instructor: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        permissions: updated.permissions ? JSON.parse(updated.permissions) : []
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
