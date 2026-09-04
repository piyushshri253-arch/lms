import { prisma } from '../prisma';

export interface AIExecutionContext {
  userId: string;
  organizationId?: string | null;
  role: string;
}

export class AIToolsService {
  /**
   * Retrieves authorized student learning progress
   */
  static async getStudentProgress(ctx: AIExecutionContext) {
    const where: any = { userId: ctx.userId };
    if (ctx.organizationId) where.organizationId = ctx.organizationId;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnail: true } }
      }
    });

    const progress = await prisma.lessonProgress.findMany({
      where: { userId: ctx.userId },
      select: { lessonId: true, completed: true, updatedAt: true }
    });

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { xpPoints: true, currentStreak: true, longestStreak: true }
    });

    return {
      enrolledCoursesCount: enrollments.length,
      enrollments: enrollments.map((e) => ({
        courseTitle: e.course.title,
        courseSlug: e.course.slug,
        enrolledAt: e.enrolledAt
      })),
      completedLessonsCount: progress.filter((p) => p.completed).length,
      xpPoints: user?.xpPoints || 0,
      currentStreakDays: user?.currentStreak || 0
    };
  }

  /**
   * Retrieves public course catalog for the organization
   */
  static async getCourseCatalog(ctx: AIExecutionContext) {
    const where: any = { status: 'PUBLISHED' };
    if (ctx.organizationId) where.organizationId = ctx.organizationId;

    const courses = await prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        level: true,
        price: true,
        discountPrice: true,
        category: { select: { name: true } },
        instructor: { select: { name: true } }
      },
      take: 10
    });

    return { courses };
  }

  /**
   * Retrieves details of a specific course
   */
  static async getCourseDetails(ctx: AIExecutionContext, courseSlug: string) {
    const where: any = { slug: courseSlug };
    if (ctx.organizationId) where.organizationId = ctx.organizationId;

    const course = await prisma.course.findFirst({
      where,
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, type: true, durationSeconds: true, isFree: true }
            }
          }
        }
      }
    });

    if (!course) return { error: 'Course not found' };

    return {
      title: course.title,
      description: course.description,
      level: course.level,
      price: course.price,
      sectionsCount: course.sections.length,
      totalLessonsCount: course.sections.reduce((acc, s) => acc + s.lessons.length, 0),
      syllabus: course.sections.map((s) => ({
        title: s.title,
        lessons: s.lessons.map((l) => l.title)
      }))
    };
  }

  /**
   * Retrieves organization FAQs and Knowledge Docs
   */
  static async getOrganizationKnowledge(ctx: AIExecutionContext) {
    const where: any = {};
    if (ctx.organizationId) where.organizationId = ctx.organizationId;

    const docs = await prisma.aiKnowledgeDocument.findMany({
      where,
      select: { title: true, category: true, content: true }
    });

    return { documents: docs };
  }

  /**
   * Escalates AI chat to human support ticket
   */
  static async createSupportTicketHandoff(
    ctx: AIExecutionContext,
    subject: string,
    summary: string,
    conversationId?: string
  ) {
    const ticketNumber = 'TICK-AI-' + Date.now().toString().slice(-5) + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true }
    });

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: ctx.organizationId || null,
        userId: ctx.userId,
        ticketNumber,
        subject: subject || 'AI Support Escalation',
        category: 'GENERAL',
        priority: 'HIGH',
        status: 'OPEN',
        messages: {
          create: {
            senderId: ctx.userId,
            senderName: user?.name || 'Student',
            senderRole: ctx.role,
            message: summary
          }
        }
      }
    });

    if (conversationId) {
      await prisma.aiConversation.update({
        where: { id: conversationId },
        data: {
          status: 'WAITING_FOR_HUMAN',
          ticketId: ticket.id
        }
      }).catch(() => {});
    }

    return {
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      message: 'Support ticket ' + ticket.ticketNumber + ' has been created. A support specialist will respond shortly.'
    };
  }

  /**
   * Retrieves admin analytics (Strictly scoped to ADMIN or SUPER_ADMIN)
   */
  static async getAdminAnalytics(ctx: AIExecutionContext) {
    if (ctx.role !== 'ADMIN' && ctx.role !== 'SUPER_ADMIN') {
      throw new Error('Unauthorized: Analytics is restricted to Administrators.');
    }

    const orgFilter = ctx.role === 'SUPER_ADMIN' ? {} : { organizationId: ctx.organizationId || '' };

    const totalStudents = await prisma.user.count({
      where: { ...orgFilter, role: 'STUDENT' }
    });

    const totalCourses = await prisma.course.count({
      where: { ...orgFilter }
    });

    const totalEnrollments = await prisma.enrollment.count({
      where: { ...orgFilter }
    });

    const paidOrders = await prisma.order.findMany({
      where: { ...orgFilter, status: 'COMPLETED' },
      select: { total: true }
    });

    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      totalStudents,
      totalCourses,
      totalEnrollments,
      totalRevenueUSD: totalRevenue,
      activeInstructors: await prisma.user.count({ where: { ...orgFilter, role: 'INSTRUCTOR' } })
    };
  }
}