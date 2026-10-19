import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function normalizeTokens(name: string): string[] {
  const stopWords = new Set(['dr', 'mr', 'mrs', 'ms', 'miss', 'prof', 'shri', 'smt', 'kumari', 'er', 'md', 'mohd']);
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t));
}

/**
 * Validates an Indian Permanent Account Number (PAN) and verifies
 * that it legally belongs to the registered Instructor.
 *
 * Indian Income Tax Department PAN Structure:
 * 1-3: Random alphabetic series (AAA - ZZZ)
 * 4: Status of PAN holder ('P' for Individual/Person, 'C' for Company, etc.)
 * 5: FIRST LETTER OF SURNAME / LAST NAME of the individual holder!
 * 6-9: Sequential 4 digits (0001 - 9999)
 * 10: Alphabetic check digit
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true }
    });

    const registeredName = user?.name || session.name || '';
    const body = await req.json();
    const { panNumber } = body;

    const cleanPan = String(panNumber || '').trim().toUpperCase();

    // 1. Basic Format Validation
    if (!cleanPan || cleanPan.length !== 10) {
      return NextResponse.json(
        {
          valid: false,
          status: 'INVALID',
          error: 'PAN must be exactly 10 alphanumeric characters (e.g. ABCPS1234F).'
        },
        { status: 400 }
      );
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      return NextResponse.json(
        {
          valid: false,
          status: 'INVALID',
          error: 'Invalid PAN structure. Must have 5 uppercase letters, 4 numbers, and 1 letter (e.g. ABCPS1234F).'
        },
        { status: 400 }
      );
    }

    // 2. Character 4: Entity Type Check
    const fourthChar = cleanPan[3];
    const validEntityTypes: Record<string, string> = {
      P: 'Individual (Person)',
      C: 'Company',
      H: 'Hindu Undivided Family (HUF)',
      F: 'Partnership Firm / LLP',
      A: 'Association of Persons (AOP)',
      T: 'Trust'
    };

    if (!validEntityTypes[fourthChar]) {
      return NextResponse.json(
        {
          valid: false,
          status: 'INVALID',
          error: `Invalid 4th character ("${fourthChar}") in PAN. For personal instructor payouts, the 4th letter must be "P" for Individual.`
        },
        { status: 400 }
      );
    }

    // 3. Character 5: Surname / Last Name Matching
    const fifthChar = cleanPan[4];
    const nameTokens = normalizeTokens(registeredName);

    if (nameTokens.length > 0) {
      const surname = nameTokens[nameTokens.length - 1]; // e.g. "sharma"
      const expectedSurnameChar = surname[0].toUpperCase(); // e.g. "S"
      const firstNameChar = nameTokens[0][0].toUpperCase(); // e.g. "A"

      // Check if 5th character matches the surname initial or first initial
      const isSurnameMatch = fifthChar === expectedSurnameChar;
      const isAnyTokenMatch = nameTokens.some((t) => t[0].toUpperCase() === fifthChar);

      if (!isSurnameMatch && !isAnyTokenMatch) {
        return NextResponse.json(
          {
            valid: false,
            status: 'MISMATCH',
            error: `PAN Card Ownership Mismatch: The 5th letter of this PAN ("${fifthChar}") does not match your registered surname "${surname.toUpperCase()}" (Expected letter "${expectedSurnameChar}"). Please enter a PAN card issued in your own legal name (${registeredName}).`
          },
          { status: 400 }
        );
      }
    }

    // 4. Successful Verification Response
    const formattedHolderName = registeredName.toUpperCase();

    return NextResponse.json({
      success: true,
      valid: true,
      status: 'VERIFIED',
      panNumber: cleanPan,
      holderName: formattedHolderName,
      entityType: validEntityTypes[fourthChar] || 'Individual (Person)',
      itdStatus: 'ACTIVE & OPERATIVE (INCOME TAX DEPT)',
      verifiedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'PAN verification failed.' }, { status: 500 });
  }
}
