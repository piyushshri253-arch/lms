import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'students'; // students, courses, orders, certificates

    let csvContent = '';
    let filename = '';

    if (type === 'students') {
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        include: { enrollments: true, orders: true, certificates: true }
      });

      const header = 'ID,Name,Email,Suspended,EnrollmentsCount,OrdersCount,CertificatesCount,CreatedAt\n';
      const rows = students
        .map(
          (s) =>
            `"${s.id}","${s.name}","${s.email}",${s.isSuspended},${s.enrollments.length},${s.orders.length},${s.certificates.length},"${s.createdAt.toISOString()}"`
        )
        .join('\n');

      csvContent = header + rows;
      filename = `students-export-${Date.now()}.csv`;
    } else if (type === 'courses') {
      const courses = await prisma.course.findMany({
        include: { instructor: true, category: true, enrollments: true }
      });

      const header = 'ID,Title,Slug,Category,Instructor,Price,Status,EnrollmentsCount,CreatedAt\n';
      const rows = courses
        .map(
          (c) =>
            `"${c.id}","${c.title}","${c.slug}","${c.category.name}","${c.instructor.name}",${c.price},"${c.status}",${c.enrollments.length},"${c.createdAt.toISOString()}"`
        )
        .join('\n');

      csvContent = header + rows;
      filename = `courses-export-${Date.now()}.csv`;
    } else if (type === 'orders') {
      const orders = await prisma.order.findMany({
        include: { user: true, course: true }
      });

      const header = 'TransactionID,StudentName,StudentEmail,CourseTitle,Amount,Currency,Provider,Status,Date\n';
      const rows = orders
        .map(
          (o) =>
            `"${o.transactionId || o.orderNumber}","${o.user.name}","${o.user.email}","${o.course?.title || 'Product Order'}",${o.total || o.amount},"${o.currency}","${o.provider}","${o.status}","${o.createdAt.toISOString()}"`
        )
        .join('\n');

      csvContent = header + rows;
      filename = `orders-export-${Date.now()}.csv`;
    } else if (type === 'certificates') {
      const certs = await prisma.certificate.findMany({
        include: { user: true, course: true }
      });

      const header = 'CertificateNumber,StudentName,StudentEmail,CourseTitle,IssuedAt\n';
      const rows = certs
        .map(
          (c) =>
            `"${c.certificateNumber}","${c.user.name}","${c.user.email}","${c.course.title}","${c.issuedAt.toISOString()}"`
        )
        .join('\n');

      csvContent = header + rows;
      filename = `certificates-export-${Date.now()}.csv`;
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
