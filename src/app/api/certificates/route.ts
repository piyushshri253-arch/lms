import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const certificates = await prisma.certificate.findMany({
      where: { userId: user.id },
      include: {
        organization: { select: { name: true, logo: true, slug: true } },
        course: {
          include: {
            instructor: { select: { name: true, avatar: true } }
          }
        }
      },
      orderBy: { issuedAt: 'desc' }
    });

    const mapped = certificates.map((cert) => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      status: cert.status,
      issuedAt: cert.issuedAt,
      courseId: cert.courseId,
      courseTitle: cert.course.title,
      courseSlug: cert.course.slug,
      instructorName: cert.course.instructor.name,
      organizationName: cert.organization?.name || 'Academy',
      url: `/certificate/${cert.certificateNumber}`
    }));

    return NextResponse.json({ certificates: mapped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch certificates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required.' }, { status: 400 });
    }

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }]
      },
      include: {
        instructor: { select: { name: true } }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const certificateNumber = `MT-${year}-${randomHex}`;

    const cert = await prisma.certificate.upsert({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id
        }
      },
      create: {
        organizationId: course.organizationId,
        userId: user.id,
        courseId: course.id,
        certificateNumber,
        status: 'VALID',
        certificateUrl: `/certificate/${certificateNumber}`,
        metadata: JSON.stringify({
          studentName: user.name,
          courseTitle: course.title,
          issuedAt: new Date().toISOString()
        })
      },
      update: {
        status: 'VALID'
      }
    });

    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'CERTIFICATE_GENERATED',
      entity: 'Certificate',
      entityId: cert.id,
      description: `Certificate ${cert.certificateNumber} generated for student "${user.name}" in course "${course.title}".`
    });

    return NextResponse.json({
      certificate: {
        id: cert.id,
        certificateNumber: cert.certificateNumber,
        userName: user.name,
        courseTitle: course.title,
        instructorName: course.instructor.name,
        url: `/certificate/${cert.certificateNumber}`,
        issueDate: cert.issuedAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      },
      success: true
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
