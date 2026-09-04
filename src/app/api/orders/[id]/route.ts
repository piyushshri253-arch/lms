import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, validateTenantOwnership } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderNumber: id },
          { invoiceNumber: id }
        ]
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true, logo: true, slug: true, primaryColor: true }
        },
        payments: true,
        refunds: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Access control: customer who bought it OR admin of the organization OR super admin
    const isOwner = order.userId === user.id;
    const isAdmin = user.role === 'SUPER_ADMIN' || (user.role === 'ADMIN' && validateTenantOwnership(order.organizationId, user));

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
