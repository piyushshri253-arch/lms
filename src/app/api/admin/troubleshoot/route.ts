import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    const body = await request.json();

    const { email, courseId, autoFix = false } = body;

    if (!email) {
      return NextResponse.json({ error: 'Student email is required for diagnosis' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Inspect Student User
    const student = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        organizationId: orgId || undefined
      }
    });

    if (!student) {
      return NextResponse.json({
        diagnosis: 'FAILED',
        summary: `No student account found with email "${normalizedEmail}" in your organization.`,
        steps: [
          { step: 'User Account Check', status: 'FAILED', detail: 'Account does not exist in organization.' }
        ]
      });
    }

    // 2. Inspect Orders & Payments
    const orders = await prisma.order.findMany({
      where: {
        userId: student.id,
        organizationId: orgId || undefined,
        courseId: courseId || undefined
      },
      include: { course: true, payments: true },
      orderBy: { createdAt: 'desc' }
    });

    const hasPaidOrder = orders.some((o) => o.status === 'PAID' || o.status === 'SUCCESS');

    // 3. Inspect Enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: student.id,
        organizationId: orgId || undefined,
        courseId: courseId || undefined
      },
      include: { course: true }
    });

    const hasActiveEnrollment = enrollments.some((e) => e.status === 'ACTIVE' || e.status === 'COMPLETED');

    // 4. Determine Issue and Auto-Remediation
    let diagnosisStatus = 'HEALTHY';
    let issueSummary = 'Student account and course access are in good standing.';
    let fixApplied = false;

    if (student.isSuspended) {
      diagnosisStatus = 'SUSPENDED';
      issueSummary = 'Student account is suspended. Login and course player access are blocked.';
    } else if (hasPaidOrder && !hasActiveEnrollment) {
      diagnosisStatus = 'MISSING_ENROLLMENT';
      issueSummary = 'Student has paid for the course, but course enrollment was not created.';

      if (autoFix && courseId) {
        await prisma.enrollment.upsert({
          where: { userId_courseId: { userId: student.id, courseId } },
          create: {
            organizationId: orgId,
            userId: student.id,
            courseId,
            status: 'ACTIVE'
          },
          update: { status: 'ACTIVE' }
        });
        fixApplied = true;
        issueSummary += ' (Access automatically restored via autoFix).';
      }
    }

    const steps = [
      {
        step: '1. User Account Check',
        status: student.isSuspended ? 'SUSPENDED' : 'OK',
        detail: `Student ${student.name} (${student.email}) status: ${student.status}, suspended: ${student.isSuspended}`
      },
      {
        step: '2. Order & Payment Verification',
        status: hasPaidOrder ? 'OK' : orders.length > 0 ? 'PENDING_OR_FAILED' : 'NO_ORDERS',
        detail: `Found ${orders.length} orders. Paid orders: ${orders.filter((o) => o.status === 'PAID' || o.status === 'SUCCESS').length}`
      },
      {
        step: '3. Course Enrollment & Player Access',
        status: hasActiveEnrollment ? 'OK' : 'MISSING',
        detail: `Active enrollments: ${enrollments.filter((e) => e.status === 'ACTIVE').length}`
      }
    ];

    return NextResponse.json({
      diagnosis: diagnosisStatus,
      summary: issueSummary,
      fixApplied,
      student: { id: student.id, name: student.name, email: student.email },
      steps,
      orders: orders.map((o) => ({ id: o.id, amount: o.total || o.amount, status: o.status, provider: o.provider })),
      enrollments: enrollments.map((e) => ({ id: e.id, courseTitle: e.course.title, status: e.status }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
