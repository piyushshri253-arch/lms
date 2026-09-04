import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [{ id }, { certificateNumber: id }, { courseId: id }]
      },
      include: {
        user: { select: { name: true, email: true } },
        course: {
          include: {
            instructor: { select: { name: true } }
          }
        }
      }
    });

    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json({
      certificate: {
        id: cert.id,
        certificateNumber: cert.certificateNumber,
        userName: cert.user.name,
        userEmail: cert.user.email,
        courseTitle: cert.course.title,
        instructorName: cert.course.instructor.name,
        issuedAt: cert.issuedAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
