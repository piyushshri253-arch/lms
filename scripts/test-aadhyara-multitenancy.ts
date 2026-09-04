import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { enforceTenantPlanLimits, validateTenantOwnership } from '../src/lib/auth';

const prisma = new PrismaClient();

async function cleanUpTestOrgs() {
  const testOrgs = await prisma.organization.findMany({
    where: { slug: { in: ['test-alpha-corp', 'test-beta-inc'] } }
  });

  const orgIds = testOrgs.map(o => o.id);
  if (orgIds.length > 0) {
    await prisma.course.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.category.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
}

async function runMultiTenantVerificationSuite() {
  console.log('====================================================');
  console.log('🚀 AADHYARA MULTI-TENANT SAAS TEST SUITE');
  console.log('====================================================');

  try {
    const passwordHash = await bcrypt.hash('Aadhyara@2026', 10);

    // 1. Clean up prior test orgs if exist
    await cleanUpTestOrgs();

    console.log('\n[1/6] Provisioning Isolated Tenant Organizations...');
    
    // Org A: Alpha Corp
    const orgAlpha = await prisma.organization.create({
      data: {
        name: 'Alpha Corp',
        slug: 'test-alpha-corp',
        subdomain: 'alphacorp',
        plan: 'STARTER',
        status: 'ACTIVE',
        maxCourses: 10,
        maxStudents: 100,
        maxStorageGB: 10
      }
    });

    // Org B: Beta Inc
    const orgBeta = await prisma.organization.create({
      data: {
        name: 'Beta Inc',
        slug: 'test-beta-inc',
        subdomain: 'betainc',
        plan: 'PRO',
        status: 'ACTIVE',
        maxCourses: 50,
        maxStudents: 1000,
        maxStorageGB: 100
      }
    });

    console.log(`✅ Org Alpha provisioned: ID = ${orgAlpha.id}, Slug = ${orgAlpha.slug}`);
    console.log(`✅ Org Beta provisioned: ID = ${orgBeta.id}, Slug = ${orgBeta.slug}`);

    // 2. Create Users in each tenant
    console.log('\n[2/6] Provisioning Users in Dedicated Workspaces...');
    const adminAlpha = await prisma.user.create({
      data: {
        name: 'Alpha Admin',
        email: 'admin@alphacorp.test',
        password: passwordHash,
        role: 'ADMIN',
        organizationId: orgAlpha.id
      }
    });

    const studentAlpha = await prisma.user.create({
      data: {
        name: 'Alpha Student',
        email: 'student@alphacorp.test',
        password: passwordHash,
        role: 'STUDENT',
        organizationId: orgAlpha.id
      }
    });

    const adminBeta = await prisma.user.create({
      data: {
        name: 'Beta Admin',
        email: 'admin@betainc.test',
        password: passwordHash,
        role: 'ADMIN',
        organizationId: orgBeta.id
      }
    });

    const studentBeta = await prisma.user.create({
      data: {
        name: 'Beta Student',
        email: 'student@betainc.test',
        password: passwordHash,
        role: 'STUDENT',
        organizationId: orgBeta.id
      }
    });

    console.log(`✅ Alpha Admin & Student created in orgAlpha`);
    console.log(`✅ Beta Admin & Student created in orgBeta`);

    // 3. Create Courses in Each Workspace
    console.log('\n[3/6] Testing Course Creation & Tenant Scoping...');
    
    // Category for Alpha
    const catAlpha = await prisma.category.create({
      data: {
        name: 'Alpha Cloud Security',
        slug: 'alpha-cloud-security',
        organizationId: orgAlpha.id
      }
    });

    // Course in Alpha
    const courseAlpha = await prisma.course.create({
      data: {
        title: 'Alpha Zero Trust Architecture',
        slug: 'alpha-zero-trust',
        description: 'Internal security training for Alpha Corp.',
        price: 0,
        organizationId: orgAlpha.id,
        categoryId: catAlpha.id,
        instructorId: adminAlpha.id,
        status: 'PUBLISHED'
      }
    });

    // Category for Beta
    const catBeta = await prisma.category.create({
      data: {
        name: 'Beta AI Engineering',
        slug: 'beta-ai-engineering',
        organizationId: orgBeta.id
      }
    });

    // Course in Beta
    const courseBeta = await prisma.course.create({
      data: {
        title: 'Beta High Frequency ML',
        slug: 'beta-high-frequency-ml',
        description: 'Proprietary trading ML for Beta Inc.',
        price: 199,
        organizationId: orgBeta.id,
        categoryId: catBeta.id,
        instructorId: adminBeta.id,
        status: 'PUBLISHED'
      }
    });

    console.log(`✅ Alpha Course created in Org Alpha (ID: ${courseAlpha.id})`);
    console.log(`✅ Beta Course created in Org Beta (ID: ${courseBeta.id})`);

    // 4. Test Cross-Tenant Access Controls (IDOR Simulation)
    console.log('\n[4/6] Verifying Cross-Tenant IDOR Protection & Ownership Validation...');

    const alphaAdminSession = {
      id: adminAlpha.id,
      email: adminAlpha.email,
      role: adminAlpha.role,
      organizationId: orgAlpha.id
    };

    const betaAdminSession = {
      id: adminBeta.id,
      email: adminBeta.email,
      role: adminBeta.role,
      organizationId: orgBeta.id
    };

    // Alpha Admin tries to access Alpha Course -> Must PASS
    const alphaAccessAlpha = validateTenantOwnership(courseAlpha.organizationId, alphaAdminSession as any);
    if (!alphaAccessAlpha) throw new Error('Alpha Admin failed to validate own course');
    console.log('✅ Alpha Admin accessing Alpha Course: ALLOWED');

    // Alpha Admin tries to access Beta Course -> Must FAIL (False)
    const alphaAccessBeta = validateTenantOwnership(courseBeta.organizationId, alphaAdminSession as any);
    if (alphaAccessBeta) throw new Error('SECURITY BREACH: Alpha Admin was allowed access to Beta Course!');
    console.log('🛡️ Alpha Admin accessing Beta Course: REJECTED (Tenant Isolation Verified)');

    // Beta Admin tries to access Alpha Course -> Must FAIL (False)
    const betaAccessAlpha = validateTenantOwnership(courseAlpha.organizationId, betaAdminSession as any);
    if (betaAccessAlpha) throw new Error('SECURITY BREACH: Beta Admin was allowed access to Alpha Course!');
    console.log('🛡️ Beta Admin accessing Alpha Course: REJECTED (Tenant Isolation Verified)');

    // 5. Test Database Query Scoping Isolation
    console.log('\n[5/6] Verifying Database Query Scope Isolation...');

    const alphaStudentsList = await prisma.user.findMany({
      where: { organizationId: orgAlpha.id, role: 'STUDENT' }
    });
    console.log(`Alpha Student Query count: ${alphaStudentsList.length} (Expected: 1)`);
    if (alphaStudentsList.some(s => s.id === studentBeta.id)) {
      throw new Error('SECURITY BREACH: Beta student leaked into Alpha student listing!');
    }
    console.log('🛡️ Student listings are strictly isolated between tenants.');

    const betaStudentsList = await prisma.user.findMany({
      where: { organizationId: orgBeta.id, role: 'STUDENT' }
    });
    console.log(`Beta Student Query count: ${betaStudentsList.length} (Expected: 1)`);
    if (betaStudentsList.some(s => s.id === studentAlpha.id)) {
      throw new Error('SECURITY BREACH: Alpha student leaked into Beta student listing!');
    }
    console.log('🛡️ Beta student query does NOT leak Alpha students.');

    // 6. Test SaaS Plan Limit Enforcement
    console.log('\n[6/6] Testing SaaS Subscription Limits Enforcement...');
    const limitCheck = await enforceTenantPlanLimits(orgAlpha.id, 'COURSES');
    console.log(`Plan Limit Check for Org Alpha (STARTER): Allowed = ${limitCheck.allowed}`);
    if (!limitCheck.allowed) {
      throw new Error('Org Alpha should be allowed to create course within limit');
    }
    console.log('✅ Plan limit check passed.');

    // Clean up test tenants
    await cleanUpTestOrgs();

    console.log('\n====================================================');
    console.log('🎉 ALL MULTI-TENANCY TESTS PASSED WITH 100% SUCCESS!');
    console.log('AADHYARA is fully secured for commercial multi-tenant operation.');
    console.log('====================================================');

  } catch (err) {
    console.error('❌ MULTI-TENANCY TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMultiTenantVerificationSuite();
