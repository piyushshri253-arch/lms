import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { cancelImmediately = false } = body;

    const subscription = await prisma.subscription.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          { organization: { users: { some: { id: user.id, role: { in: ['ADMIN', 'SUPER_ADMIN'] } } } } }
        ]
      },
      include: {
        product: {
          include: { courses: true }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found or unauthorized' }, { status: 404 });
    }

    if (cancelImmediately) {
      // Immediate cancellation
      const updated = await prisma.$transaction(async (tx) => {
        const sub = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelAtPeriodEnd: false
          }
        });

        // Revoke enrollments
        for (const pc of subscription.product.courses) {
          await tx.enrollment.updateMany({
            where: {
              userId: subscription.userId,
              courseId: pc.courseId
            },
            data: { status: 'CANCELLED' }
          });
        }

        return sub;
      });

      await createAuditLog({
        organizationId: subscription.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'SUBSCRIPTION_CANCELLED_IMMEDIATELY',
        entity: 'Subscription',
        entityId: subscription.id,
        description: `Subscription for "${subscription.product.name}" was cancelled immediately.`,
        req: request
      });

      return NextResponse.json({
        success: true,
        subscription: updated,
        message: 'Subscription cancelled immediately. Course access has been revoked.'
      });
    } else {
      // Cancel at period end
      const updated = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: new Date()
        }
      });

      await createAuditLog({
        organizationId: subscription.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'SUBSCRIPTION_CANCELLED_AT_PERIOD_END',
        entity: 'Subscription',
        entityId: subscription.id,
        description: `Subscription for "${subscription.product.name}" scheduled to cancel on ${subscription.currentPeriodEnd.toISOString().split('T')[0]}.`,
        req: request
      });

      return NextResponse.json({
        success: true,
        subscription: updated,
        message: `Subscription will remain active until ${subscription.currentPeriodEnd.toLocaleDateString()}, after which it will not renew.`
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Cancellation failed' }, { status: 500 });
  }
}
