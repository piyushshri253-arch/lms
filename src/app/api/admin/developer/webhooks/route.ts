import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
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

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { organizationId: orgId },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      endpoints: endpoints.map((e) => ({
        id: e.id,
        url: e.url,
        secretPrefix: `${e.secret.substring(0, 10)}...`,
        events: JSON.parse(e.events || '[]'),
        status: e.status,
        deliveriesCount: e.deliveries.length,
        deliveries: e.deliveries,
        createdAt: e.createdAt
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const {
      url,
      events = ['order.paid', 'student.created', 'course.completed'],
      organizationId: targetOrgId
    } = body;

    const orgId = targetOrgId || user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!url) {
      return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
    }

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        organizationId: orgId,
        url,
        secret,
        events: JSON.stringify(events),
        status: 'ACTIVE'
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'WEBHOOK_ENDPOINT_CREATED',
      entity: 'WebhookEndpoint',
      entityId: endpoint.id,
      description: `Outbound webhook endpoint created for ${url}.`,
      req: request
    });

    return NextResponse.json({
      success: true,
      endpoint: {
        id: endpoint.id,
        url: endpoint.url,
        secret, // Shown once
        events,
        status: endpoint.status
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get('id');

    if (!endpointId) {
      return NextResponse.json({ error: 'Endpoint ID is required' }, { status: 400 });
    }

    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint || !validateTenantOwnership(endpoint.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.webhookEndpoint.delete({ where: { id: endpointId } });

    await createAuditLog({
      organizationId: endpoint.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'WEBHOOK_ENDPOINT_DELETED',
      entity: 'WebhookEndpoint',
      entityId: endpoint.id,
      description: `Webhook endpoint ${endpoint.url} deleted.`,
      req: request
    });

    return NextResponse.json({ success: true, message: 'Webhook endpoint deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
