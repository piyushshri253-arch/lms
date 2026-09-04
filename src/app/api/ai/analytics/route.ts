import { NextResponse } from 'next/server';
import { requireTenantRole } from '@/lib/auth';
import { AIGateway } from '@/lib/ai/gateway';
import { AIToolsService } from '@/lib/ai/tools';
import { SYSTEM_PROMPT_ANALYTICS } from '@/lib/ai/prompts';
import { AIMessage } from '@/lib/ai/types';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const where = user.role === 'SUPER_ADMIN' ? {} : { organizationId: user.organizationId || '' };

    const totalRequests = await prisma.aiUsageLog.count({ where });
    const usageLogs = await prisma.aiUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const totalTokens = usageLogs.reduce((sum, l) => sum + l.totalTokens, 0);
    const setting = user.organizationId
      ? await prisma.aiSetting.findUnique({ where: { organizationId: user.organizationId } })
      : null;

    const breakdown = {
      supportChats: await prisma.aiUsageLog.count({ where: { ...where, feature: 'SUPPORT_BOT' } }),
      courseGenerations: await prisma.aiUsageLog.count({ where: { ...where, feature: 'COURSE_GENERATOR' } }),
      quizGenerations: await prisma.aiUsageLog.count({ where: { ...where, feature: 'QUIZ_GENERATOR' } }),
      websiteGenerations: await prisma.aiUsageLog.count({ where: { ...where, feature: 'WEBSITE_BUILDER' } }),
      studentTutors: await prisma.aiUsageLog.count({ where: { ...where, feature: 'STUDENT_TUTOR' } })
    };

    return NextResponse.json({
      totalRequests,
      totalTokens,
      breakdown,
      setting: setting || {
        supportBotEnabled: true,
        courseGenEnabled: true,
        websiteGenEnabled: true,
        studentTutorEnabled: true,
        monthlyTokenQuota: 500000,
        tokensUsedThisMonth: 0
      },
      recentLogs: usageLogs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const analyticsData = await AIToolsService.getAdminAnalytics({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role
    });

    const provider = await AIGateway.resolveProvider(user.organizationId || undefined);
    if (!provider.isConfigured()) {
      return NextResponse.json({ error: 'AI Provider is not configured. Please set GEMINI_API_KEY.' }, { status: 503 });
    }

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT_ANALYTICS + '\n\n--- AUTHORIZED ACADEMY METRICS ---\n' + JSON.stringify(analyticsData) + '\n--------------------------------'
      },
      { role: 'user', content: query }
    ];

    const result = await provider.generateText(messages, {
      temperature: 0.5,
      organizationId: user.organizationId || undefined,
      userId: user.id,
      feature: 'ANALYTICS_COPILOT'
    });

    await AIGateway.recordUsage(user.organizationId, user.id, 'ANALYTICS_COPILOT', result);

    return NextResponse.json({
      analysis: result.text,
      metrics: analyticsData,
      usage: result.usage
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}