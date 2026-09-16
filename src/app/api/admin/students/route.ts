import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApiGuard } from '@/lib/api-guard';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    const { errorResponse, sessionData } = await requireAdminApiGuard('student.view', facilityId);
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {
      role: 'STUDENT'
    };

    if (facilityId && facilityId !== 'all' && facilityId !== 'main-facility') {
      where.organizationId = facilityId;
    }

    if (status === 'SUSPENDED') {
      where.isSuspended = true;
    } else if (status === 'ACTIVE') {
      where.isSuspended = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
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
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password, group, courseId, facilityId } = body;

    const { errorResponse, sessionData } = await requireAdminApiGuard('student.create', facilityId);
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    // Check existing
    const existing = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        platform: 'LMS'
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'A student with this email address already exists.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        platform: 'LMS',
        phone: phone?.trim() || null,
        password: hashedPassword,
        role: 'STUDENT',
        customRole: group || 'Batch 2026',
        status: 'ACTIVE',
        isSuspended: false,
        organizationId: sessionData.activeFacilityId
      }
    });

    let enrolledCourseInfo: any = null;
    if (courseId) {
      try {
        const enrollment = await prisma.enrollment.create({
          data: {
            userId: newStudent.id,
            courseId,
            status: 'ACTIVE'
          },
          include: {
            course: { select: { id: true, title: true } }
          }
        });
        enrolledCourseInfo = {
          courseId: enrollment.course.id,
          title: enrollment.course.title,
          status: 'ACTIVE',
          enrolledAt: enrollment.enrolledAt
        };
      } catch (err) {
        console.error('Failed to auto-enroll course:', err);
      }
    }

    return NextResponse.json({
      student: {
        id: newStudent.id,
        name: newStudent.name,
        email: newStudent.email,
        phone: newStudent.phone,
        role: newStudent.role,
        group: newStudent.customRole || 'Batch 2026',
        isSuspended: false,
        createdAt: newStudent.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        totalSpent: 0,
        enrollmentsCount: enrolledCourseInfo ? 1 : 0,
        certificatesCount: 0,
        reviewsCount: 0,
        ordersCount: 0,
        enrolledCourses: enrolledCourseInfo ? [enrolledCourseInfo] : []
      }
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isSuspended, name, email, phone, group } = body;

    const { errorResponse } = await requireAdminApiGuard('student.edit');
    if (errorResponse) return errorResponse;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof isSuspended === 'boolean' ? { isSuspended } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(email ? { email: email.toLowerCase().trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
        ...(group ? { customRole: group } : {})
      }
    });

    return NextResponse.json({
      student: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        isSuspended: updated.isSuspended,
        group: updated.customRole || 'Batch 2026'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { errorResponse } = await requireAdminApiGuard('student.delete');
    if (errorResponse) return errorResponse;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Student removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete student' }, { status: 500 });
  }
}
