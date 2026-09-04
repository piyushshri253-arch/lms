import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('organizationId') || user.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const paths = await prisma.learningPath.findMany({
      where: { organizationId: orgId },
      include: {
        courses: {
          include: {
            course: {
              select: { id: true, title: true, slug: true, thumbnail: true, price: true }
            }
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ paths });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const body = await request.json();
    const {
      title,
      slug,
      description,
      isSequential = true,
      courseIds = [],
      organizationId: targetOrgId
    } = body;

    const orgId = targetOrgId || user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    const path = await prisma.learningPath.create({
      data: {
        organizationId: orgId,
        title,
        slug,
        description,
        isSequential,
        courses: {
          create: courseIds.map((courseId: string, index: number) => ({
            courseId,
            order: index + 1,
            isRequired: true
          }))
        }
      },
      include: {
        courses: {
          include: { course: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'LEARNING_PATH_CREATED',
      entity: 'LearningPath',
      entityId: path.id,
      description: `Learning path "${title}" created with ${courseIds.length} sequential courses.`,
      req: request
    });

    return NextResponse.json({ success: true, path });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
