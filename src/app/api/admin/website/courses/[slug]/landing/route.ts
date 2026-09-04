import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');
    const orgId = searchParams.get('organizationId');

    let organization: any = null;
    if (orgSlug) {
      organization = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    } else if (orgId) {
      organization = await prisma.organization.findUnique({ where: { id: orgId } });
    }

    const whereClause: any = { slug };
    if (organization) {
      whereClause.organizationId = organization.id;
    }

    const course = await prisma.course.findFirst({
      where: whereClause,
      include: {
        instructor: {
          select: { id: true, name: true, avatar: true, bio: true }
        },
        category: { select: { id: true, name: true, slug: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                duration: true,
                durationSeconds: true,
                isPreview: true,
                isFree: true,
                order: true
              }
            }
          }
        },
        reviews: {
          select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true, avatar: true } } }
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            primaryColor: true,
            secondaryColor: true,
            contactEmail: true
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course landing page not found' }, { status: 404 });
    }

    // Compute curriculum stats
    const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);
    const totalDurationSeconds = course.sections.reduce(
      (sum, s) => sum + s.lessons.reduce((lSum, l) => lSum + (l.durationSeconds || 0), 0),
      0
    );

    // Compute reviews average
    const totalReviews = course.reviews.length;
    const avgRating = totalReviews > 0
      ? Number((course.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 5.0;

    const enrollmentCount = await prisma.enrollment.count({
      where: { courseId: course.id }
    });

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        shortDescription: course.shortDescription,
        description: course.description,
        thumbnail: course.thumbnail,
        trailerVideoUrl: course.trailerVideoUrl,
        level: course.level,
        language: course.language,
        durationHours: course.durationHours || Number((totalDurationSeconds / 3600).toFixed(1)),
        price: course.price,
        discountPrice: course.discountPrice,
        currency: course.currency,
        whatYouWillLearn: course.whatYouWillLearn ? JSON.parse(course.whatYouWillLearn) : [],
        requirements: course.requirements ? JSON.parse(course.requirements) : [],
        targetAudience: course.targetAudience ? JSON.parse(course.targetAudience) : [],
        instructor: course.instructor,
        category: course.category,
        sectionsCount: course.sections.length,
        lessonsCount: totalLessons,
        curriculum: course.sections,
        enrollmentCount,
        reviewsCount: totalReviews,
        avgRating,
        recentReviews: course.reviews.slice(0, 5),
        organization: course.organization
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
