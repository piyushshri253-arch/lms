import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/auth';
import { AIToolsService } from '@/lib/ai/tools';

export async function POST(req: Request) {
  try {
    const user = await requireTenantAuth();
    const body = await req.json();
    const { subject, summary, conversationId } = body;

    const res = await AIToolsService.createSupportTicketHandoff(
      {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role
      },
      subject || 'Student requested human support assistance',
      summary || 'Student escalated AI Support Bot conversation to a human specialist.',
      conversationId
    );

    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}