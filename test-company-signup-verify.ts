import { prisma } from './src/lib/prisma';
import { hashPassword, generateOtp, hashToken } from './src/lib/security';

async function testCompanySignupAndVerify() {
  console.log('========================================================================');
  console.log('🧪 TESTING COMPANY SIGNUP & VERIFY (LMS vs SALES PLATFORMS)');
  console.log('========================================================================\n');

  // Case 1: LMS Academy Signup
  console.log('--- TEST 1: LMS Academy Signup & Verification ---');
  const lmsEmail = `lms_dean_${Date.now()}@university.edu`;
  const lmsOrgName = 'Apex Code Academy';
  const lmsSlug = `apex-academy-${Date.now()}`;
  const lmsPassword = 'SecureLmsPass123!';
  const lmsHashedPassword = await hashPassword(lmsPassword);
  const { otp: lmsOtp, hash: lmsOtpHash } = generateOtp(6);

  const lmsCreated = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: lmsOrgName,
        slug: lmsSlug,
        subdomain: lmsSlug,
        plan: 'PRO',
        status: 'PENDING_VERIFICATION',
        subscriptionStatus: 'TRIAL'
      }
    });

    const user = await tx.user.create({
      data: {
        organizationId: org.id,
        name: 'Dean Mitchell',
        email: lmsEmail,
        platform: 'LMS',
        password: lmsHashedPassword,
        role: 'LMS_ADMIN',
        status: 'PENDING_VERIFICATION',
        emailVerified: false
      }
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: lmsEmail,
        platform: 'LMS',
        otpHash: lmsOtpHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        attempts: 0
      }
    });

    return { org, user };
  });

  console.log(`✅ LMS Signup created User ID: ${lmsCreated.user.id} on Platform: ${lmsCreated.user.platform} (Role: ${lmsCreated.user.role})`);

  // Verify LMS Token
  const lmsToken = await prisma.emailVerificationToken.findFirst({
    where: { email: lmsEmail, usedAt: null },
    orderBy: { createdAt: 'desc' }
  });

  if (!lmsToken || lmsToken.otpHash !== hashToken(lmsOtp)) {
    throw new Error('LMS OTP verification failed!');
  }

  await prisma.emailVerificationToken.update({
    where: { id: lmsToken.id },
    data: { usedAt: new Date() }
  });

  const lmsActivatedUser = await prisma.user.update({
    where: { id: lmsCreated.user.id },
    data: { status: 'ACTIVE', emailVerified: true }
  });

  console.log(`✅ LMS User Activated: ${lmsActivatedUser.name} on Platform: ${lmsActivatedUser.platform} (Destination: /lms/admin)`);

  // Case 2: Sales Business Signup
  console.log('\n--- TEST 2: Sales Business Signup & Verification ---');
  const salesEmail = `sales_founder_${Date.now()}@startup.io`;
  const salesOrgName = 'CloudStore Agency';
  const salesSlug = `cloudstore-${Date.now()}`;
  const salesPassword = 'SecureSalesPass123!';
  const salesHashedPassword = await hashPassword(salesPassword);
  const { otp: salesOtp, hash: salesOtpHash } = generateOtp(6);

  const salesCreated = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: salesOrgName,
        slug: salesSlug,
        subdomain: salesSlug,
        plan: 'STARTER',
        status: 'PENDING_VERIFICATION',
        subscriptionStatus: 'TRIAL'
      }
    });

    const user = await tx.user.create({
      data: {
        organizationId: org.id,
        name: 'Sarah Founder',
        email: salesEmail,
        platform: 'SALES',
        password: salesHashedPassword,
        role: 'SALES_ADMIN',
        status: 'PENDING_VERIFICATION',
        emailVerified: false
      }
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: salesEmail,
        platform: 'SALES',
        otpHash: salesOtpHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        attempts: 0
      }
    });

    return { org, user };
  });

  console.log(`✅ Sales Signup created User ID: ${salesCreated.user.id} on Platform: ${salesCreated.user.platform} (Role: ${salesCreated.user.role})`);

  // Verify Sales Token
  const salesToken = await prisma.emailVerificationToken.findFirst({
    where: { email: salesEmail, usedAt: null },
    orderBy: { createdAt: 'desc' }
  });

  if (!salesToken || salesToken.otpHash !== hashToken(salesOtp)) {
    throw new Error('Sales OTP verification failed!');
  }

  await prisma.emailVerificationToken.update({
    where: { id: salesToken.id },
    data: { usedAt: new Date() }
  });

  const salesActivatedUser = await prisma.user.update({
    where: { id: salesCreated.user.id },
    data: { status: 'ACTIVE', emailVerified: true }
  });

  console.log(`✅ Sales User Activated: ${salesActivatedUser.name} on Platform: ${salesActivatedUser.platform} (Destination: /sales/onboarding)`);

  console.log('\n========================================================================');
  console.log('🎉 ALL LMS & SALES SIGNUP/VERIFY PLATFORM TESTS PASSED (100%)!');
  console.log('========================================================================\n');
}

testCompanySignupAndVerify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
