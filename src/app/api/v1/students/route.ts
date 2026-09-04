import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/integrations';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function getApiKey(request: Request): string {
  const headerKey = request.headers.get('x-api-key');
  if (headerKey) return headerKey;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return '';
}

export async function GET(request: Request) {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  const apiKey = getApiKey(request);

  const auth = await validateApiKey(apiKey, 'students:read');
  if (!auth.isValid || !auth.organizationId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: auth.error || 'Invalid API Key', request_id: requestId } },
      { status: 401, headers: { 'x-request-id': requestId } }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const skip = (page - 1) * limit;

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId: auth.organizationId,
        role: 'STUDENT'
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        xpPoints: true,
        currentStreak: true,
        createdAt: true
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({
      where: {
        organizationId: auth.organizationId,
        role: 'STUDENT'
      }
    })
  ]);

  return NextResponse.json(
    {
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    },
    { headers: { 'x-request-id': requestId } }
  );
}
