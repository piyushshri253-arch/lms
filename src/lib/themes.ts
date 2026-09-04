import { prisma } from './prisma';

export interface StarterTheme {
  id: string;
  name: string;
  description: string;
  badge: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  buttonStyle: 'rounded' | 'pill' | 'square';
  borderRadius: string;
  defaultSections: Array<{
    type: string;
    title?: string;
    subtitle?: string;
    content: any;
    order: number;
  }>;
}

export const STARTER_THEMES: Record<string, StarterTheme> = {
  MODERN_ACADEMY: {
    id: 'MODERN_ACADEMY',
    name: 'Modern Academy',
    description: 'High-impact dark theme designed for tech bootcamps, code academies, and STEM institutes.',
    badge: 'Popular for Tech & AI',
    primaryColor: '#6366f1',
    secondaryColor: '#10b981',
    fontFamily: 'Plus Jakarta Sans',
    buttonStyle: 'rounded',
    borderRadius: '0.75rem',
    defaultSections: [
      {
        type: 'HERO',
        title: 'Master Modern Tech with Industry Leaders',
        subtitle: 'Hands-on curriculum, interactive labs, and globally verified certifications.',
        content: {
          badgeText: 'ACCREDITED MASTERCLASSES',
          heading: 'Master Modern Tech with Industry Leaders',
          subheading: 'Learn practical full-stack, cloud, and deep-tech engineering from seasoned practitioners.',
          primaryBtnText: 'Explore Curricula',
          primaryBtnUrl: '/courses',
          secondaryBtnText: 'Student Portal',
          secondaryBtnUrl: '/login',
          backgroundType: 'GRADIENT'
        },
        order: 0
      },
      {
        type: 'STATISTICS',
        title: 'Platform Milestones',
        content: {
          stats: [
            { number: '10K+', label: 'Active Students' },
            { number: '98%', label: 'Course Completion Rate' },
            { number: '4.9/5', label: 'Student Satisfaction' },
            { number: '100%', label: 'Verified Certificates' }
          ]
        },
        order: 1
      },
      {
        type: 'FEATURED_COURSES',
        title: 'Featured Masterclasses',
        subtitle: 'Explore our most popular programs designed for high career impact.',
        content: {
          limit: 6,
          sort: 'featured',
          layout: 'grid'
        },
        order: 2
      },
      {
        type: 'WHY_CHOOSE_US',
        title: 'Why Learn With Us?',
        subtitle: 'Engineered for real-world mastery rather than passive video consumption.',
        content: {
          cards: [
            {
              icon: 'terminal',
              title: 'Practical Project Cohorts',
              description: 'Build real distributed applications and real systems instead of toy projects.'
            },
            {
              icon: 'verified',
              title: 'Verifiable Certificates',
              description: 'Every certificate is cryptographically signed and publicly verifiable.'
            },
            {
              icon: 'support_agent',
              title: 'Direct Faculty Mentorship',
              description: 'Get your architectural questions answered in dedicated lesson discussions.'
            }
          ]
        },
        order: 3
      },
      {
        type: 'TESTIMONIALS',
        title: 'Student Success Stories',
        subtitle: 'Hear from engineers and designers who transformed their careers.',
        content: {
          testimonials: [
            {
              name: 'Arjun Mehta',
              role: 'Senior Backend Engineer',
              comment: 'The distributed systems curriculum completely transformed my engineering skills. Landed a senior role within 2 months of graduation.',
              rating: 5
            },
            {
              name: 'Sarah Chen',
              role: 'Full Stack Architect',
              comment: 'Exceptional video clarity, responsive interactive player, and thorough quizzes that test actual problem solving.',
              rating: 5
            }
          ]
        },
        order: 4
      },
      {
        type: 'FAQ',
        title: 'Frequently Asked Questions',
        subtitle: 'Everything you need to know about enrollment and course access.',
        content: {
          faqs: [
            {
              q: 'How long do I have access to the courses?',
              a: 'Once enrolled, you receive lifetime access to all lesson videos, downloadable assets, and future curriculum updates.'
            },
            {
              q: 'Will I receive a verifiable certificate upon completion?',
              a: 'Yes, after completing 100% of the lessons and passing all module quizzes, a cryptographic certificate is automatically generated.'
            }
          ]
        },
        order: 5
      },
      {
        type: 'CTA',
        title: 'Ready to Accelerate Your Career?',
        subtitle: 'Join thousands of ambitious learners today and start mastering modern technologies.',
        content: {
          heading: 'Ready to Accelerate Your Career?',
          description: 'Unlock full lifetime access to all masterclasses and join our community.',
          buttonText: 'Get Started Now',
          buttonUrl: '/courses'
        },
        order: 6
      }
    ]
  },

  CREATOR_BRAND: {
    id: 'CREATOR_BRAND',
    name: 'Creator & Personal Brand',
    description: 'Personalized layout emphasizing founder authority, video highlights, and signature courses.',
    badge: 'Best for Solo Instructors',
    primaryColor: '#ec4899',
    secondaryColor: '#8b5cf6',
    fontFamily: 'Poppins',
    buttonStyle: 'pill',
    borderRadius: '9999px',
    defaultSections: [
      {
        type: 'HERO',
        title: 'Learn Practical Skills Directly From My Experience',
        subtitle: 'Join my signature cohort programs and build in-demand digital competencies.',
        content: {
          badgeText: 'AUTHOR & CREATOR',
          heading: 'Learn Practical Skills Directly From My Experience',
          subheading: 'No filler, no fluff. Just distilled lessons from a decade of building high-growth products.',
          primaryBtnText: 'Join Signature Masterclass',
          primaryBtnUrl: '/courses',
          secondaryBtnText: 'About Instructor',
          secondaryBtnUrl: '/about',
          backgroundType: 'GRADIENT'
        },
        order: 0
      },
      {
        type: 'FEATURED_COURSES',
        title: 'Signature Programs',
        subtitle: 'Step-by-step masterclasses designed to take you from fundamentals to mastery.',
        content: { limit: 3, sort: 'featured', layout: 'grid' },
        order: 1
      },
      {
        type: 'INSTRUCTORS',
        title: 'Meet Your Mentor',
        subtitle: 'Educator, builder, and mentor to over 50,000 learners worldwide.',
        content: {},
        order: 2
      },
      {
        type: 'TESTIMONIALS',
        title: 'Loved by Thousands',
        subtitle: 'Real reviews from students who took the journey.',
        content: {
          testimonials: [
            {
              name: 'Priya Sharma',
              role: 'Product Designer',
              comment: 'The mentor feedback was gold. The curriculum is structured with unmatched clarity.',
              rating: 5
            }
          ]
        },
        order: 3
      },
      {
        type: 'CTA',
        title: 'Start Learning Today',
        subtitle: 'Enroll now and receive instant access to all course materials.',
        content: {
          heading: 'Start Learning Today',
          description: 'Enroll now and receive instant access to all course materials and private community access.',
          buttonText: 'Enroll in Masterclass',
          buttonUrl: '/courses'
        },
        order: 4
      }
    ]
  },

  CORPORATE_TRAINING: {
    id: 'CORPORATE_TRAINING',
    name: 'Corporate Training & Enterprise',
    description: 'Corporate B2B design showcasing team enablement, enterprise tracks, and institutional compliance.',
    badge: 'Enterprise & B2B',
    primaryColor: '#2563eb',
    secondaryColor: '#0ea5e9',
    fontFamily: 'Inter',
    buttonStyle: 'rounded',
    borderRadius: '0.5rem',
    defaultSections: [
      {
        type: 'HERO',
        title: 'Enterprise Upskilling for Modern Engineering Teams',
        subtitle: 'Scale your workforce technical capabilities with accredited training programs.',
        content: {
          badgeText: 'ENTERPRISE TRAINING SUITE',
          heading: 'Enterprise Upskilling for Modern Engineering Teams',
          subheading: 'Tailored learning tracks, team progress tracking, and verified institutional certificates.',
          primaryBtnText: 'Explore Enterprise Tracks',
          primaryBtnUrl: '/courses',
          secondaryBtnText: 'Contact Enterprise Sales',
          secondaryBtnUrl: '/contact',
          backgroundType: 'GRADIENT'
        },
        order: 0
      },
      {
        type: 'BENEFITS',
        title: 'Designed for High-Performing Teams',
        subtitle: 'Enterprise-grade training infrastructure with seamless reporting.',
        content: {
          cards: [
            {
              icon: 'domain',
              title: 'Team Analytics & Reports',
              description: 'Monitor employee lesson completion, quiz pass rates, and certificate compliance.'
            },
            {
              icon: 'security',
              title: 'Secure & Compliant',
              description: 'Role-based permissions, custom SSO options, and dedicated account managers.'
            },
            {
              icon: 'psychology',
              title: 'Custom Learning Tracks',
              description: 'Curate tailored paths matching your specific enterprise stack and workflows.'
            }
          ]
        },
        order: 1
      },
      {
        type: 'COURSE_GRID',
        title: 'Enterprise Curricula',
        subtitle: 'Browse all available technical training programs.',
        content: { limit: 6, sort: 'newest', layout: 'grid' },
        order: 2
      },
      {
        type: 'CTA',
        title: 'Ready to Upskill Your Organization?',
        subtitle: 'Schedule a tailored demonstration or request custom cohort pricing for your teams.',
        content: {
          heading: 'Ready to Upskill Your Organization?',
          description: 'Connect with our corporate enablement team to discuss your team requirements.',
          buttonText: 'Request Enterprise Demo',
          buttonUrl: '/contact'
        },
        order: 3
      }
    ]
  },

  MINIMAL_CLEAN: {
    id: 'MINIMAL_CLEAN',
    name: 'Minimal & Clean',
    description: 'Clean, distraction-free layout with prominent course catalog and fast enrollment flow.',
    badge: 'Minimalist & Fast',
    primaryColor: '#10b981',
    secondaryColor: '#6366f1',
    fontFamily: 'Inter',
    buttonStyle: 'rounded',
    borderRadius: '0.5rem',
    defaultSections: [
      {
        type: 'HERO',
        title: 'High-Impact Courses. Zero Distraction.',
        subtitle: 'Straight to the point courses designed to build real skills rapidly.',
        content: {
          badgeText: 'COURSE CATALOG',
          heading: 'High-Impact Courses. Zero Distraction.',
          subheading: 'Concise masterclasses, clear roadmaps, and immediate enrollment.',
          primaryBtnText: 'Browse Courses',
          primaryBtnUrl: '/courses',
          backgroundType: 'GRADIENT'
        },
        order: 0
      },
      {
        type: 'COURSE_GRID',
        title: 'All Available Masterclasses',
        subtitle: 'Select a course to view syllabus and start learning immediately.',
        content: { limit: 12, sort: 'newest', layout: 'grid' },
        order: 1
      }
    ]
  }
};

