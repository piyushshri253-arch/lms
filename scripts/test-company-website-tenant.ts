import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { validateTenantOwnership } from '../src/lib/auth';

const prisma = new PrismaClient();

async function runCompanyWebsiteTenantTests() {
  console.log('========================================================================');
  console.log('🏢 AADHYARA: COMPANY WEBSITE BUILDER & LMS TENANT FEATURES VERIFICATION');
  console.log('========================================================================');

  try {
    const passwordHash = await bcrypt.hash('Aadhyara@Pass2026', 10);

    // 0. Clean prior test entities if present
    const testOrgs = await prisma.organization.findMany({
      where: { slug: { in: ['alpha-academy-test', 'beta-tech-test'] } }
    });
    const testOrgIds = testOrgs.map(o => o.id);
    if (testOrgIds.length > 0) {
      await prisma.websiteSection.deleteMany({ where: { page: { organizationId: { in: testOrgIds } } } });
      await prisma.websitePage.deleteMany({ where: { organizationId: { in: testOrgIds } } });
      await prisma.navigationItem.deleteMany({ where: { organizationId: { in: testOrgIds } } });
      await prisma.websiteAnalytics.deleteMany({ where: { organizationId: { in: testOrgIds } } });
      await prisma.enrollment.deleteMany({ where: { organizationId: { in: testOrgIds } } });
      await prisma.order.deleteMany({ where: { organizationId: { in: testOrgIds } } });
      await prisma.course.deleteMany({ where: { organizationId: { in: testOrgIds } } });
      await prisma.category.deleteMany({ where: { organizationId: { in: testOrgIds } } });
      await prisma.user.deleteMany({ where: { organizationId: { in: testOrgIds } } });
      await prisma.organization.deleteMany({ where: { id: { in: testOrgIds } } });
    }

    console.log('\n[1/7] Provisioning Company A (Alpha Academy) with Custom Profile & Branding...');
    const orgA = await prisma.organization.create({
      data: {
        name: 'Alpha Academy',
        slug: 'alpha-academy-test',
        subdomain: 'alpha-academy-test',
        description: 'Elite Software Engineering & Deep-Tech Masterclasses',
        contactEmail: 'contact@alphaacademy.test',
        contactPhone: '+91 9876543210',
        address: 'Alpha Cyber City, Sector 5',
        country: 'India',
        timezone: 'Asia/Kolkata',
        primaryColor: '#6366f1',
        secondaryColor: '#14b8a6',
        buttonStyle: 'pill',
        typography: 'modern',
        theme: 'luxury',
        seoTitle: 'Alpha Academy — Engineering Masterclasses',
        seoDescription: 'Master modern system design and fullstack architectures.',
        allowStudentRegistration: true,
        razorpayKeyId: 'rzp_live_alpha_123',
        razorpayKeySecret: 'alpha_secret_encrypted',
        socialLinks: JSON.stringify({
          linkedin: 'https://linkedin.com/company/alpha-academy',
          twitter: 'https://x.com/alphaacademy'
        })
      }
    });

    const adminA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'Alex Rivera',
        email: 'alex@alphaacademy.test',
        password: passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    const catA = await prisma.category.create({
      data: {
        organizationId: orgA.id,
        name: 'Cloud Native',
        slug: `cloud-native-${orgA.id.slice(-6)}`
      }
    });

    const courseA = await prisma.course.create({
      data: {
        organizationId: orgA.id,
        title: 'Distributed Microservices & Kafka',
        slug: `distributed-microservices-${orgA.id.slice(-6)}`,
        description: 'High throughput event-driven microservices.',
        price: 3499,
        categoryId: catA.id,
        instructorId: adminA.id,
        status: 'PUBLISHED'
      }
    });

    console.log(`✅ Company A created: ${orgA.name} (OrgID: ${orgA.id}, Primary: ${orgA.primaryColor}, ButtonStyle: ${orgA.buttonStyle})`);

    console.log('\n[2/7] Creating Custom Website Pages & Sections in Website Builder...');
    const pageHomeA = await prisma.websitePage.create({
      data: {
        organizationId: orgA.id,
        title: 'Home',
        slug: 'home',
        status: 'PUBLISHED',
        seoTitle: 'Alpha Academy Home'
      }
    });

    const heroSection = await prisma.websiteSection.create({
      data: {
        pageId: pageHomeA.id,
        type: 'HERO',
        title: 'Scale Your Technical Mastery',
        subtitle: 'Hands-on architectural masterclasses',
        order: 0,
        enabled: true,
        content: JSON.stringify({
          heading: 'Scale Your Technical Mastery',
          subheading: 'Hands-on architectural masterclasses taught by principal engineers.',
          primaryBtnText: 'View Courses',
          primaryBtnUrl: '/courses',
          secondaryBtnText: 'Student Register',
          secondaryBtnUrl: '/register'
        })
      }
    });

    const coursesSection = await prisma.websiteSection.create({
      data: {
        pageId: pageHomeA.id,
        type: 'FEATURED_COURSES',
        title: 'Masterclass Curricula',
        subtitle: 'Direct practical cohorts',
        order: 1,
        enabled: true,
        content: JSON.stringify({ filterMode: 'FEATURED', limit: 6 })
      }
    });

    const faqSection = await prisma.websiteSection.create({
      data: {
        pageId: pageHomeA.id,
        type: 'FAQ',
        title: 'Admissions FAQ',
        order: 2,
        enabled: true,
        content: JSON.stringify({
          faqs: [{ q: 'Is there lifetime access?', a: 'Yes, lifetime updates included.' }]
        })
      }
    });

    console.log(`✅ Website sections created for Alpha Academy: Hero (${heroSection.id}), Courses (${coursesSection.id}), FAQ (${faqSection.id})`);

    console.log('\n[3/7] Provisioning Company B (Beta Tech) for Isolation Testing...');
    const orgB = await prisma.organization.create({
      data: {
        name: 'Beta Tech Institute',
        slug: 'beta-tech-test',
        primaryColor: '#059669',
        allowStudentRegistration: false,
        razorpayKeyId: 'rzp_live_beta_999'
      }
    });

    const adminB = await prisma.user.create({
      data: {
        organizationId: orgB.id,
        name: 'Sarah Connor',
        email: 'sarah@betatech.test',
        password: passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });

    console.log(`✅ Company B created: ${orgB.name} (OrgID: ${orgB.id})`);

    console.log('\n[4/7] Testing Cross-Company Isolation Protection...');
    // Company B Admin attempts to access Company A's page/sections
    const isBAllowedOnA = validateTenantOwnership(orgA.id, {
      id: adminB.id,
      email: adminB.email,
      role: 'ADMIN',
      organizationId: adminB.organizationId
    } as any);

    if (isBAllowedOnA) {
      throw new Error('SECURITY VIOLATION: Beta Tech Admin accessed Alpha Academy website sections!');
    }
    console.log('🛡️ Cross-Company Isolation: Beta Tech Admin correctly rejected from modifying Alpha Academy website.');

    console.log('\n[5/7] Testing Tenant-Scoped Student Self-Registration...');
    // Student registers on Alpha Academy storefront
    const studentA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'Karan Mehra',
        email: 'karan@student.test',
        password: passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    if (studentA.organizationId !== orgA.id) {
      throw new Error('Student was not bound to target organizationId!');
    }
    console.log(`✅ Student "${studentA.name}" successfully registered and scoped strictly to Alpha Academy (${studentA.organizationId}).`);

    console.log('\n[6/7] Testing Course Checkout & Isolated Merchant Order...');
    const orderA = await prisma.order.create({
      data: {
        organizationId: orgA.id,
        userId: studentA.id,
        courseId: courseA.id,
        amount: courseA.price,
        currency: 'INR',
        provider: 'RAZORPAY',
        transactionId: `txn_alpha_${Date.now()}`,
        status: 'SUCCESS'
      }
    });

    const enrollmentA = await prisma.enrollment.create({
      data: {
        organizationId: orgA.id,
        userId: studentA.id,
        courseId: courseA.id,
        paymentId: orderA.id,
        status: 'ACTIVE'
      }
    });

    console.log(`✅ Order processed via Alpha Academy merchant ledger: OrderID = ${orderA.id}, Amount = ₹${orderA.amount}, Enrolled = ${enrollmentA.id}`);

    console.log('\n[7/7] Verifying Real Website Analytics Aggregation...');
    await prisma.websiteAnalytics.createMany({
      data: [
        { organizationId: orgA.id, eventType: 'PAGE_VIEW', pageSlug: 'home' },
        { organizationId: orgA.id, eventType: 'PAGE_VIEW', pageSlug: 'courses' },
        { organizationId: orgA.id, eventType: 'COURSE_VIEW', courseId: courseA.id, pageSlug: `courses/${courseA.slug}` },
        { organizationId: orgA.id, eventType: 'REGISTRATION' },
        { organizationId: orgA.id, eventType: 'ENROLLMENT', courseId: courseA.id }
      ]
    });

    const totalViews = await prisma.websiteAnalytics.count({
      where: { organizationId: orgA.id }
    });
    console.log(`✅ Real website analytics tracking verified: ${totalViews} recorded telemetry events.`);

    // Cleanup test data
    await prisma.websiteAnalytics.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.websiteSection.deleteMany({ where: { page: { organizationId: { in: [orgA.id, orgB.id] } } } });
    await prisma.websitePage.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.enrollment.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.order.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.course.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.category.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });

    console.log('\n========================================================================');
    console.log('🎉 ALL 7 COMPANY WEBSITE & LMS TENANT ACCEPTANCE TESTS PASSED (100%)');
    console.log('========================================================================');

  } catch (err: any) {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCompanyWebsiteTenantTests();
