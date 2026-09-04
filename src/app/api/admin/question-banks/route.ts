import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('organizationId') || user.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const questionBanks = await prisma.questionBank.findMany({
      where: { organizationId: orgId },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ questionBanks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const body = await request.json();
    const {
      title,
      category,
      questions = [],
      organizationId: targetOrgId
    } = body;

    const orgId = targetOrgId || user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const bank = await prisma.questionBank.create({
      data: {
        organizationId: orgId,
        title,
        category,
        items: {
          create: questions.map((q: any) => ({
            question: q.question,
            type: q.type || 'MULTIPLE_CHOICE',
            difficulty: q.difficulty || 'MEDIUM',
            options: JSON.stringify(q.options || []),
            explanation: q.explanation || null
          }))
        }
      },
      include: { items: true }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'QUESTION_BANK_CREATED',
      entity: 'QuestionBank',
      entityId: bank.id,
      description: `Question Bank "${title}" created with ${questions.length} questions.`,
      req: request
    });

    return NextResponse.json({ success: true, questionBank: bank });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
