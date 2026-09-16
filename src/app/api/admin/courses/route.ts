import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApiGuard } from '@/lib/api-guard';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    const { errorResponse, sessionData } = await requireAdminApiGuard('course.view', facilityId);
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {};

    if (facilityId && facilityId !== 'all' && facilityId !== 'main-facility') {
      where.organizationId = facilityId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        instructor: { select: { id: true, name: true, avatar: true } },
        _count: {
          select: { enrollments: true, reviews: true, sections: true }
        }
      }
    });

    const mapped = courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      price: c.price,
      level: c.level,
      category: c.category?.name || 'General',
      instructor: c.instructor?.name || 'Academic Faculty',
      instructorAvatar: c.instructor?.avatar,
      isPublished: c.status === 'PUBLISHED',
      status: c.status,
      studentsCount: c._count?.enrollments || 0,
      reviewsCount: c._count?.reviews || 0,
      modulesCount: c._count?.sections || 0,
      rating: 4.9,
      createdAt: c.createdAt
    }));

    return NextResponse.json({ courses: mapped });
  } catch (error: any) {
    console.error('Error fetching admin courses:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      shortDescription,
      price,
      level,
      category,
      categoryId,
      facilityId,
      status = 'PUBLISHED',
      thumbnail,
      durationHours,
      instructorId
    } = body;

    const { errorResponse, sessionData } = await requireAdminApiGuard('course.create', facilityId);
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Course title is required' }, { status: 400 });
    }

    const slug =
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + `-${Date.now().toString().slice(-4)}`;

    // Resolve or find default category
    let targetCatId = categoryId;
    if (!targetCatId && category) {
      const existingCat = await prisma.category.findFirst({
        where: { name: { equals: category.trim(), mode: 'insensitive' } }
      });
      if (existingCat) {
        targetCatId = existingCat.id;
      } else {
        const catSlug = category.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        const newCat = await prisma.category.create({
          data: {
            name: category.trim(),
            slug: `${catSlug}-${Date.now().toString().slice(-4)}`,
            organizationId: sessionData.activeFacilityId
          }
        });
        targetCatId = newCat.id;
      }
    }

    if (!targetCatId) {
      let defaultCat = await prisma.category.findFirst({
        where: { organizationId: sessionData.activeFacilityId }
      });
      if (!defaultCat) {
        defaultCat = await prisma.category.create({
          data: {
            name: 'General Curriculum',
            slug: `general-${Date.now()}`,
            organizationId: sessionData.activeFacilityId
          }
        });
      }
      targetCatId = defaultCat.id;
    }

    const targetInstructorId = instructorId || sessionData.user.id;

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        slug,
        description: description?.trim() || 'Comprehensive course curriculum.',
        shortDescription: shortDescription?.trim() || description?.slice(0, 160) || '',
        price: Number(price) || 0,
        level: level || 'INTERMEDIATE',
        status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        thumbnail: thumbnail?.trim() || '',
        durationHours: Number(durationHours) || 12,
        organizationId: sessionData.activeFacilityId,
        instructorId: targetInstructorId,
        categoryId: targetCatId
      },
      include: {
        category: true,
        instructor: { select: { id: true, name: true, avatar: true } }
      }
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating admin course:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, title, price, level, description, facilityId } = body;

    let auth = await requireAdminApiGuard('course.edit', facilityId);
    if (auth.errorResponse && status !== undefined) {
      // Allow if user has course.publish permission
      const publishAuth = await requireAdminApiGuard('course.publish', facilityId);
      if (!publishAuth.errorResponse) {
        auth = publishAuth;
      }
    }
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title.trim();
    if (price !== undefined) updateData.price = Number(price);
    if (level !== undefined) updateData.level = level;
    if (description !== undefined) updateData.description = description.trim();

    const updated = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        instructor: { select: { id: true, name: true, avatar: true } }
      }
    });

    return NextResponse.json({ course: updated });
  } catch (error: any) {
    console.error('Error updating admin course:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const facilityId = searchParams.get('facilityId');

    const { errorResponse } = await requireAdminApiGuard('course.delete', facilityId);
    if (errorResponse) {
      return errorResponse;
    }

    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    await prisma.course.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Course deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting admin course:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
