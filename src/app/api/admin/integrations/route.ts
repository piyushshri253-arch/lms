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

    const accounts = await prisma.integrationAccount.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        provider: true,
        category: true,
        status: true,
        settings: true,
        lastSyncAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ integrations: accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const {
      provider,
      category,
      credentials,
      settings,
      organizationId: targetOrgId
    } = body;

    const orgId = targetOrgId || user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!provider || !category) {
      return NextResponse.json({ error: 'Provider and category are required' }, { status: 400 });
    }

    const account = await prisma.integrationAccount.upsert({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider
        }
      },
      update: {
        category,
        status: 'CONNECTED',
        credentials: credentials ? JSON.stringify(credentials) : undefined,
        settings: settings ? JSON.stringify(settings) : undefined,
        lastSyncAt: new Date()
      },
      create: {
        organizationId: orgId,
        provider,
        category,
        status: 'CONNECTED',
        credentials: credentials ? JSON.stringify(credentials) : undefined,
        settings: settings ? JSON.stringify(settings) : undefined,
        lastSyncAt: new Date()
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'INTEGRATION_CONNECTED',
      entity: 'IntegrationAccount',
      entityId: account.id,
      description: `Integration provider "${provider}" connected.`,
      req: request
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: account.id,
        provider: account.provider,
        category: account.category,
        status: account.status,
        lastSyncAt: account.lastSyncAt
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
