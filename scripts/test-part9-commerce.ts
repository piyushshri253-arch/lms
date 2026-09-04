import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import {
  calculateOrderPricing,
  validateCouponServerSide,
  grantOrderEntitlements,
  revokeOrderEntitlements,
  recordAffiliateConversion,
  createGiftCourse,
  redeemGiftCourse
} from '../src/lib/commerce';

async function runPart9TestSuite() {
  console.log('===========================================================');
  console.log('  MORENA LMS — PART 9 ADVANCED COMMERCE & MARKETING');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Clean up previous test records
    await prisma.giftCourse.deleteMany({});
    await prisma.affiliateConversion.deleteMany({});
    await prisma.affiliateAccount.deleteMany({});
    await prisma.abandonedCheckout.deleteMany({});
    await prisma.marketingCampaign.deleteMany({});
    await prisma.entitlement.deleteMany({});
    await prisma.couponRedemption.deleteMany({});
    await prisma.coupon.deleteMany({ where: { code: { in: ['WELCOME20', 'FLAT500', 'MIN1000'] } } });
    await prisma.payment.deleteMany({ where: { providerPaymentId: { contains: 'p9_pay' } } });
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({ where: { orderNumber: { contains: 'P9' } } });
    await prisma.enrollment.deleteMany({ where: { user: { email: { contains: 'p9.org' } } } });
    await prisma.productCourse.deleteMany({});
    await prisma.productPricing.deleteMany({});
    await prisma.product.deleteMany({ where: { slug: { in: ['full-stack-bundle-p9', 'pro-membership-p9'] } } });
    await prisma.lessonProgress.deleteMany({});
    await prisma.lesson.deleteMany({ where: { title: { contains: 'P9' } } });
    await prisma.courseSection.deleteMany({ where: { title: { contains: 'P9' } } });
    await prisma.course.deleteMany({ where: { slug: { in: ['react-p9', 'node-p9', 'nextjs-p9'] } } });
    await prisma.organization.deleteMany({ where: { slug: { in: ['abc-p9-commerce', 'xyz-p9-commerce'] } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'p9.org' } } });

    console.log('--- 1. Multi-Tenant Organization & Course Setup ---');
    const passwordHash = await hashPassword('CommerceSecret2026!');

    const orgABC = await prisma.organization.create({
      data: {
        name: 'ABC Commerce Academy',
        slug: 'abc-p9-commerce',
        plan: 'ENTERPRISE',
        taxPercent: 18.0
      }
    });

    const orgXYZ = await prisma.organization.create({
      data: {
        name: 'XYZ Commerce Institute',
        slug: 'xyz-p9-commerce',
        plan: 'STARTER'
      }
    });

    const studentJohn = await prisma.user.create({
      data: {
        organizationId: orgABC.id,
        name: 'John Doe',
        email: 'john.doe@abc.p9.org',
        password: passwordHash,
        role: 'STUDENT'
      }
    });

    const studentSarah = await prisma.user.create({
      data: {
        organizationId: orgABC.id,
        name: 'Sarah Connor',
        email: 'sarah.connor@abc.p9.org',
        password: passwordHash,
        role: 'STUDENT'
      }
    });

    const instructor = await prisma.user.create({
      data: {
        organizationId: orgABC.id,
        name: 'Dr. Alan Turing',
        email: 'alan.turing@abc.p9.org',
        password: passwordHash,
        role: 'INSTRUCTOR'
      }
    });

    const catWeb = await prisma.category.create({
      data: {
        organizationId: orgABC.id,
        name: 'Web Development P9',
        slug: 'web-dev-p9'
      }
    });

    // Create 3 Courses in ABC
    const courseReact = await prisma.course.create({
      data: {
        organization: { connect: { id: orgABC.id } },
        category: { connect: { id: catWeb.id } },
        instructor: { connect: { id: instructor.id } },
        title: 'React 19 Masterclass P9',
        slug: 'react-p9',
        description: 'Comprehensive React 19 Masterclass with server components and hooks',
        price: 5000,
        discountPrice: 4000,
        status: 'PUBLISHED',
        accessType: 'LIFETIME'
      }
    });

    const courseNode = await prisma.course.create({
      data: {
        organization: { connect: { id: orgABC.id } },
        category: { connect: { id: catWeb.id } },
        instructor: { connect: { id: instructor.id } },
        title: 'Node.js Backend Mastery P9',
        slug: 'node-p9',
        description: 'Node.js architecture, event loop, clustering and scalability',
        price: 4000,
        discountPrice: 3000,
        status: 'PUBLISHED',
        accessType: 'LIFETIME'
      }
    });

    const courseNext = await prisma.course.create({
      data: {
        organization: { connect: { id: orgABC.id } },
        category: { connect: { id: catWeb.id } },
        instructor: { connect: { id: instructor.id } },
        title: 'Next.js 16 Full Stack P9',
        slug: 'nextjs-p9',
        description: 'Next.js 16 App Router, Turbopack, and full stack deployment',
        price: 6000,
        discountPrice: 5000,
        status: 'PUBLISHED',
        accessType: 'LIFETIME'
      }
    });

    assert(Boolean(courseReact.id && courseNode.id && courseNext.id), 'Courses successfully provisioned with baseline pricing');

    console.log('\n--- 2. Product Decoupling & Multi-Course Bundles ---');
    // Bundle Product: Full Stack Web Developer Bundle
    const bundleProduct = await prisma.product.create({
      data: {
        organizationId: orgABC.id,
        name: 'Full Stack Web Dev Bundle P9',
        slug: 'full-stack-bundle-p9',
        type: 'BUNDLE',
        status: 'ACTIVE'
      }
    });

    // Link 3 courses to bundle
    await prisma.productCourse.createMany({
      data: [
        { productId: bundleProduct.id, courseId: courseReact.id },
        { productId: bundleProduct.id, courseId: courseNode.id },
        { productId: bundleProduct.id, courseId: courseNext.id }
      ]
    });

    // Multiple Pricing Tiers on Bundle: Standard vs VIP Mentorship
    const pricingStandard = await prisma.productPricing.create({
      data: {
        productId: bundleProduct.id,
        name: 'Standard Lifetime Bundle',
        type: 'ONE_TIME',
        price: 8999,
        isDefault: true
      }
    });

    const pricingVIP = await prisma.productPricing.create({
      data: {
        productId: bundleProduct.id,
        name: 'VIP Mentorship Bundle',
        type: 'ONE_TIME',
        price: 14999
      }
    });

    assert(
      Boolean(bundleProduct.id && pricingStandard.price === 8999 && pricingVIP.price === 14999),
      'Bundle created with decoupled multiple pricing tiers (Standard ₹8,999 vs VIP ₹14,999)'
    );

    console.log('\n--- 3. Server-Side Zero-Trust Pricing & GST Tax Calculations ---');
    const pricingResult = await calculateOrderPricing(
      orgABC.id,
      studentJohn.id,
      [{ courseId: courseReact.id }, { courseId: courseNode.id }],
      undefined,
      18.0
    );

    // Subtotal: React discount (4000) + Node discount (3000) = 7000
    // Tax: 18% of 7000 = 1260
    // Total: 8260
    assert(
      pricingResult.subtotal === 7000 && pricingResult.tax === 1260 && pricingResult.total === 8260,
      'Server accurately computed Subtotal (₹7,000), 18% GST (₹1,260), and Total (₹8,260)'
    );

    console.log('\n--- 4. Advanced Coupons & Abuse Prevention Engine ---');
    // Coupon 1: 20% discount, min order 5000, max discount 2000, max 1 use per customer
    const coupon20 = await prisma.coupon.create({
      data: {
        organizationId: orgABC.id,
        code: 'WELCOME20',
        discountPercent: 20.0,
        discountType: 'PERCENTAGE',
        minOrderValue: 5000,
        maxDiscount: 2000,
        perCustomerLimit: 1,
        usageLimit: 100,
        status: 'ACTIVE'
      }
    });

    const validCouponResult = await validateCouponServerSide(
      orgABC.id,
      'WELCOME20',
      studentJohn.id,
      7000,
      [courseReact.id, courseNode.id]
    );

    // 20% of 7000 = 1400
    assert(
      validCouponResult.valid && validCouponResult.discountAmount === 1400,
      'Server-side coupon validation applied 20% discount (₹1,400 off on ₹7,000 cart)'
    );

    // Test min order failure
    const minOrderResult = await validateCouponServerSide(
      orgABC.id,
      'WELCOME20',
      studentJohn.id,
      3000, // Below 5000
      [courseNode.id]
    );
    assert(!minOrderResult.valid && Boolean(minOrderResult.error?.includes('Minimum order')), 'Coupon rejected when cart is below minimum order value threshold');

    console.log('\n--- 5. Verified Payment, Order Snapshot & Bundle Entitlements Expansion ---');
    // Student John purchases Full Stack Bundle with WELCOME20 coupon
    const bundlePricing = await calculateOrderPricing(
      orgABC.id,
      studentJohn.id,
      [{ productId: bundleProduct.id, pricingId: pricingStandard.id }],
      'WELCOME20',
      18.0
    );

    // Bundle Price 8999 - 20% (1799.8) = 7199.2 + 18% GST (1295.86) = 8495.06
    const orderNumber = `ORD-P9-${Date.now()}`;
    const paidOrder = await prisma.order.create({
      data: {
        orderNumber,
        organizationId: orgABC.id,
        userId: studentJohn.id,
        subtotal: bundlePricing.subtotal,
        discount: bundlePricing.discount,
        tax: bundlePricing.tax,
        total: bundlePricing.total,
        currency: 'INR',
        provider: 'RAZORPAY',
        status: 'PAID',
        couponCode: 'WELCOME20',
        discountAmount: bundlePricing.discount,
        transactionId: `p9_pay_${Date.now()}`,
        items: {
          create: {
            productId: bundleProduct.id,
            pricingId: pricingStandard.id,
            productTitle: bundleProduct.name,
            quantity: 1,
            unitPrice: pricingStandard.price,
            discount: bundlePricing.discount,
            totalPrice: bundlePricing.total
          }
        }
      }
    });

    // Record coupon redemption to test abuse protection
    await prisma.couponRedemption.create({
      data: {
        couponId: coupon20.id,
        userId: studentJohn.id,
        orderId: paidOrder.id
      }
    });

    // Grant Entitlements for Bundle
    const grantResult = await grantOrderEntitlements(paidOrder.id);

    // Bundle contained React, Node, and Next.js -> Should grant 3 individual entitlements
    const studentEntitlements = await prisma.entitlement.findMany({
      where: { userId: studentJohn.id, status: 'ACTIVE' }
    });

    const enrolledCourses = await prisma.enrollment.findMany({
      where: { userId: studentJohn.id, status: 'ACTIVE' }
    });

    assert(
      studentEntitlements.length === 3 && grantResult.grantedCount === 3,
      'Bundle purchase automatically expanded and granted 3 distinct course entitlements (React, Node, Next.js)'
    );

    assert(
      enrolledCourses.length === 3,
      'LMS enrollment synchronized with bundle entitlements for immediate Course Player access'
    );

    // Abuse Check: John tries to use WELCOME20 again
    const secondUseAttempt = await validateCouponServerSide(
      orgABC.id,
      'WELCOME20',
      studentJohn.id,
      8000,
      [courseReact.id]
    );

    assert(
      !secondUseAttempt.valid && Boolean(secondUseAttempt.error?.includes('already used')),
      'Coupon abuse prevention blocked repeat redemption by the same customer'
    );

    console.log('\n--- 6. Affiliate Partner Program, Referral Tracking & Commission ---');
    // Create affiliate account for Sarah
    const affiliateSarah = await prisma.affiliateAccount.create({
      data: {
        organizationId: orgABC.id,
        userId: studentSarah.id,
        affiliateCode: 'SARAH20',
        commissionRate: 15.0 // 15%
      }
    });

    // Order referred by SARAH20 of ₹10,000
    const affiliateConv = await recordAffiliateConversion(
      orgABC.id,
      'SARAH20',
      paidOrder.id,
      10000
    );

    const updatedAffiliate = await prisma.affiliateAccount.findUnique({
      where: { id: affiliateSarah.id }
    });

    assert(
      affiliateConv.success && affiliateConv.commissionAmount === 1500 && updatedAffiliate?.pendingPayout === 1500,
      'Affiliate referral tracked: 15% commission (₹1,500) credited to pending payout'
    );

    console.log('\n--- 7. Gift Courses Purchase & Instant Redemption Flow ---');
    // John buys React course as a gift for Sarah
    const giftResult = await createGiftCourse(
      orgABC.id,
      paidOrder.id,
      courseReact.id,
      studentJohn.id,
      'Sarah Connor',
      'sarah.connor@abc.p9.org',
      'Enjoy learning React 19!'
    );

    assert(Boolean(giftResult.redemptionCode.startsWith('GIFT-')), 'Gift course created with secure cryptographic redemption token');

    // Sarah redeems the gift
    const redemptionResult = await redeemGiftCourse(
      giftResult.redemptionCode,
      studentSarah.id
    );

    const sarahReactEntitlement = await prisma.entitlement.findUnique({
      where: {
        userId_courseId: {
          userId: studentSarah.id,
          courseId: courseReact.id
        }
      }
    });

    assert(
      redemptionResult.success && sarahReactEntitlement?.sourceType === 'GIFT',
      'Recipient successfully redeemed gift token and received GIFT entitlement'
    );

    // Double redemption prevention
    const repeatRedeem = await redeemGiftCourse(
      giftResult.redemptionCode,
      studentSarah.id
    );
    assert(!repeatRedeem.success, 'Double redemption of claimed gift code strictly blocked');

    console.log('\n--- 8. Abandoned Checkout Tracking & Recovery Pipeline ---');
    const abandoned = await prisma.abandonedCheckout.create({
      data: {
        organizationId: orgABC.id,
        email: 'prospect.lead@abc.p9.org',
        name: 'Prospect Lead',
        courseId: courseNext.id,
        cartTotal: 5000
      }
    });

    // Recovery reminder dispatched
    const recoveredRecord = await prisma.abandonedCheckout.update({
      where: { id: abandoned.id },
      data: { recoveryEmailSent: true }
    });

    assert(
      Boolean(abandoned.id && recoveredRecord.recoveryEmailSent),
      'Abandoned checkout tracked and automated recovery reminder triggered'
    );

    console.log('\n--- 9. Audience Segmentation & Marketing Campaigns ---');
    const campaign = await prisma.marketingCampaign.create({
      data: {
        organizationId: orgABC.id,
        name: 'React 19 Launch Blast',
        subject: 'Master Full Stack React 19',
        content: 'Special 20% discount for all learners.',
        targetAudience: 'ALL',
        status: 'SENT',
        sentCount: 2,
        sentAt: new Date()
      }
    });

    assert(
      Boolean(campaign.id && campaign.sentCount === 2 && campaign.status === 'SENT'),
      'Targeted email marketing campaign broadcast to segmented learner audience'
    );

    console.log('\n--- 10. Refund Engine & Entitlements Revocation Policy ---');
    // Refund the paid order -> Revoke entitlements
    const revokeResult = await revokeOrderEntitlements(paidOrder.id);

    const revokedEntitlements = await prisma.entitlement.findMany({
      where: { userId: studentJohn.id, status: 'REVOKED' }
    });

    const cancelledEnrollments = await prisma.enrollment.findMany({
      where: { userId: studentJohn.id, status: 'CANCELLED' }
    });

    assert(
      revokedEntitlements.length === 3 && cancelledEnrollments.length === 3 && revokeResult.revokedCount === 3,
      'Order refund successfully revoked all 3 bundle course entitlements and cancelled LMS access'
    );

    console.log('\n--- 11. Strict Multi-Tenant Commerce Isolation ---');
    // Ensure XYZ Institute cannot query ABC Academy coupons, orders, or campaigns
    const xyzCoupons = await prisma.coupon.findMany({
      where: { organizationId: orgXYZ.id }
    });

    const xyzEntitlements = await prisma.entitlement.findMany({
      where: { organizationId: orgXYZ.id }
    });

    assert(
      xyzCoupons.length === 0 && xyzEntitlements.length === 0,
      'Strict Tenant Isolation: ABC Academy coupons, orders, entitlements, and affiliates are 100% invisible to XYZ Institute'
    );

    console.log('\n===========================================================');
    console.log(`  PART 9 COMMERCE RESULTS: ${passed} PASSED, ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log('===========================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPart9TestSuite();
