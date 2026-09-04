import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    const wishlist = await prisma.wishlist.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            instructor: { select: { name: true, avatar: true } },
            category: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      wishlist: wishlist.map((w) => ({
        id: w.id,
        courseId: w.course.id,
        slug: w.course.slug,
        title: w.course.title,
        thumbnail: w.course.thumbnail && w.course.thumbnail.trim() ? w.course.thumbnail.trim() : null,
        price: w.course.price,
        discountPrice: w.course.discountPrice,
        category: w.course.category.name,
        instructor: {
          ...w.course.instructor,
          avatar: w.course.instructor.avatar && w.course.instructor.avatar.trim() ? w.course.instructor.avatar.trim() : null
        },
        durationHours: w.course.durationHours,
        level: w.course.level
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: 'courseId required' }, { status: 400 });
    }

    const item = await prisma.wishlist.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      },
      update: {},
      create: {
        userId: user.id,
        courseId
      }
    });

    return NextResponse.json({ item, message: 'Added to wishlist!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId required' }, { status: 400 });
    }

    await prisma.wishlist.deleteMany({
      where: {
        userId: user.id,
        courseId
      }
    });

    return NextResponse.json({ message: 'Removed from wishlist' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
