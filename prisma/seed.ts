import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initializing pristine production-ready database...');

  // 1. Clean existing records in reverse dependency order
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.impersonationLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.note.deleteMany();
  await prisma.discussion.deleteMany();
  await prisma.review.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.order.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.courseSection.deleteMany();
  await prisma.course.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash passwords
  const superAdminPasswordHash = await bcrypt.hash('superadmin123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const instructorPasswordHash = await bcrypt.hash('instructor123', 10);
  const studentPasswordHash = await bcrypt.hash('student123', 10);

  // 3. Create Root Administrative & Role Accounts (All default to null empty avatar)
  const superAdminUser = await prisma.user.create({
    data: {
      name: 'Super Admin Officer',
      email: 'superadmin@morenateach.com',
      password: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      customRole: 'Chief Executive Administrator',
      emailVerified: true,
      permissions: JSON.stringify(['ALL']),
      avatar: null,
      bio: 'Master of Platform Infrastructure, Security and Global System Operations.'
    }
  });

  const adminUser = await prisma.user.create({
    data: {
      name: 'Dr. Elena Rodriguez',
      email: 'admin@morenateach.com',
      password: adminPasswordHash,
      role: 'ADMIN',
      customRole: 'Academic Dean & Lead Manager',
      emailVerified: true,
      permissions: JSON.stringify([
        'courses.all',
        'students.all',
        'curriculum.all',
        'certificates.all',
        'reviews.moderate',
        'support.reply'
      ]),
      avatar: null,
      bio: 'Lead Instructor, Principal Systems Architect & Founding Educator at Morena Teach.'
    }
  });

  const instructorUser = await prisma.user.create({
    data: {
      name: 'Dr. Alan Turing',
      email: 'instructor@morenateach.com',
      password: instructorPasswordHash,
      role: 'INSTRUCTOR',
      customRole: 'Distinguished Faculty Lead',
      emailVerified: true,
      avatar: null,
      bio: 'Distributed Systems Pioneer & Cloud Infrastructure Architect.'
    }
  });

  const studentUser = await prisma.user.create({
    data: {
      name: 'Alex Morgan',
      email: 'student@morenateach.com',
      password: studentPasswordHash,
      role: 'STUDENT',
      emailVerified: true,
      avatar: null,
      bio: 'Passionate software engineer and lifelong learner.'
    }
  });

  // 4. Create Official Disciplines / Categories
  const catEngineering = await prisma.category.create({
    data: {
      name: 'Engineering',
      slug: 'engineering',
      description: 'Distributed systems, Next.js, backend infrastructure, Rust & cloud computing.'
    }
  });

  const catDesign = await prisma.category.create({
    data: {
      name: 'Design',
      slug: 'design',
      description: 'UI/UX design systems, Figma tokens, visual hierarchy & spatial cognition.'
    }
  });

  const catDataScience = await prisma.category.create({
    data: {
      name: 'Data Science',
      slug: 'data-science',
      description: 'Machine learning, predictive models, business intelligence & data engineering.'
    }
  });

  const catBusiness = await prisma.category.create({
    data: {
      name: 'Business',
      slug: 'business',
      description: 'Product management, executive strategy, technical leadership & SaaS scaling.'
    }
  });

  // 5. Create Master Published Curricula
  const course1 = await prisma.course.create({
    data: {
      title: 'UI/UX Design Masterclass: From Theory to High-Fidelity Systems',
      slug: 'ui-ux-design-masterclass',
      description:
        'Master the art of intuitive user interface design, modern interaction systems, design tokens, and cognitive hierarchy. Taught with live interactive critique.',
      shortDescription: 'Comprehensive UI/UX design masterclass covering tokens, Figma, and human perception.',
      thumbnail:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBfSK-qNFG7rZx20vQ1L8m13W422kT-esoQzVPjbuKICGsyBtAypO0ON2yIUDtGNQZl-1BmPNBLCRzfehpqn2Qh4FcikJioN_BmHUDgUsIcDSa7ggt-zoSXzEgNGPgidwydnTDCGkzfHaZF9vDV95VQrNJ9O2YZBvlqbWR94Z6hAsuH-pFJ6rNijbiIiF2a6TxDw9okxS29w27lGJwoWoUmXQseao9d4Du8Nf--4mdIfIXnErsrKliDuA',
      price: 149.99,
      discountPrice: 199.99,
      categoryId: catDesign.id,
      level: 'INTERMEDIATE',
      instructorId: adminUser.id,
      status: 'PUBLISHED',
      durationHours: 42.5,
      language: 'English',
      bestseller: true,
      isNew: false,
      whatYouWillLearn: JSON.stringify([
        'Build scalable design systems with atomic tokens and semantic themes',
        'Master cognitive visual hierarchy, F-pattern reading, and micro-interactions',
        'Create interactive Figma prototypes with variables and auto-layout',
        'Conduct usability testing and portfolio-ready product case studies'
      ])
    }
  });

  const c1Sec1 = await prisma.courseSection.create({
    data: {
      courseId: course1.id,
      title: 'Module 1: Foundations of Visual Hierarchy & Spatial Cognition',
      description: 'Understanding how human eyes scan interfaces and structuring high-intent layouts.',
      order: 1
    }
  });

  await prisma.lesson.create({
    data: {
      sectionId: c1Sec1.id,
      title: '1.1 The Science of Visual Perception & Eye Tracking',
      description: 'How luminance contrast and typographic scale direct attention.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: '14:20',
      durationSeconds: 860,
      order: 1,
      isFree: true,
      resources: JSON.stringify([
        { title: 'Visual Hierarchy Figma Starter Kit.fig', size: '14.8 MB', url: '#' }
      ])
    }
  });

  await prisma.lesson.create({
    data: {
      sectionId: c1Sec1.id,
      title: '1.2 Design Token Variables & Semantic Theming',
      description: 'Setting up CSS and Figma variable modes for accessible light and dark palettes.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: '18:45',
      durationSeconds: 1125,
      order: 2,
      isFree: false,
      resources: JSON.stringify([
        { title: 'Design System Token Cheatsheet.pdf', size: '2.4 MB', url: '#' }
      ])
    }
  });

  const c1Sec2 = await prisma.courseSection.create({
    data: {
      courseId: course1.id,
      title: 'Module 2: Micro-Interactions, Motion & Component Architecture',
      description: 'Creating delightful physics-based transitions with GSAP and CSS transforms.',
      order: 2
    }
  });

  await prisma.lesson.create({
    data: {
      sectionId: c1Sec2.id,
      title: '2.1 Fluid Gesture Animations & Spring Physics',
      description: 'Implementing high-performance GPU-accelerated motion curves.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: '22:10',
      durationSeconds: 1330,
      order: 1,
      isFree: false
    }
  });

  // Course 2: Full-Stack System Architecture
  const course2 = await prisma.course.create({
    data: {
      title: 'Full-Stack System Architecture: Distributed Services & Cloud Scale',
      slug: 'fullstack-system-architecture',
      description:
        'Architect fault-tolerant web applications. Deep dive into sharding, event-driven message buses, database indexing, caching strategies, and resilient microservices.',
      shortDescription: 'Enterprise architecture blueprint: concurrency, Redis locks, microservices, and database tuning.',
      thumbnail:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCpF7QuytsdIC8UBOTt9_RvqyVInZ1JFsLQBPUw5O3uQjMM-EKbQ7t4nre7mK3BmTl7QYJMcJZGJyPKje1i5SRHyFZyyGgwWvJJKMsDfGkMpTnLg4OGiyqJ8r0PHKE2JjIciMlB-surwaioHi3RMNYj9iqj5DLA0xbftAqrK0o-n1tyVcJmjm7q1u2iPT61TROhWK5l59Di-sBDNVe6nWEDRNjZvEWq68C34hR6q4Y0H48hVuKq8YwJpw',
      price: 189.99,
      discountPrice: 249.99,
      categoryId: catEngineering.id,
      level: 'EXPERT',
      instructorId: instructorUser.id,
      status: 'PUBLISHED',
      durationHours: 58.0,
      language: 'English',
      bestseller: true,
      isNew: false,
      whatYouWillLearn: JSON.stringify([
        'Design decoupled event meshes with Kafka and RabbitMQ',
        'Prevent race conditions with distributed locks (Redlock / Mutex)',
        'Optimize SQL queries with composite indexes and explain analyze',
        'Deploy resilient Kubernetes workloads on Google Cloud & AWS'
      ])
    }
  });

  const c2Sec1 = await prisma.courseSection.create({
    data: {
      courseId: course2.id,
      title: 'Module 1: Concurrency, Sharding & Distributed Locking',
      description: 'Tackling synchronization bottlenecks in high-throughput cloud environments.',
      order: 1
    }
  });

  await prisma.lesson.create({
    data: {
      sectionId: c2Sec1.id,
      title: '1.1 Implementing Distributed Locks with Redis and Lua Scripts',
      description: 'Atomic token acquisition and TTL lease renewal patterns.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: '26:30',
      durationSeconds: 1590,
      order: 1,
      isFree: true
    }
  });

  // Course 3: Advanced React Patterns
  const course3 = await prisma.course.create({
    data: {
      title: 'Advanced React Patterns & Next.js 15 Server Components',
      slug: 'advanced-react-patterns',
      description:
        'Master modern React internals, concurrent rendering, Server Actions, streaming SSR, and scalable design patterns for high-performance enterprise applications.',
      thumbnail:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCF4WbHERQQhCfIkio6WzArNuJ2S6uMWs5d86v56VugR7mQLfQzLcNSF92ARGvhIHxpm410Q68DzPkRXz0rztQZ4geEtOWg03Rh2y_IQgsTfdo5k4EboPEHi5E31v2pQKVzqI0IdjK6aFEn76ftWYXJa5qVB8Wv0WmUVekt2y3poNQtPKXpn0Ki4XvRoEWbKTnwSPjmIU9swiTplwJzzHF4Fz7XLc64L6IuhISRfXCKyauyG_YsSMn7lg',
      price: 129.99,
      categoryId: catEngineering.id,
      level: 'INTERMEDIATE',
      instructorId: adminUser.id,
      status: 'PUBLISHED',
      durationHours: 36.0,
      language: 'English',
      isNew: true,
      whatYouWillLearn: JSON.stringify([
        'Master React 19 hooks and optimistic UI updates',
        'Structure scalable Next.js 15 App Router server actions',
        'Implement streaming SSR and progressive hydration',
        'Write robust unit and integration tests with Vitest and Testing Library'
      ])
    }
  });

  const c3Sec1 = await prisma.courseSection.create({
    data: {
      courseId: course3.id,
      title: 'Module 1: Server Components & Concurrent Rendering',
      order: 1
    }
  });

  await prisma.lesson.create({
    data: {
      sectionId: c3Sec1.id,
      title: '1.1 Deep Dive into React Server Component Wire Format',
      duration: '16:40',
      durationSeconds: 1000,
      order: 1,
      isFree: true
    }
  });

  // 6. Active Promotional Coupons
  await prisma.coupon.create({
    data: {
      code: 'DESIGN25',
      discountPercent: 25,
      status: 'ACTIVE'
    }
  });

  await prisma.coupon.create({
    data: {
      code: 'WELCOME50',
      discountPercent: 50,
      status: 'ACTIVE'
    }
  });

  await prisma.coupon.create({
    data: {
      code: 'MORENA100',
      discountPercent: 100,
      status: 'ACTIVE'
    }
  });

  // 7. Initial System Audit Log
  await prisma.auditLog.create({
    data: {
      adminId: superAdminUser.id,
      adminEmail: superAdminUser.email,
      action: 'SYSTEM_INITIALIZATION',
      entity: 'Platform',
      entityId: 'global',
      description: 'Morena Teach LMS database initialized in production-ready state.',
      ipAddress: '127.0.0.1'
    }
  });

  // 8. Platform Settings
  await prisma.platformSetting.create({
    data: {
      key: 'general_config',
      value: JSON.stringify({
        platformName: 'Morena Teach',
        supportEmail: 'support@morenateach.com',
        defaultLanguage: 'English (US)',
        twoFactorAuth: true,
        sessionTimeoutMinutes: 60,
        stripeActive: true,
        stripePublishableKey: 'pk_live_51M89x91...',
        razorpayActive: true,
        paypalActive: true,
        maintenanceMode: false,
        heroHeadline: 'Where Great Teaching Inspires Great Learning',
        heroSubheadline: 'Learn system design, product leadership, and engineering architecture from distinguished industry leads.',
        primaryCtaText: 'Explore Masterclasses'
      })
    }
  });

  console.log('✅ Clean database seeded successfully with Super Admin, Instructors, Curricula, and Coupons!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
