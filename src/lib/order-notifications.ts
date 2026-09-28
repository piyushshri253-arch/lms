import { prisma } from './prisma';
import { sendEmail } from './email';
import { getBaseUrl } from './base-url';

/**
 * Dispatches multi-party notifications upon course purchase:
 * 1. Student: Course receipt & welcome email + in-app notification
 * 2. Instructor: New student enrollment email + in-app notification in Instructor Studio
 * 3. Admin: Order confirmation email to morena@morenateach.com + in-app notification in Admin Command Center
 */
export async function dispatchOrderPurchasedNotifications(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        course: {
          include: {
            instructor: true
          }
        },
        items: true,
        organization: true
      }
    });

    if (!order) {
      console.warn(`[Order Notification] Order ${orderId} not found.`);
      return { success: false, error: 'Order not found' };
    }

    const student = order.user;
    if (!student) {
      console.warn(`[Order Notification] Student for order ${orderId} not found.`);
      return { success: false, error: 'Student not found' };
    }

    // Collect all unique courses involved in this purchase
    const courseIds = new Set<string>();
    if (order.courseId) courseIds.add(order.courseId);
    for (const item of order.items) {
      if (item.courseId) courseIds.add(item.courseId);
    }

    // Fetch full course details with instructor
    const courses = await prisma.course.findMany({
      where: { id: { in: Array.from(courseIds) } },
      include: { instructor: true }
    });

    // Fallback course title if none explicitly matched
    const primaryCourseTitle =
      courses[0]?.title ||
      order.course?.title ||
      order.items[0]?.productTitle ||
      'Complete Masterclass Course';

    const instructorNames = courses
      .map((c) => c.instructor?.name)
      .filter(Boolean)
      .join(', ') || 'Morena Teach Faculty';

    // -----------------------------------------------------------------------
    // 1. STUDENT NOTIFICATION (Email + In-App)
    // -----------------------------------------------------------------------
    // In-App Notification
    await prisma.notification.create({
      data: {
        organizationId: order.organizationId,
        userId: student.id,
        title: '🎉 Payment Successful & Course Unlocked!',
        message: `Order #${order.orderNumber} for ₹${order.total} confirmed. You have lifetime access to "${primaryCourseTitle}".`,
        type: 'PAYMENT',
        link: '/student/learning'
      }
    }).catch((err) => console.error('[Student In-App Notification Error]:', err));

    const baseUrl = getBaseUrl();
    const invoiceUrl = `${baseUrl}/invoice/${order.orderNumber || order.id}`;
    const courseUrl = `${baseUrl}/student/learning`;
    const instructorDashboardUrl = `${baseUrl}/instructor`;
    const adminDashboardUrl = `${baseUrl}/admin`;

    // Email to Student
    await sendEmail({
      to: student.email,
      subject: `Order Confirmed: #${order.orderNumber} — Welcome to ${primaryCourseTitle}! 🎓`,
      template: 'PAYMENT_SUCCESS',
      userId: student.id,
      organizationId: order.organizationId,
      data: {
        name: student.name,
        courseTitle: primaryCourseTitle,
        orderNumber: order.orderNumber,
        total: order.total,
        provider: order.provider || 'Trial Payment',
        courseUrl,
        invoiceUrl
      }
    }).catch((err) => console.error('[Student Purchase Email Error]:', err));

    // -----------------------------------------------------------------------
    // 2. INSTRUCTOR NOTIFICATION (Email + In-App for Each Course Instructor)
    // -----------------------------------------------------------------------
    const notifiedInstructors = new Set<string>();

    for (const course of courses) {
      const instructor = course.instructor;
      if (instructor && instructor.email && !notifiedInstructors.has(instructor.id)) {
        notifiedInstructors.add(instructor.id);

        // Instructor In-App Notification
        await prisma.notification.create({
          data: {
            organizationId: order.organizationId,
            userId: instructor.id,
            title: 'New Student Enrollment! 👨‍🏫',
            message: `Student "${student.name}" (${student.email}) has purchased your course "${course.title}".`,
            type: 'ENROLLMENT',
            link: '/instructor'
          }
        }).catch((err) => console.error('[Instructor In-App Notification Error]:', err));

        // Instructor Email
        await sendEmail({
          to: instructor.email,
          subject: `New Student Enrolled: ${student.name} in "${course.title}"! 🎓`,
          template: 'INSTRUCTOR_ENROLLMENT_ALERT',
          userId: instructor.id,
          organizationId: order.organizationId,
          data: {
            instructorName: instructor.name,
            courseTitle: course.title,
            studentName: student.name,
            studentEmail: student.email,
            orderNumber: order.orderNumber,
            total: order.total,
            dashboardUrl: instructorDashboardUrl
          }
        }).catch((err) => console.error(`[Instructor Email Error ${instructor.email}]:`, err));
      }
    }

    // -----------------------------------------------------------------------
    // 3. ADMIN NOTIFICATION (Email to Admin + In-App for All Admins)
    // -----------------------------------------------------------------------
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'morena@morenateach.com';

    // Find all Super Admins and Admins in Database
    const adminUsers = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN'] }
      },
      select: { id: true, email: true, name: true }
    });

    // Admin In-App Notifications
    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          organizationId: order.organizationId,
          userId: admin.id,
          title: `New Course Order: #${order.orderNumber}`,
          message: `Student "${student.name}" (${student.email}) purchased "${primaryCourseTitle}" for ₹${order.total}.`,
          type: 'PAYMENT',
          link: '/admin'
        }
      }).catch((err) => console.error(`[Admin In-App Notification Error ${admin.id}]:`, err));
    }

    // Admin Email: send to primary adminEmail (and other admins if distinct)
    const adminEmailsToNotify = new Set<string>([adminEmail.toLowerCase().trim()]);
    for (const admin of adminUsers) {
      if (admin.email && admin.email.includes('@')) {
        adminEmailsToNotify.add(admin.email.toLowerCase().trim());
      }
    }

    for (const destEmail of adminEmailsToNotify) {
      await sendEmail({
        to: destEmail,
        subject: `[Morena Teach] New Order #${order.orderNumber} — ${student.name} (₹${order.total})`,
        template: 'ADMIN_ORDER_ALERT',
        organizationId: order.organizationId,
        data: {
          orderNumber: order.orderNumber,
          courseTitle: primaryCourseTitle,
          studentName: student.name,
          studentEmail: student.email,
          instructorName: instructorNames,
          total: order.total,
          provider: order.provider || 'Trial Payment',
          adminUrl: adminDashboardUrl
        }
      }).catch((err) => console.error(`[Admin Order Email Error ${destEmail}]:`, err));
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Dispatch Order Notifications Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatches multi-party email & in-app notifications when a student's payment
 * FAILS, TIMES OUT, or CANNOT BE COMPLETED for any reason.
 */
export async function dispatchOrderPaymentFailedNotifications(
  orderId: string,
  failureReason: string = 'Bank authorization declined or payment session interrupted.'
): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        course: true,
        items: true,
        organization: true
      }
    });

    if (!order || !order.user) {
      return { success: false, error: 'Order or student not found' };
    }

    const student = order.user;
    const primaryCourseTitle =
      order.course?.title ||
      order.items[0]?.productTitle ||
      'Selected Masterclass Course';

    const baseUrl = getBaseUrl();
    const retryUrl = `${baseUrl}/checkout`;
    const ordersUrl = `${baseUrl}/student/learning?tab=orders`;

    // 1. Send Payment Failed Email to Student
    await sendEmail({
      to: student.email,
      subject: `⚠️ Payment Failed for Order #${order.orderNumber} — Action Required (${primaryCourseTitle})`,
      template: 'PAYMENT_FAILED',
      userId: student.id,
      organizationId: order.organizationId,
      data: {
        name: student.name,
        courseTitle: primaryCourseTitle,
        orderNumber: order.orderNumber,
        total: order.total,
        provider: order.provider || 'Online Payment',
        failureReason,
        retryUrl,
        ordersUrl
      }
    }).catch((err) => console.error('[Student Payment Failed Email Error]:', err));

    // 2. Send Payment Failed Alert Email to Platform Admin (so support can follow up)
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'morena@morenateach.com';
    await sendEmail({
      to: adminEmail,
      subject: `[Payment Failed Alert] Order #${order.orderNumber} — ${student.name} (${student.email})`,
      template: 'PAYMENT_FAILED',
      organizationId: order.organizationId,
      data: {
        name: `${student.name} (${student.email})`,
        courseTitle: primaryCourseTitle,
        orderNumber: order.orderNumber,
        total: order.total,
        provider: order.provider || 'Online Payment',
        failureReason,
        retryUrl: `${baseUrl}/admin`,
        ordersUrl: `${baseUrl}/admin`
      }
    }).catch((err) => console.error('[Admin Payment Failed Email Error]:', err));

    return { success: true };
  } catch (err: any) {
    console.error('[Dispatch Payment Failed Notifications Error]:', err);
    return { success: false, error: err.message };
  }
}

