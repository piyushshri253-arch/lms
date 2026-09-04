import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    const status = searchParams.get('status') || 'ALL'; // ALL, SUCCESS, PENDING, FAILED, REFUNDED
    const provider = searchParams.get('provider') || 'ALL';

    const where: any = {};
    if (status !== 'ALL') where.status = status;
    if (provider !== 'ALL') where.provider = provider;
    if (q) {
      where.OR = [
        { transactionId: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { course: { title: { contains: q } } }
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true, slug: true, price: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = orders.map((o) => ({
      id: o.id,
      transactionId: o.transactionId,
      amount: o.amount,
      currency: o.currency,
      provider: o.provider,
      status: o.status,
      couponCode: o.couponCode,
      discountAmount: o.discountAmount,
      createdAt: o.createdAt.toISOString().split('T')[0],
      createdAtFull: o.createdAt.toLocaleString(),
      user: o.user,
      course: o.course
    }));

    return NextResponse.json({ orders: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
