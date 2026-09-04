import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    const action = searchParams.get('action') || 'ALL';

    const where: any = {};
    if (action !== 'ALL') where.action = action;
    if (q) {
      where.OR = [
        { description: { contains: q } },
        { adminEmail: { contains: q } },
        { entity: { contains: q } }
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const formatted = logs.map((l) => ({
      id: l.id,
      adminEmail: l.adminEmail || 'system',
      action: l.action,
      entity: l.entity,
      entityId: l.entityId || '-',
      description: l.description,
      ipAddress: l.ipAddress || '127.0.0.1',
      createdAt: l.createdAt.toLocaleString()
    }));

    return NextResponse.json({ logs: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
