import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    await requireTenantRole(['SUPER_ADMIN']);

    const payouts = await prisma.sellerPayout.findMany({
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true, verifiedSeller: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });

    return NextResponse.json({ payouts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch payouts' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireTenantRole(['SUPER_ADMIN']);
    const body = await req.json();
    const { payoutId, status, referenceNumber, rejectionReason } = body;

    if (!payoutId || !status) {
      return NextResponse.json({ error: 'payoutId and status are required' }, { status: 400 });
    }

    const payout = await prisma.sellerPayout.findUnique({
      where: { id: payoutId },
      include: { wallet: true }
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout record not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedPayout = await tx.sellerPayout.update({
        where: { id: payoutId },
        data: {
          status,
          referenceNumber: referenceNumber || payout.referenceNumber,
          rejectionReason: rejectionReason || null,
          processedAt: status === 'COMPLETED' || status === 'REJECTED' ? new Date() : payout.processedAt
        }
      });

      if (status === 'COMPLETED') {
        // Move from pending to paidOut
        await tx.wallet.update({
          where: { id: payout.walletId },
          data: {
            pendingBalance: { decrement: payout.amount },
            paidOutBalance: { increment: payout.amount }
          }
        });
      } else if (status === 'REJECTED') {
        // Refund from pending back to available
        await tx.wallet.update({
          where: { id: payout.walletId },
          data: {
            pendingBalance: { decrement: payout.amount },
            availableBalance: { increment: payout.amount }
          }
        });
      }

      return updatedPayout;
    });

    await logAudit({
      organizationId: payout.organizationId,
      adminId: user.id,
      adminEmail: user.email,
      action: 'PAYOUT_STATUS_CHANGED',
      entity: 'SellerPayout',
      entityId: payout.id,
      description: `Super Admin changed payout #${payout.id} status to ${status}`
    });

    return NextResponse.json({ success: true, payout: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update payout status' }, { status: 500 });
  }
}
