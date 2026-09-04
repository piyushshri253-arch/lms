import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }]
      },
      include: {
        courses: {
          include: {
            course: {
              include: {
                instructor: { select: { name: true, avatar: true } },
                category: true,
                sections: {
                  include: {
                    lessons: { select: { id: true, title: true, type: true, duration: true, isFree: true, isPreview: true } }
                  }
                }
              }
            }
          }
        },
        pricings: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'asc' }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { id } = await params;
    const body = await request.json();

    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { pricings: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!validateTenantOwnership(product.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden: Cannot edit product outside your organization.' }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: product.id },
        data: {
          name: body.name !== undefined ? body.name.trim() : undefined,
          description: body.description !== undefined ? body.description : undefined,
          thumbnail: body.thumbnail !== undefined ? body.thumbnail : undefined,
          type: body.type !== undefined ? body.type : undefined,
          status: body.status !== undefined ? body.status : undefined
        }
      });

      // Update linked courses if provided
      if (Array.isArray(body.courseIds)) {
        await tx.productCourse.deleteMany({ where: { productId: product.id } });
        for (const cId of body.courseIds) {
          await tx.productCourse.create({
            data: { productId: product.id, courseId: cId }
          });
        }
      }

      // Update pricing tiers if provided
      if (Array.isArray(body.pricings)) {
        await tx.productPricing.deleteMany({ where: { productId: product.id } });
        for (let idx = 0; idx < body.pricings.length; idx++) {
          const pr = body.pricings[idx];
          await tx.productPricing.create({
            data: {
              productId: product.id,
              name: pr.name || 'Lifetime Access',
              type: pr.type || 'ONE_TIME',
              price: Number(pr.price) || 0.0,
              currency: pr.currency || 'INR',
              billingInterval: pr.billingInterval || null,
              trialDays: pr.trialDays ? Number(pr.trialDays) : 0,
              accessDays: pr.accessDays ? Number(pr.accessDays) : null,
              isDefault: idx === 0
            }
          });
        }
      }

      return p;
    });

    await createAuditLog({
      organizationId: product.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: product.id,
      description: `Product "${product.name}" updated.`,
      req: request
    });

    return NextResponse.json({ success: true, message: 'Product updated successfully.', product: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!validateTenantOwnership(product.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.product.delete({ where: { id: product.id } });

    await createAuditLog({
      organizationId: product.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'PRODUCT_DELETED',
      entity: 'Product',
      entityId: product.id,
      description: `Product "${product.name}" deleted.`,
      req: request
    });

    return NextResponse.json({ success: true, message: 'Product deleted.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
