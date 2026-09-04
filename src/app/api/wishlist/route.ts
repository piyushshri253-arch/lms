import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    // If guest user, return empty wishlist without error
    if (!user) {
      return NextResponse.json({ wishlist: [] });
    }

    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            instructor: { select: { name: true, avatar: true } },
            category: true,
            _count: { select: { reviews: true, enrollments: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      wishlist: wishlistItems.map((item) => ({
        id: item.id,
        courseId: item.course.id,
        courseSlug: item.course.slug,
        title: item.course.title,
        thumbnail: item.course.thumbnail,
        price: item.course.price,
        category: item.course.category.name,
        level: item.course.level,
        instructorName: item.course.instructor.name,
        createdAt: item.createdAt
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ wishlist: [], error: err.message }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required to add to wishlist.' }, { status: 401 });
    }

    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const item = await prisma.wishlist.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId
        }
      },
      create: {
        userId: user.id,
        courseId
      },
      update: {}
    });

    return NextResponse.json({ item, message: 'Added to wishlist.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    await prisma.wishlist.deleteMany({
      where: {
        userId: user.id,
        courseId
      }
    });

    return NextResponse.json({ message: 'Removed from wishlist.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
