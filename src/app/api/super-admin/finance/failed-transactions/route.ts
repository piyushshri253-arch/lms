import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    await requireFinanceAdmin();

    // Fetch payments that failed or pending abandoned orders
    const [failedPayments, pendingOrders] = await Promise.all([
      prisma.payment.findMany({
        where: { status: 'FAILED' },
        include: {
          order: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              course: { select: { id: true, title: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.order.findMany({
        where: { status: 'FAILED' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          course: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    const items = [
      ...failedPayments.map((p) => ({
        id: p.id,
        attemptId: p.providerPaymentId || 'FAIL-' + p.id.slice(-8).toUpperCase(),
        orderId: p.orderId,
        studentName: p.order?.user?.name || 'Student',
        studentEmail: p.order?.user?.email || 'N/A',
        studentPhone: p.order?.user?.phone || 'N/A',
        courseTitle: p.order?.course?.title || 'Course Package',
        courseId: p.order?.course?.id,
        amount: p.amount,
        currency: p.currency,
        gateway: p.provider,
        reason: 'Payment authorization declined / Session expired',
        date: p.createdAt,
        status: 'FAILED',
        resolved: false
      })),
      ...pendingOrders.map((o) => ({
        id: o.id,
        attemptId: o.orderNumber || 'ORD-FAIL-' + o.id.slice(-8).toUpperCase(),
        orderId: o.id,
        studentName: o.user?.name || 'Student',
        studentEmail: o.user?.email || 'N/A',
        studentPhone: o.user?.phone || 'N/A',
        courseTitle: o.course?.title || 'Course Access',
        courseId: o.course?.id,
        amount: o.total || o.amount,
        currency: o.currency,
        gateway: o.provider,
        reason: 'Order timed out at checkout gateway',
        date: o.createdAt,
        status: 'FAILED',
        resolved: false
      }))
    ];

    return NextResponse.json({
      success: true,
      failedTransactions: items
    });
  } catch (error: any) {
    console.error('Error fetching failed transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch failed transactions' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireFinanceAdmin();
    const body = await req.json();
    const { action, id, email, studentName, courseTitle, amount } = body;

    if (action === 'SEND_RECOVERY') {
      if (!email) {
        return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
      }

      await sendEmail({
        to: email,
        subject: `Complete your enrollment in ${courseTitle || 'your course'} - Morena Teach`,
        template: 'PAYMENT_FAILED',
        data: {
          name: studentName,
          courseTitle,
          amount,
          retryUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/cart`
        },
        html: `
          <p>Dear ${studentName || 'Learner'},</p>
          <p>We noticed your recent payment attempt for <strong>${courseTitle || 'your course'}</strong> (₹${amount || ''}) was interrupted.</p>
          <p>Your seat has been reserved. You can easily complete your payment through this secure link:</p>
          <p><a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/cart" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">Resume Checkout Now</a></p>
          <p>If you need assistance, please feel free to reply to this email.</p>
          <p>Best regards,<br />Admissions & Billing Team<br />Morena Teach LMS</p>
        `
      });

      return NextResponse.json({
        success: true,
        message: `Recovery email sent successfully to ${email}`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in failed transactions POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Action failed' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}
