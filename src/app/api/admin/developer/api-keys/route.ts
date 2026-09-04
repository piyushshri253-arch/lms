import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateApiKey } from '@/lib/integrations';
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

    const keys = await prisma.apiKey.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimitPerMin: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      apiKeys: keys.map((k) => ({
        ...k,
        scopes: JSON.parse(k.scopes || '[]')
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
      name,
      scopes = ['courses:read', 'students:read', 'orders:read'],
      rateLimitPerMin = 120,
      expiresInDays,
      organizationId: targetOrgId
    } = body;

    const orgId = targetOrgId || user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    const generated = await generateApiKey(
      orgId,
      name,
      scopes,
      rateLimitPerMin,
      expiresInDays
    );

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'API_KEY_GENERATED',
      entity: 'ApiKey',
      entityId: generated.keyId,
      description: `Scoped API Key "${name}" generated with scopes: ${scopes.join(', ')}.`,
      req: request
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: generated.keyId,
        name,
        keyPrefix: generated.keyPrefix,
        rawApiKey: generated.rawApiKey, // Shown ONLY ONCE
        scopes: generated.scopes
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
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key || !validateTenantOwnership(key.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { status: 'REVOKED' }
    });

    await createAuditLog({
      organizationId: key.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'API_KEY_REVOKED',
      entity: 'ApiKey',
      entityId: key.id,
      description: `API Key "${key.name}" revoked.`,
      req: request
    });

    return NextResponse.json({ success: true, message: 'API Key revoked successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
