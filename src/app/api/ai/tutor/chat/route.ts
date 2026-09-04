import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/auth';
import { AIGateway } from '@/lib/ai/gateway';
import { SYSTEM_PROMPT_STUDENT_TUTOR } from '@/lib/ai/prompts';
import { AIMessage } from '@/lib/ai/types';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await requireTenantAuth();
    const body = await req.json();
    const { message, lessonId, courseSlug, history = [] } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const provider = await AIGateway.resolveProvider(user.organizationId || undefined);
    if (!provider.isConfigured()) {
      return NextResponse.json({ error: 'AI Tutor is not configured. Please set GEMINI_API_KEY.' }, { status: 503 });
    }

    let lessonContext = '';
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { title: true, type: true, content: true, description: true }
      });
      if (lesson) {
        lessonContext = '\n--- ACTIVE LESSON CONTEXT ---\nTitle: ' + lesson.title + '\nType: ' + lesson.type + '\nDescription: ' + (lesson.description || '') + '\nContent excerpt: ' + (lesson.content ? lesson.content.slice(0, 1000) : '') + '\n-----------------------------';
      }
    }

    const messages: AIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT_STUDENT_TUTOR + lessonContext },
      ...history.slice(-4).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const result = await provider.generateText(messages, {
      temperature: 0.6,
      organizationId: user.organizationId || undefined,
      userId: user.id,
      feature: 'STUDENT_TUTOR'
    });

    await AIGateway.recordUsage(user.organizationId, user.id, 'STUDENT_TUTOR', result);

    return NextResponse.json({
      reply: result.text,
      usage: result.usage,
      provider: result.provider
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}