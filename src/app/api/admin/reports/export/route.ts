import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    const body = await request.json();

    const { reportType, format = 'CSV' } = body;

    const tenantFilter: any = {};
    if (user.role !== 'SUPER_ADMIN' && orgId) {
      tenantFilter.organizationId = orgId;
    }

    let records: any[] = [];
    let headers: string[] = [];

    if (reportType === 'REVENUE') {
      headers = ['Order Number', 'Date', 'Customer Name', 'Email', 'Product/Course', 'Amount', 'Discount', 'Status', 'Provider'];
      const orders = await prisma.order.findMany({
        where: tenantFilter,
        include: { user: true, course: true, items: true },
        orderBy: { createdAt: 'desc' }
      });
      records = orders.map((o) => [
        o.orderNumber || o.id,
        o.createdAt.toISOString(),
        o.user.name,
        o.user.email,
        o.course?.title || o.items[0]?.productTitle || 'Product',
        o.total || o.amount,
        o.discountAmount || 0,
        o.status,
        o.provider
      ]);
    } else if (reportType === 'STUDENTS') {
      headers = ['Student Name', 'Email', 'Joined Date', 'Status', 'Enrolled Courses', 'Completed Courses', 'Total Spent'];
      const students = await prisma.user.findMany({
        where: { ...tenantFilter, role: 'STUDENT' },
        include: {
          enrollments: true,
          certificates: true,
          orders: { where: { status: { in: ['PAID', 'SUCCESS'] } } }
        },
        orderBy: { createdAt: 'desc' }
      });
      records = students.map((s) => [
        s.name,
        s.email,
        s.createdAt.toISOString(),
        s.status,
        s.enrollments.length,
        s.certificates.length,
        s.orders.reduce((sum, o) => sum + (o.total || o.amount), 0)
      ]);
    } else if (reportType === 'COURSES') {
      headers = ['Course Title', 'Slug', 'Category', 'Price', 'Status', 'Enrollments', 'Completion Rate %'];
      const courses = await prisma.course.findMany({
        where: tenantFilter,
        include: { category: true, enrollments: true },
        orderBy: { createdAt: 'desc' }
      });
      records = courses.map((c) => {
        const comp = c.enrollments.filter((e) => e.status === 'COMPLETED').length;
        const rate = c.enrollments.length > 0 ? ((comp / c.enrollments.length) * 100).toFixed(1) : '0';
        return [
          c.title,
          c.slug,
          c.category?.name || 'General',
          c.price,
          c.status,
          c.enrollments.length,
          rate
        ];
      });
    } else if (reportType === 'CERTIFICATES') {
      headers = ['Certificate Number', 'Student Name', 'Student Email', 'Course Title', 'Issued Date', 'Status'];
      const certs = await prisma.certificate.findMany({
        where: tenantFilter,
        include: { user: true, course: true },
        orderBy: { issuedAt: 'desc' }
      });
      records = certs.map((c) => [
        c.certificateNumber,
        c.user.name,
        c.user.email,
        c.course.title,
        c.issuedAt.toISOString(),
        c.status
      ]);
    } else {
      // Default Generic
      headers = ['ID', 'Date', 'Type'];
      records = [[user.id, new Date().toISOString(), reportType]];
    }

    if (format === 'CSV') {
      const csvRows = [
        headers.join(','),
        ...records.map((r) => r.map((field: any) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ];
      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType.toLowerCase()}_report_${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({
      reportType,
      headers,
      records,
      count: records.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
