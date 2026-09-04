import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    const notes = await prisma.note.findMany({
      where: { userId: user.id, lessonId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ notes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { lessonId, content, timestamp } = await request.json();

    if (!lessonId || !content) {
      return NextResponse.json({ error: 'Missing required note content' }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        userId: user.id,
        lessonId,
        content,
        timestamp: Number(timestamp) || 0
      }
    });

    return NextResponse.json({ note, message: 'Note saved successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Note ID required' }, { status: 400 });
    }

    await prisma.note.deleteMany({
      where: { id, userId: user.id }
    });

    return NextResponse.json({ message: 'Note deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
