import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('organizationId') || user.organizationId;
    const courseId = searchParams.get('courseId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const whereClause: any = { organizationId: orgId };
    if (courseId) {
      whereClause.courseId = courseId;
    }

    const liveClasses = await prisma.liveClass.findMany({
      where: whereClause,
      include: {
        course: { select: { id: true, title: true, slug: true } },
        instructor: { select: { id: true, name: true, email: true } },
        attendances: true
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return NextResponse.json({ liveClasses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const body = await request.json();
    const {
      courseId,
      title,
      description,
      scheduledAt,
      durationMinutes = 60,
      meetingUrl,
      organizationId: targetOrgId
    } = body;

    const orgId = targetOrgId || user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!courseId || !title || !scheduledAt) {
      return NextResponse.json({ error: 'courseId, title, and scheduledAt are required' }, { status: 400 });
    }

    const liveClass = await prisma.liveClass.create({
      data: {
        organizationId: orgId,
        courseId,
        instructorId: user.id,
        title,
        description,
        scheduledAt: new Date(scheduledAt),
        durationMinutes,
        meetingUrl: meetingUrl || `https://meet.morenalms.com/room-${Date.now()}`,
        status: 'SCHEDULED'
      },
      include: {
        course: true,
        instructor: true
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'LIVE_CLASS_SCHEDULED',
      entity: 'LiveClass',
      entityId: liveClass.id,
      description: `Live Class "${title}" scheduled for ${scheduledAt}.`,
      req: request
    });

    return NextResponse.json({ success: true, liveClass });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
