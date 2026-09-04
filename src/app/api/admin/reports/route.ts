import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;

    const availableReportTypes = [
      { id: 'REVENUE', name: 'Revenue & Sales Report', description: 'Complete transaction history with gross, net, taxes, and refunds' },
      { id: 'STUDENTS', name: 'Student Roster & Progress Report', description: 'All enrolled students, progress %, completed courses, and spend' },
      { id: 'COURSES', name: 'Course Performance Report', description: 'Curriculum stats, enrollments, completion rates, and ratings' },
      { id: 'ENROLLMENTS', name: 'Enrollment Activity Report', description: 'Active and completed student enrollments with timestamps' },
      { id: 'ASSIGNMENTS', name: 'Assignment Submissions & Grades', description: 'Student assignment submissions, grading workload, and scores' },
      { id: 'QUIZZES', name: 'Quiz Assessment Results', description: 'Quiz attempts, average scores, and question pass rates' },
      { id: 'CERTIFICATES', name: 'Certificates Registry Report', description: 'All issued diplomas with verification numbers and issue dates' },
      { id: 'COUPONS', name: 'Promotional Coupons & ROI Report', description: 'Coupon redemptions, discount amounts, and generated revenue' }
    ];

    const schedules = await prisma.reportSchedule.findMany({
      where: { organizationId: orgId || undefined },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      reportTypes: availableReportTypes,
      scheduledReports: schedules.map((s) => ({
        id: s.id,
        name: s.name,
        reportType: s.reportType,
        frequency: s.frequency,
        timeOfDay: s.timeOfDay,
        recipients: JSON.parse(s.recipients || '[]'),
        format: s.format,
        status: s.status,
        lastSentAt: s.lastSentAt
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    const body = await request.json();

    const { name, reportType, frequency = 'WEEKLY', timeOfDay = '09:00', recipients, format = 'CSV' } = body;

    if (!name || !reportType || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Name, reportType, and recipients array are required' }, { status: 400 });
    }

    const schedule = await prisma.reportSchedule.create({
      data: {
        organizationId: orgId!,
        name,
        reportType,
        frequency,
        timeOfDay,
        recipients: JSON.stringify(recipients),
        format,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({
      message: 'Scheduled report configured successfully',
      schedule
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
