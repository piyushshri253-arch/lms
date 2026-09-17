import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { sendMultiChannelNotification } from '@/lib/notifications';

export async function GET() {
  try {
    await requireSuperAdmin();
    const offers = await prisma.platformOffer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ offers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await req.json();
    const {
      title,
      code,
      description,
      discountPercent,
      targetPlan,
      targetAudience = 'ALL',
      selectedOrgIds,
      startDate,
      endDate
    } = body;

    if (!title || !discountPercent) {
      return NextResponse.json({ error: 'Offer title and discount percentage are required.' }, { status: 400 });
    }

    const offer = await prisma.platformOffer.create({
      data: {
        title,
        code: code ? code.trim().toUpperCase() : null,
        description: description || '',
        discountPercent: Number(discountPercent),
        targetPlan: targetPlan || 'ALL',
        targetAudience,
        selectedOrgIds: selectedOrgIds ? JSON.stringify(selectedOrgIds) : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status: 'ACTIVE'
      }
    });

    // Determine target organizations to notify
    let orgWhere: any = {};
    if (targetAudience === 'TRIAL') orgWhere.subscriptionStatus = 'TRIAL';
    else if (targetAudience === 'PAID') orgWhere.subscriptionStatus = 'ACTIVE';
    else if (targetAudience === 'SELECTED' && selectedOrgIds?.length > 0) {
      orgWhere.id = { in: selectedOrgIds };
    }

    const targetOrgs = await prisma.organization.findMany({
      where: orgWhere,
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, email: true }
        }
      }
    });

    // Multi-channel notification to organization administrators
    for (const org of targetOrgs) {
      for (const admin of org.users) {
        await sendMultiChannelNotification({
          userId: admin.id,
          organizationId: org.id,
          title: `🎁 Exclusive MORENA TEACH Offer: ${offer.title}`,
          message: `${offer.description} Get ${offer.discountPercent}% OFF on your SaaS plan upgrade. Use code: ${offer.code || 'SPECIAL'}`,
          type: 'OFFER',
          category: 'OFFERS',
          channels: ['IN_APP', 'EMAIL'],
          link: '/admin/settings'
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'CREATE_PLATFORM_OFFER',
        entity: 'PlatformOffer',
        entityId: offer.id,
        description: `Super Admin created platform offer "${offer.title}" (${offer.discountPercent}% discount).`
      }
    });

    return NextResponse.json({ success: true, offer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
