import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { calculateOrderPricing, grantOrderEntitlements, recordAffiliateConversion, createGiftCourse } from '@/lib/commerce';
import { dispatchOrderPurchasedNotifications } from '@/lib/order-notifications';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      productId,
      pricingId,
      courseId,
      items: cartItems = [],
      couponCode,
      provider = 'RAZORPAY',
      affiliateCode,
      isGift = false,
      recipientName,
      recipientEmail,
      giftMessage,
      orderBump
    } = body;

    // Normalize checkout items
    const rawItems: Array<{ courseId?: string; productId?: string; pricingId?: string }> = [];

    if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        rawItems.push(item);
      }
    } else if (productId) {
      rawItems.push({ productId, pricingId });
    } else if (courseId) {
      rawItems.push({ courseId });
    }

    // Add optional Order Bump
    if (orderBump && orderBump.courseId) {
      rawItems.push({ courseId: orderBump.courseId });
    } else if (orderBump && orderBump.productId) {
      rawItems.push({ productId: orderBump.productId, pricingId: orderBump.pricingId });
    }

    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'At least one product or course is required for checkout.' }, { status: 400 });
    }

    // Resolve organization for checkout
    let orgId: string | null = null;
    let matchedCourse: any = null;

    if (rawItems[0].courseId) {
      matchedCourse = await prisma.course.findUnique({ where: { id: rawItems[0].courseId } });
      orgId = matchedCourse?.organizationId || null;
    } else if (rawItems[0].productId) {
      const p = await prisma.product.findUnique({ where: { id: rawItems[0].productId } });
      orgId = p?.organizationId || null;
    }

    if (!orgId) {
      orgId = user.organizationId || null;
    }

    // Fallback to default platform organization (Morena Teach)
    if (!orgId) {
      const defaultOrg =
        (await prisma.organization.findFirst({
          where: {
            OR: [
              { name: { contains: 'Morena', mode: 'insensitive' } },
              { slug: { contains: 'morena', mode: 'insensitive' } },
              { slug: 'morean-teach' }
            ]
          }
        })) || (await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } }));

      orgId = defaultOrg?.id || null;
    }

    // If still no organization exists in the database, automatically provision the Morena Teach organization
    if (!orgId) {
      const createdOrg = await prisma.organization.create({
        data: {
          name: 'Morena Teach',
          slug: 'morena-teach',
          primaryColor: '#5624d0',
          status: 'ACTIVE'
        }
      });
      orgId = createdOrg.id;
    }

    // Ensure the course is linked to this organization if it was previously null
    if (rawItems[0].courseId && (!matchedCourse || !matchedCourse.organizationId)) {
      await prisma.course.updateMany({
        where: { id: rawItems[0].courseId, organizationId: null },
        data: { organizationId: orgId }
      }).catch(() => {});
    }

    // Ensure student user is associated with this platform organization
    if (!user.organizationId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: orgId }
      }).catch(() => {});
    }

    // Tenant Isolation Check (Only enforce for non-student administrative users)
    if (user.role !== 'STUDENT' && !validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden: Cross-tenant purchase disallowed.' }, { status: 403 });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const taxRatePercent = org?.taxPercent || 18.0;

    // 1. Server-Side Zero-Trust Pricing Calculation
    const pricingResult = await calculateOrderPricing(
      orgId,
      user.id,
      rawItems,
      couponCode,
      taxRatePercent
    );

    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `ORD-${year}-${randomHex}`;
    const invoiceNumber = `INV-${year}-${randomHex}`;

    // 2. Track Abandoned Checkout Intent
    await prisma.abandonedCheckout.create({
      data: {
        organizationId: orgId,
        email: user.email,
        name: user.name,
        courseId: rawItems[0].courseId || null,
        productId: rawItems[0].productId || null,
        cartTotal: pricingResult.total
      }
    });

    // 3. Handle Free Checkout (₹0 total)
    if (pricingResult.total === 0) {
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            organizationId: orgId,
            userId: user.id,
            courseId: rawItems[0].courseId || null,
            amount: 0.0,
            subtotal: pricingResult.subtotal,
            discount: pricingResult.discount,
            tax: 0.0,
            total: 0.0,
            currency: 'INR',
            provider: 'FREE',
            status: 'PAID',
            couponCode: pricingResult.couponCode || null,
            discountAmount: pricingResult.discount,
            invoiceNumber,
            metadata: JSON.stringify({
              itemsCount: pricingResult.items.length,
              isGift,
              affiliateCode: affiliateCode || null
            })
          }
        });

        for (const item of pricingResult.items) {
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId || null,
              pricingId: item.pricingId || null,
              productTitle: item.productTitle,
              quantity: 1,
              unitPrice: item.unitPrice,
              discount: item.discount,
              totalPrice: item.totalPrice,
              courseId: item.courseId || null
            }
          });
        }

        // Record 100% Free Payment
        await tx.payment.create({
          data: {
            organizationId: orgId,
            orderId: newOrder.id,
            provider: 'FREE',
            providerPaymentId: `free_${Date.now()}_${randomHex}`,
            amount: 0.0,
            currency: 'INR',
            status: 'PAID',
            paidAt: new Date()
          }
        });

        return newOrder;
      });

      // Grant Entitlements
      if (isGift && recipientEmail) {
        await createGiftCourse(
          orgId,
          order.id,
          rawItems[0].courseId || '',
          user.id,
          recipientName || 'Friend',
          recipientEmail,
          giftMessage
        );
      } else {
        await grantOrderEntitlements(order.id);
      }

      // Record coupon redemption
      if (pricingResult.couponCode) {
        const coupon = await prisma.coupon.findFirst({
          where: { organizationId: orgId, code: pricingResult.couponCode }
        });
        if (coupon) {
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } }
          });
          await prisma.couponRedemption.create({
            data: {
              couponId: coupon.id,
              userId: user.id,
              orderId: order.id
            }
          });
        }
      }

      await createAuditLog({
        organizationId: orgId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'FREE_ENROLLMENT_COMPLETED',
        entity: 'Order',
        entityId: order.id,
        description: `Student "${user.name}" completed zero-cost enrollment for order ${order.orderNumber}.`,
        req: request
      });

      // Send Multi-Party Notifications: Student (Receipt + Access), Instructor (New Student Alert), Admin (Order Alert)
      await dispatchOrderPurchasedNotifications(order.id);

      return NextResponse.json({
        success: true,
        isFree: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        status: 'PAID',
        redirectUrl: '/student/dashboard',
        message: 'Order completed and course access activated!'
      });
    }

    // 4. Handle Paid Purchases: Initialize Pending Order & Gateway Intent
    const pendingOrder = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          organizationId: orgId,
          userId: user.id,
          courseId: rawItems[0].courseId || null,
          amount: pricingResult.total,
          subtotal: pricingResult.subtotal,
          discount: pricingResult.discount,
          tax: pricingResult.tax,
          total: pricingResult.total,
          currency: 'INR',
          provider: provider.toUpperCase(),
          status: 'PENDING',
          couponCode: pricingResult.couponCode || null,
          discountAmount: pricingResult.discount,
          invoiceNumber,
          metadata: JSON.stringify({
            itemsCount: pricingResult.items.length,
            isGift,
            recipientName: recipientName || null,
            recipientEmail: recipientEmail || null,
            giftMessage: giftMessage || null,
            affiliateCode: affiliateCode || null
          })
        }
      });

      for (const item of pricingResult.items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId || null,
            pricingId: item.pricingId || null,
            productTitle: item.productTitle,
            quantity: 1,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
            courseId: item.courseId || null
          }
        });
      }

      return newOrder;
    });

    const gatewayOrderId = `order_${Date.now()}_${randomHex}`;
    const gatewayKey = org?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_morena_key';

    return NextResponse.json({
      success: true,
      isFree: false,
      order: {
        id: pendingOrder.id,
        orderNumber: pendingOrder.orderNumber,
        subtotal: pricingResult.subtotal,
        discount: pricingResult.discount,
        tax: pricingResult.tax,
        total: pricingResult.total,
        currency: 'INR',
        items: pricingResult.items
      },
      paymentGateway: {
        provider: provider.toUpperCase(),
        keyId: gatewayKey,
        gatewayOrderId,
        amount: Math.round(pricingResult.total * 100), // paise / cents
        currency: 'INR',
        customerName: user.name,
        customerEmail: user.email
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Checkout failed.' }, { status: 500 });
  }
}
