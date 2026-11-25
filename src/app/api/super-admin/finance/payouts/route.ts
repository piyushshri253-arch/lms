import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLedgerEntry } from '@/lib/finance-service';
import { calculateInstructorPayout } from '@/lib/payout-calculator';

export async function GET(req: NextRequest) {
  try {
    await requireFinanceAdmin();

    const payouts = await prisma.instructorPayout.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true
          }
        },
        bankAccount: true
      },
      orderBy: { requestedAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      payouts
    });
  } catch (error: any) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payouts' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireFinanceAdmin();
    const body = await req.json();
    const { action, payoutId, instructorId, amount, referenceNumber, adminNotes, rejectionReason, paymentProofUrl } = body;

    if (action === 'INITIATE_PAYOUT') {
      if (!instructorId || !amount) {
        return NextResponse.json({ error: 'instructorId and amount are required' }, { status: 400 });
      }

      const instructor = await prisma.user.findUnique({
        where: { id: instructorId },
        include: { bankAccount: true }
      });

      if (!instructor) {
        return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
      }

      const payout = await prisma.instructorPayout.create({
        data: {
          userId: instructorId,
          bankAccountId: instructor.bankAccount?.id || null,
          amount: Number(amount),
          platformFee: 0,
          taxDeduction: 0,
          netAmount: Number(amount),
          currency: 'INR',
          payoutMethod: instructor.bankAccount?.accountNumber ? 'BANK_TRANSFER' : 'UPI',
          status: 'PENDING_APPROVAL',
          adminNotes: adminNotes || 'Payout request created by Super Admin'
        }
      });

      return NextResponse.json({ success: true, payout });
    }

    if (!payoutId) {
      return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });
    }

    const payout = await prisma.instructorPayout.findUnique({
      where: { id: payoutId },
      include: { user: true, bankAccount: true }
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout record not found' }, { status: 404 });
    }

    // CRITICAL SECURITY RULE: Do not allow administrator to approve their own payout request
    if (admin.id === payout.userId && (action === 'APPROVE' || action === 'RECORD_TRANSFER' || action === 'MARK_PAID')) {
      return NextResponse.json(
        { error: 'Security restriction: An administrator cannot approve or process their own payout request.' },
        { status: 403 }
      );
    }

    if (action === 'APPROVE') {
      const updated = await prisma.instructorPayout.update({
        where: { id: payoutId },
        data: {
          status: 'APPROVED',
          processedById: admin.id,
          processedByName: admin.name || 'Super Admin'
        }
      });
      return NextResponse.json({ success: true, payout: updated });
    }

    if (action === 'HOLD') {
      const updated = await prisma.instructorPayout.update({
        where: { id: payoutId },
        data: {
          status: 'ON_HOLD',
          adminNotes: adminNotes ? `${payout.adminNotes || ''} [Hold: ${adminNotes}]` : payout.adminNotes
        }
      });
      return NextResponse.json({ success: true, payout: updated });
    }

    if (action === 'REJECT') {
      const updated = await prisma.instructorPayout.update({
        where: { id: payoutId },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason || 'Payout rejected by administrator',
          processedById: admin.id,
          processedByName: admin.name || 'Super Admin',
          processedAt: new Date()
        }
      });
      return NextResponse.json({ success: true, payout: updated });
    }

    if (action === 'RECORD_TRANSFER' || action === 'MARK_PAID') {
      const ref = referenceNumber || `UTR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const updated = await prisma.instructorPayout.update({
        where: { id: payoutId },
        data: {
          status: 'PAID',
          referenceNumber: ref,
          adminNotes: adminNotes || payout.adminNotes,
          processedById: admin.id,
          processedByName: admin.name || 'Super Admin',
          processedAt: new Date()
        }
      });

      // Record in Financial Ledger
      await createLedgerEntry({
        type: 'INSTRUCTOR_PAYOUT',
        payoutId: payout.id,
        instructorId: payout.userId,
        debit: payout.netAmount,
        credit: 0,
        description: `Instructor payout of ${payout.currency} ${payout.netAmount} disbursed to ${payout.user.name || payout.user.email} (Ref: ${ref})`,
        referenceId: ref,
        paymentMethod: payout.payoutMethod,
        status: 'COMPLETED'
      });

      return NextResponse.json({
        success: true,
        message: 'Payout marked as paid and recorded in financial ledger',
        payout: updated
      });
    }

    return NextResponse.json({ error: 'Invalid payout action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling payout operation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payout operation failed' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}
