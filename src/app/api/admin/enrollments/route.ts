import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApiGuard } from '@/lib/api-guard';
import { hashPassword } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');

    const { errorResponse, sessionData } = await requireAdminApiGuard('enrollment.view', facilityId);
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetFacilityId = sessionData.activeFacilityId;
    const isSuperAdmin = sessionData.user.role === 'SUPER_ADMIN';

    const where: any = {};
    if (!isSuperAdmin && targetFacilityId) {
      where.OR = [
        { organizationId: targetFacilityId },
        { course: { organizationId: targetFacilityId } }
      ];
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            certificates: {
              select: { id: true }
            }
          }
        }
      }
    });

    const mapped = enrollments.map((enr) => ({
      id: enr.id,
      studentId: enr.user.id,
      studentName: enr.user.name,
      studentEmail: enr.user.email,
      studentAvatar: enr.user.avatar,
      courseId: enr.course.id,
      courseTitle: enr.course.title,
      progress: 0,
      status: enr.status,
      accessType: 'LIFETIME',
      enrolledAt: new Date(enr.enrolledAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      certificateIssued: enr.course.certificates.length > 0
    }));

    return NextResponse.json({ enrollments: mapped });
  } catch (err: any) {
    console.error('Failed to fetch admin enrollments:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');

    const { errorResponse, sessionData } = await requireAdminApiGuard('enrollment.create', facilityId);
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentName, studentEmail, courseId, accessType = 'LIFETIME', status = 'ACTIVE' } = body;

    if (!studentName || !studentEmail || !courseId) {
      return NextResponse.json(
        { error: 'Student name, student email, and course are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = studentEmail.toLowerCase().trim();

    // 1. Find or create student
    let student = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (!student) {
      const defaultPassword = await hashPassword('Student@2026');
      student = await prisma.user.create({
        data: {
          name: studentName.trim(),
          email: normalizedEmail,
          password: defaultPassword,
          role: 'STUDENT',
          organizationId: sessionData.activeFacilityId,
          emailVerified: true
        }
      });
    }

    // 2. Find course
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { title: courseId }, { slug: courseId }]
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Selected course was not found.' }, { status: 404 });
    }

    // 3. Upsert enrollment
    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: student.id,
          courseId: course.id
        }
      },
      create: {
        organizationId: sessionData.activeFacilityId,
        userId: student.id,
        courseId: course.id,
        status
      },
      update: {
        status
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        studentName: enrollment.user.name,
        studentEmail: enrollment.user.email,
        courseTitle: enrollment.course.title,
        status: enrollment.status,
        accessType,
        enrolledAt: 'Just now',
        certificateIssued: false
      }
    });
  } catch (err: any) {
    console.error('Failed to create admin enrollment:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { errorResponse } = await requireAdminApiGuard('enrollment.manage');
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Enrollment ID and status are required' }, { status: 400 });
    }

    const updated = await prisma.enrollment.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, enrollment: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { errorResponse } = await requireAdminApiGuard('enrollment.delete');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
    }

    await prisma.enrollment.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Enrollment revoked' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}