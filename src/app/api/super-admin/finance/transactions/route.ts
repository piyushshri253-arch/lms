import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureLedgerInitialized, createLedgerEntry } from '@/lib/finance-service';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    await ensureLedgerInitialized();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || undefined;
    const search = searchParams.get('search')?.toLowerCase() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { entryNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { referenceId: { contains: search, mode: 'insensitive' } },
        { paymentMethod: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [totalCount, entries] = await Promise.all([
      prisma.financialLedgerEntry.count({ where }),
      prisma.financialLedgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    // Compute ledger statistics
    const stats = await prisma.financialLedgerEntry.groupBy({
      by: ['type'],
      _sum: {
        debit: true,
        credit: true
      }
    });

    return NextResponse.json({
      success: true,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      entries,
      stats
    });
  } catch (error: any) {
    console.error('Error fetching ledger entries:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch financial ledger' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();
    const { type, amount, isCredit, description, referenceId, instructorId, courseId } = body;

    if (!description || !amount) {
      return NextResponse.json({ error: 'Amount and description are required' }, { status: 400 });
    }

    const numAmount = Math.abs(Number(amount));
    const credit = isCredit ? numAmount : 0;
    const debit = !isCredit ? numAmount : 0;

    // Get latest balance
    const latest = await prisma.financialLedgerEntry.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    const previousBalance = latest?.balance || 0;
    const newBalance = previousBalance + credit - debit;

    const entry = await createLedgerEntry({
      type: type || 'ADJUSTMENT',
      credit,
      debit,
      balance: newBalance,
      description: `[Manual Adjustment by ${admin.name || admin.email}]: ${description}`,
      referenceId: referenceId || `ADJ-${Date.now()}`,
      instructorId: instructorId || null,
      courseId: courseId || null,
      paymentMethod: 'ADMIN_MANUAL_JOURNAL',
      metadata: { createdByAdminId: admin.id, createdByAdminEmail: admin.email }
    });

    return NextResponse.json({
      success: true,
      message: 'Ledger entry recorded successfully',
      entry
    });
  } catch (error: any) {
    console.error('Error creating manual ledger entry:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Adjustment creation failed' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}
