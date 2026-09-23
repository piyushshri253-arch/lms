import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireTenantRole, validateTenantOwnership, handleAuthError } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const currentUser = await getCurrentUser();

    const course = await prisma.course.findFirst({
      where: {
        OR: [
          { slug: slug },
          { id: slug }
        ]
      },
      include: {
        category: true,
        instructor: true,
        sections: {
          include: {
            lessons: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        reviews: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Tenant Isolation Check for Draft/Private Courses
    if (course.status !== 'PUBLISHED') {
      if (!currentUser) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      if (!validateTenantOwnership(course.organizationId, currentUser)) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
    }

    let isEnrolled = false;
    let completedLessonIds: string[] = [];

    if (currentUser) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: currentUser.id,
          courseId: course.id
        }
      });
      isEnrolled =
        !!enrollment ||
        currentUser.role === 'SUPER_ADMIN' ||
        (currentUser.role === 'ADMIN' && validateTenantOwnership(course.organizationId, currentUser)) ||
        course.instructorId === currentUser.id;

      if (isEnrolled) {
        const progress = await prisma.lessonProgress.findMany({
          where: {
            userId: currentUser.id,
            completed: true,
            lesson: {
              section: {
                courseId: course.id
              }
            }
          },
          select: { lessonId: true }
        });
        completedLessonIds = progress.map((p) => p.lessonId);
      }
    }

    const avgRating =
      course.reviews.length > 0
        ? Number((course.reviews.reduce((acc, r) => acc + r.rating, 0) / course.reviews.length).toFixed(1))
        : 5.0;

    let whatYouWillLearn: string[] = [];
    let requirements: string[] = [];
    let targetAudience: string[] = [];

    try { whatYouWillLearn = JSON.parse(course.whatYouWillLearn); } catch { whatYouWillLearn = []; }
    try { requirements = JSON.parse((course as any).requirements || '[]'); } catch { requirements = []; }
    try { targetAudience = JSON.parse((course as any).targetAudience || '[]'); } catch { targetAudience = []; }

    const formattedCourse = {
      id: course.id,
      slug: course.slug,
      organizationId: course.organizationId,
      title: course.title,
      subtitle: course.shortDescription || '',
      description: course.description,
      price: course.price,
      originalPrice: course.discountPrice || undefined,
      currency: (course as any).currency || 'INR',
      category: course.category.name,
      categoryId: course.categoryId,
      level: course.level,
      thumbnail: course.thumbnail && course.thumbnail.trim() ? course.thumbnail.trim() : null,
      banner: (course as any).banner && (course as any).banner.trim() ? (course as any).banner.trim() : null,
      rating: avgRating,
      reviewsCount: course._count.reviews || course.reviews.length || 0,
      studentsCount: course._count.enrollments || 0,
      durationHours: course.durationHours,
      language: course.language,
      subtitles: ['English', 'Hindi'],
      bestseller: course.bestseller,
      isNew: course.isNew,
      status: course.status,
      accessType: (course as any).accessType || 'LIFETIME',
      accessDays: (course as any).accessDays || null,
      seoTitle: (course as any).seoTitle || null,
      seoDescription: (course as any).seoDescription || null,
      whatYouWillLearn,
      requirements,
      targetAudience,
      instructor: {
        id: course.instructor.id,
        name: course.instructor.name,
        title: course.instructor.bio || 'Lead Instructor & Systems Architect',
        avatar: course.instructor.avatar && course.instructor.avatar.trim() ? course.instructor.avatar.trim() : null
      },
      sections: course.sections.map((sec, secIdx) => ({
        id: sec.id,
        title: sec.title,
        description: sec.description || '',
        order: sec.order,
        moduleNumber: secIdx + 1,
        lessons: sec.lessons.map((les) => ({
          id: les.id,
          title: les.title,
          description: les.description || '',
          duration: les.duration,
          durationSeconds: les.durationSeconds,
          type: (les as any).type || 'VIDEO',
          content: (les as any).content || null,
          videoUrl: les.videoUrl,
          pdfUrl: (les as any).pdfUrl || null,
          fileUrl: (les as any).fileUrl || null,
          quizData: (les as any).quizData || null,
          completed: completedLessonIds.includes(les.id),
          locked: !isEnrolled && !les.isFree,
          isFree: les.isFree,
          isPublished: (les as any).isPublished ?? true,
          order: les.order
        }))
      })),
      reviews: course.reviews.map((r) => ({
        id: r.id,
        user: {
          id: r.user.id,
          name: r.user.name,
          avatar: r.user.avatar
        },
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt.toISOString()
      }))
    };

    return NextResponse.json({
      course: {
        ...formattedCourse,
        isEnrolled
      },
      isEnrolled,
      completedLessonIds
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      },
      include: {
        sections: {
          include: { lessons: true }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Tenant Isolation Check
    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify courses outside your organization.' },
        { status: 403 }
      );
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only modify courses authored by your account.' },
        { status: 403 }
      );
    }

    // Resolve category if categoryId or category name is provided
    let categoryId = body.categoryId;
    if (!categoryId && body.category) {
      const cat = await prisma.category.findFirst({
        where: {
          organizationId: user.organizationId || null,
          OR: [{ name: body.category }, { slug: body.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') }]
        }
      });
      if (cat) {
        categoryId = cat.id;
      } else {
        const newCat = await prisma.category.create({
          data: {
            organizationId: user.organizationId || null,
            name: body.category.trim(),
            slug: `${body.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
          }
        });
        categoryId = newCat.id;
      }
    }

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        title: body.title !== undefined ? body.title.trim() : undefined,
        description: body.description !== undefined ? body.description : undefined,
        shortDescription: body.shortDescription !== undefined ? body.shortDescription : undefined,
        price: body.price !== undefined ? Number(body.price) : undefined,
        discountPrice: body.discountPrice !== undefined ? (body.discountPrice ? Number(body.discountPrice) : null) : undefined,
        currency: body.currency !== undefined ? body.currency : undefined,
        thumbnail: body.thumbnail !== undefined ? body.thumbnail : undefined,
        banner: body.banner !== undefined ? body.banner : undefined,
        status: body.status !== undefined ? body.status : undefined,
        level: body.level !== undefined ? body.level : undefined,
        language: body.language !== undefined ? body.language : undefined,
        durationHours: body.durationHours !== undefined ? Number(body.durationHours) : undefined,
        categoryId: categoryId || undefined,
        whatYouWillLearn: body.whatYouWillLearn ? JSON.stringify(body.whatYouWillLearn) : undefined,
        requirements: body.requirements ? JSON.stringify(body.requirements) : undefined,
        targetAudience: body.targetAudience ? JSON.stringify(body.targetAudience) : undefined,
        seoTitle: body.seoTitle !== undefined ? body.seoTitle : undefined,
        seoDescription: body.seoDescription !== undefined ? body.seoDescription : undefined,
        accessType: body.accessType !== undefined ? body.accessType : undefined,
        accessDays: body.accessDays !== undefined ? (body.accessDays ? Number(body.accessDays) : null) : undefined
      }
    });

    // Synchronize Curriculum Sections and Lessons if provided
    if (body.sections && Array.isArray(body.sections)) {
      const incomingSectionIds: string[] = [];

      for (let sIdx = 0; sIdx < body.sections.length; sIdx++) {
        const secData = body.sections[sIdx];
        let section = course.sections.find((s) => s.id === secData.id);

        if (section) {
          section = await prisma.courseSection.update({
            where: { id: section.id },
            data: {
              title: secData.title || `Module ${sIdx + 1}`,
              order: secData.order || sIdx + 1
            },
            include: { lessons: true }
          });
        } else {
          section = await prisma.courseSection.create({
            data: {
              courseId: course.id,
              title: secData.title || `Module ${sIdx + 1}`,
              order: secData.order || sIdx + 1
            },
            include: { lessons: true }
          });
        }
        incomingSectionIds.push(section.id);

        if (secData.lessons && Array.isArray(secData.lessons)) {
          const incomingLessonIds: string[] = [];

          for (let lIdx = 0; lIdx < secData.lessons.length; lIdx++) {
            const lesData = secData.lessons[lIdx];
            const quizDataStr =
              typeof lesData.quizData === 'object' && lesData.quizData !== null
                ? JSON.stringify(lesData.quizData)
                : typeof lesData.quizData === 'string'
                ? lesData.quizData
                : null;

            const existingLesson = (section.lessons || []).find((l) => l.id === lesData.id);

            if (existingLesson) {
              const updatedLesson = await prisma.lesson.update({
                where: { id: existingLesson.id },
                data: {
                  title: lesData.title,
                  type: lesData.type || 'VIDEO',
                  content: lesData.content !== undefined ? lesData.content : undefined,
                  videoUrl: lesData.videoUrl !== undefined ? lesData.videoUrl : undefined,
                  pdfUrl: lesData.pdfUrl !== undefined ? lesData.pdfUrl : undefined,
                  fileUrl: lesData.fileUrl !== undefined ? lesData.fileUrl : undefined,
                  quizData: quizDataStr,
                  duration: lesData.duration || '10:00',
                  durationSeconds: lesData.durationSeconds || 600,
                  isFree: lesData.isFree !== undefined ? !!lesData.isFree : undefined,
                  isPublished: lesData.isPublished !== undefined ? lesData.isPublished : undefined,
                  order: lesData.order || lIdx + 1
                }
              });
              incomingLessonIds.push(updatedLesson.id);
            } else {
              const newLesson = await prisma.lesson.create({
                data: {
                  sectionId: section.id,
                  title: lesData.title || `Lesson ${lIdx + 1}`,
                  type: lesData.type || 'VIDEO',
                  content: lesData.content || null,
                  videoUrl: lesData.videoUrl || null,
                  pdfUrl: lesData.pdfUrl || null,
                  fileUrl: lesData.fileUrl || null,
                  quizData: quizDataStr,
                  duration: lesData.duration || '10:00',
                  durationSeconds: lesData.durationSeconds || 600,
                  isFree: !!lesData.isFree,
                  isPublished: lesData.isPublished !== false,
                  order: lesData.order || lIdx + 1
                }
              });
              incomingLessonIds.push(newLesson.id);
            }
          }

          const lessonsToDelete = (section.lessons || []).filter((l) => !incomingLessonIds.includes(l.id));
          for (const lToDel of lessonsToDelete) {
            await prisma.lesson.delete({ where: { id: lToDel.id } }).catch(() => {});
          }
        }
      }

      const sectionsToDelete = course.sections.filter((s) => !incomingSectionIds.includes(s.id));
      for (const sToDel of sectionsToDelete) {
        await prisma.courseSection.delete({ where: { id: sToDel.id } }).catch(() => {});
      }
    }

    await prisma.auditLog.create({
      data: {
        organizationId: course.organizationId,
        adminId: user.id,
        adminEmail: user.email,
        action: 'UPDATE_COURSE',
        entity: 'Course',
        entityId: course.id,
        description: `${user.role} updated course "${updated.title}" (Status: ${updated.status}).`
      }
    });

    return NextResponse.json({ course: updated, message: 'Course updated successfully.' });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Tenant Isolation Check
    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete courses outside your organization.' },
        { status: 403 }
      );
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete courses authored by your account.' },
        { status: 403 }
      );
    }

    // Safely decouple/cleanup relations that don't cascade automatically
    await prisma.order.updateMany({
      where: { courseId: course.id },
      data: { courseId: null }
    }).catch(() => {});

    await prisma.certificate.deleteMany({
      where: { courseId: course.id }
    }).catch(() => {});

    await prisma.course.delete({
      where: { id: course.id }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: course.organizationId,
        adminId: user.id,
        adminEmail: user.email,
        action: 'DELETE_COURSE',
        entity: 'Course',
        entityId: course.id,
        description: `${user.role} deleted course "${course.title}".`
      }
    });

    return NextResponse.json({ message: 'Course deleted successfully.' });
  } catch (err: any) {
    return handleAuthError(err);
  }
}
