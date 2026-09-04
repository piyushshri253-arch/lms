import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireSuperAdmin();

    const generalSetting = await prisma.platformSetting.findUnique({
      where: { key: 'general_config' }
    });

    let config = {
      platformName: 'AADHYARA',
      supportEmail: 'support@aadhyara.com',
      contactEmail: 'contact@aadhyara.com',
      defaultCurrency: 'USD',
      twoFactorAuth: true,
      maintenanceMode: false,
      stripeActive: true,
      razorpayActive: true,
      paypalActive: false,
      heroHeadline: 'Where Great Teaching Inspires Great Learning',
      heroSubheadline: 'Learn system design, product leadership, and engineering architecture from distinguished industry leads.',
      primaryCtaText: 'Explore Masterclasses'
    };

    if (generalSetting) {
      try {
        config = { ...config, ...JSON.parse(generalSetting.value) };
      } catch {}
    }

    return NextResponse.json({ settings: config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();

    const currentSetting = await prisma.platformSetting.findUnique({
      where: { key: 'general_config' }
    });

    let config = {};
    if (currentSetting) {
      try {
        config = JSON.parse(currentSetting.value);
      } catch {}
    }

    const updatedConfig = { ...config, ...body };

    await prisma.platformSetting.upsert({
      where: { key: 'general_config' },
      create: {
        key: 'general_config',
        value: JSON.stringify(updatedConfig)
      },
      update: {
        value: JSON.stringify(updatedConfig)
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'UPDATE_PLATFORM_SETTINGS',
        entity: 'PlatformSetting',
        entityId: 'general_config',
        description: `Super Admin updated platform configuration and website CMS content.`
      }
    });

    return NextResponse.json({
      message: 'Platform settings saved successfully.',
      settings: updatedConfig
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

