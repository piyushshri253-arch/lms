import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    const certs = await prisma.certificate.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            instructor: { select: { name: true, avatar: true } },
            category: { select: { name: true } }
          }
        },
        user: { select: { name: true, email: true } }
      },
      orderBy: { issuedAt: 'desc' }
    });

    return NextResponse.json({
      certificates: certs.map((c) => ({
        id: c.id,
        certificateNumber: c.certificateNumber,
        issuedAt: c.issuedAt.toISOString().split('T')[0],
        course: {
          id: c.course.id,
          slug: c.course.slug,
          title: c.course.title,
          thumbnail: c.course.thumbnail,
          category: c.course.category.name,
          instructor: c.course.instructor
        },
        studentName: c.user.name,
        verificationUrl: `/certificate/${c.certificateNumber}`
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
