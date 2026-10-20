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

  const auth = await validateApiKey(apiKey, 'enrollments:read');
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

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, slug: true } }
      },
      skip,
      take: limit,
      orderBy: { enrolledAt: 'desc' }
    }),
    prisma.enrollment.count({ where: { organizationId: auth.organizationId } })
  ]);

  return NextResponse.json(
    {
      data: enrollments,
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

  const auth = await validateApiKey(apiKey, 'enrollments:write');
  if (!auth.isValid || !auth.organizationId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: auth.error || 'Missing enrollments:write scope', request_id: requestId } },
      { status: 403, headers: { 'x-request-id': requestId } }
    );
  }

  try {
    const body = await request.json();
    const { userId, courseId } = body;

    if (!userId || !courseId) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'userId and courseId are required', request_id: requestId } },
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, status: true }
    });

    if (!course) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Course not found', request_id: requestId } },
        { status: 404, headers: { 'x-request-id': requestId } }
      );
    }

    if (course.status === 'INACTIVE' || course.status === 'ARCHIVED') {
      return NextResponse.json(
        {
          error: {
            code: 'COURSE_INACTIVE',
            message: 'This course is currently inactive and not accepting new enrollments.',
            request_id: requestId
          }
        },
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      update: { status: 'ACTIVE' },
      create: {
        organizationId: auth.organizationId,
        userId,
        courseId,
        status: 'ACTIVE'
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json(
      { data: enrollment },
      { status: 201, headers: { 'x-request-id': requestId } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message, request_id: requestId } },
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
