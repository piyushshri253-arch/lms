import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN', 'INSTRUCTOR']);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    const where: any = {};

    if (search) {
      where.OR = [
        { certificateNumber: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { course: { title: { contains: search } } }
      ];
    }

    const certificates = await prisma.certificate.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true, slug: true, thumbnail: true } }
      }
    });

    const mapped = certificates.map((c) => ({
      id: c.id,
      certificateNumber: c.certificateNumber,
      issuedAt: c.issuedAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      rawDate: c.issuedAt,
      student: {
        id: c.user.id,
        name: c.user.name,
        email: c.user.email,
        avatar: c.user.avatar
      },
      course: {
        id: c.course.id,
        title: c.course.title,
        slug: c.course.slug,
        thumbnail: c.course.thumbnail
      }
    }));

    return NextResponse.json({ certificates: mapped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole(['ADMIN', 'INSTRUCTOR']);
    const body = await request.json();
    const { userId, courseId } = body;

    if (!userId || !courseId) {
      return NextResponse.json({ error: 'User ID and Course ID are required' }, { status: 400 });
    }

    const code = `MT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const certificate = await prisma.certificate.upsert({
      where: {
        userId_courseId: { userId, courseId }
      },
      create: {
        userId,
        courseId,
        certificateNumber: code
      },
      update: {
        certificateNumber: code,
        issuedAt: new Date()
      },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'ISSUE_CERTIFICATE',
        entity: 'Certificate',
        entityId: certificate.id,
        description: `Admin issued certificate #${code} for ${certificate.user.name} in "${certificate.course.title}".`
      }
    });

    return NextResponse.json({
      certificate,
      message: `Issued certificate ${code} for ${certificate.user.name}.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireRole(['ADMIN']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Certificate ID is required' }, { status: 400 });
    }

    await prisma.certificate.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REVOKE_CERTIFICATE',
        entity: 'Certificate',
        entityId: id,
        description: `Admin revoked certificate ${id}.`
      }
    });

    return NextResponse.json({ message: 'Certificate revoked.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
