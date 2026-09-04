import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true, thumbnail: true } }
          }
        },
        course: {
          select: { id: true, slug: true, title: true, thumbnail: true, price: true }
        },
        organization: {
          select: { name: true, logo: true, slug: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapped = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      invoiceNumber: o.invoiceNumber,
      amount: o.total || o.amount,
      subtotal: o.subtotal,
      discount: o.discount,
      tax: o.tax,
      total: o.total,
      currency: o.currency,
      provider: o.provider,
      status: o.status,
      couponCode: o.couponCode,
      discountAmount: o.discountAmount,
      createdAt: o.createdAt.toISOString().split('T')[0],
      createdAtFull: o.createdAt,
      organizationName: o.organization?.name || 'Academy',
      items: o.items.map((it) => ({
        id: it.id,
        productTitle: it.productTitle,
        pricingName: it.pricingName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice
      })),
      course: o.course
    }));

    return NextResponse.json({ orders: mapped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
