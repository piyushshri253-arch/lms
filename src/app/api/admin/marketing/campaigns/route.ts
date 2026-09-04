import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('organizationId') || user.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const campaigns = await prisma.marketingCampaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ campaigns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const {
      name,
      subject,
      content,
      targetAudience = 'ALL',
      sendNow = false,
      scheduledAt,
      organizationId: targetOrgId
    } = body;

    const orgId = targetOrgId || user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!name || !subject || !content) {
      return NextResponse.json({ error: 'Name, subject, and content are required' }, { status: 400 });
    }

    // Resolve audience members
    let recipientUsers: any[] = [];
    if (targetAudience === 'INACTIVE_30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      recipientUsers = await prisma.user.findMany({
        where: {
          organizationId: orgId,
          role: 'STUDENT',
          updatedAt: { lte: thirtyDaysAgo }
        }
      });
    } else if (targetAudience === 'NEVER_PURCHASED') {
      recipientUsers = await prisma.user.findMany({
        where: {
          organizationId: orgId,
          role: 'STUDENT',
          orders: { none: { status: 'PAID' } }
        }
      });
    } else if (targetAudience === 'COURSE_COMPLETED') {
      recipientUsers = await prisma.user.findMany({
        where: {
          organizationId: orgId,
          role: 'STUDENT',
          enrollments: { some: { status: 'COMPLETED' } }
        }
      });
    } else {
      recipientUsers = await prisma.user.findMany({
        where: {
          organizationId: orgId,
          role: 'STUDENT'
        }
      });
    }

    const campaign = await prisma.marketingCampaign.create({
      data: {
        organizationId: orgId,
        name,
        subject,
        content,
        targetAudience,
        status: sendNow ? 'SENT' : 'SCHEDULED',
        sentCount: sendNow ? recipientUsers.length : 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        sentAt: sendNow ? new Date() : null
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: sendNow ? 'MARKETING_CAMPAIGN_SENT' : 'MARKETING_CAMPAIGN_SCHEDULED',
      entity: 'MarketingCampaign',
      entityId: campaign.id,
      description: `Campaign "${name}" ${sendNow ? 'sent' : 'scheduled'} to audience "${targetAudience}" (${recipientUsers.length} students).`,
      req: request
    });

    return NextResponse.json({
      success: true,
      campaign,
      audienceSize: recipientUsers.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
