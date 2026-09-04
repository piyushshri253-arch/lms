import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const course = await prisma.course.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: { sections: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Instructors can only modify courses they authored
    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only modify courses authored by your account.' },
        { status: 403 }
      );
    }

    const order = (course.sections?.length || 0) + 1;
    const sectionTitle = body.title?.trim() || `Module ${order}: New Curriculum Section`;

    const section = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: sectionTitle,
        description: body.description?.trim() || null,
        order
      }
    });

    return NextResponse.json({ section, message: 'Section created successfully.' });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient') || err.message?.includes('permissions');
    const status = isAuth ? 401 : isForbidden ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to create section' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');

    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required' }, { status: 400 });
    }

    const section = await prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true }
    });

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && section.course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only modify courses authored by your account.' },
        { status: 403 }
      );
    }

    await prisma.courseSection.delete({
      where: { id: sectionId }
    });

    return NextResponse.json({ message: 'Section deleted successfully.' });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient') || err.message?.includes('permissions');
    const status = isAuth ? 401 : isForbidden ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to delete section' }, { status });
  }
}
