process.env.EMAIL_SIMULATE = 'true';

import { prisma } from './src/lib/prisma';
import { EmailService } from './src/lib/email';
import { encryptSecret, decryptSecret, maskSecret, savePendingOtp, verifyPendingOtp, generateOtp } from './src/lib/security';

async function runTests() {
  console.log('\n========================================================================');
  console.log('🚀 AADHYARA MULTI-TENANT SMTP & EMAIL SYSTEM — COMPREHENSIVE TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error(`   └─ Error: ${detail}`);
      failed++;
    }
  };

  try {
    // ------------------------------------------------------------------------
    // SETUP: Clean and provision test organizations & configurations
    // ------------------------------------------------------------------------
    console.log('🛠️  Preparing Test Database State...');

    // 1. Provision Platform SMTP (single master record)
    await prisma.platformEmailConfig.deleteMany();
    const platformConfig = await prisma.platformEmailConfig.create({
      data: {
        id: 'platform-default',
        smtpHost: 'smtp.aadhyara-platform.com',
        smtpPort: 587,
        smtpEncryption: 'TLS',
        smtpUsername: 'platform@aadhyara.com',
        smtpPasswordEncrypted: encryptSecret('PlatformMasterSecretPass2026!'),
        fromName: 'AADHYARA Platform',
        fromEmail: 'platform@aadhyara.com',
        replyTo: 'support@aadhyara.com',
        isEnabled: true
      }
    });

    // 2. Provision Company A: XYZ Company
    const orgA = await prisma.organization.upsert({
      where: { slug: 'xyz-test-company' },
      create: {
        name: 'XYZ Company',
        slug: 'xyz-test-company',
        status: 'ACTIVE',
        plan: 'PRO'
      },
      update: { name: 'XYZ Company', status: 'ACTIVE' }
    });

    const smtpA = await prisma.organizationEmailConfig.upsert({
      where: { organizationId: orgA.id },
      create: {
        organizationId: orgA.id,
        smtpHost: 'smtp.xyzcompany.com',
        smtpPort: 587,
        smtpEncryption: 'TLS',
        smtpUsername: 'xyz@gmail.com',
        smtpPasswordEncrypted: encryptSecret('XYZSecretAppPassword123!'),
        fromName: 'XYZ Academy',
        fromEmail: 'xyz@gmail.com',
        isEnabled: true,
        fallbackToPlatform: true
      },
      update: {
        smtpHost: 'smtp.xyzcompany.com',
        smtpPort: 587,
        smtpEncryption: 'TLS',
        smtpUsername: 'xyz@gmail.com',
        smtpPasswordEncrypted: encryptSecret('XYZSecretAppPassword123!'),
        fromName: 'XYZ Academy',
        fromEmail: 'xyz@gmail.com',
        isEnabled: true,
        fallbackToPlatform: true
      }
    });

    // 3. Provision Company B: 123 Company
    const orgB = await prisma.organization.upsert({
      where: { slug: '123-test-company' },
      create: {
        name: '123 Company',
        slug: '123-test-company',
        status: 'ACTIVE',
        plan: 'ENTERPRISE'
      },
      update: { name: '123 Company', status: 'ACTIVE' }
    });

    const smtpB = await prisma.organizationEmailConfig.upsert({
      where: { organizationId: orgB.id },
      create: {
        organizationId: orgB.id,
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpEncryption: 'TLS',
        smtpUsername: 'admin@123company.com',
        smtpPasswordEncrypted: encryptSecret('123Office365SecretPass456!'),
        fromName: '123 Masterclass',
        fromEmail: 'admin@123company.com',
        isEnabled: true,
        fallbackToPlatform: true
      },
      update: {
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpEncryption: 'TLS',
        smtpUsername: 'admin@123company.com',
        smtpPasswordEncrypted: encryptSecret('123Office365SecretPass456!'),
        fromName: '123 Masterclass',
        fromEmail: 'admin@123company.com',
        isEnabled: true,
        fallbackToPlatform: true
      }
    });

    console.log('✅ State initialized successfully.\n');

    // ------------------------------------------------------------------------
    // TEST 1: AES-256-GCM Encryption & Masking
    // ------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: AES-256-GCM SECURITY & SECRETS ---');
    const rawSecret = 'MySuperSensitiveSmtpAppPass2026';
    const encrypted = encryptSecret(rawSecret);
    const decrypted = decryptSecret(encrypted);
    const masked = maskSecret(encrypted);

    assert(encrypted !== rawSecret && encrypted.includes(':'), 'AES-256-GCM Encrypts with IV and Auth Tag', `Cipher: ${encrypted.slice(0, 24)}...`);
    assert(decrypted === rawSecret, 'AES-256-GCM Decrypts accurately server-side');
    assert(masked === '••••••••', 'Masks secret as •••••••• for frontend rendering');

    // ------------------------------------------------------------------------
    // TEST 2: Company A (XYZ Company) SMTP Resolution
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: TENANT-ISOLATED SMTP RESOLUTION ---');
    const resolvedA = await EmailService.resolveSmtpConfig(orgA.id);
    assert(
      resolvedA !== null &&
      resolvedA.providerType === 'ORGANIZATION_SMTP' &&
      resolvedA.config.smtpHost === 'smtp.xyzcompany.com' &&
      resolvedA.config.fromEmail === 'xyz@gmail.com' &&
      resolvedA.config.fromName === 'XYZ Academy',
      'XYZ Company email resolves to XYZ Dedicated SMTP',
      `Resolved Host: ${resolvedA?.config.smtpHost}, From: ${resolvedA?.config.fromEmail}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Company B (123 Company) SMTP Resolution
    // ------------------------------------------------------------------------
    const resolvedB = await EmailService.resolveSmtpConfig(orgB.id);
    assert(
      resolvedB !== null &&
      resolvedB.providerType === 'ORGANIZATION_SMTP' &&
      resolvedB.config.smtpHost === 'smtp.office365.com' &&
      resolvedB.config.fromEmail === 'admin@123company.com' &&
      resolvedB.config.fromName === '123 Masterclass',
      '123 Company email resolves to 123 Dedicated SMTP',
      `Resolved Host: ${resolvedB?.config.smtpHost}, From: ${resolvedB?.config.fromEmail}`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Zero Cross-Tenant SMTP Leakage
    // ------------------------------------------------------------------------
    assert(
      resolvedA?.config.smtpUsername !== resolvedB?.config.smtpUsername &&
      resolvedA?.config.fromEmail !== resolvedB?.config.fromEmail,
      'Zero Cross-Tenant Leakage between Company A and Company B'
    );

    // ------------------------------------------------------------------------
    // TEST 5: Automatic Platform Fallback when Tenant SMTP is Disabled
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: AUTOMATIC PLATFORM FALLBACK CASCADES ---');
    await prisma.organizationEmailConfig.update({
      where: { organizationId: orgA.id },
      data: { isEnabled: false }
    });

    const fallbackResolved = await EmailService.resolveSmtpConfig(orgA.id);
    assert(
      fallbackResolved !== null &&
      fallbackResolved.providerType === 'PLATFORM_SMTP' &&
      fallbackResolved.config.fromEmail === 'platform@aadhyara.com' &&
      fallbackResolved.isFallback === true,
      'When XYZ SMTP is disabled, automatically falls back to Platform SMTP',
      `Fallback Provider: ${fallbackResolved?.providerType}, Host: ${fallbackResolved?.config.smtpHost}`
    );

    // ------------------------------------------------------------------------
    // TEST 6: Automatic Return to Tenant SMTP on Re-enable
    // ------------------------------------------------------------------------
    await prisma.organizationEmailConfig.update({
      where: { organizationId: orgA.id },
      data: { isEnabled: true }
    });

    const restoredResolved = await EmailService.resolveSmtpConfig(orgA.id);
    assert(
      restoredResolved !== null &&
      restoredResolved.providerType === 'ORGANIZATION_SMTP' &&
      restoredResolved.config.fromEmail === 'xyz@gmail.com',
      'When XYZ SMTP is re-enabled, instantly routes through XYZ SMTP again'
    );

    // ------------------------------------------------------------------------
    // TEST 7: Multi-Tenant Email Dispatch & Audit Logging
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: DISPATCH & LOGGING ISOLATION ---');
    const sendResultA = await EmailService.sendEmail({
      to: 'student@xyzcustomer.com',
      subject: 'Welcome to XYZ Academy',
      template: 'WELCOME',
      organizationId: orgA.id,
      data: { name: 'Rahul Sharma', companyName: 'XYZ Company' }
    });

    assert(sendResultA.success === true, 'Dispatches email for XYZ student successfully');

    const sendResultB = await EmailService.sendEmail({
      to: 'learner@123client.com',
      subject: 'Your 123 Masterclass Certificate',
      template: 'CERTIFICATE',
      organizationId: orgB.id,
      data: { name: 'Priya Verma', companyName: '123 Company', courseTitle: 'Advanced AI' }
    });

    assert(sendResultB.success === true, 'Dispatches email for 123 student successfully');

    // Verify Email Logs Scoping
    const logsOrgA = await prisma.emailLog.findMany({
      where: { organizationId: orgA.id }
    });
    const logsOrgB = await prisma.emailLog.findMany({
      where: { organizationId: orgB.id }
    });

    assert(
      logsOrgA.every((l) => l.organizationId === orgA.id) &&
      !logsOrgA.some((l) => l.recipientEmail === 'learner@123client.com'),
      'XYZ Company logs contain ONLY XYZ emails (100% Tenant Scoped)'
    );

    assert(
      logsOrgB.every((l) => l.organizationId === orgB.id) &&
      !logsOrgB.some((l) => l.recipientEmail === 'student@xyzcustomer.com'),
      '123 Company logs contain ONLY 123 emails (100% Tenant Scoped)'
    );

    // ------------------------------------------------------------------------
    // TEST 8: Cryptographic Registration OTP Flow
    // ------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: CRYPTOGRAPHIC OTP FLOW & EXPIRY ---');
    const { otp, hash } = generateOtp(6);
    const testEmail = 'newfounder@startup.com';

    await savePendingOtp(testEmail, hash, 15);
    const badVerify = await verifyPendingOtp(testEmail, '999999');
    assert(badVerify.success === false, 'Rejects incorrect OTP');

    const goodVerify = await verifyPendingOtp(testEmail, otp);
    assert(goodVerify.success === true, 'Accepts valid OTP and verifies hash');

    const reuseVerify = await verifyPendingOtp(testEmail, otp);
    assert(reuseVerify.success === false, 'Invalidates OTP upon first use (Single-use guarantee)');

    // ------------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------------
    console.log('\n🧹 Cleaning up test artifacts...');
    await prisma.organizationEmailConfig.deleteMany({
      where: { organizationId: { in: [orgA.id, orgB.id] } }
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgA.id, orgB.id] } }
    });

    console.log('\n========================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('💥 Unhandled Exception in Test Suite:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
