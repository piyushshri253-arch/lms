import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        instructor: true,
        sections: {
          include: {
            lessons: { where: { isPublished: true } }
          }
        }
      }
    });

    if (!course || !validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Course Quality Checklist Validation
    const checklist = {
      hasTitle: Boolean(course.title && course.title.trim().length >= 3),
      hasDescription: Boolean(course.description && course.description.trim().length >= 10),
      hasThumbnail: Boolean(course.thumbnail && course.thumbnail.trim().length > 0),
      hasCategory: Boolean(course.categoryId),
      hasInstructor: Boolean(course.instructorId),
      hasValidPricing: Boolean(course.price !== null && course.price >= 0),
      hasPublishedLessons: course.sections.some((s) => s.lessons.length > 0)
    };

    const missingItems: string[] = [];
    if (!checklist.hasTitle) missingItems.push('Course Title (minimum 3 characters)');
    if (!checklist.hasDescription) missingItems.push('Course Description (minimum 10 characters)');
    if (!checklist.hasThumbnail) missingItems.push('Course Thumbnail image');
    if (!checklist.hasCategory) missingItems.push('Course Category assignment');
    if (!checklist.hasInstructor) missingItems.push('Assigned Instructor');
    if (!checklist.hasValidPricing) missingItems.push('Valid Pricing configuration');
    if (!checklist.hasPublishedLessons) missingItems.push('At least one published lesson in curriculum');

    if (missingItems.length > 0) {
      return NextResponse.json(
        {
          error: 'Course failed quality validation checklist',
          canPublish: false,
          missingItems,
          checklist
        },
        { status: 422 }
      );
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status: 'PUBLISHED' }
    });

    // Record Audit Log
    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'PUBLISH_COURSE',
      entity: 'Course',
      entityId: course.id,
      description: `Admin published course "${course.title}".`
    });

    return NextResponse.json({
      message: 'Course published successfully and is now visible on public school catalog',
      course: updated,
      checklist
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
