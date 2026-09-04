import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireSuperAdmin();

    const webhooks = await prisma.webhookLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const summary = {
      totalReceived: webhooks.length,
      processedCount: webhooks.filter((w) => w.status === 'PROCESSED').length,
      failedCount: webhooks.filter((w) => w.status === 'FAILED').length,
      retryCount: webhooks.filter((w) => w.status === 'RETRY').length
    };

    return NextResponse.json({
      summary,
      webhooks
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
