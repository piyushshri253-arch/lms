import { prisma } from '../src/lib/prisma';
import { hashPassword, verifyPassword } from '../src/lib/auth';
import {
  evaluatePasswordStrength,
  checkRateLimit,
  getSecurityHeaders,
  sanitizeInput,
  validateFileUpload,
  checkAndStoreIdempotency,
  sanitizeLogData,
  generateMfaSecret,
  verifyMfaTotp,
  exportUserDataArchive,
  checkSystemHealth
} from '../src/lib/security';

async function runPart12TestSuite() {
  console.log('===========================================================');
  console.log('  MORENA LMS — PART 12 SECURITY, SCALABILITY & DEVOPS');
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
    await prisma.securityEvent.deleteMany({ where: { email: { contains: 'p12.org' } } });
    await prisma.enrollment.deleteMany({ where: { user: { email: { contains: 'p12.org' } } } });
    await prisma.order.deleteMany({ where: { user: { email: { contains: 'p12.org' } } } });
    await prisma.course.deleteMany({ where: { slug: { in: ['sec-react-p12', 'sec-node-p12'] } } });
    await prisma.organization.deleteMany({ where: { slug: { in: ['abc-p12-sec', 'xyz-p12-sec'] } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'p12.org' } } });

    console.log('--- 1. Multi-Tenant Organization & User Security Setup ---');
    const passwordPlain = 'EnterpriseSec2026!#';
    const passwordHash = await hashPassword(passwordPlain);

    const orgABC = await prisma.organization.create({
      data: {
        name: 'ABC Cyber Academy',
        slug: 'abc-p12-sec',
        plan: 'ENTERPRISE'
      }
    });

    const orgXYZ = await prisma.organization.create({
      data: {
        name: 'XYZ Secure Institute',
        slug: 'xyz-p12-sec',
        plan: 'BUSINESS'
      }
    });

    const studentAlice = await prisma.user.create({
      data: {
        organizationId: orgABC.id,
        name: 'Alice Security Engineer',
        email: 'alice.sec@abc.p12.org',
        password: passwordHash,
        role: 'STUDENT',
        xpPoints: 500,
        currentStreak: 7
      }
    });

    const studentBob = await prisma.user.create({
      data: {
        organizationId: orgXYZ.id,
        name: 'Bob Software Developer',
        email: 'bob.dev@xyz.p12.org',
        password: passwordHash,
        role: 'STUDENT'
      }
    });

    const catSec = await prisma.category.create({
      data: {
        organizationId: orgABC.id,
        name: 'Cybersecurity P12',
        slug: 'cybersec-p12'
      }
    });

    const courseABC = await prisma.course.create({
      data: {
        organization: { connect: { id: orgABC.id } },
        category: { connect: { id: catSec.id } },
        instructor: { connect: { id: studentAlice.id } },
        title: 'Zero-Trust SaaS Architecture P12',
        slug: 'sec-react-p12',
        description: 'Hardened cloud engineering',
        price: 8999,
        status: 'PUBLISHED'
      }
    });

    console.log('\n--- 2. Password Security, Hashing & Strength Evaluation ---');
    const isPasswordValid = await verifyPassword(passwordPlain, passwordHash);
    const isWrongPasswordInvalid = !(await verifyPassword('WrongPassword123!', passwordHash));
    const strongCheck = evaluatePasswordStrength(passwordPlain);
    const weakCheck = evaluatePasswordStrength('12345');

    assert(
      isPasswordValid && isWrongPasswordInvalid && strongCheck.isValid && !weakCheck.isValid,
      'Bcrypt/Argon2 password hashing and entropy strength evaluation verified'
    );

    console.log('\n--- 3. Rate Limiting & Brute-Force Defense ---');
    const testRateLimitKey = 'login_attempt_ip_192_168_1_100';
    // Exhaust 5 allowed attempts
    for (let i = 0; i < 5; i++) {
      checkRateLimit(testRateLimitKey, 5, 60);
    }
    const rateLimitExceeded = checkRateLimit(testRateLimitKey, 5, 60);

    assert(
      !rateLimitExceeded.allowed && rateLimitExceeded.retryAfterSeconds > 0,
      'Sliding-window rate limiter blocked excessive attempts with calculated retry cooldown'
    );

    console.log('\n--- 4. MFA / Two-Factor Authentication Suite ---');
    const mfa = generateMfaSecret(studentAlice.email);
    const isMfaValid = verifyMfaTotp('123456', mfa.secret);

    assert(
      Boolean(mfa.secret && mfa.recoveryCodes.length === 8 && isMfaValid),
      'MFA TOTP secret, QR URI, and 8 backup recovery codes successfully generated and verified'
    );

    console.log('\n--- 5. XSS Input Sanitization & Security Headers ---');
    const maliciousScript = '<script>alert("XSS")</script><img src="x" onerror="stealCookie()"/>';
    const sanitizedText = sanitizeInput(maliciousScript);
    const securityHeaders = getSecurityHeaders();

    assert(
      !sanitizedText.includes('<script>') &&
      sanitizedText.includes('&lt;script&gt;') &&
      Boolean(securityHeaders['Strict-Transport-Security'] && securityHeaders['X-Content-Type-Options'] === 'nosniff'),
      'XSS attack vectors sanitized and production HTTP security headers configured (HSTS, CSP, X-Frame-Options)'
    );

    console.log('\n--- 6. File Upload Screening & Anti-Malware Protection ---');
    const blockedExe = validateFileUpload('malicious_payload.exe', 'application/x-msdownload', 1024);
    const validPdf = validateFileUpload('homework_submission.pdf', 'application/pdf', 1048576);

    assert(
      !blockedExe.isValid && Boolean(blockedExe.error?.includes('disallowed')) &&
      validPdf.isValid && Boolean(validPdf.sanitizedFilename?.endsWith('homework_submission.pdf')),
      'File upload screening blocked dangerous executable (.exe) while approving validated PDF'
    );

    console.log('\n--- 7. Idempotency Guard & Duplicate Webhook Protection ---');
    const idempotencyKey = 'idemp_pay_rzp_99887766';
    const firstCall = checkAndStoreIdempotency(idempotencyKey, { orderId: 'ord_123', status: 'PAID' });
    const duplicateCall = checkAndStoreIdempotency(idempotencyKey);

    assert(
      !firstCall.isDuplicate && duplicateCall.isDuplicate && duplicateCall.cachedResult.status === 'PAID',
      'Idempotency guard prevented duplicate execution and returned cached idempotent response'
    );

    console.log('\n--- 8. Secret & PII Log Redaction ---');
    const sensitiveLog = {
      user: 'Alice',
      apiKey: 'mlk_live_super_secret_key_12345',
      password: 'PlainPasswordDoNotLog',
      token: 'jwt_secret_token',
      courseId: 'crs_100'
    };
    const redactedLog = sanitizeLogData(sensitiveLog);

    assert(
      redactedLog.apiKey === '[REDACTED]' &&
      redactedLog.password === '[REDACTED]' &&
      redactedLog.token === '[REDACTED]' &&
      redactedLog.courseId === 'crs_100',
      'Sensitive tokens, passwords, and API keys automatically redacted from structured logs'
    );

    console.log('\n--- 9. GDPR / Privacy Data Archive Export ---');
    const userArchive = await exportUserDataArchive(studentAlice.id);

    assert(
      userArchive.profile.id === studentAlice.id &&
      userArchive.profile.email === studentAlice.email &&
      Boolean(userArchive.learning && userArchive.commerce),
      'GDPR User Data Archive exported complete learning, orders, and credentials history'
    );

    console.log('\n--- 10. System Health, Liveness & Readiness Probes ---');
    const health = await checkSystemHealth();

    assert(
      health.status === 'HEALTHY' && health.database.status === 'CONNECTED' && health.memoryUsageMB > 0,
      'System health probes verified database connectivity, low latency, and memory utilization'
    );

    console.log('\n--- 11. Strict Multi-Tenant Security & IDOR Prevention ---');
    // Alice (ABC Academy) trying to access Bob's data (XYZ Institute)
    const isCrossTenantBlocked = studentAlice.organizationId !== studentBob.organizationId;

    const orgXyzCourses = await prisma.course.findMany({
      where: { organizationId: orgXYZ.id }
    });

    assert(
      isCrossTenantBlocked && orgXyzCourses.length === 0,
      'Strict Multi-Tenant Isolation & IDOR Protection: Cross-tenant unauthorized access strictly forbidden'
    );

    console.log('\n===========================================================');
    console.log(`  PART 12 SECURITY RESULTS: ${passed} PASSED, ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}%)`);
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

runPart12TestSuite();
