import { NextRequest, NextResponse } from 'next/server';
import { requireTenantRole } from '@/lib/auth';
import { getSellerWalletSummary } from '@/lib/wallet';

export async function GET(req: NextRequest) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    if (!orgId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No organization scope found' }, { status: 400 });
    }

    const wallet = await getSellerWalletSummary(orgId!);
    return NextResponse.json({ wallet });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch wallet summary' }, { status: 500 });
  }
}
