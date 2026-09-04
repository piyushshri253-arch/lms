import { prisma } from './prisma';

/**
 * Credits the seller wallet when an order is verified and completed.
 * Automatically computes platform commission and net seller revenue.
 */
export async function creditSellerWallet(params: {
  organizationId: string;
  orderId: string;
  orderTotal: number;
  currency?: string;
}) {
  const { organizationId, orderId, orderTotal, currency = 'INR' } = params;

  // 1. Fetch organization commission rate
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { commissionRate: true, name: true }
  });

  const commissionRate = org?.commissionRate !== undefined ? org.commissionRate : 10.0;
  const platformFee = Math.round((orderTotal * (commissionRate / 100)) * 100) / 100;
  const sellerAmount = Math.max(0, Math.round((orderTotal - platformFee) * 100) / 100);

  // 2. Update Order with fee split
  await prisma.order.update({
    where: { id: orderId },
    data: {
      platformFee,
      sellerAmount
    }
  });

  // 3. Upsert Wallet record
  const wallet = await prisma.wallet.upsert({
    where: { organizationId },
    create: {
      organizationId,
      totalSales: orderTotal,
      platformFees: platformFee,
      totalRefunds: 0.0,
      availableBalance: sellerAmount,
      pendingBalance: 0.0,
      paidOutBalance: 0.0,
      currency
    },
    update: {
      totalSales: { increment: orderTotal },
      platformFees: { increment: platformFee },
      availableBalance: { increment: sellerAmount }
    }
  });

  return {
    orderTotal,
    platformFee,
    sellerAmount,
    commissionRate,
    wallet
  };
}

/**
 * Fetches the seller wallet and financial overview for an organization
 */
export async function getSellerWalletSummary(organizationId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { organizationId },
    include: {
      payouts: {
        orderBy: { requestedAt: 'desc' },
        take: 20
      }
    }
  });

  if (!wallet) {
    return {
      totalSales: 0.0,
      platformFees: 0.0,
      totalRefunds: 0.0,
      availableBalance: 0.0,
      pendingBalance: 0.0,
      paidOutBalance: 0.0,
      currency: 'INR',
      payouts: []
    };
  }

  return wallet;
}

export interface RequestPayoutInput {
  organizationId: string;
  amount: number;
  payoutMethod: 'BANK_TRANSFER' | 'UPI' | 'STRIPE_CONNECT';
  payoutDetails: Record<string, any>;
}

/**
 * Submits a payout request for a seller
 */
export async function requestSellerPayout(input: RequestPayoutInput) {
  const wallet = await prisma.wallet.findUnique({
    where: { organizationId: input.organizationId }
  });

  if (!wallet) {
    return { success: false, error: 'Wallet not initialized for this organization.' };
  }

  if (input.amount <= 0) {
    return { success: false, error: 'Payout amount must be greater than zero.' };
  }

  if (input.amount > wallet.availableBalance) {
    return {
      success: false,
      error: `Insufficient available balance. You have ₹${wallet.availableBalance.toFixed(2)} available.`
    };
  }

  // Deduct from available and add to pending in transaction
  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { organizationId: input.organizationId },
      data: {
        availableBalance: { decrement: input.amount },
        pendingBalance: { increment: input.amount }
      }
    });

    const payout = await tx.sellerPayout.create({
      data: {
        organizationId: input.organizationId,
        walletId: wallet.id,
        amount: input.amount,
        currency: wallet.currency,
        payoutMethod: input.payoutMethod,
        payoutDetails: JSON.stringify(input.payoutDetails),
        status: 'PENDING',
        requestedAt: new Date()
      }
    });

    return { updatedWallet, payout };
  });

  return {
    success: true,
    message: 'Payout request submitted successfully. Super Admin will review and process.',
    payout: result.payout,
    wallet: result.updatedWallet
  };
}
