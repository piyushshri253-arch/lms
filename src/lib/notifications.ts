import { prisma } from './prisma';
import { sendEmail, EmailTemplateType } from './email';
import { sendWhatsAppMessage } from './whatsapp';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'WHATSAPP' | 'ALL';
export type NotificationCategory = 'SYSTEM' | 'BILLING' | 'COURSES' | 'STUDENTS' | 'OFFERS' | 'ANNOUNCEMENTS' | 'SECURITY';

export interface MultiChannelNotificationPayload {
  userId?: string | null;
  organizationId?: string | null;
  title: string;
  message: string;
  type?: 'INFO' | 'ENROLLMENT' | 'CERTIFICATE' | 'PAYMENT' | 'ANNOUNCEMENT' | 'SYSTEM' | 'OFFER';
  category?: NotificationCategory;
  channels?: NotificationChannel[];
  link?: string | null;
  
  // Email parameters
  recipientEmail?: string | null;
  emailTemplate?: EmailTemplateType;
  emailData?: Record<string, any>;
  
  // WhatsApp parameters
  recipientPhone?: string | null;
  whatsAppTemplate?: string;
  whatsAppVariables?: Record<string, any>;
}

/**
 * Enterprise Multi-Channel Notification Engine
 * Dispatches notifications across In-App UI, Transactional Email, and WhatsApp Business API
 * while strictly respecting user notification preferences and organization scoping.
 */
export async function sendMultiChannelNotification(payload: MultiChannelNotificationPayload) {
  const {
    userId,
    organizationId,
    title,
    message,
    type = 'INFO',
    category = 'SYSTEM',
    channels = ['IN_APP'],
    link = null,
    recipientEmail,
    emailTemplate,
    emailData = {},
    recipientPhone,
    whatsAppTemplate,
    whatsAppVariables = {}
  } = payload;

  const results: { inApp?: boolean; email?: boolean; whatsApp?: boolean } = {};

  try {
    // 1. Fetch user & preferences if userId provided
    let userPref: any = null;
    let userRecord: any = null;

    if (userId) {
      userRecord = await prisma.user.findUnique({
        where: { id: userId },
        include: { notificationPreferences: true }
      });
      userPref = userRecord?.notificationPreferences;
    }

    const effectiveOrgId = organizationId || userRecord?.organizationId || null;
    const effectiveEmail = recipientEmail || userRecord?.email || null;
    const effectivePhone = recipientPhone || userRecord?.phone || null;

    const shouldSendInApp = channels.includes('ALL') || channels.includes('IN_APP');
    const shouldSendEmail = channels.includes('ALL') || channels.includes('EMAIL');
    const shouldSendWhatsApp = channels.includes('ALL') || channels.includes('WHATSAPP');

    // 2. In-App Notification Delivery
    if (shouldSendInApp && userId) {
      await prisma.notification.create({
        data: {
          userId,
          organizationId: effectiveOrgId,
          title,
          message,
          type,
          category,
          channel: 'IN_APP',
          link
        }
      });
      results.inApp = true;
    }

    // 3. Transactional Email Delivery
    if (shouldSendEmail && effectiveEmail) {
      const emailAllowed = userPref ? userPref.emailPromotions !== false : true;
      if (emailAllowed) {
        await sendEmail({
          to: effectiveEmail,
          subject: title,
          template: emailTemplate || 'ANNOUNCEMENT',
          data: {
            title,
            message,
            ...emailData
          },
          userId: userId || undefined,
          organizationId: effectiveOrgId || undefined
        });
        results.email = true;
      }
    }

    // 4. WhatsApp Business API Delivery
    if (shouldSendWhatsApp && effectivePhone && whatsAppTemplate) {
      const waAllowed = userPref ? userPref.whatsAppUpdates !== false : true;
      if (waAllowed) {
        const waRes = await sendWhatsAppMessage({
          recipientPhone: effectivePhone,
          templateName: whatsAppTemplate,
          variables: whatsAppVariables,
          organizationId: effectiveOrgId
        });
        results.whatsApp = waRes.success;
      }
    }

    return {
      success: true,
      channelsDelivered: results
    };
  } catch (err: any) {
    console.error('[MultiChannel Notification Engine Error]:', err);
    return {
      success: false,
      error: err.message
    };
  }
}
