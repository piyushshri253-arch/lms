import { prisma } from '@/lib/prisma';
import { calculateInstructorPayout, PayoutBreakdown } from '@/lib/payout-calculator';

export interface DateFilter {
  range?: '7d' | '30d' | '90d' | '1y' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
}

export function getDateFilterWhere(filter?: DateFilter) {
  if (!filter || !filter.range || filter.range === 'all') {
    return {};
  }

  const now = new Date();
  let start: Date | null = null;
  let end: Date = now;

  switch (filter.range) {
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      if (filter.startDate) {
        start = new Date(filter.startDate);
      }
      if (filter.endDate) {
        end = new Date(filter.endDate);
        // Include full day of end date
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  if (start) {
    return {
      createdAt: {
        gte: start,
        lte: end
      }
    };
  }

  return {};
}

export function formatINR(amount: number | null | undefined): string {
  const val = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(val);
}

export function maskAccountNumber(acc?: string | null): string {
  if (!acc) return '•••• •••• ••••';
  const clean = String(acc).trim();
  if (clean.length <= 4) return clean;
  return `•••• •••• ${clean.slice(-4)}`;
}

export function maskPan(pan?: string | null): string {
  if (!pan) return '••••• ••••';
  const clean = String(pan).trim().toUpperCase();
  if (clean.length < 6) return clean;
  return `${clean.slice(0, 3)}•••${clean.slice(-2)}`;
}

/**
 * Creates an immutable ledger entry.
 */
export async function createLedgerEntry(data: {
  type: 'COURSE_SALE' | 'INSTRUCTOR_PAYOUT' | 'REFUND' | 'TDS_DEDUCTION' | 'GST_ENTRY' | 'GATEWAY_CHARGE' | 'ADJUSTMENT';
  orderId?: string | null;
  payoutId?: string | null;
  refundId?: string | null;
  userId?: string | null;
  instructorId?: string | null;
  courseId?: string | null;
  debit?: number;
  credit?: number;
  balance?: number;
  currency?: string;
  description: string;
  referenceId?: string | null;
  paymentMethod?: string;
  status?: string;
  metadata?: any;
}) {
  const count = await prisma.financialLedgerEntry.count();
  const entryNumber = `FLE-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  return await prisma.financialLedgerEntry.create({
    data: {
      entryNumber,
      type: data.type,
      orderId: data.orderId || null,
      payoutId: data.payoutId || null,
      refundId: data.refundId || null,
      userId: data.userId || null,
      instructorId: data.instructorId || null,
      courseId: data.courseId || null,
      debit: data.debit || 0.0,
      credit: data.credit || 0.0,
      balance: data.balance || 0.0,
      currency: data.currency || 'INR',
      description: data.description,
      referenceId: data.referenceId || null,
      paymentMethod: data.paymentMethod || 'RAZORPAY',
      status: data.status || 'COMPLETED',
      metadata: data.metadata ? JSON.stringify(data.metadata) : null
    }
  });
}

/**
 * Sync initial ledger entries from existing successful orders and transactions if ledger is empty.
 */
export async function ensureLedgerInitialized() {
  const count = await prisma.financialLedgerEntry.count();
  if (count > 0) return;

  const orders = await prisma.order.findMany({
    where: { status: 'PAID' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, instructorId: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  let runningBalance = 0;

  for (const o of orders) {
    const total = o.total || o.amount;
    const basePrice = o.subtotal || o.amount / 1.18;
    const calc = calculateInstructorPayout(basePrice);

    runningBalance += total;

    // 1. Student payment credit
    await prisma.financialLedgerEntry.create({
      data: {
        entryNumber: `FLE-${new Date(o.createdAt).getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        type: 'COURSE_SALE',
        orderId: o.id,
        userId: o.userId,
        instructorId: o.course?.instructorId || null,
        courseId: o.courseId,
        credit: total,
        debit: 0,
        balance: runningBalance,
        description: `Course sale: ${o.course?.title || 'Order ' + o.orderNumber} purchased by ${o.user?.name || o.user?.email}`,
        referenceId: o.transactionId || o.providerPaymentId || o.orderNumber,
        paymentMethod: o.provider || 'RAZORPAY',
        status: 'COMPLETED',
        createdAt: o.createdAt
      }
    });

    // 2. Gateway fee deduction
    runningBalance -= calc.gtfAmount;
    await prisma.financialLedgerEntry.create({
      data: {
        entryNumber: `FLE-${new Date(o.createdAt).getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        type: 'GATEWAY_CHARGE',
        orderId: o.id,
        userId: o.userId,
        courseId: o.courseId,
        credit: 0,
        debit: calc.gtfAmount,
        balance: runningBalance,
        description: `Payment gateway fee (2% + GST) on order ${o.orderNumber || o.id}`,
        referenceId: o.providerPaymentId,
        paymentMethod: o.provider || 'RAZORPAY',
        status: 'COMPLETED',
        createdAt: new Date(new Date(o.createdAt).getTime() + 1000)
      }
    });

    // 3. GST entry
    await prisma.financialLedgerEntry.create({
      data: {
        entryNumber: `FLE-${new Date(o.createdAt).getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        type: 'GST_ENTRY',
        orderId: o.id,
        courseId: o.courseId,
        credit: calc.gstAmount,
        debit: 0,
        balance: runningBalance,
        description: `GST collected 18% on order ${o.orderNumber || o.id} (Taxable ₹${calc.basePrice})`,
        referenceId: o.invoiceNumber || o.orderNumber,
        paymentMethod: o.provider || 'RAZORPAY',
        status: 'COMPLETED',
        createdAt: new Date(new Date(o.createdAt).getTime() + 2000)
      }
    });

    // 4. TDS deduction entry
    if (o.course?.instructorId && calc.tdsAmount > 0) {
      await prisma.financialLedgerEntry.create({
        data: {
          entryNumber: `FLE-${new Date(o.createdAt).getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          type: 'TDS_DEDUCTION',
          orderId: o.id,
          instructorId: o.course.instructorId,
          courseId: o.courseId,
          credit: calc.tdsAmount,
          debit: 0,
          balance: runningBalance,
          description: `Govt TDS 2% deducted on instructor share (₹${calc.instructorGross}) for order ${o.orderNumber}`,
          referenceId: `TDS-${o.orderNumber}`,
          paymentMethod: 'INTERNAL_LEDGER',
          status: 'COMPLETED',
          createdAt: new Date(new Date(o.createdAt).getTime() + 3000)
        }
      });
    }
  }
}
