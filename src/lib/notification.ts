import { prisma } from '@/lib/prisma';

export interface CreateNotificationParams {
  organizationId?: string | null;
  userId: string;
  title: string;
  message: string;
  type?: string; // INFO, ENROLLMENT, CERTIFICATE, PAYMENT, ANNOUNCEMENT, ASSIGNMENT, COMMUNITY, SYSTEM
  category?: string; // SYSTEM, BILLING, COURSES, STUDENTS, OFFERS, ANNOUNCEMENTS, SECURITY
  channel?: string; // IN_APP, EMAIL, ALL
  link?: string | null;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        organizationId: params.organizationId || null,
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        category: params.category || 'SYSTEM',
        channel: params.channel || 'IN_APP',
        link: params.link || null,
        isRead: false
      }
    });

    return notification;
  } catch (error) {
    console.error('[Notification Engine Error]:', error);
    return null;
  }
}
