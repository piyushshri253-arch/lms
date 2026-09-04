import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';

    const where: any = {};
    if (q) {
      where.OR = [
        { certificateNumber: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { course: { title: { contains: q } } }
      ];
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            instructor: { select: { name: true } }
          }
        }
      },
      orderBy: { issuedAt: 'desc' }
    });

    const formatted = certificates.map((c) => ({
      id: c.id,
      certificateNumber: c.certificateNumber,
      issuedAt: c.issuedAt.toISOString().split('T')[0],
      user: c.user,
      course: c.course
    }));

    return NextResponse.json({ certificates: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { userId, courseId } = body;

    if (!userId || !courseId) {
      return NextResponse.json({ error: 'userId and courseId are required' }, { status: 400 });
    }

    const [user, course] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.course.findUnique({ where: { id: courseId } })
    ]);

    if (!user || !course) {
      return NextResponse.json({ error: 'User or course not found' }, { status: 404 });
    }

    const certificateNumber = `MT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const cert = await prisma.certificate.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: {
        userId,
        courseId,
        certificateNumber
      },
      update: {
        certificateNumber,
        issuedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'GENERATE_CERTIFICATE',
        entity: 'Certificate',
        entityId: cert.id,
        description: `Super Admin issued accredited certificate #${cert.certificateNumber} to ${user.name} for "${course.title}".`
      }
    });

    return NextResponse.json({
      message: `Certificate #${cert.certificateNumber} generated successfully.`,
      certificate: cert
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Certificate ID is required' }, { status: 400 });
    }

    const cert = await prisma.certificate.findUnique({ where: { id } });
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    await prisma.certificate.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REVOKE_CERTIFICATE',
        entity: 'Certificate',
        entityId: id,
        description: `Super Admin revoked diploma #${cert.certificateNumber}.`
      }
    });

    return NextResponse.json({ message: `Certificate #${cert.certificateNumber} revoked.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
