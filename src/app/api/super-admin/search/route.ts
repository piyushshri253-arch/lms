import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [students, admins, instructors, courses, orders, certificates, tickets] =
      await Promise.all([
        prisma.user.findMany({
          where: {
            role: 'STUDENT',
            OR: [{ name: { contains: q } }, { email: { contains: q } }]
          },
          select: { id: true, name: true, email: true },
          take: 5
        }),
        prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'SUPER_ADMIN'] },
            OR: [{ name: { contains: q } }, { email: { contains: q } }]
          },
          select: { id: true, name: true, email: true, role: true },
          take: 5
        }),
        prisma.user.findMany({
          where: {
            role: 'INSTRUCTOR',
            OR: [{ name: { contains: q } }, { email: { contains: q } }]
          },
          select: { id: true, name: true, email: true },
          take: 5
        }),
        prisma.course.findMany({
          where: {
            OR: [{ title: { contains: q } }, { slug: { contains: q } }]
          },
          select: { id: true, title: true, slug: true, price: true, status: true },
          take: 5
        }),
        prisma.order.findMany({
          where: {
            OR: [
              { transactionId: { contains: q } },
              { user: { name: { contains: q } } },
              { course: { title: { contains: q } } }
            ]
          },
          select: { id: true, transactionId: true, amount: true, status: true },
          take: 5
        }),
        prisma.certificate.findMany({
          where: {
            OR: [
              { certificateNumber: { contains: q } },
              { user: { name: { contains: q } } },
              { course: { title: { contains: q } } }
            ]
          },
          select: { id: true, certificateNumber: true, user: { select: { name: true } } },
          take: 5
        }),
        prisma.supportTicket.findMany({
          where: {
            OR: [{ ticketNumber: { contains: q } }, { subject: { contains: q } }]
          },
          select: { id: true, ticketNumber: true, subject: true, status: true },
          take: 5
        })
      ]);

    const results = [
      ...students.map((s) => ({
        type: 'Student',
        title: s.name,
        subtitle: s.email,
        url: `/super-admin/students?id=${s.id}`
      })),
      ...admins.map((a) => ({
        type: 'Administrator',
        title: a.name,
        subtitle: `${a.role} • ${a.email}`,
        url: `/super-admin/admins?id=${a.id}`
      })),
      ...instructors.map((i) => ({
        type: 'Instructor',
        title: i.name,
        subtitle: i.email,
        url: `/super-admin/instructors?id=${i.id}`
      })),
      ...courses.map((c) => ({
        type: 'Course',
        title: c.title,
        subtitle: `$${c.price} • ${c.status}`,
        url: `/super-admin/courses?id=${c.id}`
      })),
      ...orders.map((o) => ({
        type: 'Order / Transaction',
        title: `Txn #${o.transactionId}`,
        subtitle: `$${o.amount} • ${o.status}`,
        url: `/super-admin/orders?q=${o.transactionId}`
      })),
      ...certificates.map((cert) => ({
        type: 'Certificate',
        title: `Diploma #${cert.certificateNumber}`,
        subtitle: `Issued to ${cert.user.name}`,
        url: `/super-admin/certificates?q=${cert.certificateNumber}`
      })),
      ...tickets.map((t) => ({
        type: 'Support Ticket',
        title: `#${t.ticketNumber}: ${t.subject}`,
        subtitle: `Status: ${t.status}`,
        url: `/super-admin/support?id=${t.id}`
      }))
    ];

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
