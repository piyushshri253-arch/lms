import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const unmask = searchParams.get('unmask') === 'true';

    const accounts = await prisma.instructorBankAccount.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = accounts.map((b) => ({
      id: b.id,
      userId: b.userId,
      instructorName: b.user?.name || 'N/A',
      instructorEmail: b.user?.email || 'N/A',
      instructorPhone: b.user?.phone || 'N/A',
      accountHolderName: b.accountHolderName,
      bankName: b.bankName,
      accountNumber: unmask ? b.accountNumber : b.accountNumberMasked,
      accountNumberMasked: b.accountNumberMasked,
      ifscCode: b.ifscCode,
      accountType: b.accountType,
      branchName: b.branchName,
      upiId: b.upiId,
      panNumber: b.panNumber,
      panDocUrl: b.panDocUrl,
      aadhaarNumber: b.aadhaarNumber,
      aadhaarDocUrl: b.aadhaarDocUrl,
      bankProofUrl: b.bankProofUrl,
      status: b.status, // NOT_ADDED, PENDING_VERIFICATION, VERIFIED, REJECTED, DISABLED
      rejectionReason: b.rejectionReason,
      verifiedById: b.verifiedById,
      verifiedAt: b.verifiedAt,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }));

    return NextResponse.json({
      success: true,
      bankAccounts: formatted
    });
  } catch (error: any) {
    console.error('Error fetching bank details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch bank accounts' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();
    const { action, bankAccountId, rejectionReason, updateMessage, instructorId, ...details } = body;

    if (action === 'CREATE_OR_UPDATE') {
      if (!instructorId) {
        return NextResponse.json({ error: 'instructorId is required' }, { status: 400 });
      }

      const rawNumber = String(details.accountNumber || '').trim();
      const masked = rawNumber.length > 4 ? `•••• •••• ${rawNumber.slice(-4)}` : rawNumber;

      const record = await prisma.instructorBankAccount.upsert({
        where: { userId: instructorId },
        create: {
          userId: instructorId,
          accountHolderName: details.accountHolderName || 'Faculty Account',
          bankName: details.bankName || 'State Bank of India',
          accountNumber: rawNumber,
          accountNumberMasked: masked,
          ifscCode: String(details.ifscCode || 'SBIN0000001').toUpperCase(),
          accountType: details.accountType || 'SAVINGS',
          branchName: details.branchName || 'Main Branch',
          upiId: details.upiId || null,
          panNumber: details.panNumber ? String(details.panNumber).toUpperCase() : null,
          status: 'PENDING_VERIFICATION'
        },
        update: {
          accountHolderName: details.accountHolderName,
          bankName: details.bankName,
          accountNumber: rawNumber || undefined,
          accountNumberMasked: rawNumber ? masked : undefined,
          ifscCode: details.ifscCode ? String(details.ifscCode).toUpperCase() : undefined,
          accountType: details.accountType,
          branchName: details.branchName,
          upiId: details.upiId,
          panNumber: details.panNumber ? String(details.panNumber).toUpperCase() : undefined,
          status: 'PENDING_VERIFICATION',
          rejectionReason: null
        }
      });

      return NextResponse.json({ success: true, bankAccount: record });
    }

    if (!bankAccountId) {
      return NextResponse.json({ error: 'bankAccountId is required' }, { status: 400 });
    }

    const bankAccount = await prisma.instructorBankAccount.findUnique({
      where: { id: bankAccountId },
      include: { user: true }
    });

    if (!bankAccount) {
      return NextResponse.json({ error: 'Bank account record not found' }, { status: 404 });
    }

    if (action === 'VERIFY') {
      const updated = await prisma.instructorBankAccount.update({
        where: { id: bankAccountId },
        data: {
          status: 'VERIFIED',
          rejectionReason: null,
          verifiedById: admin.id,
          verifiedAt: new Date()
        }
      });

      // Send verification notification
      if (bankAccount.user?.email) {
        try {
          await sendEmail({
            to: bankAccount.user.email,
            subject: 'Bank Account Verified - Morena Teach LMS',
            template: 'BANK_ACCOUNT_VERIFIED',
            data: {
              name: bankAccount.user.name,
              bankName: bankAccount.bankName,
              accountMasked: bankAccount.accountNumberMasked
            },
            html: `
              <p>Dear ${bankAccount.user.name || 'Instructor'},</p>
              <p>Your bank account (Ending in ${bankAccount.accountNumberMasked.slice(-4)}) has been verified by the finance department.</p>
              <p>You can now receive revenue share disbursements directly to this account.</p>
            `
          });
        } catch (mailErr) {
          console.warn('Mail send skipped:', mailErr);
        }
      }

      return NextResponse.json({ success: true, bankAccount: updated });
    }

    if (action === 'REJECT') {
      const updated = await prisma.instructorBankAccount.update({
        where: { id: bankAccountId },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason || 'Bank account details could not be verified with bank records',
          verifiedById: admin.id,
          verifiedAt: new Date()
        }
      });

      if (bankAccount.user?.email) {
        try {
          await sendEmail({
            to: bankAccount.user.email,
            subject: 'Bank Verification Attention Required - Morena Teach LMS',
            template: 'NOTIFICATION',
            data: {
              title: 'Bank Verification Attention Required',
              message: `Your bank details require correction: ${rejectionReason || 'Incorrect IFSC or account name mismatch.'}`
            },
            html: `
              <p>Dear ${bankAccount.user.name || 'Instructor'},</p>
              <p>Your bank details require correction: ${rejectionReason || 'Incorrect IFSC or account name mismatch.'}</p>
              <p>Please update your bank details in your Instructor Studio settings.</p>
            `
          });
        } catch (mailErr) {
          console.warn('Mail send skipped:', mailErr);
        }
      }

      return NextResponse.json({ success: true, bankAccount: updated });
    }

    if (action === 'REQUEST_UPDATE') {
      const updated = await prisma.instructorBankAccount.update({
        where: { id: bankAccountId },
        data: {
          status: 'PENDING_VERIFICATION',
          rejectionReason: updateMessage || 'Please review and re-confirm your banking credentials'
        }
      });

      return NextResponse.json({ success: true, bankAccount: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling bank account operation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Operation failed' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}
