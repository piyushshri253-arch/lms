import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'INSTRUCTOR', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');

    const where: any = {};

    // Strict Tenant Isolation: Scope to organization
    if (user.role !== 'SUPER_ADMIN' && user.organizationId) {
      where.organizationId = user.organizationId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (provider && provider !== 'ALL') {
      where.provider = provider;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { invoiceNumber: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { course: { title: { contains: search } } }
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true, thumbnail: true, slug: true } },
        items: {
          include: {
            product: { select: { name: true } }
          }
        },
        refunds: true
      }
    });

    const mapped = orders.map((o) => {
      const primaryTitle = o.items[0]?.productTitle || o.course?.title || 'Course Package';
      const totalRefunded = o.refunds.reduce((acc, r) => acc + r.amount, 0);

      return {
        id: o.id,
        orderNumber: o.orderNumber || o.id,
        invoiceNumber: o.invoiceNumber,
        organizationId: o.organizationId,
        amount: o.total || o.amount,
        subtotal: o.subtotal,
        discount: o.discount,
        tax: o.tax,
        total: o.total,
        totalRefunded,
        currency: o.currency,
        provider: o.provider,
        status: o.status,
        couponCode: o.couponCode,
        discountAmount: o.discountAmount,
        createdAt: o.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        rawDate: o.createdAt,
        student: {
          id: o.user.id,
          name: o.user.name,
          email: o.user.email,
          avatar: o.user.avatar
        },
        course: o.course
          ? {
              id: o.course.id,
              title: o.course.title,
              thumbnail: o.course.thumbnail,
              slug: o.course.slug
            }
          : {
              id: o.items[0]?.productId || '',
              title: primaryTitle,
              thumbnail: '',
              slug: ''
            },
        items: o.items.map((it) => ({
          id: it.id,
          productTitle: it.productTitle,
          pricingName: it.pricingName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice
        }))
      };
    });

    return NextResponse.json({ orders: mapped });
  } catch (err: any) {
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 500 });
  }
}
