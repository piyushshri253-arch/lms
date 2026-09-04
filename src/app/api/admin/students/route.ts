import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'INSTRUCTOR', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    const where: any = {
      role: 'STUDENT'
    };

    // Strict Tenant Isolation: Scope to current user's organization
    if (user.role !== 'SUPER_ADMIN' && user.organizationId) {
      where.organizationId = user.organizationId;
    }

    if (status === 'SUSPENDED') {
      where.isSuspended = true;
    } else if (status === 'ACTIVE') {
      where.isSuspended = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const students = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        enrollments: {
          include: {
            course: { select: { id: true, title: true, price: true } }
          }
        },
        orders: {
          where: { status: 'SUCCESS' },
          select: { amount: true }
        },
        certificates: {
          select: { id: true, certificateNumber: true }
        },
        _count: {
          select: { enrollments: true, reviews: true, certificates: true, orders: true }
        }
      }
    });

    const mapped = students.map((s) => {
      const totalSpent = s.orders.reduce((sum, o) => sum + o.amount, 0);
      return {
        id: s.id,
        organizationId: s.organizationId,
        name: s.name,
        email: s.email,
        avatar: s.avatar,
        bio: s.bio,
        role: s.role,
        isSuspended: s.isSuspended,
        createdAt: s.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        totalSpent: Math.round(totalSpent),
        enrollmentsCount: s._count.enrollments,
        certificatesCount: s._count.certificates,
        reviewsCount: s._count.reviews,
        ordersCount: s._count.orders,
        enrolledCourses: s.enrollments.map((e) => ({
          courseId: e.course.id,
          title: e.course.title,
          status: e.status,
          enrolledAt: e.enrolledAt
        }))
      };
    });

    return NextResponse.json({ students: mapped });
  } catch (err: any) {
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 500 });
  }
}
