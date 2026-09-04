import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL'; // ALL, APPROVED, PENDING, HIDDEN
    const q = searchParams.get('q')?.toLowerCase() || '';

    const where: any = {};
    if (status !== 'ALL') where.status = status;
    if (q) {
      where.OR = [
        { comment: { contains: q } },
        { user: { name: { contains: q } } },
        { course: { title: { contains: q } } }
      ];
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true, slug: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ reviews });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { status }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'MODERATE_REVIEW',
        entity: 'Review',
        entityId: id,
        description: `Super Admin updated review moderation status to "${status}".`
      }
    });

    return NextResponse.json({ message: `Review status updated to ${status}.`, review: updated });
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
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    await prisma.review.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'DELETE_REVIEW',
        entity: 'Review',
        entityId: id,
        description: `Super Admin deleted student review.`
      }
    });

    return NextResponse.json({ message: 'Review deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
