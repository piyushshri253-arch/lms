import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const admin = await requireRole(['ADMIN', 'INSTRUCTOR']);
    const body = await request.json();
    const { userId, courseId } = body;

    if (!userId || !courseId) {
      return NextResponse.json({ error: 'User ID and Course ID are required' }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId, courseId }
      },
      create: {
        userId,
        courseId,
        status: 'ACTIVE',
        paymentId: 'MANUAL_ADMIN_ENROLLMENT'
      },
      update: {
        status: 'ACTIVE'
      },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } }
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'MANUAL_ENROLLMENT',
        entity: 'Enrollment',
        entityId: enrollment.id,
        description: `Admin enrolled ${enrollment.user.name} into "${enrollment.course.title}".`
      }
    });

    return NextResponse.json({
      enrollment,
      message: `Enrolled ${enrollment.user.name} into "${enrollment.course.title}".`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireRole(['ADMIN', 'INSTRUCTOR']);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const courseId = searchParams.get('courseId');

    if (!userId || !courseId) {
      return NextResponse.json({ error: 'User ID and Course ID are required' }, { status: 400 });
    }

    await prisma.enrollment.deleteMany({
      where: { userId, courseId }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REVOKE_ENROLLMENT',
        entity: 'Enrollment',
        description: `Admin revoked enrollment for user ${userId} from course ${courseId}.`
      }
    });

    return NextResponse.json({ message: 'Enrollment revoked successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
