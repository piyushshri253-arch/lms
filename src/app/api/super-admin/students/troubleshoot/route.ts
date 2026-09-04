import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { action, studentId, courseId, lessonId, orderId, certificateNumber } = body;

    if (!studentId || !action) {
      return NextResponse.json({ error: 'studentId and action are required' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    let resultMessage = '';

    switch (action) {
      case 'GRANT_COURSE_ACCESS': {
        if (!courseId) throw new Error('courseId is required');
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) throw new Error('Course not found');

        const enrollment = await prisma.enrollment.upsert({
          where: { userId_courseId: { userId: studentId, courseId } },
          create: {
            userId: studentId,
            courseId,
            status: 'ACTIVE'
          },
          update: {
            status: 'ACTIVE'
          }
        });

        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'GRANT_COURSE_ACCESS',
            entity: 'Enrollment',
            entityId: enrollment.id,
            description: `Super Admin granted manual course access to ${course.title} for student ${student.name}.`
          }
        });

        resultMessage = `Access granted to "${course.title}".`;
        break;
      }

      case 'REVOKE_COURSE_ACCESS': {
        if (!courseId) throw new Error('courseId is required');
        await prisma.enrollment.deleteMany({
          where: { userId: studentId, courseId }
        });

        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'REVOKE_COURSE_ACCESS',
            entity: 'Enrollment',
            entityId: `${studentId}_${courseId}`,
            description: `Super Admin revoked course access for student ${student.name}.`
          }
        });

        resultMessage = 'Course enrollment revoked.';
        break;
      }

      case 'MARK_LESSON_COMPLETE': {
        if (!lessonId) throw new Error('lessonId is required');
        const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson) throw new Error('Lesson not found');

        await prisma.lessonProgress.upsert({
          where: { userId_lessonId: { userId: studentId, lessonId } },
          create: {
            userId: studentId,
            lessonId,
            completed: true,
            watchedDuration: lesson.durationSeconds || 600,
            completedAt: new Date()
          },
          update: {
            completed: true,
            completedAt: new Date()
          }
        });

        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'MANUAL_PROGRESS_OVERRIDE',
            entity: 'LessonProgress',
            entityId: lessonId,
            description: `Super Admin marked lesson "${lesson.title}" completed for ${student.name}.`
          }
        });

        resultMessage = `Marked "${lesson.title}" as completed.`;
        break;
      }

      case 'RESET_COURSE_PROGRESS': {
        if (!courseId) throw new Error('courseId is required');
        const lessons = await prisma.lesson.findMany({
          where: { section: { courseId } },
          select: { id: true }
        });

        const lessonIds = lessons.map((l) => l.id);
        await prisma.lessonProgress.deleteMany({
          where: { userId: studentId, lessonId: { in: lessonIds } }
        });

        // Set enrollment status to ACTIVE if previously completed
        await prisma.enrollment.updateMany({
          where: { userId: studentId, courseId },
          data: { status: 'ACTIVE' }
        });

        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'RESET_COURSE_PROGRESS',
            entity: 'Course',
            entityId: courseId,
            description: `Super Admin reset all lecture progress for student ${student.name}.`
          }
        });

        resultMessage = 'Course progress reset to 0%.';
        break;
      }

      case 'GENERATE_CERTIFICATE': {
        if (!courseId) throw new Error('courseId is required');
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) throw new Error('Course not found');

        const certCode = `MT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const cert = await prisma.certificate.upsert({
          where: { userId_courseId: { userId: studentId, courseId } },
          create: {
            userId: studentId,
            courseId,
            certificateNumber: certCode
          },
          update: {
            certificateNumber: certCode,
            issuedAt: new Date()
          }
        });

        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'GENERATE_CERTIFICATE',
            entity: 'Certificate',
            entityId: cert.id,
            description: `Super Admin issued verified certificate #${cert.certificateNumber} for ${student.name}.`
          }
        });

        resultMessage = `Generated verified diploma #${cert.certificateNumber}.`;
        break;
      }

      case 'REVOKE_CERTIFICATE': {
        if (!courseId) throw new Error('courseId is required');
        await prisma.certificate.deleteMany({
          where: { userId: studentId, courseId }
        });

        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'REVOKE_CERTIFICATE',
            entity: 'Certificate',
            entityId: `${studentId}_${courseId}`,
            description: `Super Admin revoked certificate for student ${student.name}.`
          }
        });

        resultMessage = 'Certificate revoked.';
        break;
      }

      case 'SYNC_PAYMENT': {
        if (!orderId) throw new Error('orderId is required');
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new Error('Order not found');

        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'SUCCESS' }
        });

        if (order.courseId) {
          await prisma.enrollment.upsert({
            where: { userId_courseId: { userId: studentId, courseId: order.courseId } },
            create: {
              organizationId: order.organizationId,
              userId: studentId,
              courseId: order.courseId,
              paymentId: order.transactionId || order.id,
              status: 'ACTIVE'
            },
            update: {
              status: 'ACTIVE',
              paymentId: order.transactionId || order.id
            }
          });
        }

        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'SYNC_PAYMENT_ENROLLMENT',
            entity: 'Order',
            entityId: orderId,
            description: `Super Admin verified and synced transaction ${order.transactionId} with active enrollment for ${student.name}.`
          }
        });

        resultMessage = `Transaction ${order.transactionId} synced & access verified.`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown troubleshooting action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      message: resultMessage,
      action
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
