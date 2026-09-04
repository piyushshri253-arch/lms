import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, getCurrentUser, validateTenantOwnership, enforceTenantPlanLimits } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('org');
    const type = searchParams.get('type');
    const currentUser = await getCurrentUser();

    const where: any = {};

    if (orgSlug) {
      const targetOrg = await prisma.organization.findUnique({ where: { slug: orgSlug } });
      if (targetOrg) where.organizationId = targetOrg.id;
    } else if (currentUser?.organizationId && currentUser.role !== 'SUPER_ADMIN') {
      where.organizationId = currentUser.organizationId;
    }

    if (type) {
      where.type = type;
    }

    if (!currentUser || currentUser.role === 'STUDENT') {
      where.status = 'ACTIVE';
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
                price: true,
                durationHours: true
              }
            }
          }
        },
        pricings: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'asc' }
        },
        _count: {
          select: { orderItems: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const body = await request.json();

    const {
      name,
      description,
      type = 'COURSE', // COURSE, BUNDLE, SUBSCRIPTION, DIGITAL_DOWNLOAD, COACHING
      thumbnail,
      courseIds = [], // Array of Course IDs linked to this product
      pricings = []   // Array of { name, type: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION' | 'INSTALLMENT', price, currency, billingInterval, trialDays, accessDays }
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }

    const orgId = user.organizationId;
    if (!orgId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot create product without an assigned organization.' }, { status: 403 });
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Create product with linked courses and pricing tiers in transaction
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          organizationId: orgId,
          name: name.trim(),
          slug,
          description: description?.trim() || null,
          type,
          thumbnail: thumbnail || null,
          status: 'ACTIVE'
        }
      });

      // Link courses
      if (Array.isArray(courseIds) && courseIds.length > 0) {
        for (const cId of courseIds) {
          await tx.productCourse.create({
            data: {
              productId: newProduct.id,
              courseId: cId
            }
          });
        }
      }

      // Create pricing tiers
      if (Array.isArray(pricings) && pricings.length > 0) {
        for (let idx = 0; idx < pricings.length; idx++) {
          const p = pricings[idx];
          await tx.productPricing.create({
            data: {
              productId: newProduct.id,
              name: p.name || (p.type === 'FREE' ? 'Free Access' : 'Full Lifetime Access'),
              type: p.type || 'ONE_TIME',
              price: Number(p.price) || 0.0,
              currency: p.currency || 'INR',
              billingInterval: p.billingInterval || null,
              trialDays: p.trialDays ? Number(p.trialDays) : 0,
              accessDays: p.accessDays ? Number(p.accessDays) : null,
              isDefault: idx === 0
            }
          });
        }
      } else {
        // Create default one-time pricing
        await tx.productPricing.create({
          data: {
            productId: newProduct.id,
            name: 'Lifetime Access',
            type: 'ONE_TIME',
            price: Number(body.price) || 0.0,
            currency: body.currency || 'INR',
            isDefault: true
          }
        });
      }

      return newProduct;
    });

    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        courses: { include: { course: true } },
        pricings: true
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product.id,
      description: `Product "${product.name}" created with ${pricings.length || 1} pricing tier(s).`,
      req: request
    });

    return NextResponse.json({
      success: true,
      message: 'Product created successfully.',
      product: fullProduct
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create product' }, { status: 500 });
  }
}
