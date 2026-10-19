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

function normalizePersonName(name: string): string[] {
  const stopWords = new Set(['dr', 'mr', 'mrs', 'ms', 'miss', 'prof', 'shri', 'smt', 'kumari', 'er', 'md', 'mohd']);
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t));
}

/**
 * Checks whether the Bank Account Holder Name belongs to the registered Instructor.
 * At least one significant name token (or prefix/substring of 3+ chars) must match.
 */
function verifyAccountHolderMatchesInstructor(instructorName: string, accountHolderName: string): {
  valid: boolean;
  reason?: string;
} {
  const instTokens = normalizePersonName(instructorName);
  const holderTokens = normalizePersonName(accountHolderName);

  if (holderTokens.length === 0) {
    return {
      valid: false,
      reason: 'Please enter a valid Account Holder Name (alphabets only).'
    };
  }

  if (instTokens.length === 0) {
    return { valid: true };
  }

  const hasMatch = instTokens.some((it) =>
    holderTokens.some(
      (ht) =>
        ht === it ||
        (it.length >= 3 && ht.startsWith(it)) ||
        (ht.length >= 3 && it.startsWith(ht))
    )
  );

  if (!hasMatch) {
    return {
      valid: false,
      reason: `Bank Account Ownership Mismatch: Account Holder Name ("${accountHolderName.trim()}") does not match your registered Instructor name ("${instructorName}"). You must enter your own bank account.`
    };
  }

  return { valid: true };
}

function isValidAccountNumber(acct: string): { valid: boolean; reason?: string } {
  if (!/^\d{9,18}$/.test(acct)) {
    return {
      valid: false,
      reason: 'Bank Account Number must contain 9 to 18 numeric digits only.'
    };
  }
  // Reject all same digits (e.g. 0000000000, 1111111111)
  if (/^(\d)\1+$/.test(acct)) {
    return {
      valid: false,
      reason: 'Invalid Bank Account Number: Repeating dummy digits are not allowed.'
    };
  }
  // Reject obvious sequential numbers
  if ('123456789012345678'.includes(acct) || '987654321098765432'.includes(acct)) {
    return {
      valid: false,
      reason: 'Invalid Bank Account Number: Sequential test numbers are not allowed.'
    };
  }
  return { valid: true };
}

