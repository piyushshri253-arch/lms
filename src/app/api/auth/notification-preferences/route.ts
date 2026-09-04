import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: user.id }
    });

    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId: user.id }
      });
    }

    return NextResponse.json({ preferences: prefs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const {
      emailCourseUpdates,
      emailPayments,
      emailCertificates,
      emailPromotions,
      emailSecurityAlerts,
      inAppLearning,
      inAppPayments,
      inAppOffers,
      inAppSupport
    } = body;

    const updated = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailCourseUpdates: emailCourseUpdates ?? true,
        emailPayments: emailPayments ?? true,
        emailCertificates: emailCertificates ?? true,
        emailPromotions: emailPromotions ?? true,
        emailSecurityAlerts: emailSecurityAlerts ?? true,
        inAppLearning: inAppLearning ?? true,
        inAppPayments: inAppPayments ?? true,
        inAppOffers: inAppOffers ?? true,
        inAppSupport: inAppSupport ?? true
      },
      update: {
        emailCourseUpdates: emailCourseUpdates !== undefined ? emailCourseUpdates : undefined,
        emailPayments: emailPayments !== undefined ? emailPayments : undefined,
        emailCertificates: emailCertificates !== undefined ? emailCertificates : undefined,
        emailPromotions: emailPromotions !== undefined ? emailPromotions : undefined,
        emailSecurityAlerts: emailSecurityAlerts !== undefined ? emailSecurityAlerts : undefined,
        inAppLearning: inAppLearning !== undefined ? inAppLearning : undefined,
        inAppPayments: inAppPayments !== undefined ? inAppPayments : undefined,
        inAppOffers: inAppOffers !== undefined ? inAppOffers : undefined,
        inAppSupport: inAppSupport !== undefined ? inAppSupport : undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully.',
      preferences: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}
