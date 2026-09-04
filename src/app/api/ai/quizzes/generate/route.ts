import { NextResponse } from 'next/server';
import { requireTenantRole } from '@/lib/auth';
import { AIGateway } from '@/lib/ai/gateway';
import { AIMessage } from '@/lib/ai/types';
import { PROMPT_INJECTION_DEFENSE } from '@/lib/ai/prompts';

export async function POST(req: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const body = await req.json();
    const { lessonContent, questionCount = 5, difficulty = 'MEDIUM' } = body;

    if (!lessonContent || !lessonContent.trim()) {
      return NextResponse.json({ error: 'Lesson content or topic is required' }, { status: 400 });
    }

    const provider = await AIGateway.resolveProvider(user.organizationId || undefined);
    if (!provider.isConfigured()) {
      return NextResponse.json({ error: 'AI Provider is not configured. Please set GEMINI_API_KEY.' }, { status: 503 });
    }

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are an educational assessment specialist. Generate rigorous, high-quality quiz questions assessing the provided lesson material.\n' + PROMPT_INJECTION_DEFENSE
      },
      {
        role: 'user',
        content: 'Generate ' + questionCount + ' quiz questions (' + difficulty + ' difficulty) from the following content:\n\n' + lessonContent
      }
    ];

    const schema = {
      questions: [
        {
          question: 'What is...?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: 0,
          explanation: 'Detailed explanation of why Option A is correct',
          difficulty: 'MEDIUM'
        }
      ]
    };

    const result = await provider.generateStructured<any>(messages, schema, {
      temperature: 0.6,
      organizationId: user.organizationId || undefined,
      userId: user.id,
      feature: 'QUIZ_GENERATOR'
    });

    await AIGateway.recordUsage(user.organizationId, user.id, 'QUIZ_GENERATOR', result as any);

    return NextResponse.json({ success: true, quiz: result.data, usage: result.usage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}