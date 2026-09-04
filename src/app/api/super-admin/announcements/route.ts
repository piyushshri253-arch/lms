import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireSuperAdmin();
    const announcements = await prisma.announcement.findMany({
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
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { title, message, targetAudience, courseId, status } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const item = await prisma.announcement.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        targetAudience: targetAudience || 'ALL',
        courseId: courseId || null,
        status: status || 'ACTIVE'
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'CREATE_ANNOUNCEMENT',
        entity: 'Announcement',
        entityId: item.id,
        description: `Super Admin published platform announcement "${item.title}" (Audience: ${item.targetAudience}).`
      }
    });

    return NextResponse.json({ message: 'Announcement created successfully.', announcement: item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { id, title, message, targetAudience, courseId, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (message !== undefined) data.message = message.trim();
    if (targetAudience !== undefined) data.targetAudience = targetAudience;
    if (courseId !== undefined) data.courseId = courseId || null;
    if (status !== undefined) data.status = status;

    const updated = await prisma.announcement.update({ where: { id }, data });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'UPDATE_ANNOUNCEMENT',
        entity: 'Announcement',
        entityId: updated.id,
        description: `Super Admin updated announcement "${updated.title}" (Status: ${updated.status}).`
      }
    });

    return NextResponse.json({ message: 'Announcement updated.', announcement: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const item = await prisma.announcement.findUnique({ where: { id } });
    await prisma.announcement.delete({ where: { id } });

    if (item) {
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'DELETE_ANNOUNCEMENT',
          entity: 'Announcement',
          entityId: id,
          description: `Super Admin deleted announcement "${item.title}".`
        }
      });
    }

    return NextResponse.json({ message: 'Announcement deleted.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