/**
 * Apply a theme template to an organization, creating default pages and sections.
 */
export async function applyThemeToOrganization(organizationId: string, themeId: string) {
  const theme = STARTER_THEMES[themeId] || STARTER_THEMES.MODERN_ACADEMY;

  return await prisma.$transaction(async (tx) => {
    // 1. Update Organization branding & theme
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        themeId: theme.id,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        fontFamily: theme.fontFamily,
        buttonStyle: theme.buttonStyle,
        borderRadius: theme.borderRadius
      }
    });

    // 2. Ensure default pages exist (Home, Courses, About, Contact)
    const homePage = await tx.websitePage.upsert({
      where: { organizationId_slug: { organizationId, slug: 'home' } },
      create: {
        organizationId,
        title: 'Home',
        slug: 'home',
        status: 'PUBLISHED',
        seoTitle: 'Home',
        seoDescription: 'Welcome to our academy storefront.'
      },
      update: { status: 'PUBLISHED' }
    });

    await tx.websitePage.upsert({
      where: { organizationId_slug: { organizationId, slug: 'courses' } },
      create: {
        organizationId,
        title: 'Courses',
        slug: 'courses',
        status: 'PUBLISHED',
        seoTitle: 'Course Catalog',
        seoDescription: 'Explore all available masterclasses and training programs.'
      },
      update: { status: 'PUBLISHED' }
    });

    await tx.websitePage.upsert({
      where: { organizationId_slug: { organizationId, slug: 'about' } },
      create: {
        organizationId,
        title: 'About Us',
        slug: 'about',
        status: 'PUBLISHED',
        seoTitle: 'About Us',
        seoDescription: 'Learn more about our mission, instructors, and academy background.'
      },
      update: {}
    });

    await tx.websitePage.upsert({
      where: { organizationId_slug: { organizationId, slug: 'contact' } },
      create: {
        organizationId,
        title: 'Contact',
        slug: 'contact',
        status: 'PUBLISHED',
        seoTitle: 'Contact Support',
        seoDescription: 'Get in touch with our team.'
      },
      update: {}
    });

    // 3. Clear existing home sections and seed theme defaults
    await tx.websiteSection.deleteMany({ where: { pageId: homePage.id } });

    for (const sec of theme.defaultSections) {
      await tx.websiteSection.create({
        data: {
          pageId: homePage.id,
          type: sec.type,
          title: sec.title || null,
          subtitle: sec.subtitle || null,
          content: JSON.stringify(sec.content),
          draftContent: JSON.stringify(sec.content),
          order: sec.order,
          enabled: true,
          status: 'PUBLISHED'
        }
      });
    }

    // 4. Ensure navigation menu has default items
    const navCount = await tx.navigationItem.count({ where: { organizationId } });
    if (navCount === 0) {
      const defaultNav = [
        { label: 'Home', url: '/', order: 0 },
        { label: 'Courses', url: '/courses', order: 1 },
        { label: 'About', url: '/about', order: 2 },
        { label: 'Contact', url: '/contact', order: 3 }
      ];
      for (const item of defaultNav) {
        await tx.navigationItem.create({
          data: {
            organizationId,
            label: item.label,
            url: item.url,
            order: item.order,
            enabled: true
          }
        });
      }
    }

    return theme;
  });
}
