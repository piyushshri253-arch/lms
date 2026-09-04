import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;

    const tenantFilter: any = {};
    if (user.role !== 'SUPER_ADMIN' && orgId) {
      tenantFilter.organizationId = orgId;
    }

    const media = await prisma.mediaAsset.findMany({
      where: tenantFilter
    });

    let videoBytes = 0;
    let imageBytes = 0;
    let documentBytes = 0;
    let audioBytes = 0;

    media.forEach((m) => {
      const size = m.sizeBytes || 0;
      if (m.type === 'VIDEO') videoBytes += size;
      else if (m.type === 'IMAGE') imageBytes += size;
      else if (m.type === 'DOCUMENT' || m.type === 'PDF') documentBytes += size;
      else if (m.type === 'AUDIO') audioBytes += size;
      else documentBytes += size;
    });

    const totalBytes = videoBytes + imageBytes + documentBytes + audioBytes;
    const totalGB = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));

    // Storage limits by plan
    const planLimitsGB: { [key: string]: number } = {
      STARTER: 20,
      GROWTH: 100,
      BUSINESS: 500,
      ENTERPRISE: 2000
    };

    const plan = user.plan || 'STARTER';
    const limitGB = planLimitsGB[plan] || 20;
    const usagePercent = Number(((totalGB / limitGB) * 100).toFixed(1));
    const isLimitReached = totalGB >= limitGB;

    return NextResponse.json({
      plan,
      storageLimitGB: limitGB,
      totalUsedGB: totalGB,
      totalUsedBytes: totalBytes,
      usagePercent,
      isLimitReached,
      breakdown: {
        videosGB: Number((videoBytes / (1024 * 1024 * 1024)).toFixed(2)),
        imagesGB: Number((imageBytes / (1024 * 1024 * 1024)).toFixed(2)),
        documentsGB: Number((documentBytes / (1024 * 1024 * 1024)).toFixed(2)),
        audioGB: Number((audioBytes / (1024 * 1024 * 1024)).toFixed(2))
      },
      assetCounts: {
        totalAssets: media.length,
        videos: media.filter((m) => m.type === 'VIDEO').length,
        images: media.filter((m) => m.type === 'IMAGE').length,
        documents: media.filter((m) => m.type === 'DOCUMENT' || m.type === 'PDF').length
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
