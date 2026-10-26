import { prisma } from './prisma';
import { Course } from '@/types';

export async function getPublishedCourses(): Promise<Course[]> {
  try {
    const rawCourses = await prisma.course.findMany({
      where: {
        status: 'PUBLISHED'
      },
      include: {
        category: true,
        instructor: true,
        reviews: true,
        sections: {
          include: {
            lessons: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return rawCourses.map((c) => {
      const avgRating =
        c.reviews.length > 0
          ? Number((c.reviews.reduce((acc, r) => acc + r.rating, 0) / c.reviews.length).toFixed(1))
          : 4.8;

      let whatYouWillLearn: string[] = [];
      try {
        whatYouWillLearn = JSON.parse(c.whatYouWillLearn || '[]');
      } catch {
        whatYouWillLearn = [];
      }

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        subtitle: c.shortDescription || '',
        description: c.description,
        price: c.price,
        originalPrice: c.discountPrice || undefined,
        category: c.category?.name || 'General',
        categoryId: c.categoryId,
        level: c.level,
        thumbnail: c.thumbnail && c.thumbnail.trim() ? c.thumbnail.trim() : '',
        banner: (c as any).banner || undefined,
        rating: avgRating,
        reviewsCount: c._count.reviews || c.reviews.length || 0,
        studentsCount: c._count.enrollments || 0,
        durationHours: c.durationHours || 12,
        language: c.language || 'English',
        bestseller: c.bestseller,
        isNew: c.isNew,
        status: c.status,
        parentCourseId: (c as any).parentCourseId || null,
        versionNumber: (c as any).versionNumber || 1,
        versionLabel: (c as any).versionLabel || `v${(c as any).versionNumber || 1}.0`,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        whatYouWillLearn,
        instructor: {
          id: c.instructor?.id || 'faculty',
          name: c.instructor?.name || 'Faculty of Teacher Excellence',
          title: c.instructor?.bio || 'Master Pedagogy & Early Childhood Educator',
          avatar: c.instructor?.avatar || ''
        },
        subtitles: ['English', 'Hindi'],
        modules: c.sections.map((sec, secIdx) => ({
          id: sec.id,
          title: sec.title,
          moduleNumber: secIdx + 1,
          lessons: sec.lessons.map((les) => ({
            id: les.id,
            title: les.title,
            duration: les.duration,
            durationSeconds: les.durationSeconds,
            type: (les.type?.toLowerCase() || 'video') as any,
            completed: false,
            locked: !les.isFree,
            isFree: les.isFree,
            videoUrl: les.videoUrl
          }))
        }))
      } as unknown as Course;
    });
  } catch (error) {
    console.error('Error fetching published courses:', error);
    return [];
  }
}

export async function getActiveCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        courses: {
          some: { status: 'PUBLISHED' }
        }
      },
      include: {
        _count: {
          select: {
            courses: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      courseCount: cat._count.courses
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}
