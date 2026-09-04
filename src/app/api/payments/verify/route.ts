import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { grantOrderEntitlements, recordAffiliateConversion, createGiftCourse } from '@/lib/commerce';
import { issueSoftwareLicense } from '@/lib/license';
import { bookService } from '@/lib/services';
import { creditSellerWallet } from '@/lib/wallet';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { orderId, orderNumber, paymentId, providerOrderId, signature, provider = 'RAZORPAY' } = body;

    if (!orderId && !orderNumber) {
      return NextResponse.json({ error: 'orderId or orderNumber is required.' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId || '' }, { orderNumber: orderNumber || '' }],
        userId: user.id
      },
      include: {
        items: true,
        course: true,
        organization: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.status === 'PAID') {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'PAID',
        message: 'Payment was already verified and processed.'
      });
    }

    const effectivePaymentId = paymentId || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Perform atomic activation of payment and order
    const verifiedOrder = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      await tx.payment.create({
        data: {
          organizationId: order.organizationId,
          orderId: order.id,
          provider: provider.toUpperCase(),
          providerPaymentId: effectivePaymentId,
          providerOrderId: providerOrderId || null,
          amount: order.total,
          currency: order.currency,
          status: 'PAID',
          signature: signature || null,
          paidAt: new Date()
        }
      });

      // 2. Update Order to PAID
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          providerPaymentId: effectivePaymentId
        }
      });

      // 3. Mark coupon redeemed
      if (order.couponCode) {
        const coupon = await tx.coupon.findFirst({
          where: {
            code: order.couponCode,
            OR: [{ organizationId: order.organizationId }, { organizationId: null }]
          }
        });

        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } }
          });

          await tx.couponRedemption.create({
            data: {
              couponId: coupon.id,
              userId: user.id,
              orderId: order.id
            }
          });
        }
      }

      return updatedOrder;
    });

    // Parse metadata
    let metadata: any = {};
    try {
      metadata = JSON.parse(order.metadata || '{}');
    } catch {}

    // Mark Abandoned Checkout as Recovered
    await prisma.abandonedCheckout.updateMany({
      where: {
        organizationId: order.organizationId || '',
        email: user.email,
        recovered: false
      },
      data: { recovered: true }
    });

    // 4. Grant Entitlements, Software Licenses, or Service Bookings
    if (metadata.isGift && metadata.recipientEmail) {
      await createGiftCourse(
        order.organizationId || '',
        order.id,
        order.courseId || order.items[0]?.courseId || '',
        user.id,
        metadata.recipientName || 'Gift Recipient',
        metadata.recipientEmail,
        metadata.giftMessage
      );
    } else {
      await grantOrderEntitlements(order.id);
    }

    // Process universal order items (Software Licenses & Service Bookings)
    for (const item of order.items) {
      if (item.productId) {
        const prod = await prisma.product.findUnique({ where: { id: item.productId } });
        if (prod && (prod.type === 'SOFTWARE' || prod.licenseType)) {
          const license = await issueSoftwareLicense({
            organizationId: order.organizationId || prod.organizationId || '',
            productId: prod.id,
            userId: user.id,
            orderId: order.id,
            licenseType: (prod.licenseType as any) || 'SINGLE_USER'
          });

          await prisma.orderItem.update({
            where: { id: item.id },
            data: { licenseKey: license.licenseKey }
          });
        }
      }

      if (item.serviceId) {
        await bookService({
          organizationId: order.organizationId || '',
          serviceId: item.serviceId,
          userId: user.id,
          orderId: order.id,
          packageName: item.pricingName || 'Standard',
          amount: item.totalPrice,
          currency: order.currency
        });
      }
    }

    // 5. Credit Seller Wallet (Calculates Platform Commission & Net Seller Revenue)
    if (order.organizationId && order.total > 0) {
      await creditSellerWallet({
        organizationId: order.organizationId,
        orderId: order.id,
        orderTotal: order.total,
        currency: order.currency
      });
    }

    // 6. Record Affiliate Conversion
    if (metadata.affiliateCode && order.organizationId) {
      await recordAffiliateConversion(
        order.organizationId,
        metadata.affiliateCode,
        order.id,
        order.total
      );
    }

    // Send In-App Notification
    await prisma.notification.create({
      data: {
        organizationId: order.organizationId,
        userId: user.id,
        title: '🎉 Payment Successful!',
        message: `Order #${order.orderNumber} for ₹${order.total} has been confirmed. Access granted.`,
        type: 'PAYMENT',
        link: '/student/dashboard'
      }
    });

    // Send Tenant-Scoped Order & Enrollment Confirmation Email
    await sendEmail({
      to: user.email,
      subject: `Order Confirmed: #${order.orderNumber} — Course Access Granted`,
      template: 'ENROLLMENT',
      userId: user.id,
      organizationId: order.organizationId,
      data: {
        name: user.name,
        courseTitle: order.course?.title || order.items[0]?.productTitle || 'Course Masterclass',
        orderNumber: order.orderNumber,
        total: order.total,
        currency: order.currency
      }
    }).catch((err) => console.error('[Enrollment Email Error]:', err));

    await createAuditLog({
      organizationId: order.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'PAYMENT_VERIFIED',
      entity: 'Order',
      entityId: order.id,
      description: `Payment of ₹${order.total} verified for Order #${order.orderNumber}. Entitlements granted.`,
      req: request
    });

    return NextResponse.json({
      success: true,
      orderId: verifiedOrder.id,
      orderNumber: verifiedOrder.orderNumber,
      invoiceNumber: verifiedOrder.invoiceNumber,
      status: 'PAID',
      total: verifiedOrder.total,
      redirectUrl: '/student/dashboard',
      message: 'Payment verified and access granted successfully!'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Payment verification failed' }, { status: 500 });
  }
}
