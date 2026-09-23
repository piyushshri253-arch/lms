import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireReviewerAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireReviewerAuth();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status')?.trim().toUpperCase();
    const search = searchParams.get('search')?.trim().toLowerCase();

    const andConditions: any[] = [];

    if (user.role !== 'SUPER_ADMIN' && user.organizationId) {
      andConditions.push({
        OR: [
          { organizationId: user.organizationId },
          { organizationId: null }
        ]
      });
    }

    if (statusFilter && statusFilter !== 'ALL') {
      andConditions.push({ status: statusFilter });
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { instructor: { name: { contains: search, mode: 'insensitive' } } },
          { instructor: { email: { contains: search, mode: 'insensitive' } } },
          { category: { name: { contains: search, mode: 'insensitive' } } }
        ]
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    // Counts for stats cards
    const tenantFilter = user.role !== 'SUPER_ADMIN' && user.organizationId ? {
      OR: [
        { organizationId: user.organizationId },
        { organizationId: null }
      ]
    } : {};
    
    const [pendingCount, approvedCount, rejectedCount, totalCount] = await Promise.all([
      prisma.course.count({ where: { ...tenantFilter, status: 'IN_REVIEW' } }),
      prisma.course.count({ where: { ...tenantFilter, status: 'APPROVED' } }),
      prisma.course.count({ where: { ...tenantFilter, status: 'REJECTED' } }),
      prisma.course.count({ where: tenantFilter })
    ]);

    const courses = await prisma.course.findMany({
      where,
      orderBy: [
        // Prioritize IN_REVIEW courses at the top
        { updatedAt: 'desc' }
      ],
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                duration: true,
                durationSeconds: true,
                videoUrl: true,
                pdfUrl: true,
                fileUrl: true,
                isFree: true,
                order: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true
          }
        }
      }
    });

    const parsedCourses = courses.map((c) => {
      let learnPoints: string[] = [];
      let reqList: string[] = [];
      let audienceList: string[] = [];

      try {
        learnPoints = JSON.parse(c.whatYouWillLearn || '[]');
      } catch {
        learnPoints = [];
      }
      try {
        reqList = JSON.parse(c.requirements || '[]');
      } catch {
        reqList = [];
      }
      try {
        audienceList = JSON.parse(c.targetAudience || '[]');
      } catch {
        audienceList = [];
      }

      const totalLessons = c.sections.reduce((sum, s) => sum + s.lessons.length, 0);

      return {
        ...c,
        learningOutcomes: learnPoints,
        requirementsList: reqList,
        audienceList,
        totalLessons,
        totalSections: c.sections.length
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        pendingReview: pendingCount,
        approved: approvedCount,
        changesRequested: rejectedCount,
        total: totalCount
      },
      courses: parsedCourses
    });
  } catch (err: any) {
    console.error('[Reviewer Courses GET Error]:', err);
    const msg = String(err?.message || '');
    const isAuth = msg === 'UNAUTHORIZED' || msg.includes('UNAUTHORIZED');
    const isForbidden = msg === 'FORBIDDEN' || msg.includes('FORBIDDEN') || msg.includes('INSUFFICIENT');
    return NextResponse.json(
      {
        error: isForbidden
          ? 'Access denied: Course Reviewer or Administrator privileges required.'
          : isAuth
          ? 'Authentication required. Please log into a Course Reviewer account.'
          : (err.message || 'Unauthorized or server error')
      },
      { status: isAuth ? 401 : isForbidden ? 403 : 400 }
    );
  }
}
