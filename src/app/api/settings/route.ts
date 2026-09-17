import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const record = await prisma.platformSetting.findUnique({
      where: { key: 'general_config' }
    });

    if (record) {
      try {
        const parsed = JSON.parse(record.value);
        return NextResponse.json({ settings: parsed });
      } catch {}
    }

    return NextResponse.json({
      settings: {
        platformName: 'MORENA TEACH',
        supportEmail: 'morena@morenateach.com',
        defaultLanguage: 'English (US)',
        twoFactorAuth: true,
        sessionTimeoutMinutes: 60,
        stripeActive: true,
        stripePublishableKey: 'pk_live_51M89x91...',
        razorpayActive: true,
        paypalActive: true,
        maintenanceMode: false
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole(['ADMIN']);
    const body = await request.json();

    const updated = await prisma.platformSetting.upsert({
      where: { key: 'general_config' },
      create: {
        key: 'general_config',
        value: JSON.stringify(body)
      },
      update: {
        value: JSON.stringify(body)
      }
    });

    return NextResponse.json({
      settings: JSON.parse(updated.value),
      message: 'Platform settings saved to database.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

