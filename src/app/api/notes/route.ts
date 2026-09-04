import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireTenantAuth();
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');

    const whereClause: any = { userId: user.id };
    if (lessonId) whereClause.lessonId = lessonId;

    const notes = await prisma.note.findMany({
      where: whereClause,
      orderBy: [{ timestamp: 'asc' }, { updatedAt: 'desc' }]
    });

    return NextResponse.json({
      notes,
      content: notes[0]?.content || ''
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantAuth();
    const body = await request.json();
    const { lessonId, content, timestamp } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        organizationId: user.organizationId || null,
        userId: user.id,
        lessonId,
        content: content || '',
        timestamp: Number(timestamp || 0)
      }
    });

    return NextResponse.json({ success: true, note, message: 'Timestamped note saved successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireTenantAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required.' }, { status: 400 });
    }

    await prisma.note.deleteMany({
      where: { id, userId: user.id }
    });

    return NextResponse.json({ success: true, message: 'Note deleted.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
