import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      include: {
        course: {
          select: { id: true, slug: true, title: true, thumbnail: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt.toISOString().split('T')[0],
        course: r.course
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { courseId, rating, comment } = body;

    if (!courseId || !rating || !comment) {
      return NextResponse.json({ error: 'Missing required review fields' }, { status: 400 });
    }

    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You can only review courses you are actively enrolled in.' },
        { status: 403 }
      );
    }

    const review = await prisma.review.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      },
      update: {
        rating: Number(rating),
        comment,
        status: 'APPROVED'
      },
      create: {
        userId: user.id,
        courseId,
        rating: Number(rating),
        comment,
        status: 'APPROVED'
      }
    });

    return NextResponse.json({
      review,
      message: 'Your review has been submitted successfully!'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    await prisma.review.deleteMany({
      where: {
        id,
        userId: user.id // Ensure student can only delete their own review
      }
    });

    return NextResponse.json({ message: 'Review deleted.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
