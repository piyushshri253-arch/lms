import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { EmailService } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';

const MIN_PAYOUT_AMOUNT = 500;

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    if (session.role !== 'INSTRUCTOR' && session.role !== 'SUPER_ADMIN' && session.role !== 'LMS_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Reviewer / Auditor and non-instructor roles cannot access payouts.' },
        { status: 403 }
      );
    }

    const user: any = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        bankAccount: true,
        instructorPayouts: {
          orderBy: { requestedAt: 'desc' }
        },
        instructorTransactions: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const totalNetEarnings = user.instructorTransactions
      .filter((t: any) => t.type === 'COURSE_SALE' && t.status === 'PAID')
      .reduce((s: number, t: any) => s + Number(t.netAmount || 0), 0);

    const paidAmount = user.instructorPayouts
      .filter((p: any) => p.status === 'PAID')
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const pendingPayout = user.instructorPayouts
      .filter((p: any) => ['REQUESTED', 'PENDING', 'APPROVED', 'PROCESSING'].includes(p.status))
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const availableBalance = Math.max(0, totalNetEarnings - paidAmount - pendingPayout);

    const eligibility = {
      isAccountActive: user.status === 'ACTIVE' && !user.isSuspended,
      isEmailVerified: Boolean(user.emailVerified),
      isBankVerified: user.bankAccount?.status === 'VERIFIED',
      hasMinimumBalance: availableBalance >= MIN_PAYOUT_AMOUNT,
      minimumPayoutAmount: MIN_PAYOUT_AMOUNT
    };

    return NextResponse.json({
      success: true,
      availableBalance,
      paidAmount,
      pendingPayout,
      totalNetEarnings,
      eligibility,
      bankAccount: user.bankAccount
        ? {
            id: user.bankAccount.id,
            bankName: user.bankAccount.bankName,
            accountHolderName: user.bankAccount.accountHolderName,
            accountNumberMasked: user.bankAccount.accountNumberMasked,
            ifscCode: user.bankAccount.ifscCode,
            status: user.bankAccount.status,
            rejectionReason: user.bankAccount.rejectionReason
          }
        : { status: 'NOT_ADDED' },
      payouts: user.instructorPayouts
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load payouts.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    if (session.role !== 'INSTRUCTOR') {
      return NextResponse.json(
        { error: 'Forbidden: Only verified Instructors can request payouts.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const requestedAmount = Number(body.amount || 0);
    const payoutMethod = body.payoutMethod === 'UPI' ? 'UPI' : 'BANK_TRANSFER';

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        bankAccount: true,
        instructorPayouts: true,
        instructorTransactions: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Instructor account not found.' }, { status: 404 });
    }

    // 1. Account Status check
    if (user.status !== 'ACTIVE' || user.isSuspended) {
      return NextResponse.json(
        { error: 'Your Instructor account must be ACTIVE to request a payout.' },
        { status: 403 }
      );
    }

    // 2. Email Verification check
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Your email address must be verified via OTP before requesting a payout.' },
        { status: 403 }
      );
    }

    // 3. Verified Bank Account check
    if (!user.bankAccount || user.bankAccount.status !== 'VERIFIED') {
      return NextResponse.json(
        {
          error:
            'A Verified Bank Account is mandatory before requesting payouts. Please ensure your bank details are verified by an Administrator.'
        },
        { status: 400 }
      );
    }

    // 4. Available Balance check
    const totalNetEarnings = user.instructorTransactions
      .filter((t: any) => t.type === 'COURSE_SALE' && t.status === 'PAID')
      .reduce((s: number, t: any) => s + Number(t.netAmount || 0), 0);

    const paidAmount = user.instructorPayouts
      .filter((p: any) => p.status === 'PAID')
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const pendingPayout = user.instructorPayouts
      .filter((p: any) => ['REQUESTED', 'PENDING', 'APPROVED', 'PROCESSING'].includes(p.status))
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const availableBalance = Math.max(0, totalNetEarnings - paidAmount - pendingPayout);

    if (requestedAmount < MIN_PAYOUT_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum payout request amount is ₹${MIN_PAYOUT_AMOUNT}.` },
        { status: 400 }
      );
    }

    if (requestedAmount > availableBalance) {
      return NextResponse.json(
        {
          error: `Requested amount (₹${requestedAmount.toLocaleString('en-IN')}) exceeds your available balance (₹${availableBalance.toLocaleString('en-IN')}).`
        },
        { status: 400 }
      );
    }

    const payout = await prisma.instructorPayout.create({
      data: {
        userId: user.id,
        bankAccountId: user.bankAccount.id,
        amount: requestedAmount,
        platformFee: 0,
        taxDeduction: 0,
        netAmount: requestedAmount,
        payoutMethod,
        status: 'REQUESTED'
      }
    });

    await EmailService.sendPayoutNotification(
      'PAYOUT_REQUESTED',
      { id: user.id, name: user.name, email: user.email },
      { amount: payout.amount, netAmount: payout.netAmount, status: 'REQUESTED' }
    ).catch(() => {});

    await createAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: 'INSTRUCTOR_REQUESTED_PAYOUT',
      entity: 'InstructorPayout',
      entityId: payout.id,
      description: `Instructor "${user.name}" requested a payout of ₹${requestedAmount.toLocaleString('en-IN')}.`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Payout request for ₹${requestedAmount.toLocaleString('en-IN')} submitted successfully!`,
      payout
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit payout request.' }, { status: 500 });
  }
}