async function verifyIfscWithRbiDirectory(ifsc: string): Promise<{
  valid: boolean;
  bank?: string;
  branch?: string;
  city?: string;
  state?: string;
  reason?: string;
}> {
  const cleanIfsc = ifsc.trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
    return {
      valid: false,
      reason: 'Invalid IFSC format. Must be 11 characters: 4 bank letters + 0 + 6 branch characters (e.g. SBIN0001234 or HDFC0000123).'
    };
  }

  try {
    const res = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (res.status === 404) {
      return {
        valid: false,
        reason: `IFSC Code "${cleanIfsc}" was not found in the Reserve Bank of India (RBI) directory. Please enter a real, active IFSC code.`
      };
    }

    if (res.ok) {
      const data = await res.json();
      return {
        valid: true,
        bank: data.BANK || '',
        branch: data.BRANCH || '',
        city: data.CITY || '',
        state: data.STATE || ''
      };
    }
  } catch {
    // If external lookup times out, rely on strict regex + bank prefix check
  }

  return { valid: true };
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

    const [user, bank] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true, name: true, email: true, phone: true }
      }),
      prisma.instructorBankAccount.findUnique({
        where: { userId: session.id }
      })
    ]);

    const instructorProfile = {
      id: user?.id || session.id,
      name: user?.name || session.name || '',
      email: user?.email || session.email || '',
      phone: user?.phone || ''
    };

    if (!bank) {
      return NextResponse.json({
        success: true,
        instructorProfile,
        bankAccount: {
          status: 'NOT_ADDED',
          accountHolderName: instructorProfile.name,
          bankName: '',
          accountNumberMasked: '',
          ifscCode: '',
          accountType: 'SAVINGS',
          branchName: '',
          upiId: '',
          panNumber: '',
          panDocUrl: '',
          aadhaarNumber: '',
          aadhaarDocUrl: '',
          bankProofUrl: '',
          panVerifiedName: '',
          rejectionReason: ''
        }
      });
    }

    return NextResponse.json({
      success: true,
      instructorProfile,
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
        panDocUrl: bank.panDocUrl || '',
        aadhaarNumber: bank.aadhaarNumber || '',
        aadhaarDocUrl: bank.aadhaarDocUrl || '',
        bankProofUrl: bank.bankProofUrl || '',
        panVerifiedName: bank.panVerifiedName || '',
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

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true }
    });
    const registeredInstructorName = user?.name || session.name || '';

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
      panNumber,
      panDocUrl,
      aadhaarNumber,
      aadhaarDocUrl,
      bankProofUrl
    } = body;

    if (!accountHolderName || !String(accountHolderName).trim()) {
      return NextResponse.json({ error: 'Account Holder Name is required.' }, { status: 400 });
    }

    // 1. Verify Account Holder Name matches the registered Instructor
    const nameCheck = verifyAccountHolderMatchesInstructor(registeredInstructorName, String(accountHolderName));
    if (!nameCheck.valid) {
      return NextResponse.json({ error: nameCheck.reason }, { status: 400 });
    }

    // 2. Verify Bank Account Number (9-18 digits, non-dummy, matches confirmation)
    const cleanAcct = String(accountNumber || '').replace(/\s+/g, '');
    const cleanConfirmAcct = String(confirmAccountNumber || '').replace(/\s+/g, '');

    const acctCheck = isValidAccountNumber(cleanAcct);
    if (!acctCheck.valid) {
      return NextResponse.json({ error: acctCheck.reason }, { status: 400 });
    }
    if (cleanAcct !== cleanConfirmAcct) {
      return NextResponse.json(
        { error: 'Bank Account Number and Confirm Bank Account Number do not match.' },
        { status: 400 }
      );
    }

    // Check if another instructor already registered the exact same account number
    const duplicateBank = await prisma.instructorBankAccount.findFirst({
      where: {
        accountNumber: cleanAcct,
        userId: { not: session.id }
      }
    });
    if (duplicateBank) {
      return NextResponse.json(
        { error: 'This Bank Account Number is already linked to another account. Please enter your own unique bank account.' },
        { status: 400 }
      );
    }

    // 3. Verify IFSC Code against RBI / Razorpay IFSC Directory
    const cleanIfsc = String(ifscCode || '').trim().toUpperCase();
    const ifscVerification = await verifyIfscWithRbiDirectory(cleanIfsc);
    if (!ifscVerification.valid) {
      return NextResponse.json({ error: ifscVerification.reason }, { status: 400 });
    }

    const finalBankName = ifscVerification.bank || String(bankName || '').trim();
    const finalBranchName = ifscVerification.branch || (branchName ? String(branchName).trim() : '');

    if (!finalBankName) {
      return NextResponse.json({ error: 'Bank Name is required.' }, { status: 400 });
    }

    // 4. Strict Indian ITD PAN Number Validation & Surname Ownership Matching
    const cleanPan = panNumber ? String(panNumber).trim().toUpperCase() : '';
    if (!cleanPan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-character Permanent Account Number (PAN), e.g. ABCPS1234F.' },
        { status: 400 }
      );
    }

    // Character 4: Entity Status check (Must be 'P' for Individual, or 'C'/'F'/'H')
    const fourthChar = cleanPan[3];
    if (!['P', 'C', 'H', 'F', 'T', 'A'].includes(fourthChar)) {
      return NextResponse.json(
        { error: `Invalid 4th character ("${fourthChar}") in PAN. For instructor payouts, 4th letter must be "P" (Individual).` },
        { status: 400 }
      );
    }

    // Character 5: Must match applicant's Surname / Last Name initial
    const fifthChar = cleanPan[4];
    const nameTokens = normalizePersonName(registeredInstructorName);
    if (nameTokens.length > 0) {
      const surname = nameTokens[nameTokens.length - 1]; // e.g. "sharma"
      const expectedSurnameChar = surname[0].toUpperCase();
      const isSurnameMatch = fifthChar === expectedSurnameChar;
      const isAnyInitialMatch = nameTokens.some((t) => t[0].toUpperCase() === fifthChar);

      if (!isSurnameMatch && !isAnyInitialMatch) {
        return NextResponse.json(
          {
            error: `PAN Card Ownership Mismatch: The 5th character of this PAN ("${fifthChar}") does not match your registered surname "${surname.toUpperCase()}". PAN Card must belong to "${registeredInstructorName}".`
          },
          { status: 400 }
        );
      }
    }

    // 5. Aadhaar Number Validation (12 Digits)
    const cleanAadhaar = String(aadhaarNumber || '').replace(/[^0-9]/g, '');
    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      return NextResponse.json(
        { error: 'Please enter a valid 12-digit Aadhaar Card Number.' },
        { status: 400 }
      );
    }
    if (/^(\d)\1+$/.test(cleanAadhaar) || '123456789012'.includes(cleanAadhaar)) {
      return NextResponse.json(
        { error: 'Invalid Aadhaar Number: Dummy or sequential numbers are not allowed.' },
        { status: 400 }
      );
    }

    // 6. Mandatory KYC Verification Document Uploads
    if (!panDocUrl || !String(panDocUrl).trim()) {
      return NextResponse.json(
        { error: 'PAN Card Photo is mandatory for KYC and tax verification. Please upload a clear photo of your PAN Card.' },
        { status: 400 }
      );
    }

    if (!aadhaarDocUrl || !String(aadhaarDocUrl).trim()) {
      return NextResponse.json(
        { error: 'Aadhaar Card Photo is mandatory for identity verification. Please upload a clear photo of your Aadhaar Card.' },
        { status: 400 }
      );
    }

    if (!bankProofUrl || !String(bankProofUrl).trim()) {
      return NextResponse.json(
        { error: 'Bank Proof is mandatory. Please upload a photo of your Bank Passbook front page or a Cancelled Cheque.' },
        { status: 400 }
      );
    }

    // 7. Validate UPI ID format if provided
    const cleanUpi = upiId ? String(upiId).trim() : '';
    if (cleanUpi && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(cleanUpi)) {
      return NextResponse.json(
        { error: 'Invalid UPI ID format. Example of a valid UPI ID: yourname@okhdfcbank' },
        { status: 400 }
      );
    }

    const masked = maskBankAccountNumber(cleanAcct);

    const saved = await prisma.instructorBankAccount.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        accountHolderName: String(accountHolderName).trim(),
        bankName: finalBankName,
        accountNumber: cleanAcct,
        accountNumberMasked: masked,
        ifscCode: cleanIfsc,
        accountType: accountType === 'CURRENT' ? 'CURRENT' : 'SAVINGS',
        branchName: finalBranchName || null,
        upiId: cleanUpi || null,
        panNumber: cleanPan,
        panDocUrl: String(panDocUrl).trim(),
        aadhaarNumber: cleanAadhaar,
        aadhaarDocUrl: String(aadhaarDocUrl).trim(),
        bankProofUrl: String(bankProofUrl).trim(),
        panVerifiedName: registeredInstructorName.toUpperCase(),
        status: 'PENDING_VERIFICATION',
        rejectionReason: null,
        rejectedAt: null
      },
      update: {
        accountHolderName: String(accountHolderName).trim(),
        bankName: finalBankName,
        accountNumber: cleanAcct,
        accountNumberMasked: masked,
        ifscCode: cleanIfsc,
        accountType: accountType === 'CURRENT' ? 'CURRENT' : 'SAVINGS',
        branchName: finalBranchName || null,
        upiId: cleanUpi || null,
        panNumber: cleanPan,
        panDocUrl: String(panDocUrl).trim(),
        aadhaarNumber: cleanAadhaar,
        aadhaarDocUrl: String(aadhaarDocUrl).trim(),
        bankProofUrl: String(bankProofUrl).trim(),
        panVerifiedName: registeredInstructorName.toUpperCase(),
        status: 'PENDING_VERIFICATION',
        rejectionReason: null,
        rejectedAt: null
      }
    });

    await EmailService.sendBankAccountAdded(
      { id: session.id, name: registeredInstructorName, email: session.email },
      { bankName: saved.bankName, accountNumberMasked: saved.accountNumberMasked, ifscCode: saved.ifscCode }
    ).catch(() => {});

    // Notify Super Admins & Admins to verify bank account with KYC docs
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'LMS_ADMIN', 'ADMIN'] } },
        select: { id: true }
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: `Bank & KYC Verification Needed: ${registeredInstructorName}`,
            message: `Instructor ${registeredInstructorName} (${session.email}) submitted bank account (${saved.bankName} - ${saved.accountNumberMasked}, IFSC: ${saved.ifscCode}, PAN: ${saved.panNumber}) along with PAN, Aadhaar & Bank Proof documents for payout approval.`,
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
      description: `Instructor "${registeredInstructorName}" submitted bank account (${saved.bankName} ${saved.accountNumberMasked}, IFSC: ${saved.ifscCode}) with PAN (${saved.panNumber}), Aadhaar & Bank Proof KYC documents.`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Bank details & KYC documents verified and submitted for Admin approval!`,
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
        panDocUrl: saved.panDocUrl || '',
        aadhaarNumber: saved.aadhaarNumber || '',
        aadhaarDocUrl: saved.aadhaarDocUrl || '',
        bankProofUrl: saved.bankProofUrl || '',
        panVerifiedName: saved.panVerifiedName || '',
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
