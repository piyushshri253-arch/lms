import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { EmailService } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';

function maskBankAccountNumber(acct: string): string {
  const clean = acct.replace(/\s+/g, '');
  if (clean.length <= 4) return `XXXX ${clean}`;
  const last4 = clean.slice(-4);
  return `XXXX XXXX ${last4}`;
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    if (session.role !== 'INSTRUCTOR' && session.role !== 'SUPER_ADMIN' && session.role !== 'LMS_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only Instructors can manage payout bank accounts.' },
        { status: 403 }
      );
    }

    const bank = await prisma.instructorBankAccount.findUnique({
      where: { userId: session.id }
    });

    if (!bank) {
      return NextResponse.json({
        success: true,
        bankAccount: {
          status: 'NOT_ADDED',
          accountHolderName: '',
          bankName: '',
          accountNumberMasked: '',
          ifscCode: '',
          accountType: 'SAVINGS',
          branchName: '',
          upiId: '',
          panNumber: '',
          rejectionReason: ''
        }
      });
    }

    return NextResponse.json({
      success: true,
      bankAccount: {
        id: bank.id,
        accountHolderName: bank.accountHolderName,
        bankName: bank.bankName,
        accountNumberMasked: bank.accountNumberMasked,
        ifscCode: bank.ifscCode,
        accountType: bank.accountType,
        branchName: bank.branchName || '',
        upiId: bank.upiId || '',
        panNumber: bank.panNumber || '',
        status: bank.status,
        rejectionReason: bank.rejectionReason || '',
        verifiedByName: bank.verifiedByName || '',
        verifiedAt: bank.verifiedAt,
        rejectedAt: bank.rejectedAt,
        updatedAt: bank.updatedAt
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch bank details.' }, { status: 500 });
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
        { error: 'Forbidden: Reviewer / Auditor and non-instructor roles cannot add payout bank accounts.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      accountHolderName,
      bankName,
      accountNumber,
      confirmAccountNumber,
      ifscCode,
      accountType,
      branchName,
      upiId,
      panNumber
    } = body;

    if (!accountHolderName || !String(accountHolderName).trim()) {
      return NextResponse.json({ error: 'Account Holder Name is required.' }, { status: 400 });
    }
    if (!bankName || !String(bankName).trim()) {
      return NextResponse.json({ error: 'Bank Name is required.' }, { status: 400 });
    }

    const cleanAcct = String(accountNumber || '').replace(/\s+/g, '');
    const cleanConfirmAcct = String(confirmAccountNumber || '').replace(/\s+/g, '');

    if (!cleanAcct || cleanAcct.length < 6 || cleanAcct.length > 22) {
      return NextResponse.json({ error: 'Please enter a valid Bank Account Number (6–22 digits).' }, { status: 400 });
    }
    if (cleanAcct !== cleanConfirmAcct) {
      return NextResponse.json(
        { error: 'Bank Account Number and Confirm Bank Account Number do not match.' },
        { status: 400 }
      );
    }

    const cleanIfsc = String(ifscCode || '').trim().toUpperCase();
    if (!cleanIfsc || cleanIfsc.length < 8 || cleanIfsc.length > 11) {
      return NextResponse.json(
        { error: 'Please enter a valid IFSC / Bank Routing Code (e.g. SBIN0001234).' },
        { status: 400 }
      );
    }

    const masked = maskBankAccountNumber(cleanAcct);

    const saved = await prisma.instructorBankAccount.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        accountHolderName: String(accountHolderName).trim(),
        bankName: String(bankName).trim(),
        accountNumber: cleanAcct,
        accountNumberMasked: masked,
        ifscCode: cleanIfsc,
        accountType: accountType === 'CURRENT' ? 'CURRENT' : 'SAVINGS',
        branchName: branchName ? String(branchName).trim() : null,
        upiId: upiId ? String(upiId).trim() : null,
        panNumber: panNumber ? String(panNumber).trim().toUpperCase() : null,
        status: 'PENDING_VERIFICATION',
        rejectionReason: null,
        rejectedAt: null
      },
      update: {
        accountHolderName: String(accountHolderName).trim(),
        bankName: String(bankName).trim(),
        accountNumber: cleanAcct,
        accountNumberMasked: masked,
        ifscCode: cleanIfsc,
        accountType: accountType === 'CURRENT' ? 'CURRENT' : 'SAVINGS',
        branchName: branchName ? String(branchName).trim() : null,
        upiId: upiId ? String(upiId).trim() : null,
        panNumber: panNumber ? String(panNumber).trim().toUpperCase() : null,
        status: 'PENDING_VERIFICATION',
        rejectionReason: null,
        rejectedAt: null
      }
    });

    await EmailService.sendBankAccountAdded(
      { id: session.id, name: session.name, email: session.email },
      { bankName: saved.bankName, accountNumberMasked: saved.accountNumberMasked, ifscCode: saved.ifscCode }
    ).catch(() => {});

    // Notify Super Admins & Admins to verify bank account
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'LMS_ADMIN', 'ADMIN'] } },
        select: { id: true }
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: `Bank Verification Needed: ${session.name}`,
            message: `Instructor ${session.name} (${session.email}) submitted bank account (${saved.bankName} - ${saved.accountNumberMasked}) for payout verification.`,
            type: 'ACCOUNT',
            link: '/super-admin/users'
          }
        });
      }
    } catch {}

    await createAuditLog({
      actorId: session.id,
      actorEmail: session.email,
      action: 'INSTRUCTOR_SUBMITTED_BANK_ACCOUNT',
      entity: 'InstructorBankAccount',
      entityId: saved.id,
      description: `Instructor "${session.name}" submitted bank account (${saved.bankName} ${saved.accountNumberMasked}) for verification.`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Bank account details submitted! Status is now Pending Verification by Admin.',
      bankAccount: {
        id: saved.id,
        accountHolderName: saved.accountHolderName,
        bankName: saved.bankName,
        accountNumberMasked: saved.accountNumberMasked,
        ifscCode: saved.ifscCode,
        accountType: saved.accountType,
        branchName: saved.branchName || '',
        upiId: saved.upiId || '',
        panNumber: saved.panNumber || '',
        status: saved.status,
        rejectionReason: '',
        updatedAt: saved.updatedAt
      }
    });
  } catch (err: any) {
    console.error('[Instructor Bank Details API Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to save bank details.' }, { status: 500 });
  }
}
