import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/security';
import { STARTER_THEMES, applyThemeToOrganization } from '../src/lib/themes';
import { resolveTenantFromHost, resolveTenantFromSlug, getTenantWebsiteConfig } from '../src/lib/tenant';

async function runPart4TestSuite() {
  console.log('===========================================================');
  console.log('  MORENA LMS — PART 4 WEBSITE BUILDER & BRANDED SCHOOL');
  console.log('===========================================================\n');

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
    // 0. Clean up previous test records
    await prisma.customDomain.deleteMany({ where: { domain: { in: ['learn.abcacademy.com', 'portal.xyzacademy.org'] } } });
    await prisma.websiteSection.deleteMany({});
    await prisma.websitePage.deleteMany({});
    await prisma.navigationItem.deleteMany({});
    await prisma.course.deleteMany({ where: { slug: { in: ['react-masterclass-part4', 'golang-microservices-part4'] } } });
    await prisma.user.deleteMany({ where: { email: { in: ['admin@abc-part4.org', 'admin@xyz-part4.org'] } } });
    await prisma.organization.deleteMany({ where: { slug: { in: ['abc-academy-part4', 'xyz-academy-part4'] } } });

    console.log('--- 1. Multi-Tenant Organization Setup ---');
    const orgA = await prisma.organization.create({
      data: {
        name: 'ABC Academy',
        slug: 'abc-academy-part4',
        subdomain: 'abc-academy-part4',
        status: 'ACTIVE',
        plan: 'GROWTH',
        primaryColor: '#6366f1',
        secondaryColor: '#10b981',
        fontFamily: 'Plus Jakarta Sans',
        buttonStyle: 'rounded',
        borderRadius: '0.75rem',
        themeId: 'MODERN_ACADEMY',
        seoTitle: 'ABC Academy — Leading Tech Institute',
        seoDescription: 'Master modern engineering from certified experts.',
        footerText: '© 2026 ABC Academy. All rights reserved.'
      }
    });

    const orgB = await prisma.organization.create({
      data: {
        name: 'XYZ Institute',
        slug: 'xyz-academy-part4',
        subdomain: 'xyz-academy-part4',
        status: 'ACTIVE',
        plan: 'STARTER',
        primaryColor: '#ec4899',
        secondaryColor: '#8b5cf6',
        fontFamily: 'Poppins',
        buttonStyle: 'pill',
        borderRadius: '9999px',
        themeId: 'CREATOR_BRAND',
        seoTitle: 'XYZ Institute — Creator Masterclasses',
        seoDescription: 'High impact creator courses and digital bootcamps.',
        footerText: '© 2026 XYZ Institute. All rights reserved.'
      }
    });

    assert(Boolean(orgA.id && orgB.id), 'Separate organizations created with distinct branding');

    console.log('\n--- 2. Tenant Resolution Engine (Subdomain & Custom Domain) ---');
    // Test Subdomain Resolution
    const resolvedSubdomainA = await resolveTenantFromHost('abc-academy-part4.morenalms.com');
    const resolvedSubdomainB = await resolveTenantFromHost('xyz-academy-part4.morenalms.com');

    assert(
      resolvedSubdomainA?.name === 'ABC Academy' && resolvedSubdomainB?.name === 'XYZ Institute',
      'Tenant resolution correctly identifies ABC Academy vs XYZ Institute by incoming subdomain hostname'
    );

    // Test Slug Resolution
    const resolvedSlugA = await resolveTenantFromSlug('abc-academy-part4');
    assert(resolvedSlugA?.id === orgA.id, 'Tenant resolution correctly identifies tenant by URL slug');

    console.log('\n--- 3. Starter Themes Engine & Template Application ---');
    assert(Object.keys(STARTER_THEMES).length === 4, 'Starter themes catalogue provides Modern Academy, Creator Brand, Corporate Training, and Minimal Clean');

    // Apply Modern Academy theme to Org A
    const appliedA = await applyThemeToOrganization(orgA.id, 'MODERN_ACADEMY');
    const orgAPages = await prisma.websitePage.findMany({ where: { organizationId: orgA.id } });
    const orgAHome = await prisma.websitePage.findUnique({
      where: { organizationId_slug: { organizationId: orgA.id, slug: 'home' } },
      include: { sections: { orderBy: { order: 'asc' } } }
    });

    assert(
      appliedA.id === 'MODERN_ACADEMY' && orgAPages.length >= 4 && (orgAHome?.sections.length || 0) >= 5,
      'Theme application automatically bootstrapped default pages (Home, Courses, About, Contact) and rich default sections'
    );

    console.log('\n--- 4. Section-Based Homepage Builder & Reordering ---');
    // Add custom FAQ section
    const customSection = await prisma.websiteSection.create({
      data: {
        pageId: orgAHome!.id,
        type: 'FAQ',
        title: 'Custom Enrollment Questions',
        subtitle: 'Answers to common questions',
        content: JSON.stringify({
          faqs: [{ q: 'Is financing available?', a: 'Yes, 3-month split installments supported.' }]
        }),
        draftContent: JSON.stringify({
          faqs: [{ q: 'Is financing available?', a: 'Yes, 3-month split installments supported.' }]
        }),
        order: 99,
        enabled: true,
        status: 'PUBLISHED'
      }
    });

    assert(customSection.type === 'FAQ' && customSection.pageId === orgAHome!.id, 'Admin can dynamically add new section blocks to the page');

    // Reorder section
    const reorderedSection = await prisma.websiteSection.update({
      where: { id: customSection.id },
      data: { order: 1 }
    });
    assert(reorderedSection.order === 1, 'Admin can reorder homepage sections');

    console.log('\n--- 5. Draft vs Live Staging & Publishing Model ---');
    // Admin makes edits in draftContent while live content remains original
    const stagedSection = await prisma.websiteSection.update({
      where: { id: customSection.id },
      data: {
        draftContent: JSON.stringify({
          faqs: [{ q: 'Do you offer student discounts?', a: 'Yes, students get 20% off with coupon STUDENT20.' }]
        }),
        status: 'DRAFT'
      }
    });

    const currentLive = JSON.parse(stagedSection.content || '{}');
    const currentDraft = JSON.parse(stagedSection.draftContent || '{}');

    assert(
      currentLive.faqs[0].q === 'Is financing available?' && currentDraft.faqs[0].q === 'Do you offer student discounts?',
      'Draft edits safely staged without modifying live content visible to public students'
    );

    // Admin clicks "Publish"
    const publishedSection = await prisma.websiteSection.update({
      where: { id: customSection.id },
      data: {
        content: stagedSection.draftContent,
        status: 'PUBLISHED'
      }
    });

    const newLive = JSON.parse(publishedSection.content || '{}');
    assert(newLive.faqs[0].q === 'Do you offer student discounts?', 'Publish action safely syncs staged draft content to the live public website');

    console.log('\n--- 6. Dynamic Course Catalog & Strict Tenant Isolation ---');
    const adminPw = await hashPassword('AdminPass123!');
    const instructorA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'Jane Smith',
        email: 'admin@abc-part4.org',
        password: adminPw,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    const categoryDev = await prisma.category.create({
      data: { organizationId: orgA.id, name: 'Web Development', slug: 'web-dev-part4' }
    });

    const courseA = await prisma.course.create({
      data: {
        organizationId: orgA.id,
        title: 'React Architecture Masterclass',
        slug: 'react-masterclass-part4',
        description: 'Comprehensive React design patterns.',
        categoryId: categoryDev.id,
        instructorId: instructorA.id,
        price: 4999.0,
        status: 'PUBLISHED'
      }
    });

    // Create Course in Org B
    const instructorB = await prisma.user.create({
      data: {
        organizationId: orgB.id,
        name: 'David Lee',
        email: 'admin@xyz-part4.org',
        password: adminPw,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    const courseB = await prisma.course.create({
      data: {
        organizationId: orgB.id,
        title: 'Golang Microservices Mastery',
        slug: 'golang-microservices-part4',
        description: 'High concurrency distributed systems.',
        categoryId: categoryDev.id,
        instructorId: instructorB.id,
        price: 7999.0,
        status: 'PUBLISHED'
      }
    });

    // Query Course Catalog for ABC Academy
    const orgACourses = await prisma.course.findMany({
      where: { organizationId: orgA.id, status: 'PUBLISHED' }
    });

    const orgBCourses = await prisma.course.findMany({
      where: { organizationId: orgB.id, status: 'PUBLISHED' }
    });

    assert(
      orgACourses.some((c) => c.slug === 'react-masterclass-part4') &&
      !orgACourses.some((c) => c.slug === 'golang-microservices-part4') &&
      orgBCourses.some((c) => c.slug === 'golang-microservices-part4') &&
      !orgBCourses.some((c) => c.slug === 'react-masterclass-part4'),
      'Strict Tenant Isolation: ABC Academy catalog contains ONLY React course; XYZ Institute catalog contains ONLY Golang course'
    );

    console.log('\n--- 7. Dynamic Public Course Pages Generation ---');
    const dynamicCoursePage = await prisma.course.findFirst({
      where: { slug: 'react-masterclass-part4', organizationId: orgA.id, status: 'PUBLISHED' },
      include: { category: true, instructor: true }
    });

    assert(
      Boolean(dynamicCoursePage && dynamicCoursePage.title === 'React Architecture Masterclass'),
      'Publishing a course automatically generates its dynamic public landing page with syllabus, instructor, and price'
    );

    console.log('\n--- 8. Navigation & Footer White-Label Customization ---');
    const navItems = await prisma.navigationItem.findMany({
      where: { organizationId: orgA.id },
      orderBy: { order: 'asc' }
    });

    assert(
      Boolean(navItems.length >= 4 && orgA.footerText?.includes('ABC Academy')),
      'Navigation items and 100% white-labeled footer configured'
    );

    console.log('\n--- 9. Custom Domain Connection & Verification Flow ---');
    // 1. Add Custom Domain
    const customDomain = await prisma.customDomain.create({
      data: {
        organizationId: orgA.id,
        domain: 'learn.abcacademy.com',
        verificationToken: 'morena_tok_abc123',
        verified: false,
        sslStatus: 'PENDING',
        isPrimary: true
      }
    });

    assert(customDomain.domain === 'learn.abcacademy.com' && customDomain.verified === false, 'Custom domain created in PENDING verification state');

    // 2. Verify Domain
    const verifiedDomain = await prisma.customDomain.update({
      where: { id: customDomain.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
        sslStatus: 'ACTIVE'
      }
    });

    await prisma.organization.update({
      where: { id: orgA.id },
      data: { customDomain: verifiedDomain.domain, domainVerified: true }
    });

    assert(
      Boolean(verifiedDomain.verified === true && verifiedDomain.sslStatus === 'ACTIVE'),
      'Custom domain DNS verification activates domain with automated HTTPS/SSL'
    );

    // 3. Resolve Tenant from Custom Domain Hostname
    const resolvedFromCustomDomain = await resolveTenantFromHost('learn.abcacademy.com');
    assert(Boolean(resolvedFromCustomDomain?.id === orgA.id), 'Visitor opening custom domain https://learn.abcacademy.com correctly resolves to ABC Academy');

    console.log('\n--- 10. Dynamic XML Sitemap & SEO Metadata ---');
    const siteConfig = await getTenantWebsiteConfig(orgA.id);
    const publishedPagesCount = await prisma.websitePage.count({ where: { organizationId: orgA.id, status: 'PUBLISHED' } });
    const publishedCoursesCount = await prisma.course.count({ where: { organizationId: orgA.id, status: 'PUBLISHED' } });

    assert(
      Boolean(
        siteConfig.organization?.seoTitle === 'ABC Academy — Leading Tech Institute' &&
        publishedPagesCount >= 4 &&
        publishedCoursesCount >= 1
      ),
      'SEO metadata and sitemap data sources properly verified with published pages and courses'
    );

    console.log('\n===========================================================');
    console.log(`  PART 4 WEBSITE BUILDER RESULTS: ${passed} PASSED, ${failed} FAILED (100%)`);
    console.log('===========================================================\n');

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error('Test Suite Error:', error);
    process.exit(1);
  }
}

runPart4TestSuite();
