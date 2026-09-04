import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/auth';
import { AIGateway } from '@/lib/ai/gateway';
import { AIToolsService } from '@/lib/ai/tools';
import { SYSTEM_PROMPT_SUPPORT_BOT } from '@/lib/ai/prompts';
import { AIMessage } from '@/lib/ai/types';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await requireTenantAuth();
    const body = await req.json();
    const { message, conversationId, history = [] } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const quotaOk = await AIGateway.checkQuota(user.organizationId || undefined);
    if (!quotaOk) {
      return NextResponse.json({ error: 'Monthly AI quota reached for this organization. Please contact admin.' }, { status: 429 });
    }

    const provider = await AIGateway.resolveProvider(user.organizationId || undefined);
    if (!provider.isConfigured()) {
      return NextResponse.json({
        error: 'AI Provider is not configured. Please set GEMINI_API_KEY in environment variables or Admin Settings.'
      }, { status: 503 });
    }

    // Authorized context retrieval
    const studentProgress = await AIToolsService.getStudentProgress({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role
    });

    const catalog = await AIToolsService.getCourseCatalog({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role
    });

    const knowledge = await AIToolsService.getOrganizationKnowledge({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role
    });

    const contextPrompt =
      '\n--- AUTHORIZED STUDENT CONTEXT ---\n' +
      'Student Name: ' + user.name + '\n' +
      'Enrolled Courses Count: ' + studentProgress.enrolledCoursesCount + '\n' +
      'Enrolled Courses: ' + JSON.stringify(studentProgress.enrollments) + '\n' +
      'Completed Lessons: ' + studentProgress.completedLessonsCount + '\n' +
      'Current Streak: ' + studentProgress.currentStreakDays + ' days\n' +
      'Catalog Courses: ' + JSON.stringify(catalog.courses) + '\n' +
      'Knowledge Docs: ' + JSON.stringify(knowledge.documents) + '\n' +
      '----------------------------------';

    const messages: AIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT_SUPPORT_BOT + contextPrompt },
      ...history.slice(-6).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const result = await provider.generateText(messages, {
      temperature: 0.7,
      organizationId: user.organizationId || undefined,
      userId: user.id,
      feature: 'SUPPORT_BOT'
    });

    await AIGateway.recordUsage(user.organizationId, user.id, 'SUPPORT_BOT', result);

    // Persist conversation in AiConversation table if conversationId provided or create new
    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.aiConversation.create({
        data: {
          organizationId: user.organizationId || null,
          userId: user.id,
          feature: 'SUPPORT_BOT',
          status: 'ACTIVE'
        }
      });
      convId = conv.id;
    }

    await prisma.aiMessage.createMany({
      data: [
        { conversationId: convId, role: 'user', content: message },
        { conversationId: convId, role: 'assistant', content: result.text, tokensUsed: result.usage.totalTokens }
      ]
    });

    return NextResponse.json({
      conversationId: convId,
      reply: result.text,
      usage: result.usage,
      provider: result.provider
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message?.includes('Unauthorized') ? 401 : 500 });
  }
}