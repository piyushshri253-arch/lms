import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    const status = searchParams.get('status') || 'ALL'; // ALL, PUBLISHED, DRAFT, ARCHIVED
    const category = searchParams.get('category') || 'ALL';

    const where: any = {};
    if (status !== 'ALL') where.status = status;
    if (category !== 'ALL') where.category = { slug: category };
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { slug: { contains: q } },
        { instructor: { name: { contains: q } } }
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        category: true,
        instructor: { select: { id: true, name: true, email: true, avatar: true } },
        sections: {
          include: {
            lessons: true
          },
          orderBy: { order: 'asc' }
        },
        enrollments: { select: { id: true } },
        orders: { select: { amount: true, status: true } },
        reviews: { select: { rating: true } },
        certificates: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = courses.map((c) => {
      const allLessons = c.sections.flatMap((s) => s.lessons);
      const totalRevenue = c.orders
        .filter((o) => o.status === 'SUCCESS')
        .reduce((sum, o) => sum + o.amount, 0);

      const avgRating =
        c.reviews.length > 0
          ? Math.round((c.reviews.reduce((sum, r) => sum + r.rating, 0) / c.reviews.length) * 10) / 10
          : 5.0;

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        shortDescription: c.shortDescription,
        thumbnail: c.thumbnail,
        price: c.price,
        discountPrice: c.discountPrice,
        level: c.level,
        status: c.status,
        durationHours: c.durationHours,
        language: c.language,
        bestseller: c.bestseller,
        isNew: c.isNew,
        category: c.category.name,
        categorySlug: c.category.slug,
        categoryId: c.categoryId,
        instructor: c.instructor,
        instructorId: c.instructorId,
        sectionsCount: c.sections.length,
        lessonsCount: allLessons.length,
        sections: c.sections,
        enrollmentCount: c.enrollments.length,
        certificatesCount: c.certificates.length,
        reviewsCount: c.reviews.length,
        avgRating,
        revenue: Math.round(totalRevenue * 100) / 100,
        createdAt: c.createdAt.toISOString().split('T')[0]
      };
    });

    return NextResponse.json({ courses: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const {
      title,
      description,
      shortDescription,
      thumbnail,
      price,
      discountPrice,
      categoryId,
      instructorId,
      level,
      status,
      durationHours,
      language,
      whatYouWillLearn
    } = body;

    if (!title || !price || !categoryId || !instructorId) {
      return NextResponse.json(
        { error: 'Title, price, categoryId, and instructorId are required' },
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    const newCourse = await prisma.course.create({
      data: {
        title: title.trim(),
        slug,
        description: description?.trim() || title,
        shortDescription: shortDescription?.trim() || '',
        thumbnail:
          thumbnail ||
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBfSK-qNFG7rZx20vQ1L8m13W422kT-esoQzVPjbuKICGsyBtAypO0ON2yIUDtGNQZl-1BmPNBLCRzfehpqn2Qh4FcikJioN_BmHUDgUsIcDSa7ggt-zoSXzEgNGPgidwydnTDCGkzfHaZF9vDV95VQrNJ9O2YZBvlqbWR94Z6hAsuH-pFJ6rNijbiIiF2a6TxDw9okxS29w27lGJwoWoUmXQseao9d4Du8Nf--4mdIfIXnErsrKliDuA',
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        categoryId,
        instructorId,
        level: level || 'ALL_LEVELS',
        status: status || 'DRAFT',
        durationHours: Number(durationHours) || 10.0,
        language: language || 'English',
        whatYouWillLearn: JSON.stringify(whatYouWillLearn || [])
      }
    });

    // Create default starter module and lesson
    const sec = await prisma.courseSection.create({
      data: {
        courseId: newCourse.id,
        title: 'Module 1: Orientation & Architecture Setup',
        order: 1
      }
    });

    await prisma.lesson.create({
      data: {
        sectionId: sec.id,
        title: '1.1 Curriculum Overview & Tooling',
        duration: '10:00',
        durationSeconds: 600,
        order: 1,
        isFree: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'CREATE_COURSE',
        entity: 'Course',
        entityId: newCourse.id,
        description: `Super Admin created master curriculum "${newCourse.title}" ($${newCourse.price}).`
      }
    });

    return NextResponse.json({
      message: `Course "${newCourse.title}" created successfully.`,
      course: newCourse
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const {
      id,
      title,
      description,
      shortDescription,
      thumbnail,
      price,
      discountPrice,
      categoryId,
      instructorId,
      level,
      status,
      durationHours,
      bestseller,
      isNew
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (title) data.title = title.trim();
    if (description) data.description = description.trim();
    if (shortDescription !== undefined) data.shortDescription = shortDescription.trim();
    if (thumbnail) data.thumbnail = thumbnail.trim();
    if (price !== undefined) data.price = Number(price);
    if (discountPrice !== undefined) data.discountPrice = discountPrice ? Number(discountPrice) : null;
    if (categoryId) data.categoryId = categoryId;
    if (instructorId) data.instructorId = instructorId;
    if (level) data.level = level;
    if (status) data.status = status;
    if (durationHours !== undefined) data.durationHours = Number(durationHours);
    if (typeof bestseller === 'boolean') data.bestseller = bestseller;
    if (typeof isNew === 'boolean') data.isNew = isNew;

    const updated = await prisma.course.update({
      where: { id },
      data
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'UPDATE_COURSE',
        entity: 'Course',
        entityId: id,
        description: `Super Admin updated course settings for "${updated.title}". Status: ${updated.status}.`
      }
    });

    return NextResponse.json({
      message: `Course "${updated.title}" updated successfully.`,
      course: updated
    });
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
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const target = await prisma.course.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Cascade deletions
    await prisma.review.deleteMany({ where: { courseId: id } });
    await prisma.certificate.deleteMany({ where: { courseId: id } });
    await prisma.wishlist.deleteMany({ where: { courseId: id } });
    await prisma.enrollment.deleteMany({ where: { courseId: id } });
    await prisma.order.deleteMany({ where: { courseId: id } });

    const sections = await prisma.courseSection.findMany({ where: { courseId: id }, select: { id: true } });
    const sectionIds = sections.map((s) => s.id);
    const lessons = await prisma.lesson.findMany({ where: { sectionId: { in: sectionIds } }, select: { id: true } });
    const lessonIds = lessons.map((l) => l.id);

    await prisma.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.lesson.deleteMany({ where: { sectionId: { in: sectionIds } } });
    await prisma.courseSection.deleteMany({ where: { courseId: id } });
    await prisma.course.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'DELETE_COURSE',
        entity: 'Course',
        entityId: id,
        description: `Super Admin permanently deleted course "${target.title}".`
      }
    });

    return NextResponse.json({ message: `Course "${target.title}" deleted successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
