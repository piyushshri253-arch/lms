import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['REVIEWER', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status')?.trim().toUpperCase();
    const search = searchParams.get('search')?.trim().toLowerCase();

    const where: any = {};

    if (user.role !== 'SUPER_ADMIN' && user.organizationId) {
      where.organizationId = user.organizationId;
    }

    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { instructor: { name: { contains: search, mode: 'insensitive' } } },
        { instructor: { email: { contains: search, mode: 'insensitive' } } },
        { category: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Counts for stats cards
    const tenantFilter = user.role !== 'SUPER_ADMIN' && user.organizationId ? { organizationId: user.organizationId } : {};
    
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
    return NextResponse.json({ error: err.message || 'Unauthorized or server error' }, { status: 400 });
  }
}
