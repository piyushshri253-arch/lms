import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    await requireSuperAdmin();

    const flags = await prisma.featureFlag.findMany({
      orderBy: { createdAt: 'asc' }
    });

    // Default seeded flags if table is empty
    if (flags.length === 0) {
      const defaultFlags = [
        { key: 'ai_course_generator', name: 'AI Course Generator', description: 'Enable Gemini AI automated course curriculum builder', enabled: true, targetAudience: 'GLOBAL', percentage: 100 },
        { key: 'new_checkout_v2', name: 'Optimized Checkout V2', description: 'One-click checkout with embedded coupons', enabled: true, targetAudience: 'GLOBAL', percentage: 100 },
        { key: 'advanced_analytics_engine', name: 'Advanced Cohort Analytics', description: 'Cohort retention and drop-off analytics', enabled: true, targetAudience: 'GLOBAL', percentage: 100 },
        { key: 'live_classroom_beta', name: 'Live Classroom Beta', description: 'WebRTC based live interactive streaming', enabled: false, targetAudience: 'ORG_LIST', percentage: 0 }
      ];

      for (const df of defaultFlags) {
        await prisma.featureFlag.create({ data: df });
      }

      const seeded = await prisma.featureFlag.findMany();
      return NextResponse.json({ featureFlags: seeded });
    }

    return NextResponse.json({ featureFlags: flags });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();

    const { key, name, description, enabled = false, targetAudience = 'GLOBAL', targetOrgs = [], percentage = 100 } = body;

    if (!key || !name) {
      return NextResponse.json({ error: 'Flag key and name are required' }, { status: 400 });
    }

    const flag = await prisma.featureFlag.upsert({
      where: { key },
      create: {
        key,
        name,
        description,
        enabled: Boolean(enabled),
        targetAudience,
        targetOrgs: JSON.stringify(targetOrgs),
        percentage: Number(percentage)
      },
      update: {
        name,
        description,
        enabled: Boolean(enabled),
        targetAudience,
        targetOrgs: JSON.stringify(targetOrgs),
        percentage: Number(percentage)
      }
    });

    await createAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'UPDATE_FEATURE_FLAG',
      entity: 'FeatureFlag',
      entityId: flag.id,
      description: `Super Admin updated feature flag "${flag.key}" (enabled: ${flag.enabled}).`
    });

    return NextResponse.json({
      message: 'Feature flag saved successfully',
      featureFlag: flag
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
