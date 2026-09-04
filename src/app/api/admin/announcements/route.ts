import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const where: any = {};
    if (user.role !== 'SUPER_ADMIN' && user.organizationId) {
      where.organizationId = user.organizationId;
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const courseIds = announcements.map((a) => a.courseId).filter(Boolean) as string[];
    const courses =
      courseIds.length > 0
        ? await prisma.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, title: true, slug: true }
          })
        : [];
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const mapped = announcements.map((a) => ({
      ...a,
      course: a.courseId ? courseMap.get(a.courseId) || null : null
    }));

    return NextResponse.json({ announcements: mapped });
  } catch (err: any) {
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const body = await request.json();
    const { title, message, targetAudience = 'ALL', courseId, status = 'ACTIVE' } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        organizationId: admin.organizationId || null,
        title: title.trim(),
        message: message.trim(),
        targetAudience: targetAudience || 'ALL',
        courseId: courseId || null,
        status: status || 'ACTIVE'
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: admin.organizationId || null,
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'BROADCAST_ANNOUNCEMENT',
        entity: 'Announcement',
        entityId: announcement.id,
        description: `${admin.role} broadcasted announcement "${title}" (Audience: ${targetAudience}).`
      }
    });

    return NextResponse.json({ announcement, message: 'Announcement broadcasted successfully.' });
  } catch (err: any) {
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const item = await prisma.announcement.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    if (!validateTenantOwnership(item.organizationId, admin)) {
      return NextResponse.json({ error: 'Forbidden: Cannot delete announcement outside your organization' }, { status: 403 });
    }

    await prisma.announcement.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        organizationId: item.organizationId,
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'DELETE_ANNOUNCEMENT',
        entity: 'Announcement',
        entityId: id,
        description: `${admin.role} deleted announcement "${item.title}".`
      }
    });

    return NextResponse.json({ message: 'Announcement deleted.' });
  } catch (err: any) {
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 500 });
  }
}
