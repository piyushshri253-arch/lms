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

    const courseIds = courses.map((c) => c.id);
    const versionMap = new Map<string, any>();
    if (courseIds.length > 0) {
      try {
        const versionRows = await prisma.platformSetting.findMany({
          where: {
            key: { in: courseIds.map((id) => `course_version_${id}`) }
          }
        });
        for (const row of versionRows) {
          try {
            const parsed = JSON.parse(row.value);
            const courseId = row.key.replace('course_version_', '');
            versionMap.set(courseId, parsed);
          } catch {}
        }
      } catch (err) {
        console.error('Failed to load version states for admin courses:', err);
      }
    }

    const mapped = courses.map((c) => {
      const verState = versionMap.get(c.id);
      const hasDraftVersion = Boolean(
        c.status === 'PUBLISHED' &&
        verState &&
        (verState.status === 'DRAFT_VERSION' || verState.status === 'PENDING_REVIEW')
      );
      return {
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
        hasDraftVersion,
        draftVersionNumber: verState?.pendingVersionNumber || (verState?.liveVersionNumber ? verState.liveVersionNumber + 1 : 2),
        liveVersionNumber: verState?.liveVersionNumber || 1,
        versionStatus: verState?.status || null,
        studentsCount: c._count?.enrollments || 0,
        reviewsCount: c._count?.reviews || 0,
        modulesCount: c._count?.sections || 0,
        rating: 4.9,
        createdAt: c.createdAt
      };
    });

    const versionDraftItems: any[] = [];
    if (!status || status === 'DRAFT') {
      for (const course of courses) {
        const verState = versionMap.get(course.id);
        const hasDraftVersion = Boolean(
          course.status === 'PUBLISHED' &&
          verState &&
          (verState.status === 'DRAFT_VERSION' ||
           (verState.status === 'PENDING_REVIEW' && course.status === 'PUBLISHED'))
        );
        if (hasDraftVersion) {
          const draftVerNumber = verState?.pendingVersionNumber || (verState?.liveVersionNumber ? verState.liveVersionNumber + 1 : 2);
          versionDraftItems.push({
            id: `draft_ver_${course.id}`,
            originalCourseId: course.id,
            isVersionDraftItem: true,
            title: `${course.title} (Draft v${draftVerNumber}.0)`,
            slug: course.slug,
            description: verState?.stagedSnapshot?.description || course.description,
            price: verState?.stagedSnapshot?.price !== undefined ? verState.stagedSnapshot.price : course.price,
            level: verState?.stagedSnapshot?.level || course.level,
            category: course.category?.name || 'General',
            instructor: course.instructor?.name || 'Academic Faculty',
            instructorAvatar: course.instructor?.avatar,
            isPublished: false,
            status: 'DRAFT',
            hasDraftVersion: false,
            draftVersionNumber: draftVerNumber,
            liveVersionNumber: verState?.liveVersionNumber || 1,
            versionStatus: verState?.status,
            studentsCount: 0,
            reviewsCount: 0,
            modulesCount: verState?.stagedSnapshot?.sections?.length || 0,
            rating: 5.0,
            createdAt: verState?.updatedAt || course.createdAt
          });
        }
      }
    }

    return NextResponse.json({ courses: [...mapped, ...versionDraftItems] });
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

    const mappedCourse = {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      price: course.price,
      level: course.level,
      category: course.category?.name || 'General',
      instructor: course.instructor?.name || 'Academic Faculty',
      instructorAvatar: course.instructor?.avatar,
      isPublished: course.status === 'PUBLISHED',
      status: course.status,
      studentsCount: 0,
      reviewsCount: 0,
      modulesCount: 0,
      rating: 5.0,
      createdAt: course.createdAt
    };

    return NextResponse.json({ course: mappedCourse }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating admin course:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, title, price, level, description, facilityId, category, categoryId, thumbnail, shortDescription, durationHours } = body;

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
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription.trim();
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail.trim();
    if (durationHours !== undefined) updateData.durationHours = Number(durationHours);

    // Resolve category if provided
    if (categoryId) {
      updateData.categoryId = categoryId;
    } else if (category && typeof category === 'string' && category.trim()) {
      const catTrimmed = category.trim();
      let matchedCat = await prisma.category.findFirst({
        where: {
          OR: [
            { name: { equals: catTrimmed, mode: 'insensitive' } },
            { name: { contains: catTrimmed, mode: 'insensitive' } },
            { slug: { equals: catTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-'), mode: 'insensitive' } }
          ]
        }
      });
      if (!matchedCat) {
        matchedCat = await prisma.category.create({
          data: {
            name: catTrimmed,
            slug: `${catTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`,
            organizationId: auth.sessionData?.activeFacilityId || null
          }
        });
      }
      updateData.categoryId = matchedCat.id;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        instructor: { select: { id: true, name: true, avatar: true } }
      }
    });

    const mappedUpdated = {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      description: updated.description,
      price: updated.price,
      level: updated.level,
      category: updated.category?.name || 'General',
      instructor: updated.instructor?.name || 'Academic Faculty',
      instructorAvatar: updated.instructor?.avatar,
      isPublished: updated.status === 'PUBLISHED',
      status: updated.status,
      studentsCount: 0,
      reviewsCount: 0,
      modulesCount: 0,
      rating: 5.0,
      createdAt: updated.createdAt
    };

    return NextResponse.json({ course: mappedUpdated });
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

    const { errorResponse, sessionData } = await requireAdminApiGuard('course.delete', facilityId);
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    if (id.startsWith('draft_ver_')) {
      const realCourseId = id.replace('draft_ver_', '');
      const { discardDraftVersion } = await import('@/lib/course-versioning');
      await discardDraftVersion(realCourseId, {
        id: sessionData.user.id,
        name: sessionData.user.name || 'Admin',
        role: sessionData.user.role
      });
      return NextResponse.json({ success: true, message: 'Version draft discarded successfully' });
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
