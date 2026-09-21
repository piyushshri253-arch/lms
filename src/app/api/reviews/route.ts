import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const reviewSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  rating: z.number().min(1).max(5),
  comment: z.string().min(3, 'Review comment must be at least 3 characters')
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const result = reviewSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { courseId, rating, comment } = result.data;

    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      }
    });

    if (!enrollment && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only enrolled students can leave reviews.' },
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
      create: {
        userId: user.id,
        courseId,
        rating,
        comment: comment.trim()
      },
      update: {
        rating,
        comment: comment.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    return NextResponse.json({ review, message: 'Review submitted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    const reviews = await prisma.review.findMany({
      where: courseId ? { courseId } : undefined,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        course: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ reviews });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
