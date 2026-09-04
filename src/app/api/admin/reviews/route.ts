import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'INSTRUCTOR']);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const rating = searchParams.get('rating');
    const status = searchParams.get('status');

    const where: any = {};

    if (rating && rating !== 'ALL') {
      where.rating = Number(rating);
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { comment: { contains: search } },
        { user: { name: { contains: search } } },
        { course: { title: { contains: search } } }
      ];
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true, slug: true } }
      }
    });

    const mapped = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      student: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        avatar: r.user.avatar
      },
      course: {
        id: r.course.id,
        title: r.course.title,
        slug: r.course.slug
      }
    }));

    return NextResponse.json({ reviews: mapped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireRole(['ADMIN']);
    const body = await request.json();
    const { reviewId, status } = body;

    if (!reviewId || !status) {
      return NextResponse.json({ error: 'Review ID and status are required' }, { status: 400 });
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { status }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'MODERATE_REVIEW',
        entity: 'Review',
        entityId: reviewId,
        description: `Admin updated review ${reviewId} status to ${status}.`
      }
    });

    return NextResponse.json({ review: updated, message: `Review status updated to ${status}.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireRole(['ADMIN']);
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
        description: `Admin deleted review ${id}.`
      }
    });

    return NextResponse.json({ message: 'Review deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
