import { prisma } from '../src/lib/prisma';
import { encryptSecret, decryptSecret, maskSecret } from '../src/lib/security';
import { EmailService } from '../src/lib/email';

async function runTests() {
  console.log('=== PART 14: SMTP & EMAIL CONFIGURATION AUDIT & VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string) {
    if (condition) {
      console.log(`  [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${title}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: AES-256-GCM Secret Encryption & Decryption
    // -------------------------------------------------------------
    console.log('1. Testing AES-256-GCM Secret Security:');
    const originalSecret = 'SuperSecretSmtpPass123!@#';
    const encrypted = encryptSecret(originalSecret);
    assert(encrypted.includes(':') && encrypted !== originalSecret, 'Password is cryptographically encrypted with IV and Tag');
    const decrypted = decryptSecret(encrypted);
    assert(decrypted === originalSecret, 'Decrypted secret exactly matches original plaintext');
    const masked = maskSecret(encrypted);
    assert(masked === '••••••••', 'Masked secret returns •••••••• for frontend safety');

    // -------------------------------------------------------------
    // TEST 2: Multi-Tenant Organizations Setup
    // -------------------------------------------------------------
    console.log('\n2. Setting up Test Organizations:');
    const orgA = await prisma.organization.upsert({
      where: { slug: 'test-email-org-a' },
      create: { name: 'Alpha Tech Academy', slug: 'test-email-org-a' },
      update: { name: 'Alpha Tech Academy' }
    });
    const orgB = await prisma.organization.upsert({
      where: { slug: 'test-email-org-b' },
      create: { name: 'Beta Design School', slug: 'test-email-org-b' },
      update: { name: 'Beta Design School' }
    });
    assert(Boolean(orgA && orgB), 'Test tenant organizations A & B verified');

    // -------------------------------------------------------------
    // TEST 3: Platform Email Configuration (Super Admin)
    // -------------------------------------------------------------
    console.log('\n3. Testing Super Admin Platform Email Configuration:');
    await prisma.platformEmailConfig.deleteMany();
    const platConfig = await prisma.platformEmailConfig.create({
      data: {
        smtpHost: 'smtp.platform-master.com',
        smtpPort: 587,
        smtpEncryption: 'TLS',
        smtpUsername: 'platform-master-key',
        smtpPasswordEncrypted: encryptSecret('PlatformMasterSecret999'),
        fromName: 'Master Platform Admin',
        fromEmail: 'noreply@platform.io',
        authEnabled: true,
        isEnabled: true,
        lastTestStatus: 'SUCCESS',
        lastTestedAt: new Date()
      }
    });
    assert(platConfig.smtpHost === 'smtp.platform-master.com', 'Platform SMTP host saved');
    assert(platConfig.smtpPasswordEncrypted !== 'PlatformMasterSecret999', 'Platform password stored encrypted in DB');
    const platResolved = await EmailService.resolveSmtpConfig(null);
    assert(platResolved !== null, 'Platform SMTP resolved for global emails');
    assert(platResolved?.providerType === 'PLATFORM_SMTP', 'Platform provider tag is PLATFORM_SMTP');
    assert(platResolved?.config.smtpPassword === 'PlatformMasterSecret999', 'Decrypted server-side for SMTP handshake');

    // -------------------------------------------------------------
    // TEST 4: Organization A SMTP Configuration (Tenant Isolation)
    // -------------------------------------------------------------
    console.log('\n4. Testing Organization A SMTP Scoping:');
    await prisma.organizationEmailConfig.deleteMany({ where: { organizationId: orgA.id } });
    const orgAConfig = await prisma.organizationEmailConfig.create({
      data: {
        organizationId: orgA.id,
        smtpHost: 'smtp.alpha-academy.com',
        smtpPort: 465,
        smtpEncryption: 'SSL',
        smtpUsername: 'alpha-mailer',
        smtpPasswordEncrypted: encryptSecret('AlphaPass456!'),
        fromName: 'Alpha Academy Support',
        fromEmail: 'support@alpha-academy.com',
        isEnabled: true,
        fallbackToPlatform: false
      }
    });
    assert(orgAConfig.organizationId === orgA.id, 'Org A config created with organizationId foreign key');
    const orgAResolved = await EmailService.resolveSmtpConfig(orgA.id);
    assert(orgAResolved?.providerType === 'ORGANIZATION_SMTP', 'Org A email resolves to ORGANIZATION_SMTP');
    assert(orgAResolved?.config.smtpHost === 'smtp.alpha-academy.com', 'Org A host is smtp.alpha-academy.com');
    assert(orgAResolved?.config.smtpPassword === 'AlphaPass456!', 'Org A password decrypted correctly');

    // -------------------------------------------------------------
    // TEST 5: Organization B Tenant Isolation & Fallback
    // -------------------------------------------------------------
    console.log('\n5. Testing Organization B Isolation & Fallback:');
    await prisma.organizationEmailConfig.deleteMany({ where: { organizationId: orgB.id } });
    // Org B has no custom SMTP, fallbackToPlatform = true (default)
    const orgBResolved = await EmailService.resolveSmtpConfig(orgB.id);
    assert(orgBResolved?.providerType === 'PLATFORM_SMTP', 'Org B gracefully falls back to Platform SMTP');
    assert(orgBResolved?.isFallback === true, 'Org B resolution flagged as isFallback = true');

    // -------------------------------------------------------------
    // TEST 6: Organization B Disabling Fallback
    // -------------------------------------------------------------
    console.log('\n6. Testing Strict Fallback Disablement:');
    await prisma.organizationEmailConfig.create({
      data: {
        organizationId: orgB.id,
        smtpHost: '',
        isEnabled: false,
        fallbackToPlatform: false
      }
    });
    const orgBNoFallback = await EmailService.resolveSmtpConfig(orgB.id);
    assert(orgBNoFallback === null, 'When tenant fallback is disabled, does NOT fall back to Platform SMTP');

    // -------------------------------------------------------------
    // TEST 7: Email Dispatch & Audit Logging
    // -------------------------------------------------------------
    console.log('\n7. Testing Email Dispatch & Log Recording:');
    // 7a. Mock host dispatch gracefully logs error without crashing
    const dispatchFailedResult = await EmailService.sendEmail({
      to: 'student@example.com',
      subject: 'Welcome to Alpha Tech Academy',
      template: 'WELCOME',
      data: { name: 'Alex Student', body: 'Your learning journey starts now.' },
      organizationId: orgA.id
    });
    assert(dispatchFailedResult.success === false, 'Invalid mock hostname returns success: false cleanly');
    const logFailed = await prisma.emailLog.findFirst({
      where: { recipientEmail: 'student@example.com' },
      orderBy: { sentAt: 'desc' }
    });
    assert(Boolean(logFailed), 'Email log created in database for failed dispatch');
    assert(logFailed?.organizationId === orgA.id, 'Email log correctly tagged with Org A id');
    assert(logFailed?.status === 'FAILED', 'Email log status recorded as FAILED');
    assert(Boolean(logFailed?.errorMessage), 'Email log recorded error message details');

    // 7b. Console fallback dispatch (when organization has no SMTP and fallback disabled)
    const dispatchConsoleResult = await EmailService.sendEmail({
      to: 'learner@example.com',
      subject: 'Verification Code',
      template: 'OTP_VERIFY',
      data: { otp: '482910' },
      organizationId: orgB.id
    });
    assert(dispatchConsoleResult.success === true, 'Console fallback dispatch returns success: true');
    const logConsole = await prisma.emailLog.findFirst({
      where: { recipientEmail: 'learner@example.com' },
      orderBy: { sentAt: 'desc' }
    });
    assert(Boolean(logConsole), 'Console fallback email log created');
    assert(logConsole?.provider === 'CONSOLE_FALLBACK', 'Email log provider recorded as CONSOLE_FALLBACK');

    // -------------------------------------------------------------
    // TEST 8: Diagnostics & Mock SMTP Connection Test
    // -------------------------------------------------------------
    console.log('\n8. Testing SMTP Diagnostics Handshake:');
    const invalidTest = await EmailService.testConnection({
      smtpHost: '127.0.0.1',
      smtpPort: 19999, // Unused port
      smtpEncryption: 'TLS',
      fromName: 'Test',
      fromEmail: 'test@example.com'
    });
    assert(invalidTest.success === false, 'Invalid SMTP host/port returns success: false with user-friendly message');

    console.log(`\n=======================================================`);
    console.log(`PART 14 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=======================================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err: any) {
    console.error('Audit Error:', err);
    process.exit(1);
  }
}

runTests();
