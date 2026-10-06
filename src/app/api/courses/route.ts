import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, getCurrentUser, enforceTenantPlanLimits, handleAuthError } from '@/lib/auth';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const organizationSlug = searchParams.get('org');

    const currentUser = await getCurrentUser();

    const where: any = {};

    const manage = searchParams.get('manage') === 'true';

    // In single-company LMS, instructors manage their authored courses
    if (manage && currentUser?.role === 'INSTRUCTOR') {
      where.instructorId = currentUser.id;
    }

    if (category && category !== 'All' && category !== 'all') {
      where.category = {
        OR: [
          { name: { contains: category, mode: 'insensitive' } },
          { slug: { contains: category, mode: 'insensitive' } }
        ]
      };
    }
    if (level && level !== 'ALL_LEVELS') {
      where.level = level;
    }
    if (status) {
      where.status = status;
    } else if (!currentUser || currentUser.role === 'STUDENT' || !manage) {
      // Students and public landing visitors only view PUBLISHED courses
      where.status = 'PUBLISHED';
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } }
      ];
    }

    const courses = await prisma.course.findMany({
      where,
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
        reviews: true,
        _count: {
          select: {
            enrollments: true,
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedCourses = courses.map((course) => {
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

      return {
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
        reviewFeedback: (course as any).reviewFeedback || null,
        reviewedAt: (course as any).reviewedAt || null,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
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
        modules: course.sections.map((sec, secIdx) => ({
          id: sec.id,
          title: sec.title,
          description: sec.description || '',
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
            subLessons: (() => {
              try {
                const parsed = JSON.parse((les as any).resources || '[]');
                return Array.isArray(parsed) ? parsed : parsed?.subLessons || [];
              } catch {
                return [];
              }
            })(),
            completed: false,
            locked: !les.isFree,
            isFree: les.isFree,
            isPublished: (les as any).isPublished ?? true
          }))
        }))
      };
    });

    return NextResponse.json({ courses: mappedCourses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const createCourseSchema = z.object({
  title: z.string().min(2, 'Course title is required'),
  description: z.string().optional().default('Comprehensive master curriculum designed by industry architects.'),
  shortDescription: z.string().optional(),
  category: z.string().optional(),
  categoryName: z.string().optional(),
  categoryId: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or higher').default(0),
  discountPrice: z.coerce.number().optional().nullable(),
  currency: z.string().optional().default('INR'),
  level: z.string().optional().default('ALL_LEVELS'),
  thumbnail: z.string().optional(),
  banner: z.string().optional(),
  language: z.string().optional().default('English'),
  durationHours: z.coerce.number().optional().default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'IN_REVIEW', 'APPROVED', 'REJECTED']).optional().default('DRAFT'),
  whatYouWillLearn: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  targetAudience: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  accessType: z.string().optional().default('LIFETIME'),
  accessDays: z.coerce.number().optional().nullable(),
  sections: z.array(z.any()).optional()
});

export async function POST(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please log into your instructor account.' }, { status: 401 });
    }

    // Auto-promote student to INSTRUCTOR when they build and author a course
    if (user.role === 'STUDENT') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'INSTRUCTOR', platform: 'LMS' }
      }).catch(() => {});
      user = { ...user, role: 'INSTRUCTOR' };
    }

    if (!['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient privileges to create courses.' },
        { status: 403 }
      );
    }

    const authorId = user.id;
    let orgId = user.organizationId;

    if (!orgId) {
      let companyOrg = await prisma.organization.findFirst();
      if (!companyOrg) {
        companyOrg = await prisma.organization.create({
          data: { name: 'MORENA TEACH LMS', slug: 'morena-teach' }
        });
      }
      orgId = companyOrg.id;
    }

    const body = await request.json();
    const result = createCourseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid course payload' },
        { status: 400 }
      );
    }

    const data = result.data;
    const resolvedCatName = data.category || data.categoryName || 'Engineering';

    // Find or create category inside this organization
    let category = await prisma.category.findFirst({
      where: {
        organizationId: orgId || null,
        OR: [
          { id: data.categoryId || '' },
          { name: resolvedCatName },
          { slug: resolvedCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
        ]
      }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          organizationId: orgId || null,
          name: resolvedCatName,
          slug: `${resolvedCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
        }
      });
    }

    const baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    const newCourse = await prisma.course.create({
      data: {
        organizationId: orgId || null,
        title: data.title.trim(),
        slug: uniqueSlug,
        description: data.description || 'Comprehensive master curriculum designed by industry architects.',
        shortDescription: data.shortDescription || data.description?.slice(0, 120) || 'Comprehensive master curriculum.',
        price: data.price,
        discountPrice: data.discountPrice || undefined,
        currency: data.currency || 'INR',
        categoryId: category.id,
        level: data.level,
        instructorId: authorId,
        status: data.status,
        durationHours: data.durationHours || 0,
        language: data.language || 'English',
        thumbnail: data.thumbnail || '',
        banner: data.banner || null,
        whatYouWillLearn: JSON.stringify(data.whatYouWillLearn || []),
        requirements: JSON.stringify(data.requirements || []),
        targetAudience: JSON.stringify(data.targetAudience || []),
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        accessType: data.accessType || 'LIFETIME',
        accessDays: data.accessDays || null,
        isNew: true
      },
      include: {
        category: true,
        instructor: true
      }
    });

    // Save Sections and Lessons
    if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
      for (let sIdx = 0; sIdx < data.sections.length; sIdx++) {
        const sec = data.sections[sIdx];
        const createdSec = await prisma.courseSection.create({
          data: {
            courseId: newCourse.id,
            title: sec.title || `Module ${sIdx + 1}`,
            description: sec.description || null,
            order: sec.order || sIdx + 1
          }
        });

        if (sec.lessons && Array.isArray(sec.lessons)) {
          for (let lIdx = 0; lIdx < sec.lessons.length; lIdx++) {
            const les = sec.lessons[lIdx];
            const quizDataStr =
              typeof les.quizData === 'object' && les.quizData !== null
                ? JSON.stringify(les.quizData)
                : typeof les.quizData === 'string'
                ? les.quizData
                : null;
            const subLessonsStr = Array.isArray(les.subLessons)
              ? JSON.stringify(les.subLessons)
              : '[]';

            const cleanVideoUrl = les.videoUrl && !les.videoUrl.startsWith('blob:') ? les.videoUrl : null;
            let lesType = les.type || 'VIDEO';
            if (lesType === 'VIDEO' && !cleanVideoUrl) {
              if (quizDataStr) {
                try {
                  const q = JSON.parse(quizDataStr);
                  if (Array.isArray(q?.questions) && q.questions.length > 0) lesType = 'QUIZ';
                } catch {}
              }
              if (lesType === 'VIDEO' && les.content && les.content.trim().length > 0) {
                lesType = 'TEXT';
              } else if (lesType === 'VIDEO' && les.pdfUrl) {
                lesType = 'PDF';
              }
            }

            await prisma.lesson.create({
              data: {
                sectionId: createdSec.id,
                title: les.title || `Lesson ${lIdx + 1}`,
                description: les.description || null,
                type: lesType,
                content: les.content || null,
                videoUrl: cleanVideoUrl,
                pdfUrl: les.pdfUrl || null,
                fileUrl: les.fileUrl || null,
                quizData: quizDataStr,
                resources: subLessonsStr,
                duration: les.duration || '10:00',
                durationSeconds: les.durationSeconds || 600,
                isFree: !!les.isFree,
                isPublished: les.isPublished !== false,
                order: les.order || lIdx + 1
              }
            });
          }
        }
      }
    } else {
      const defaultSection = await prisma.courseSection.create({
        data: {
          courseId: newCourse.id,
          title: 'Module 1: Introduction & Foundation',
          order: 1
        }
      });

      await prisma.lesson.create({
        data: {
          sectionId: defaultSection.id,
          title: '1.1 Welcome to the Course',
          type: 'VIDEO',
          duration: '05:00',
          durationSeconds: 300,
          isFree: true,
          order: 1
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: orgId || null,
        adminId: user.id,
        adminEmail: user.email,
        action: 'CREATE_COURSE',
        entity: 'Course',
        entityId: newCourse.id,
        description: `${user.role} created course "${newCourse.title}" (ID: ${newCourse.id}) in organization ${user.organizationName || orgId}.`
      }
    });

    const courseWithSections = await prisma.course.findUnique({
      where: { id: newCourse.id },
      include: {
        category: true,
        instructor: true,
        sections: {
          include: { lessons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(
      { course: courseWithSections || newCourse, message: 'Course created successfully.' },
      { status: 201 }
    );
  } catch (err: any) {
    return handleAuthError(err);
  }
}
