import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'INSTRUCTOR', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Build tenant scope filter
    const tenantFilter: any = {};
    if (user.role !== 'SUPER_ADMIN' && orgId) {
      tenantFilter.organizationId = orgId;
    }

    // Parse Date Ranges
    const now = new Date();
    let startDate = new Date();

    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'yesterday') {
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === '90d') {
      startDate.setDate(now.getDate() - 90);
    } else if (range === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (range === 'custom' && startDateParam) {
      startDate = new Date(startDateParam);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    const dateFilter = {
      createdAt: {
        gte: startDate,
        lte: endDateParam ? new Date(endDateParam) : now
      }
    };

    // Revenue Aggregations scoped to tenant & date range
    const [allOrders, successfulOrders, periodOrders, pendingOrders, refundedOrders, activeSubsCount] =
      await Promise.all([
        prisma.order.findMany({
          where: { ...tenantFilter, ...dateFilter },
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            course: { select: { id: true, title: true, slug: true, thumbnail: true } },
            items: true
          }
        }),
        prisma.order.aggregate({
          where: { ...tenantFilter, status: { in: ['SUCCESS', 'PAID'] } },
          _sum: { total: true, amount: true, discountAmount: true, tax: true },
          _count: { id: true }
        }),
        prisma.order.aggregate({
          where: {
            ...tenantFilter,
            status: { in: ['SUCCESS', 'PAID'] },
            ...dateFilter
          },
          _sum: { total: true, amount: true, discountAmount: true, tax: true },
          _count: { id: true }
        }),
        prisma.order.aggregate({
          where: { ...tenantFilter, status: 'PENDING', ...dateFilter },
          _sum: { total: true, amount: true },
          _count: { id: true }
        }),
        prisma.order.aggregate({
          where: { ...tenantFilter, status: { in: ['REFUNDED', 'PARTIALLY_REFUNDED'] }, ...dateFilter },
          _sum: { total: true, amount: true },
          _count: { id: true }
        }),
        prisma.subscription.count({
          where: { ...tenantFilter, status: 'ACTIVE' }
        })
      ]);

    const grossRevenue = periodOrders._sum.total || periodOrders._sum.amount || 0;
    const allTimeGrossRevenue = successfulOrders._sum.total || successfulOrders._sum.amount || 0;
    const discountsGiven = periodOrders._sum.discountAmount || 0;
    const taxesCollected = periodOrders._sum.tax || 0;
    const refundsCount = refundedOrders._count.id || 0;
    const refundedAmount = refundedOrders._sum.total || refundedOrders._sum.amount || 0;
    const estimatedPaymentFees = Number((grossRevenue * 0.02).toFixed(2)); // 2% gateway fee standard
    const netRevenue = Math.max(0, grossRevenue - refundedAmount - estimatedPaymentFees);
    const completedPaymentsCount = periodOrders._count.id || 0;
    const averageOrderValue = completedPaymentsCount > 0 ? Number((grossRevenue / completedPaymentsCount).toFixed(2)) : 0;

    // User, Instructor & Student counts scoped to tenant
    const [totalStudents, newStudentsPeriod, totalInstructors, totalCourses, publishedCourses, draftCourses, totalProducts] = await Promise.all([
      prisma.user.count({ where: { ...tenantFilter, role: 'STUDENT' } }),
      prisma.user.count({ where: { ...tenantFilter, role: 'STUDENT', ...dateFilter } }),
      prisma.user.count({ where: { ...tenantFilter, role: 'INSTRUCTOR' } }),
      prisma.course.count({ where: tenantFilter }),
      prisma.course.count({ where: { ...tenantFilter, status: 'PUBLISHED' } }),
      prisma.course.count({ where: { ...tenantFilter, status: 'DRAFT' } }),
      prisma.product.count({ where: tenantFilter })
    ]);

    // Enrollments in Period & Certificates
    const [totalEnrollments, periodEnrollments, completedEnrollments, totalCertificates] = await Promise.all([
      prisma.enrollment.count({ where: tenantFilter }),
      prisma.enrollment.count({ where: { ...tenantFilter, enrolledAt: { gte: startDate } } }),
      prisma.enrollment.count({ where: { ...tenantFilter, status: 'COMPLETED' } }),
      prisma.certificate.count({ where: tenantFilter })
    ]);

    // Average rating
    const reviewsAgg = await prisma.review.aggregate({
      where: tenantFilter,
      _avg: { rating: true },
      _count: { id: true }
    });
    const avgRating = Number((reviewsAgg._avg.rating || 4.9).toFixed(1));
    const totalReviews = reviewsAgg._count.id || 0;

    // Monthly / Daily Revenue Timeseries
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueTrendMap: { [key: string]: number } = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      revenueTrendMap[key] = 0;
    }

    allOrders.forEach((o) => {
      if (o.status === 'SUCCESS' || o.status === 'PAID') {
        const orderDate = new Date(o.createdAt);
        const key = `${monthNames[orderDate.getMonth()]} ${orderDate.getFullYear()}`;
        if (revenueTrendMap[key] !== undefined) {
          revenueTrendMap[key] += o.total || o.amount;
        }
      }
    });

    const monthlyRevenueChart = Object.entries(revenueTrendMap).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue)
    }));

    // Top Performing Courses scoped to tenant
    const courses = await prisma.course.findMany({
      where: tenantFilter,
      include: {
        category: true,
        instructor: { select: { name: true, avatar: true } },
        orders: { where: { status: { in: ['SUCCESS', 'PAID'] } }, select: { amount: true, total: true } },
        reviews: { select: { rating: true } },
        _count: { select: { enrollments: true, reviews: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const coursePerformance = courses.map((c) => {
      const rev = c.orders.reduce((sum, ord) => sum + (ord.total || ord.amount), 0);
      const ratings = c.reviews.reduce((sum, r) => sum + r.rating, 0);
      const ratingAvg = c.reviews.length ? Number((ratings / c.reviews.length).toFixed(1)) : 5.0;

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        thumbnail: c.thumbnail,
        category: c.category?.name || 'General',
        instructorName: c.instructor?.name || 'Faculty',
        price: c.price,
        status: c.status,
        revenue: Math.round(rev),
        enrollments: c._count.enrollments,
        rating: ratingAvg,
        reviewsCount: c._count.reviews
      };
    });

    // Recent Activity / Audit Stream
    const auditLogs = await prisma.auditLog.findMany({
      where: tenantFilter,
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      organization: {
        id: user.organizationId,
        name: user.organizationName,
        plan: user.plan
      },
      range,
      metrics: {
        grossRevenue: Number(grossRevenue.toFixed(2)),
        allTimeGrossRevenue: Number(allTimeGrossRevenue.toFixed(2)),
        netRevenue: Number(netRevenue.toFixed(2)),
        totalRevenue: Number(allTimeGrossRevenue.toFixed(2)),
        revenueThisMonth: Number(grossRevenue.toFixed(2)),
        discountsGiven: Number(discountsGiven.toFixed(2)),
        refundedAmount: Number(refundedAmount.toFixed(2)),
        refundsCount,
        taxesCollected: Number(taxesCollected.toFixed(2)),
        paymentFees: estimatedPaymentFees,
        averageOrderValue,
        totalStudents,
        newStudentsPeriod,
        activeLearners: totalStudents,
        totalInstructors,
        totalCourses,
        totalProducts,
        publishedCourses,
        draftCourses,
        archivedCourses: 0,
        totalEnrollments,
        periodEnrollments,
        completedEnrollments,
        totalCertificates,
        totalOrders: allOrders.length,
        completedPaymentsCount,
        pendingPaymentsCount: pendingOrders._count.id || 0,
        activeSubscriptions: activeSubsCount,
        avgRating,
        totalReviews
      },
      monthlyRevenueChart,
      recentOrders: allOrders.slice(0, 10).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber || o.id,
        transactionId: o.transactionId || o.orderNumber,
        studentId: o.user.id,
        studentName: o.user.name,
        studentEmail: o.user.email,
        studentAvatar: o.user.avatar,
        courseId: o.course?.id || o.items[0]?.productId || '',
        courseTitle: o.items[0]?.productTitle || o.course?.title || 'Product Order',
        amount: o.total || o.amount,
        currency: o.currency,
        provider: o.provider,
        status: o.status,
        date: o.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        rawDate: o.createdAt
      })),
      coursePerformance,
      auditLogs
    });
  } catch (err: any) {
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 500 });
  }
}
