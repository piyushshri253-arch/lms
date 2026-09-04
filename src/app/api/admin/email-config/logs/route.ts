import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization found' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const template = searchParams.get('template');
  const limit = Number(searchParams.get('limit')) || 50;

  const where: any = {
    organizationId: orgId
  };
  if (status) where.status = status;
  if (template) where.template = template;

  const logs = await prisma.emailLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: limit
  });

  return NextResponse.json({ logs });
}