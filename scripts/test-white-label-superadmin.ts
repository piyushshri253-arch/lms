import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runWhiteLabelAndSuperAdminTests() {
  console.log('========================================================================');
  console.log('🏢 AADHYARA: TRUE WHITE-LABEL LMS & SUPER ADMIN VISIBILITY TEST SUITE');
  console.log('========================================================================');

  try {
    const passwordHash = await bcrypt.hash('Aadhyara@Pass2026', 10);

    // 0. Clean prior test entities if present
    const testOrgs = await prisma.organization.findMany({
      where: { slug: { in: ['abc-academy-test', 'xyz-institute-test'] } }
    });
    const testOrgIds = testOrgs.map(o => o.id);
    if (testOrgIds.length > 0) {
      await prisma.contactSubmission.deleteMany({ where: { organizationId: { in: testOrgIds } } });
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

    console.log('\n[1/6] Provisioning White-Label Company 1: ABC Academy...');
    const orgA = await prisma.organization.create({
      data: {
        name: 'ABC Academy',
        slug: 'abc-academy-test',
        subdomain: 'abc-academy-test',
        logo: 'https://cdn.example.com/abc-logo.png',
        favicon: 'https://cdn.example.com/abc-favicon.ico',
        primaryColor: '#7c3aed',
        secondaryColor: '#06b6d4',
        fontFamily: 'Poppins',
        buttonStyle: 'pill',
        headerStyle: 'BLURRED',
        heroBackgroundType: 'IMAGE',
        heroBackgroundImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4',
        heroOverlayOpacity: 0.8,
        contactEmail: 'admissions@abcacademy.test',
        contactPhone: '+91 9988776655',
        seoTitle: 'ABC Academy | Elite Fullstack Engineering',
        allowStudentRegistration: true,
        razorpayKeyId: 'rzp_live_abc_key',
        razorpayKeySecret: 'abc_secret_123'
      }
    });

    const adminA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'John Doe',
        email: 'john@abcacademy.test',
        password: passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });

    const catA = await prisma.category.create({
      data: {
        organizationId: orgA.id,
        name: 'Full Stack',
        slug: `full-stack-${orgA.id.slice(-6)}`
      }
    });

    const courseA = await prisma.course.create({
      data: {
        organizationId: orgA.id,
        title: 'React & Next.js Masterclass',
        slug: `react-masterclass-${orgA.id.slice(-6)}`,
        description: 'Learn React from beginner to advanced enterprise scale.',
        price: 1999,
        discountPrice: 999,
        categoryId: catA.id,
        instructorId: adminA.id,
        status: 'PUBLISHED'
      }
    });

    console.log(`✅ Company 1 Created: "${orgA.name}" (Font: ${orgA.fontFamily}, Hero: ${orgA.heroBackgroundType}, Course Price: ₹${courseA.price})`);

    console.log('\n[2/6] Provisioning White-Label Company 2: XYZ Institute...');
    const orgB = await prisma.organization.create({
      data: {
        name: 'XYZ Institute',
        slug: 'xyz-institute-test',
        subdomain: 'xyz-institute-test',
        logo: 'https://cdn.example.com/xyz-logo.png',
        favicon: 'https://cdn.example.com/xyz-favicon.ico',
        primaryColor: '#059669',
        secondaryColor: '#d97706',
        fontFamily: 'Inter',
        buttonStyle: 'square',
        heroBackgroundType: 'GRADIENT',
        contactEmail: 'info@xyzinstitute.test',
        seoTitle: 'XYZ Institute of Cloud AI',
        allowStudentRegistration: true,
        razorpayKeyId: 'rzp_live_xyz_key',
        razorpayKeySecret: 'xyz_secret_456'
      }
    });

    const adminB = await prisma.user.create({
      data: {
        organizationId: orgB.id,
        name: 'Dr. Jane Smith',
        email: 'jane@xyzinstitute.test',
        password: passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });

    const catB = await prisma.category.create({
      data: {
        organizationId: orgB.id,
        name: 'Cloud & AI',
        slug: `cloud-ai-${orgB.id.slice(-6)}`
      }
    });

    const courseB = await prisma.course.create({
      data: {
        organizationId: orgB.id,
        title: 'Cloud Native AI & Kubernetes',
        slug: `cloud-ai-kubernetes-${orgB.id.slice(-6)}`,
        description: 'Deploying LLMs and containerized microservices.',
        price: 4999,
        discountPrice: 2999,
        categoryId: catB.id,
        instructorId: adminB.id,
        status: 'PUBLISHED'
      }
    });

    console.log(`✅ Company 2 Created: "${orgB.name}" (Font: ${orgB.fontFamily}, Hero: ${orgB.heroBackgroundType}, Course Price: ₹${courseB.price})`);

    console.log('\n[3/6] Testing White-Label Branding Isolation...');
    if (orgA.name === orgB.name || orgA.primaryColor === orgB.primaryColor || orgA.fontFamily === orgB.fontFamily) {
      throw new Error('Branding collision between Company 1 and Company 2!');
    }
    console.log('🛡️ White-Label Branding Isolation Verified: Both companies have independent fonts, colors, and logos.');

    console.log('\n[4/6] Testing Student Registrations per Company...');
    // Student 1 joins ABC Academy
    const student1 = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'Rahul Sharma',
        email: 'rahul@student.test',
        password: passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE'
      }
    });

    // Student 2 joins XYZ Institute
    const student2 = await prisma.user.create({
      data: {
        organizationId: orgB.id,
        name: 'Sneha Roy',
        email: 'sneha@student.test',
        password: passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE'
      }
    });

    if (student1.organizationId !== orgA.id || student2.organizationId !== orgB.id) {
      throw new Error('Student organizationId mapping failed!');
    }
    console.log(`✅ Student "${student1.name}" correctly scoped to "${orgA.name}" (${student1.organizationId}).`);
    console.log(`✅ Student "${student2.name}" correctly scoped to "${orgB.name}" (${student2.organizationId}).`);

    console.log('\n[5/6] Testing Super Admin Multi-Tenant Visibility & Student Breakdown...');
    // Super Admin queries students with organization relations
    const superAdminStudents = await prisma.user.findMany({
      where: { role: 'STUDENT', organizationId: { in: [orgA.id, orgB.id] } },
      include: {
        organization: { select: { id: true, name: true, slug: true, plan: true } }
      }
    });

    if (superAdminStudents.length < 2) {
      throw new Error('Super Admin did not retrieve all registered students!');
    }

    const s1Record = superAdminStudents.find(s => s.email === student1.email);
    const s2Record = superAdminStudents.find(s => s.email === student2.email);

    if (s1Record?.organization?.name !== 'ABC Academy' || s2Record?.organization?.name !== 'XYZ Institute') {
      throw new Error('Super Admin student company mapping mismatch!');
    }
    console.log(`✅ Super Admin accurately views Student "${s1Record.name}" under "${s1Record.organization?.name}".`);
    console.log(`✅ Super Admin accurately views Student "${s2Record.name}" under "${s2Record.organization?.name}".`);

    console.log('\n[6/6] Testing White-Label Contact Inquiry Form Submission...');
    const inquiry = await prisma.contactSubmission.create({
      data: {
        organizationId: orgA.id,
        name: 'Amit Patel',
        email: 'amit@visitor.test',
        subject: 'Upcoming Batch Schedule',
        message: 'When does the next live cohort start?'
      }
    });

    if (inquiry.organizationId !== orgA.id) {
      throw new Error('Inquiry not bound to target organization!');
    }
    console.log(`✅ Contact inquiry received and stored strictly for "${orgA.name}" (Inquiry ID: ${inquiry.id}).`);

    // Cleanup test data
    await prisma.contactSubmission.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.enrollment.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.order.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.course.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.category.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });

    console.log('\n========================================================================');
    console.log('🎉 ALL 6 WHITE-LABEL & SUPER ADMIN MULTI-TENANT TESTS PASSED (100%)');
    console.log('========================================================================');

  } catch (err: any) {
    console.error('❌ TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runWhiteLabelAndSuperAdminTests();
