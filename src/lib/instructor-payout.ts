import { prisma } from './prisma';
import { calculateInstructorPayout, PayoutBreakdown } from './payout-calculator';

export { calculateInstructorPayout };
export type { PayoutBreakdown };

/**
 * Records the financial transaction in the instructor ledger when an order is verified/paid.
 */
export async function recordInstructorEarningForOrder(
  orderId: string,
  paymentMethod = 'MOCK_SIMULATOR'
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: true,
        course: true
      }
    });

    if (!order) return;

    // Collect all course IDs from the order
    const courseIds = new Set<string>();
    if (order.courseId) courseIds.add(order.courseId);
    for (const item of order.items) {
      if (item.courseId) courseIds.add(item.courseId);
    }

    if (courseIds.size === 0) return;

    const courses = await prisma.course.findMany({
      where: { id: { in: Array.from(courseIds) } },
      include: { instructor: true }
    });

    for (const course of courses) {
      if (!course.instructorId) continue;

      // Match item pricing or fallback to course price
      const matchedItem = order.items.find((i) => i.courseId === course.id);
      const basePrice = Number(
        matchedItem?.totalPrice ??
        matchedItem?.unitPrice ??
        course.discountPrice ??
        course.price ??
        100
      );

      const breakdown = calculateInstructorPayout(basePrice);

      const orderRef = order.orderNumber || order.id.slice(-6).toUpperCase();
      const courseSuffix = course.id.slice(-4).toUpperCase();
      const transactionRef = `TXN-${orderRef}-${courseSuffix}`;

      await prisma.instructorEarningTransaction.upsert({
        where: { transactionRef },
        create: {
          transactionRef,
          userId: course.instructorId,
          courseId: course.id,
          courseTitle: course.title,
          studentId: order.userId,
          studentName: order.user?.name || 'Student',
          studentEmail: order.user?.email || '',
          type: 'COURSE_SALE',
          grossAmount: breakdown.studentTotal,
          platformFee: breakdown.platformShare,
          instructorShare: breakdown.instructorGross,
          taxDeduction: breakdown.tdsAmount,
          netAmount: breakdown.netInstructorPayout,
          paymentMethod,
          status: 'PAID',
          notes: JSON.stringify(breakdown),
          createdAt: new Date()
        },
        update: {
          grossAmount: breakdown.studentTotal,
          platformFee: breakdown.platformShare,
          instructorShare: breakdown.instructorGross,
          taxDeduction: breakdown.tdsAmount,
          netAmount: breakdown.netInstructorPayout,
          paymentMethod,
          status: 'PAID',
          notes: JSON.stringify(breakdown)
        }
      });
    }
  } catch (err) {
    console.error('[recordInstructorEarningForOrder error]:', err);
  }
}
