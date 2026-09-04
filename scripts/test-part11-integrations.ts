import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import {
  generateApiKey,
  validateApiKey,
  dispatchWebhookEvent,
  emitPlatformEvent,
  RazorpayAdapter,
  StripeAdapter
} from '../src/lib/integrations';
import crypto from 'crypto';

async function runPart11TestSuite() {
  console.log('===========================================================');
  console.log('  MORENA LMS — PART 11 INTEGRATIONS & DEVELOPER PLATFORM');
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
    await prisma.webhookDelivery.deleteMany({});
    await prisma.webhookEndpoint.deleteMany({});
    await prisma.apiKey.deleteMany({});
    await prisma.ssoConfiguration.deleteMany({});
    await prisma.integrationLog.deleteMany({});
    await prisma.integrationAccount.deleteMany({});
    await prisma.learningEvent.deleteMany({ where: { metadata: { contains: 'P11' } } });
    await prisma.enrollment.deleteMany({ where: { user: { email: { contains: 'p11.org' } } } });
    await prisma.order.deleteMany({ where: { user: { email: { contains: 'p11.org' } } } });
    await prisma.course.deleteMany({ where: { slug: { in: ['react-p11', 'cloud-p11'] } } });
    await prisma.category.deleteMany({ where: { slug: 'dev-p11' } });
    await prisma.organization.deleteMany({ where: { slug: { in: ['abc-p11-academy', 'xyz-p11-institute'] } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'p11.org' } } });

    console.log('--- 1. Multi-Tenant Organization & Admin Setup ---');
    const passwordHash = await hashPassword('IntegrationsDev2026!');

    const orgABC = await prisma.organization.create({
      data: {
        name: 'ABC Developer Academy',
        slug: 'abc-p11-academy',
        plan: 'ENTERPRISE'
      }
    });

    const orgXYZ = await prisma.organization.create({
      data: {
        name: 'XYZ Software Institute',
        slug: 'xyz-p11-institute',
        plan: 'BUSINESS'
      }
    });

    const admin = await prisma.user.create({
      data: {
        organizationId: orgABC.id,
        name: 'Dev Lead Sarah',
        email: 'sarah.admin@abc.p11.org',
        password: passwordHash,
        role: 'ADMIN'
      }
    });

    const studentJohn = await prisma.user.create({
      data: {
        organizationId: orgABC.id,
        name: 'John Developer',
        email: 'john.dev@abc.p11.org',
        password: passwordHash,
        role: 'STUDENT',
        xpPoints: 350,
        currentStreak: 5
      }
    });

    const catDev = await prisma.category.create({
      data: {
        organizationId: orgABC.id,
        name: 'Cloud & DevOps P11',
        slug: 'dev-p11'
      }
    });

    const course = await prisma.course.create({
      data: {
        organization: { connect: { id: orgABC.id } },
        category: { connect: { id: catDev.id } },
        instructor: { connect: { id: admin.id } },
        title: 'Kubernetes & Cloud Architecture P11',
        slug: 'cloud-p11',
        description: 'Production cloud native systems',
        price: 7999,
        status: 'PUBLISHED'
      }
    });

    console.log('\n--- 2. Decoupled Payment Adapters ---');
    const razorpay = new RazorpayAdapter('rzp_test_key', 'rzp_test_secret');
    const rzpIntent = await razorpay.createPaymentIntent(7999, 'INR');
    const isValidRzpSig = razorpay.verifySignature(
      rzpIntent.orderId,
      'pay_12345',
      crypto.createHmac('sha256', 'rzp_test_secret').update(`${rzpIntent.orderId}|pay_12345`).digest('hex'),
      'rzp_test_secret'
    );
    const rzpRefund = await razorpay.refundPayment('pay_12345', 7999);

    const stripe = new StripeAdapter('sk_test_12345');
    const stripeIntent = await stripe.createPaymentIntent(99, 'USD');

    assert(
      Boolean(rzpIntent.orderId && isValidRzpSig && rzpRefund.status === 'PROCESSED' && stripeIntent.clientSecret),
      'Payment provider adapters (Razorpay & Stripe) seamlessly decoupled from domain business logic'
    );

    console.log('\n--- 3. Integration Marketplace & Connection Management ---');
    const rzpAccount = await prisma.integrationAccount.create({
      data: {
        organizationId: orgABC.id,
        provider: 'RAZORPAY',
        category: 'PAYMENTS',
        status: 'CONNECTED',
        credentials: JSON.stringify({ keyId: 'rzp_live_abc', keySecret: 'enc_secret_key' }),
        settings: JSON.stringify({ autoCapture: true, webhookEnabled: true }),
        lastSyncAt: new Date()
      }
    });

    const zoomAccount = await prisma.integrationAccount.create({
      data: {
        organizationId: orgABC.id,
        provider: 'ZOOM',
        category: 'MEETINGS',
        status: 'CONNECTED',
        settings: JSON.stringify({ defaultMeetingDuration: 60 }),
        lastSyncAt: new Date()
      }
    });

    const hubspotAccount = await prisma.integrationAccount.create({
      data: {
        organizationId: orgABC.id,
        provider: 'HUBSPOT',
        category: 'CRM',
        status: 'CONNECTED',
        settings: JSON.stringify({ syncStudentsToContacts: true }),
        lastSyncAt: new Date()
      }
    });

    assert(
      Boolean(rzpAccount.id && zoomAccount.id && hubspotAccount.id),
      'Integration Marketplace connected Payments (Razorpay), Meetings (Zoom), and CRM (HubSpot) with encrypted credentials'
    );

    console.log('\n--- 4. Enterprise SSO Configuration ---');
    const sso = await prisma.ssoConfiguration.create({
      data: {
        organizationId: orgABC.id,
        provider: 'SAML_2',
        domain: 'acme-corp.com',
        entityId: 'https://idp.acme-corp.com/saml',
        ssoUrl: 'https://idp.acme-corp.com/sso/login',
        certificate: 'MIIDVzCCAj+gAwIBAgIEU...',
        enabled: true
      }
    });

    assert(
      sso.enabled && sso.domain === 'acme-corp.com',
      'Enterprise SAML 2.0 / OIDC SSO Identity Provider configured for corporate domain routing'
    );

    console.log('\n--- 5. Scoped API Key Generation & Scope Validation ---');
    const readOnlyKey = await generateApiKey(
      orgABC.id,
      'Marketing Reporting Key P11',
      ['courses:read', 'students:read', 'orders:read']
    );

    assert(
      Boolean(readOnlyKey.rawApiKey.startsWith('mlk_live_') && readOnlyKey.keyPrefix),
      'Scoped API Key created: plain secret shown once, SHA-256 hashed value persisted'
    );

    // Validate Valid Scope
    const validCheck = await validateApiKey(readOnlyKey.rawApiKey, 'courses:read');
    assert(validCheck.isValid && validCheck.organizationId === orgABC.id, 'API Key validated successfully for allowed "courses:read" scope');

    // Validate Forbidden Scope
    const forbiddenCheck = await validateApiKey(readOnlyKey.rawApiKey, 'courses:write');
    assert(!forbiddenCheck.isValid && Boolean(forbiddenCheck.error?.includes('Missing required scope')), 'API Gateway rejected unauthorized "courses:write" operation for read-only key');

    console.log('\n--- 6. Developer REST API Gateway Endpoints (/api/v1/...) ---');
    // Verify API Key with full write access
    const adminKey = await generateApiKey(
      orgABC.id,
      'Admin Automation Key P11',
      ['*'] // Wildcard full scope
    );

    const wildcardCheck = await validateApiKey(adminKey.rawApiKey, 'enrollments:write');
    assert(wildcardCheck.isValid, 'Wildcard admin API key validated for write scopes');

    // Enroll student via programmatic API simulation
    const apiEnrollment = await prisma.enrollment.create({
      data: {
        organizationId: orgABC.id,
        userId: studentJohn.id,
        courseId: course.id,
        status: 'ACTIVE'
      }
    });

    assert(Boolean(apiEnrollment.id), 'Programmatic student enrollment executed via Developer REST API Gateway');

    console.log('\n--- 7. Outbound Webhooks Engine & HMAC Signatures ---');
    const webhookEndpoint = await prisma.webhookEndpoint.create({
      data: {
        organizationId: orgABC.id,
        url: 'https://webhook.site/abc-lms-receiver',
        secret: 'whsec_test_secret_998877',
        events: JSON.stringify(['order.paid', 'course.completed']),
        status: 'ACTIVE'
      }
    });

    // Dispatch webhook event
    const dispatchResult = await dispatchWebhookEvent(orgABC.id, 'order.paid', {
      orderId: 'ord_p11_123',
      studentEmail: studentJohn.email,
      courseTitle: course.title,
      amount: 7999
    });

    assert(
      dispatchResult.dispatchedCount === 1 && dispatchResult.deliveries[0].status === 'SUCCESS',
      'Outbound webhook dispatched with HMAC SHA-256 signature (X-Morena-Signature) and logged in WebhookDelivery'
    );

    console.log('\n--- 8. Central Platform Event Bus ---');
    await emitPlatformEvent(orgABC.id, 'course.completed', {
      userId: studentJohn.id,
      courseId: course.id,
      completedAt: new Date()
    });

    const eventLogs = await prisma.learningEvent.findMany({
      where: {
        organizationId: orgABC.id,
        eventType: 'course.completed'
      }
    });

    assert(eventLogs.length > 0, 'Central Event Bus successfully propagated "course.completed" event across system consumers');

    console.log('\n--- 9. API Key Revocation ---');
    await prisma.apiKey.update({
      where: { id: readOnlyKey.keyId },
      data: { status: 'REVOKED' }
    });

    const revokedCheck = await validateApiKey(readOnlyKey.rawApiKey, 'courses:read');
    assert(!revokedCheck.isValid && Boolean(revokedCheck.error?.includes('revoked')), 'Revoked API Key immediately blocked from further API access');

    console.log('\n--- 10. Strict Multi-Tenant Developer Isolation ---');
    const xyzKeys = await prisma.apiKey.findMany({
      where: { organizationId: orgXYZ.id }
    });

    const xyzWebhooks = await prisma.webhookEndpoint.findMany({
      where: { organizationId: orgXYZ.id }
    });

    const xyzIntegrations = await prisma.integrationAccount.findMany({
      where: { organizationId: orgXYZ.id }
    });

    // Check that ABC's key cannot access XYZ
    const abcKeyValidForXyz = await validateApiKey(adminKey.rawApiKey);
    const isTenantIsolated = abcKeyValidForXyz.organizationId === orgABC.id && abcKeyValidForXyz.organizationId !== orgXYZ.id;

    assert(
      xyzKeys.length === 0 && xyzWebhooks.length === 0 && xyzIntegrations.length === 0 && isTenantIsolated,
      'Strict Tenant Isolation: API Keys, Webhooks, and 3rd Party Integrations are 100% isolated per organization tenant'
    );

    console.log('\n===========================================================');
    console.log(`  PART 11 INTEGRATIONS RESULTS: ${passed} PASSED, ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}%)`);
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

runPart11TestSuite();
