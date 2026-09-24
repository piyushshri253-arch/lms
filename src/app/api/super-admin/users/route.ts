import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { EmailService } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !['SUPER_ADMIN', 'LMS_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin or Super Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = (searchParams.get('role') || 'ALL').toUpperCase();
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const users: any[] = await prisma.user.findMany({
      include: {
        bankAccount: true,
        instructorPayouts: {
          orderBy: { requestedAt: 'desc' }
        },
        instructorTransactions: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            coursesAuthored: true,
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedUsers = users
      .filter((u) => {
        if (roleFilter === 'INSTRUCTORS') return u.role === 'INSTRUCTOR' || u.role === 'TEACHER';
        if (roleFilter === 'REVIEWERS') return u.role === 'REVIEWER';
        if (roleFilter === 'ADMINS') return ['SUPER_ADMIN', 'LMS_ADMIN', 'ADMIN'].includes(u.role);
        if (roleFilter === 'STUDENTS') return u.role === 'STUDENT';
        return true;
      })
      .filter((u) => {
        if (!search) return true;
        return (
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          (u.phone || '').toLowerCase().includes(search)
        );
      })
      .map((u) => {
        const totalEarnings = u.instructorTransactions
          .filter((t: any) => t.type === 'COURSE_SALE' && t.status === 'PAID')
          .reduce((s: number, t: any) => s + Number(t.netAmount || 0), 0);

        const paidAmount = u.instructorPayouts
          .filter((p: any) => p.status === 'PAID')
          .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

        const pendingPayout = u.instructorPayouts
          .filter((p: any) => ['REQUESTED', 'PENDING', 'APPROVED', 'PROCESSING'].includes(p.status))
          .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

        const availableBalance = Math.max(0, totalEarnings - paidAmount - pendingPayout);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          address: u.address || '',
          city: u.city || '',
          state: u.state || '',
          country: u.country || 'India',
          pincode: u.pincode || '',
          role: u.role,
          customRole: u.customRole || '',
          status: u.isSuspended ? 'SUSPENDED' : u.status,
          emailVerified: u.emailVerified,
          emailVerifiedAt: u.emailVerifiedAt,
          welcomeEmailStatus: u.welcomeEmailStatus || (u.emailVerified ? 'SENT' : 'NOT_SENT'),
          welcomeEmailSentAt: u.welcomeEmailSentAt,
          welcomeEmailError: u.welcomeEmailError || '',
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          coursesCount: u._count.coursesAuthored,
          enrollmentsCount: u._count.enrollments,
          bankAccount: u.bankAccount
            ? {
                id: u.bankAccount.id,
                accountHolderName: u.bankAccount.accountHolderName,
                bankName: u.bankAccount.bankName,
                accountNumber: u.bankAccount.accountNumber,
                accountNumberMasked: u.bankAccount.accountNumberMasked,
                ifscCode: u.bankAccount.ifscCode,
                accountType: u.bankAccount.accountType,
                branchName: u.bankAccount.branchName || '',
                upiId: u.bankAccount.upiId || '',
                panNumber: u.bankAccount.panNumber || '',
                status: u.bankAccount.status,
                rejectionReason: u.bankAccount.rejectionReason || '',
                verifiedByName: u.bankAccount.verifiedByName || '',
                verifiedAt: u.bankAccount.verifiedAt,
                rejectedAt: u.bankAccount.rejectedAt
              }
            : { status: 'NOT_ADDED' },
          financials: {
            totalEarnings,
            paidAmount,
            pendingPayout,
            availableBalance,
            payouts: u.instructorPayouts,
            transactions: u.instructorTransactions.slice(0, 15)
          }
        };
      });

    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    return NextResponse.json({
      success: true,
      users: mappedUsers,
      auditLogs: recentAuditLogs
    });
  } catch (err: any) {
    console.error('[Super Admin Users API Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch users.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !['SUPER_ADMIN', 'LMS_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin or Super Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, userId, payoutId, status, reason, referenceNumber } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Target userId is required.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { bankAccount: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // 1. RESEND WELCOME EMAIL (Admin / Super Admin Fallback Action)
    if (action === 'RESEND_WELCOME_EMAIL') {
      const result = await EmailService.sendWelcomeEmail({
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        organizationId: targetUser.organizationId
      });

      await createAuditLog({
        organizationId: targetUser.organizationId || null,
        actorId: session.id,
        actorEmail: session.email,
        action: 'ADMIN_RESENT_WELCOME_EMAIL',
        entity: 'User',
        entityId: targetUser.id,
        description: `${session.role} "${session.name}" triggered Resend Welcome Email for ${targetUser.role} "${targetUser.name}" (${targetUser.email}). Result: ${result.success ? 'SENT' : 'FAILED'}.`,
        req
      }).catch(() => {});

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Welcome Email successfully resent to ${targetUser.email}!`
          : `Welcome Email attempt logged as FAILED: ${result.error || 'SMTP error'}`
      });
    }

    // 2. VERIFY / REJECT / DISABLE BANK ACCOUNT
    if (action === 'VERIFY_BANK' || action === 'REJECT_BANK' || action === 'DISABLE_BANK') {
      if (!targetUser.bankAccount) {
        return NextResponse.json({ error: 'No bank account found for this instructor.' }, { status: 400 });
      }

      if ((action === 'REJECT_BANK' || action === 'DISABLE_BANK') && !reason) {
        return NextResponse.json({ error: 'Please provide a reason for rejecting or disabling the bank account.' }, { status: 400 });
      }

      const newBankStatus =
        action === 'VERIFY_BANK'
          ? 'VERIFIED'
          : action === 'REJECT_BANK'
          ? 'REJECTED'
          : 'DISABLED';

      const updatedBank = await prisma.instructorBankAccount.update({
        where: { id: targetUser.bankAccount.id },
        data: {
          status: newBankStatus,
          rejectionReason: action === 'VERIFY_BANK' ? null : String(reason).trim(),
          verifiedById: session.id,
          verifiedByName: session.name,
          verifiedAt: action === 'VERIFY_BANK' ? new Date() : targetUser.bankAccount.verifiedAt,
          rejectedAt: action !== 'VERIFY_BANK' ? new Date() : null
        }
      });

      if (action === 'VERIFY_BANK') {
        await EmailService.sendBankAccountVerified(
          { id: targetUser.id, name: targetUser.name, email: targetUser.email },
          {
            bankName: updatedBank.bankName,
            accountNumberMasked: updatedBank.accountNumberMasked,
            ifscCode: updatedBank.ifscCode
          }
        ).catch(() => {});
      } else {
        await EmailService.sendBankAccountRejected(
          { id: targetUser.id, name: targetUser.name, email: targetUser.email },
          {
            bankName: updatedBank.bankName,
            accountNumberMasked: updatedBank.accountNumberMasked,
            ifscCode: updatedBank.ifscCode
          },
          String(reason).trim()
        ).catch(() => {});
      }

      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          title:
            action === 'VERIFY_BANK'
              ? 'Bank Account Verified for Payouts!'
              : `Bank Account ${newBankStatus}`,
          message:
            action === 'VERIFY_BANK'
              ? `Your bank account (${updatedBank.bankName} ${updatedBank.accountNumberMasked}) has been verified by ${session.name}. You can now request payouts.`
              : `Your bank account (${updatedBank.bankName} ${updatedBank.accountNumberMasked}) was marked ${newBankStatus}. Reason: ${reason}`,
          type: 'ACCOUNT',
          link: '/instructor/bank-details'
        }
      }).catch(() => {});

      await createAuditLog({
        organizationId: targetUser.organizationId || null,
        actorId: session.id,
        actorEmail: session.email,
        action: `ADMIN_${action}`,
        entity: 'InstructorBankAccount',
        entityId: updatedBank.id,
        description: `${session.role} "${session.name}" updated bank account status for "${targetUser.name}" to ${newBankStatus}${reason ? ` (Reason: ${reason})` : ''}.`,
        req
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Bank account status updated to ${newBankStatus}!`,
        bankAccount: updatedBank
      });
    }

    // 3. PROCESS PAYOUT (APPROVED, PROCESSING, PAID, REJECTED, FAILED)
    if (action === 'PROCESS_PAYOUT') {
      if (!payoutId || !status) {
        return NextResponse.json({ error: 'payoutId and status are required.' }, { status: 400 });
      }

      const updatedPayout = await prisma.instructorPayout.update({
        where: { id: payoutId },
        data: {
          status: String(status).toUpperCase(),
          referenceNumber: referenceNumber ? String(referenceNumber).trim() : undefined,
          rejectionReason: reason ? String(reason).trim() : undefined,
          processedById: session.id,
          processedByName: session.name,
          processedAt: ['PAID', 'REJECTED', 'FAILED'].includes(String(status).toUpperCase())
            ? new Date()
            : undefined
        }
      });

      const emailType =
        status === 'PAID'
          ? 'PAYOUT_COMPLETED'
          : status === 'APPROVED'
          ? 'PAYOUT_APPROVED'
          : status === 'REJECTED'
          ? 'PAYOUT_REJECTED'
          : 'PAYOUT_APPROVED';

      await EmailService.sendPayoutNotification(
        emailType,
        { id: targetUser.id, name: targetUser.name, email: targetUser.email },
        {
          amount: updatedPayout.amount,
          netAmount: updatedPayout.netAmount,
          status: updatedPayout.status,
          referenceNumber: updatedPayout.referenceNumber,
          reason: updatedPayout.rejectionReason
        }
      ).catch(() => {});

      await createAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: 'ADMIN_PROCESSED_PAYOUT',
        entity: 'InstructorPayout',
        entityId: updatedPayout.id,
        description: `${session.role} "${session.name}" updated payout #${updatedPayout.id.slice(-6)} (₹${updatedPayout.amount}) for "${targetUser.name}" to ${updatedPayout.status}.`,
        req
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Payout status updated to ${updatedPayout.status}!`,
        payout: updatedPayout
      });
    }

    // 4. UPDATE USER ACCOUNT STATUS (ACTIVE, SUSPENDED, INACTIVE)
    if (action === 'UPDATE_USER_STATUS') {
      const nextStatus = String(status || 'ACTIVE').toUpperCase();
      const isSuspended = nextStatus === 'SUSPENDED';

      const updatedUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          status: nextStatus,
          isSuspended,
          emailVerified: nextStatus === 'ACTIVE' ? true : targetUser.emailVerified
        }
      });

      await EmailService.sendAccountStatusChanged(
        { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email },
        nextStatus,
        reason
      ).catch(() => {});

      await createAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: `ADMIN_SET_USER_${nextStatus}`,
        entity: 'User',
        entityId: updatedUser.id,
        description: `${session.role} "${session.name}" changed account status of "${updatedUser.name}" (${updatedUser.email}) to ${nextStatus}.`,
        req
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Account status for ${updatedUser.name} updated to ${nextStatus}.`
      });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: any) {
    console.error('[Super Admin Users POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Action failed.' }, { status: 500 });
  }
}
