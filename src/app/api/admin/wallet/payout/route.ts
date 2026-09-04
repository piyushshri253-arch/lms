import { NextRequest, NextResponse } from 'next/server';
import { requireTenantRole } from '@/lib/auth';
import { requestSellerPayout } from '@/lib/wallet';

export async function POST(req: NextRequest) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    if (!orgId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No organization scope found' }, { status: 400 });
    }

    const body = await req.json();
    const { amount, payoutMethod = 'BANK_TRANSFER', payoutDetails = {} } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 });
    }

    const result = await requestSellerPayout({
      organizationId: orgId!,
      amount: Number(amount),
      payoutMethod,
      payoutDetails
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit payout request' }, { status: 500 });
  }
}
