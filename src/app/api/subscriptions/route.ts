import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            courses: {
              include: {
                course: { select: { id: true, title: true, slug: true, thumbnail: true } }
              }
            }
          }
        },
        pricing: true,
        organization: { select: { name: true, slug: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ subscriptions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { productId, pricingId, provider = 'RAZORPAY' } = body;

    if (!productId || !pricingId) {
      return NextResponse.json({ error: 'productId and pricingId are required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        pricings: true,
        courses: { include: { course: true } }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const pricing = product.pricings.find((p) => p.id === pricingId);
    if (!pricing) {
      return NextResponse.json({ error: 'Pricing tier not found' }, { status: 404 });
    }

    // Tenant Isolation Check
    if (product.organizationId && !validateTenantOwnership(product.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (pricing.billingInterval === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const sub = await prisma.$transaction(async (tx) => {
      const newSub = await tx.subscription.create({
        data: {
          organizationId: product.organizationId,
          userId: user.id,
          productId: product.id,
          pricingId: pricing.id,
          provider: provider.toUpperCase(),
          providerSubscriptionId: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false
        }
      });

      // Activate Enrollments
      for (const pc of product.courses) {
        await tx.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: pc.courseId
            }
          },
          create: {
            organizationId: product.organizationId,
            userId: user.id,
            courseId: pc.courseId,
            status: 'ACTIVE'
          },
          update: { status: 'ACTIVE' }
        });
      }

      return newSub;
    });

    await createAuditLog({
      organizationId: product.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'SUBSCRIPTION_CREATED',
      entity: 'Subscription',
      entityId: sub.id,
      description: `Student "${user.name}" started subscription for "${product.name}" (${pricing.name}).`,
      req: request
    });

    return NextResponse.json({
      success: true,
      subscription: sub,
      message: 'Subscription created and courses activated!'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Subscription creation failed' }, { status: 500 });
  }
}
