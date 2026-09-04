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

  const auth = await validateApiKey(apiKey, 'courses:read');
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

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where: { organizationId: auth.organizationId },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        price: true,
        status: true,
        createdAt: true
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.course.count({ where: { organizationId: auth.organizationId } })
  ]);

  return NextResponse.json(
    {
      data: courses,
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

export async function POST(request: Request) {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  const apiKey = getApiKey(request);

  const auth = await validateApiKey(apiKey, 'courses:write');
  if (!auth.isValid || !auth.organizationId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: auth.error || 'Missing courses:write scope', request_id: requestId } },
      { status: 403, headers: { 'x-request-id': requestId } }
    );
  }

  try {
    const body = await request.json();
    const { title, slug, description, price = 0, status = 'DRAFT' } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Title and slug are required', request_id: requestId } },
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    let category = await prisma.category.findFirst({
      where: { organizationId: auth.organizationId }
    });
    if (!category) {
      category = await prisma.category.create({
        data: {
          organizationId: auth.organizationId,
          name: 'General',
          slug: `general-${Date.now().toString(36)}`
        }
      });
    }

    let instructor = await prisma.user.findFirst({
      where: {
        organizationId: auth.organizationId,
        role: { in: ['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'] }
      }
    });

    if (!instructor) {
      instructor = await prisma.user.findFirst({
        where: { organizationId: auth.organizationId }
      });
    }

    if (!instructor) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'No valid instructor found for organization', request_id: requestId } },
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    const course = await prisma.course.create({
      data: {
        organizationId: auth.organizationId,
        categoryId: category.id,
        instructorId: instructor.id,
        title,
        slug,
        description: description || 'Course created via Developer API',
        price,
        status
      }
    });

    return NextResponse.json(
      { data: course },
      { status: 201, headers: { 'x-request-id': requestId } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message, request_id: requestId } },
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
