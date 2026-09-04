import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { hashPassword } from '@/lib/security';
import { createNotification } from '@/lib/notification';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    const body = await request.json();

    const { rows, mode = 'CONFIRM' } = body; // rows: Array<{ name: string; email: string; courseSlug?: string }>

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validatedRows: any[] = [];
    const errors: string[] = [];

    // Pre-fetch existing users in tenant to detect duplicates
    const existingUsers = await prisma.user.findMany({
      where: { organizationId: orgId || undefined },
      select: { email: true }
    });
    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    // Pre-fetch courses in tenant
    const existingCourses = await prisma.course.findMany({
      where: { organizationId: orgId || undefined }
    });
    const courseMap = new Map(existingCourses.map((c) => [c.slug.toLowerCase(), c]));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const trimmedEmail = (r.email || '').trim().toLowerCase();
      const trimmedName = (r.name || '').trim();

      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        errors.push(`Row ${i + 1}: Invalid email address "${r.email}"`);
        continue;
      }
      if (!trimmedName) {
        errors.push(`Row ${i + 1}: Name is required`);
        continue;
      }

      const isExisting = existingEmailSet.has(trimmedEmail);
      const targetCourse = r.courseSlug ? courseMap.get(r.courseSlug.toLowerCase()) : null;

      validatedRows.push({
        name: trimmedName,
        email: trimmedEmail,
        courseId: targetCourse?.id || null,
        courseTitle: targetCourse?.title || null,
        isDuplicate: isExisting
      });
    }

    if (mode === 'PREVIEW') {
      return NextResponse.json({
        totalRows: rows.length,
        validCount: validatedRows.length,
        duplicateCount: validatedRows.filter((r) => r.isDuplicate).length,
        errors,
        preview: validatedRows.slice(0, 10)
      });
    }

    // CONFIRM mode: Execute database insertion
    const defaultPasswordHash = await hashPassword('StudentWelcome2026!');
    let createdCount = 0;
    let enrolledCount = 0;

    for (const item of validatedRows) {
      let student = await prisma.user.findFirst({
        where: { email: item.email, organizationId: orgId || undefined }
      });

      if (!student) {
        student = await prisma.user.create({
          data: {
            organizationId: orgId,
            name: item.name,
            email: item.email,
            password: defaultPasswordHash,
            role: 'STUDENT',
            status: 'ACTIVE',
            emailVerified: true
          }
        });
        createdCount++;
      }

      if (item.courseId) {
        await prisma.enrollment.upsert({
          where: { userId_courseId: { userId: student.id, courseId: item.courseId } },
          create: {
            organizationId: orgId,
            userId: student.id,
            courseId: item.courseId,
            status: 'ACTIVE'
          },
          update: { status: 'ACTIVE' }
        });

        await createNotification({
          organizationId: orgId,
          userId: student.id,
          title: `Enrolled in ${item.courseTitle}`,
          message: 'Welcome to your new course!',
          type: 'ENROLLMENT',
          category: 'COURSES'
        });
        enrolledCount++;
      }
    }

    // Record Audit Log
    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'IMPORT_STUDENTS_CSV',
      entity: 'User',
      description: `CSV batch imported ${validatedRows.length} students (${createdCount} new accounts, ${enrolledCount} course enrollments).`
    });

    return NextResponse.json({
      success: true,
      importedCount: validatedRows.length,
      createdCount,
      enrolledCount,
      errors
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
