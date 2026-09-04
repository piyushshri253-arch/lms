import { NextResponse } from 'next/server';
import { requireTenantRole } from '@/lib/auth';
import { AIGateway } from '@/lib/ai/gateway';
import { SYSTEM_PROMPT_COURSE_ASSISTANT } from '@/lib/ai/prompts';
import { AIMessage } from '@/lib/ai/types';

export async function POST(req: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const body = await req.json();
    const { topic, audience = 'Beginner', duration = '4 weeks', language = 'English' } = body;

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Course topic is required' }, { status: 400 });
    }

    const provider = await AIGateway.resolveProvider(user.organizationId || undefined);
    if (!provider.isConfigured()) {
      return NextResponse.json({ error: 'AI Provider is not configured. Please set GEMINI_API_KEY.' }, { status: 503 });
    }

    const messages: AIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT_COURSE_ASSISTANT },
      {
        role: 'user',
        content: 'Create a comprehensive syllabus and curriculum for topic: "' + topic + '". Target Audience: ' + audience + '. Estimated Duration: ' + duration + '. Language: ' + language + '. Generate complete modules, lessons with descriptions, and learning outcomes.'
      }
    ];

    const schema = {
      title: 'Course Title',
      subtitle: 'Short Subtitle',
      description: 'Comprehensive course overview',
      level: 'BEGINNER',
      learningObjectives: ['Outcome 1', 'Outcome 2', 'Outcome 3'],
      sections: [
        {
          title: 'Module 1: Introduction',
          lessons: [
            { title: 'Lesson 1: Overview', type: 'VIDEO', duration: '10 mins', description: 'Introductory concepts' },
            { title: 'Lesson 2: Core Fundamentals', type: 'TEXT', duration: '15 mins', description: 'In-depth explanation' }
          ]
        }
      ]
    };

    const result = await provider.generateStructured<any>(messages, schema, {
      temperature: 0.7,
      organizationId: user.organizationId || undefined,
      userId: user.id,
      feature: 'COURSE_GENERATOR'
    });

    await AIGateway.recordUsage(user.organizationId, user.id, 'COURSE_GENERATOR', result as any);

    return NextResponse.json({ success: true, curriculum: result.data, usage: result.usage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}