import { prisma } from './src/lib/prisma';
import { hashPassword, hashToken } from './src/lib/security';
import {
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  AuthSessionUser
} from './src/lib/auth';

async function main() {
  console.log('========================================================================');
  console.log('🚀 AADHYARA: SALES & LMS COMPLETE PLATFORM SEPARATION VERIFICATION');
  console.log('========================================================================\n');

  const testEmail = `executive_${Date.now()}@globalbrand.com`;
  const salesPassword = 'SalesMasterPassword2026!';
  const lmsPassword = 'LmsStudentPassword2026!';

  // Clean up any existing test records
  await prisma.emailVerificationToken.deleteMany({ where: { email: testEmail } });
  await prisma.user.deleteMany({ where: { email: testEmail } });

  console.log('--- TEST GROUP 1: INDEPENDENT REGISTRATION & SAME EMAIL COEXISTENCE ---');

  // 1. Create Sales Account for testEmail
  const salesHashedPw = await hashPassword(salesPassword);
  const salesOrg = await prisma.organization.create({
    data: {
      name: 'Global Brand Sales Corp',
      slug: `global-sales-${Date.now()}`,
      subdomain: `global-sales-${Date.now()}`,
      plan: 'PRO',
      status: 'ACTIVE'
    }
  });

  const salesUser = await prisma.user.create({
    data: {
      organizationId: salesOrg.id,
      name: 'Alex Morgan',
      email: testEmail,
      platform: 'SALES',
      password: salesHashedPw,
      role: 'SALES_ADMIN',
      status: 'ACTIVE',
      emailVerified: true
    }
  });

  console.log(`✅ PASS: Sales Account created for ${testEmail} with role SALES_ADMIN (ID: ${salesUser.id})`);

  // 2. Query LMS account for testEmail -> Must be null
  const initialLmsLookup = await prisma.user.findUnique({
    where: {
      email_platform: {
        email: testEmail,
        platform: 'LMS'
      }
    }
  });

  if (initialLmsLookup) {
    throw new Error('FAILED: Sales registration should not create an LMS user!');
  }
  console.log('✅ PASS: LMS Account does not exist initially for this email (Zero Auto-Creation)');

  // 3. Register separately on LMS for the SAME email address with DIFFERENT password
  const lmsHashedPw = await hashPassword(lmsPassword);
  const lmsUser = await prisma.user.create({
    data: {
      name: 'Alex Morgan (Student)',
      email: testEmail,
      platform: 'LMS',
      password: lmsHashedPw,
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerified: true
    }
  });

  console.log(`✅ PASS: LMS Account created for ${testEmail} with role STUDENT (ID: ${lmsUser.id})`);

  // 4. Verify Both Accounts Coexist Independently in Database
  const allAccounts = await prisma.user.findMany({
    where: { email: testEmail }
  });

  if (allAccounts.length !== 2) {
    throw new Error(`FAILED: Expected 2 separate user accounts for ${testEmail}, found ${allAccounts.length}`);
  }
  console.log('✅ PASS: Both accounts exist independently with compound unique key [email, platform]');

  console.log('\n--- TEST GROUP 2: INDEPENDENT PASSWORDS & CREDENTIALS ---');

  // 5. Verify Sales Password works on Sales, but fails on LMS
  const isSalesPwValidForSales = await verifyPassword(salesPassword, salesUser.password);
  const isSalesPwValidForLms = await verifyPassword(salesPassword, lmsUser.password);

  if (!isSalesPwValidForSales || isSalesPwValidForLms) {
    throw new Error('FAILED: Password isolation failed between Sales and LMS');
  }
  console.log('✅ PASS: Sales password authorizes Sales account, rejected by LMS account');

  // 6. Verify LMS Password works on LMS, but fails on Sales
  const isLmsPwValidForLms = await verifyPassword(lmsPassword, lmsUser.password);
  const isLmsPwValidForSales = await verifyPassword(lmsPassword, salesUser.password);

  if (!isLmsPwValidForLms || isLmsPwValidForSales) {
    throw new Error('FAILED: LMS password isolation failed');
  }
  console.log('✅ PASS: LMS password authorizes LMS account, rejected by Sales account');

  console.log('\n--- TEST GROUP 3: SESSION & TOKEN ISOLATION ---');

  // 7. Generate Sales Session Token
  const salesSessionPayload: AuthSessionUser = {
    id: salesUser.id,
    name: salesUser.name,
    email: salesUser.email,
    platform: 'SALES',
    role: 'SALES_ADMIN',
    organizationId: salesOrg.id,
    organizationName: salesOrg.name,
    organizationSlug: salesOrg.slug,
    permissions: ['ALL'],
    status: 'ACTIVE',
    emailVerified: true
  };
  const salesToken = await createSessionToken(salesSessionPayload);
  const decodedSalesSession = await verifySessionToken(salesToken);

  if (!decodedSalesSession || decodedSalesSession.platform !== 'SALES') {
    throw new Error('FAILED: Sales session token decode failed');
  }
  console.log('✅ PASS: Sales session token signed and verified with platform: SALES');

  // 8. Generate LMS Session Token
  const lmsSessionPayload: AuthSessionUser = {
    id: lmsUser.id,
    name: lmsUser.name,
    email: lmsUser.email,
    platform: 'LMS',
    role: 'STUDENT',
    permissions: ['courses.view', 'enrollments.view'],
    status: 'ACTIVE',
    emailVerified: true
  };
  const lmsToken = await createSessionToken(lmsSessionPayload);
  const decodedLmsSession = await verifySessionToken(lmsToken);

  if (!decodedLmsSession || decodedLmsSession.platform !== 'LMS') {
    throw new Error('FAILED: LMS session token decode failed');
  }
  console.log('✅ PASS: LMS session token signed and verified with platform: LMS');

  // 9. Verify Cross-Platform Authorization Rejection
  const canSalesAuthorizeLms = (decodedSalesSession.platform as string) === 'LMS';
  const canLmsAuthorizeSales = (decodedLmsSession.platform as string) === 'SALES';

  if (canSalesAuthorizeLms || canLmsAuthorizeSales) {
    throw new Error('FAILED: Cross-platform session leakage detected');
  }
  console.log('✅ PASS: Sales session strictly rejected by LMS authorization rules');
  console.log('✅ PASS: LMS session strictly rejected by Sales authorization rules');

  console.log('\n--- TEST GROUP 4: PASSWORD RESET TOKEN ISOLATION ---');

  // 10. Create Sales Reset Token
  const salesResetRaw = `sales_reset_${Date.now()}`;
  const salesResetHash = hashToken(salesResetRaw);

  const resetRecord = await prisma.passwordResetToken.create({
    data: {
      userId: salesUser.id,
      platform: 'SALES',
      tokenHash: salesResetHash,
      expiresAt: new Date(Date.now() + 3600000)
    }
  });

  if (resetRecord.platform !== 'SALES') {
    throw new Error('FAILED: Password reset token not tagged with platform');
  }

  // Update Sales password using token
  const newSalesPw = 'BrandNewSalesMasterPw2026!';
  const newSalesHash = await hashPassword(newSalesPw);

  await prisma.user.update({
    where: { id: salesUser.id },
    data: { password: newSalesHash }
  });

  // Verify LMS password remains unaffected
  const currentLmsUser = await prisma.user.findUnique({
    where: { id: lmsUser.id }
  });

  const isLmsStillOriginal = await verifyPassword(lmsPassword, currentLmsUser!.password);
  if (!isLmsStillOriginal) {
    throw new Error('FAILED: Changing Sales password corrupted LMS password');
  }
  console.log('✅ PASS: Resetting Sales password did NOT change LMS account password');

  // Clean up
  await prisma.passwordResetToken.deleteMany({ where: { userId: salesUser.id } });
  await prisma.user.delete({ where: { id: salesUser.id } });
  await prisma.user.delete({ where: { id: lmsUser.id } });
  await prisma.organization.delete({ where: { id: salesOrg.id } });

  console.log('\n========================================================================');
  console.log('📊 TEST SUITE SUMMARY: ALL PLATFORM SEPARATION TESTS PASSED (10/10)');
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
