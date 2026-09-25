import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notification';
import { EmailService } from '@/lib/email';

export interface InstructorAnnouncementMeta {
  announcementId: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  targetScope: 'ALL_OWN_COURSES' | 'SELECTED_COURSE';
  courseId: string | null;
  courseTitle: string;
  channel: 'BOTH' | 'IN_APP' | 'EMAIL';
  actionLink: string | null;
  recipientCount: number;
  inAppSentCount: number;
  emailSentCount: number;
  createdAt: string;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Instructor access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const courseFilter = searchParams.get('courseId') || '';

    // 1. Load only courses owned by this Instructor (Strict RBAC)
    const courseWhere: any = {};
    if (user.role === 'INSTRUCTOR') {
      courseWhere.instructorId = user.id;
    } else if (user.organizationId) {
      courseWhere.organizationId = user.organizationId;
    }

    const ownCourses = await prisma.course.findMany({
      where: courseWhere,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        thumbnail: true,
        enrollments: {
          where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
          select: {
            userId: true,
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute unique enrolled students across all own courses
    const uniqueStudentMap = new Map<string, { id: string; name: string; email: string }>();
    const formattedCourses = ownCourses.map((c) => {
      const courseStudentMap = new Map<string, { id: string; name: string; email: string }>();
      for (const enr of c.enrollments) {
        if (enr.user && enr.userId !== user.id) {
          uniqueStudentMap.set(enr.userId, enr.user);
          courseStudentMap.set(enr.userId, enr.user);
        }
      }
      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        status: c.status,
        enrolledCount: courseStudentMap.size
      };
    });

    // 2. Load Instructor's announcement metadata from PlatformSetting
    const settingRows = await prisma.platformSetting.findMany({
      where: {
        key: { startsWith: 'instructor_announcement_' }
      }
    });

    const metaList: InstructorAnnouncementMeta[] = [];
    for (const row of settingRows) {
      try {
        const parsed: InstructorAnnouncementMeta = JSON.parse(row.value);
        if (user.role === 'INSTRUCTOR' && parsed.instructorId !== user.id) {
          continue;
        }
        metaList.push(parsed);
      } catch {}
    }

    const announcementIds = metaList.map((m) => m.announcementId);
    const dbAnnouncements =
      announcementIds.length > 0
        ? await prisma.announcement.findMany({
            where: { id: { in: announcementIds } }
          })
        : [];
    const dbMap = new Map(dbAnnouncements.map((a) => [a.id, a]));

    let announcements = metaList
      .map((meta) => {
        const dbRow = dbMap.get(meta.announcementId);
        if (!dbRow) return null;
        return {
          id: dbRow.id,
          title: dbRow.title,
          message: dbRow.message,
          status: dbRow.status,
          targetScope: meta.targetScope,
          courseId: meta.courseId,
          courseTitle: meta.courseTitle,
          channel: meta.channel,
          actionLink: meta.actionLink || null,
          recipientCount: meta.recipientCount || 0,
          inAppSentCount: meta.inAppSentCount || 0,
          emailSentCount: meta.emailSentCount || 0,
          createdAt: dbRow.createdAt
        };
      })
      .filter(Boolean) as any[];

    // Sort newest first
    announcements.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const stats = {
      totalAnnouncements: announcements.length,
      totalUniqueStudents: uniqueStudentMap.size,
      totalInAppDelivered: announcements.reduce((sum, a) => sum + (a.inAppSentCount || 0), 0),
      totalEmailsSent: announcements.reduce((sum, a) => sum + (a.emailSentCount || 0), 0)
    };

    if (courseFilter) {
      announcements = announcements.filter(
        (a) => a.courseId === courseFilter || (courseFilter === 'ALL_OWN' && a.targetScope === 'ALL_OWN_COURSES')
      );
    }

    if (search) {
      announcements = announcements.filter((a) =>
        `${a.title} ${a.message} ${a.courseTitle}`.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      announcements,
      courses: formattedCourses,
      stats
    });
  } catch (err: any) {
    console.error('[GET /api/instructor/announcements] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load announcements' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Instructor access required.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      message,
      targetScope = 'ALL_OWN_COURSES', // 'ALL_OWN_COURSES' | 'SELECTED_COURSE'
      courseId = null,
      channel = 'BOTH', // 'BOTH' | 'IN_APP' | 'EMAIL'
      actionLink = null,
      alsoPostInCourseForum = true
    } = body;

    if (!String(title || '').trim() || !String(message || '').trim()) {
      return NextResponse.json(
        { error: 'Announcement title and message are required.' },
        { status: 400 }
      );
    }

    // 1. Verify course ownership (Strict RBAC — Instructor can ONLY broadcast to their own courses)
    const ownCourseWhere: any = {};
    if (user.role === 'INSTRUCTOR') {
      ownCourseWhere.instructorId = user.id;
    } else if (user.organizationId) {
      ownCourseWhere.organizationId = user.organizationId;
    }

    const ownCourses = await prisma.course.findMany({
      where: ownCourseWhere,
      select: {
        id: true,
        title: true,
        slug: true,
        organizationId: true,
        instructorId: true,
        enrollments: {
          where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
          select: {
            userId: true,
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (ownCourses.length === 0) {
      return NextResponse.json(
        { error: 'You do not have any courses yet. Please create a course before sending announcements.' },
        { status: 400 }
      );
    }

    let targetCourses = ownCourses;
    let resolvedCourseTitle = 'All My Courses';
    let resolvedCourseId: string | null = null;

    if (targetScope === 'SELECTED_COURSE') {
      if (!courseId) {
        return NextResponse.json(
          { error: 'Please select a course for this announcement.' },
          { status: 400 }
        );
      }
      const matched = ownCourses.find((c) => c.id === courseId);
      if (!matched) {
        return NextResponse.json(
          { error: 'Forbidden: You can only send announcements to courses owned by you.' },
          { status: 403 }
        );
      }
      targetCourses = [matched];
      resolvedCourseTitle = matched.title;
      resolvedCourseId = matched.id;
    }

    // 2. Collect unique enrolled students across targetCourses
    const recipientMap = new Map<string, { id: string; name: string; email: string }>();
    for (const c of targetCourses) {
      for (const enr of c.enrollments) {
        if (enr.user && enr.userId !== user.id) {
          recipientMap.set(enr.userId, enr.user);
        }
      }
    }
    const recipients = Array.from(recipientMap.values());

    // 3. Create Announcement record in DB
    const announcement = await prisma.announcement.create({
      data: {
        organizationId: user.organizationId || targetCourses[0]?.organizationId || null,
        title: String(title).trim(),
        message: String(message).trim(),
        targetAudience: targetScope === 'SELECTED_COURSE' ? 'COURSE' : 'STUDENTS',
        courseId: resolvedCourseId,
        status: 'ACTIVE'
      }
    });

    const resolvedLink =
      actionLink && String(actionLink).trim()
        ? String(actionLink).trim()
        : resolvedCourseId
        ? `/learn/${resolvedCourseId}`
        : '/dashboard/notifications';

    // 4. Deliver In-App Notifications if channel is IN_APP or BOTH
    let inAppSentCount = 0;
    if (channel === 'IN_APP' || channel === 'BOTH') {
      for (const student of recipients) {
        const notif = await createNotification({
          organizationId: user.organizationId || null,
          userId: student.id,
          title: `📢 ${announcement.title}`,
          message: `[${resolvedCourseTitle} — ${user.name}]: ${announcement.message}`,
          type: 'ANNOUNCEMENT',
          category: 'ANNOUNCEMENTS',
          channel: channel === 'BOTH' ? 'ALL' : 'IN_APP',
          link: resolvedLink
        });
        if (notif) inAppSentCount++;
      }
    }

    // 5. Deliver Emails if channel is EMAIL or BOTH
    let emailSentCount = 0;
    if (channel === 'EMAIL' || channel === 'BOTH') {
      for (const student of recipients) {
        if (!student.email) continue;
        try {
          const emailRes = await EmailService.sendEmail({
            to: student.email,
            userId: student.id,
            organizationId: user.organizationId || null,
            subject: `📢 [${resolvedCourseTitle}] ${announcement.title}`,
            template: 'ANNOUNCEMENT',
            data: {
              title: announcement.title,
              name: student.name,
              instructorName: user.name,
              courseTitle: resolvedCourseTitle,
              message: announcement.message,
              ctaText: 'View in Dashboard',
              ctaUrl: resolvedLink
            }
          });
          if (emailRes.success) {
            emailSentCount++;
          }
        } catch {}
      }
    }

    // 6. Optionally post as a Pinned Announcement in the Course Forum so students also see it inside Q&A / Course Discussions
    if (alsoPostInCourseForum && targetCourses.length > 0) {
      const forumCourseId = resolvedCourseId || targetCourses[0].id;
      try {
        const disc = await prisma.discussion.create({
          data: {
            organizationId: user.organizationId || null,
            courseId: forumCourseId,
            lessonId: null,
            userId: user.id,
            title: `📢 Announcement: ${announcement.title}`,
            content: announcement.message
          }
        });
        await prisma.platformSetting.upsert({
          where: { key: `discussion_meta_${disc.id}` },
          update: {
            value: JSON.stringify({
              discussionId: disc.id,
              isResolved: true,
              resolvedAt: new Date().toISOString(),
              resolvedBy: user.name,
              isPinned: true,
              category: 'FORUM_DISCUSSION',
              bestReplyId: null,
              updatedAt: new Date().toISOString()
            })
          },
          create: {
            key: `discussion_meta_${disc.id}`,
            value: JSON.stringify({
              discussionId: disc.id,
              isResolved: true,
              resolvedAt: new Date().toISOString(),
              resolvedBy: user.name,
              isPinned: true,
              category: 'FORUM_DISCUSSION',
              bestReplyId: null,
              updatedAt: new Date().toISOString()
            })
          }
        });
      } catch {}
    }

    // 7. Save Instructor Announcement Metadata
    const meta: InstructorAnnouncementMeta = {
      announcementId: announcement.id,
      instructorId: user.id,
      instructorName: user.name,
      instructorEmail: user.email,
      targetScope: targetScope === 'SELECTED_COURSE' ? 'SELECTED_COURSE' : 'ALL_OWN_COURSES',
      courseId: resolvedCourseId,
      courseTitle: resolvedCourseTitle,
      channel: ['BOTH', 'IN_APP', 'EMAIL'].includes(channel) ? channel : 'BOTH',
      actionLink: resolvedLink,
      recipientCount: recipients.length,
      inAppSentCount,
      emailSentCount,
      createdAt: announcement.createdAt.toISOString()
    };

    await prisma.platformSetting.upsert({
      where: { key: `instructor_announcement_${announcement.id}` },
      update: { value: JSON.stringify(meta) },
      create: { key: `instructor_announcement_${announcement.id}`, value: JSON.stringify(meta) }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId || null,
        adminId: user.id,
        adminEmail: user.email,
        action: 'INSTRUCTOR_ANNOUNCEMENT_SENT',
        entity: 'Announcement',
        entityId: announcement.id,
        description: `Instructor sent announcement "${announcement.title}" to ${resolvedCourseTitle} (${recipients.length} students via ${channel}).`
      }
    });

    return NextResponse.json({
      success: true,
      announcement: {
        id: announcement.id,
        ...meta
      },
      message:
        recipients.length > 0
          ? `Announcement "${announcement.title}" sent to ${recipients.length} enrolled student(s)!`
          : `Announcement "${announcement.title}" published! (Will be visible to students as they enroll)`
    });
  } catch (err: any) {
    console.error('[POST /api/instructor/announcements] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send announcement' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required.' }, { status: 400 });
    }

    const settingRow = await prisma.platformSetting.findUnique({
      where: { key: `instructor_announcement_${id}` }
    });

    if (!settingRow) {
      return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 });
    }

    const parsed: InstructorAnnouncementMeta = JSON.parse(settingRow.value);
    if (user.role === 'INSTRUCTOR' && parsed.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own announcements.' },
        { status: 403 }
      );
    }

    await prisma.announcement.delete({ where: { id } }).catch(() => {});
    await prisma.platformSetting.delete({ where: { key: `instructor_announcement_${id}` } }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete announcement' }, { status: 500 });
  }
}
