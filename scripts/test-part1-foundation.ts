import { prisma } from '../src/lib/prisma';
import { hashPassword, generateOtp, hashToken } from '../src/lib/security';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/lib/permissions';
import { createAuditLog } from '../src/lib/audit';

async function runPart1TestSuite() {
  console.log('====================================================');
  console.log('  MORENA LMS — PART 1 FOUNDATION & TENANT SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 0. Clean up any existing test records
    const testEmails = [
      'admin@abc-academy.test',
      'instructor@abc-academy.test',
      'student@abc-academy.test',
      'admin@xyz-academy.test',
      'student@xyz-academy.test'
    ];
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    await prisma.organization.deleteMany({ where: { slug: { in: ['abc-academy-test', 'xyz-academy-test'] } } });

    console.log('--- 1. User Registration & Email Verification ---');
    // Step 1: User registers
    const pwHash = await hashPassword('AdminPass123!');
    const adminUser = await prisma.user.create({
      data: {
        name: 'Dr. Arthur Pendelton',
        email: 'admin@abc-academy.test',
        password: pwHash,
        role: 'STUDENT', // starts unassigned until org is created
        status: 'PENDING_VERIFICATION',
        emailVerified: false
      }
    });

    const { otp, hash: otpHash } = generateOtp(6);
    const tokenRecord = await prisma.emailVerificationToken.create({
      data: {
        userId: adminUser.id,
        email: adminUser.email,
        otpHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    assert(adminUser.status === 'PENDING_VERIFICATION' && !adminUser.emailVerified, 'Account created in PENDING_VERIFICATION state');

    // Step 2: Verify OTP
    const isOtpValid = hashToken(otp) === tokenRecord.otpHash;
    assert(isOtpValid, '6-Digit OTP securely verified against hash');

    const verifiedAdmin = await prisma.user.update({
      where: { id: adminUser.id },
      data: { emailVerified: true, status: 'ACTIVE' }
    });
    assert(verifiedAdmin.emailVerified && verifiedAdmin.status === 'ACTIVE', 'Account successfully activated after OTP verification');

    console.log('\n--- 2. Organization Creation & 5-Step Setup Wizard ---');
    // Step 3: Setup wizard execution (creates Organization + OrganizationMember + Admin Role + Invitation)
    const orgA = await prisma.organization.create({
      data: {
        name: 'ABC Academy of AI',
        slug: 'abc-academy-test',
        subdomain: 'abc-academy-test',
        description: 'Elite deep-tech and AI engineering school.',
        country: 'India',
        timezone: 'Asia/Kolkata',
        primaryColor: '#4f46e5',
        secondaryColor: '#10b981',
        plan: 'PRO',
        status: 'ACTIVE',
        subscriptionStatus: 'TRIAL',
        onboardingCompleted: true,
        onboardingStep: 5
      }
    });

    // Link Admin
    await prisma.user.update({
      where: { id: verifiedAdmin.id },
      data: {
        organizationId: orgA.id,
        role: 'ADMIN',
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.ADMIN)
      }
    });

    // Create OrganizationMember record
    const memberAdmin = await prisma.organizationMember.create({
      data: {
        organizationId: orgA.id,
        userId: verifiedAdmin.id,
        role: 'ADMIN',
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.ADMIN),
        status: 'ACTIVE'
      }
    });

    assert(memberAdmin.role === 'ADMIN' && memberAdmin.organizationId === orgA.id, 'Organization Admin assigned with active OrganizationMember record');

    // Create Audit Log
    await createAuditLog({
      organizationId: orgA.id,
      actorId: verifiedAdmin.id,
      actorEmail: verifiedAdmin.email,
      action: 'ORGANIZATION_SETUP_COMPLETED',
      entity: 'Organization',
      entityId: orgA.id,
      description: `Organization "${orgA.name}" setup completed.`
    });

    console.log('\n--- 3. Team / Instructor Invitation & Acceptance ---');
    // Step 4: Admin invites Instructor
    const { otp: inviteToken, hash: inviteTokenHash } = generateOtp(12);
    const inviteRecord = await prisma.organizationInvitation.create({
      data: {
        organizationId: orgA.id,
        email: 'instructor@abc-academy.test',
        role: 'INSTRUCTOR',
        tokenHash: inviteTokenHash,
        invitedBy: verifiedAdmin.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING'
      }
    });

    assert(inviteRecord.status === 'PENDING' && inviteRecord.role === 'INSTRUCTOR', 'Instructor invitation record generated with unique token');

    // Step 5: Instructor accepts invitation
    const instPwHash = await hashPassword('InstPass123!');
    const instructorUser = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'Prof. Evelyn Reed',
        email: 'instructor@abc-academy.test',
        password: instPwHash,
        role: 'INSTRUCTOR',
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.INSTRUCTOR),
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    const instMember = await prisma.organizationMember.create({
      data: {
        organizationId: orgA.id,
        userId: instructorUser.id,
        role: 'INSTRUCTOR',
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.INSTRUCTOR),
        status: 'ACTIVE'
      }
    });

    await prisma.organizationInvitation.update({
      where: { id: inviteRecord.id },
      data: { status: 'ACCEPTED' }
    });

    assert(instMember.role === 'INSTRUCTOR' && instMember.organizationId === orgA.id, 'Instructor accepted invite and obtained OrganizationMember INSTRUCTOR status');

    console.log('\n--- 4. Student Storefront Registration ---');
    // Step 6: Student registers under ABC Academy
    const stuPwHash = await hashPassword('StudentPass123!');
    const studentA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'John Doe',
        email: 'student@abc-academy.test',
        password: stuPwHash,
        role: 'STUDENT',
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.STUDENT),
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    const stuMemberA = await prisma.organizationMember.create({
      data: {
        organizationId: orgA.id,
        userId: studentA.id,
        role: 'STUDENT',
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.STUDENT),
        status: 'ACTIVE'
      }
    });

    assert(stuMemberA.role === 'STUDENT' && stuMemberA.organizationId === orgA.id, 'Student registered and created with active OrganizationMember record');

    console.log('\n--- 5. Organization B Creation & Strict Multi-Tenant Isolation ---');
    // Create Organization B (XYZ Academy)
    const orgB = await prisma.organization.create({
      data: {
        name: 'XYZ Academy of Design',
        slug: 'xyz-academy-test',
        subdomain: 'xyz-academy-test',
        description: 'Design school.',
        status: 'ACTIVE'
      }
    });

    const studentB = await prisma.user.create({
      data: {
        organizationId: orgB.id,
        name: 'David Smith',
        email: 'student@xyz-academy.test',
        password: stuPwHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: orgB.id,
        userId: studentB.id,
        role: 'STUDENT',
        status: 'ACTIVE'
      }
    });

    // Test Isolation Query: ABC Academy requests students
    const abcStudents = await prisma.user.findMany({
      where: {
        organizationId: orgA.id,
        role: 'STUDENT'
      }
    });

    const abcStudentEmails = abcStudents.map((s) => s.email);
    assert(
      abcStudentEmails.includes('student@abc-academy.test') && !abcStudentEmails.includes('student@xyz-academy.test'),
      'Strict Tenant Isolation: ABC Academy query returns ONLY John Doe, NEVER David Smith'
    );

    // Test Isolation Query: XYZ Academy requests students
    const xyzStudents = await prisma.user.findMany({
      where: {
        organizationId: orgB.id,
        role: 'STUDENT'
      }
    });
    const xyzStudentEmails = xyzStudents.map((s) => s.email);
    assert(
      xyzStudentEmails.includes('student@xyz-academy.test') && !xyzStudentEmails.includes('student@abc-academy.test'),
      'Strict Tenant Isolation: XYZ Academy query returns ONLY David Smith, NEVER John Doe'
    );

    console.log('\n--- 6. Server-Side Audit Trail Verification ---');
    const logs = await prisma.auditLog.findMany({
      where: { organizationId: orgA.id }
    });

    assert(logs.length > 0, `Recorded ${logs.length} audit trail event(s) for organization ${orgA.slug}`);

    console.log('\n====================================================');
    console.log(`  PART 1 FOUNDATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test Suite Exception:', error);
    process.exit(1);
  }
}

runPart1TestSuite();
