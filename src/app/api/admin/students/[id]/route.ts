import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { hashPassword } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['ADMIN', 'INSTRUCTOR', 'SUPER_ADMIN']);
    const { id } = await params;

    const student = await prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                sections: {
                  include: { lessons: true }
                }
              }
            }
          }
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            course: { select: { title: true } }
          }
        },
        certificates: {
          include: {
            course: { select: { title: true } }
          }
        },
        reviews: {
          include: {
            course: { select: { title: true } }
          }
        },
        lessonProgress: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Strict Tenant Isolation Check
    if (!validateTenantOwnership(student.organizationId, user)) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const completedLessonIds = new Set(
      student.lessonProgress.filter((p) => p.completed).map((p) => p.lessonId)
    );

    const detailedEnrollments = student.enrollments.map((e) => {
      const allLessons = e.course.sections.flatMap((s) => s.lessons);
      const totalLessons = allLessons.length;
      const completedCount = allLessons.filter((l) => completedLessonIds.has(l.id)).length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      return {
        id: e.id,
        courseId: e.course.id,
        courseTitle: e.course.title,
        courseThumbnail: e.course.thumbnail,
        status: e.status,
        enrolledAt: e.enrolledAt,
        progressPercent,
        completedLessonsCount: completedCount,
        totalLessonsCount: totalLessons
      };
    });

    const totalSpent = student.orders
      .filter((o) => o.status === 'SUCCESS' || o.status === 'PAID')
      .reduce((sum, o) => sum + (o.total || o.amount), 0);

    return NextResponse.json({
      student: {
        id: student.id,
        organizationId: student.organizationId,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        bio: student.bio,
        country: student.country,
        timezone: student.timezone,
        role: student.role,
        status: student.status,
        isSuspended: student.isSuspended,
        createdAt: student.createdAt,
        totalSpent: Math.round(totalSpent),
        enrollments: detailedEnrollments,
        orders: student.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          transactionId: o.transactionId,
          courseTitle: o.course?.title || 'Product Order',
          amount: o.total || o.amount,
          status: o.status,
          provider: o.provider,
          createdAt: o.createdAt
        })),
        certificates: student.certificates.map((c) => ({
          id: c.id,
          courseTitle: c.course.title,
          certificateNumber: c.certificateNumber,
          issuedAt: c.issuedAt
        })),
        reviews: student.reviews.map((r) => ({
          id: r.id,
          courseTitle: r.course.title,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt
        }))
      }
    });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication required');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    const status = isAuth ? 401 : isForbidden ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
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

    const student = await prisma.user.findUnique({ where: { id } });
    if (!student || !validateTenantOwnership(student.organizationId, user)) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.isSuspended !== undefined) updateData.isSuspended = Boolean(body.isSuspended);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.resetPassword) {
      updateData.password = await hashPassword(body.resetPassword);
      updateData.sessionVersion = { increment: 1 }; // Revoke existing sessions
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Record audit log
    await createAuditLog({
      organizationId: student.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: body.isSuspended !== undefined ? (body.isSuspended ? 'SUSPEND_STUDENT' : 'ACTIVATE_STUDENT') : 'UPDATE_STUDENT',
      entity: 'User',
      entityId: student.id,
      description: `Admin updated student profile (${student.name}).`
    });

    return NextResponse.json({
      message: 'Student updated successfully',
      student: { id: updated.id, name: updated.name, isSuspended: updated.isSuspended, status: updated.status }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
