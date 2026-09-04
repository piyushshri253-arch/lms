export interface StarterTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    borderRadius: string;
    buttonStyle: string;
  };
  defaultSections: Array<{
    type: string;
    title: string;
    subtitle?: string;
    order: number;
    content: any;
  }>;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'education',
    name: 'Education Academy',
    category: 'Academy',
    description: 'Classic academic design for institutes, schools, and professional academies.',
    theme: {
      primaryColor: '#2563EB',
      secondaryColor: '#1E40AF',
      fontFamily: 'Inter',
      borderRadius: '8px',
      buttonStyle: 'rounded'
    },
    defaultSections: [
      {
        type: 'HERO',
        title: 'Master New Skills. Build Your Future.',
        subtitle: 'Learn from industry-leading instructors with hands-on projects and recognized certificates.',
        order: 1,
        content: {
          badge: '🎓 Trusted by 50,000+ Students',
          ctaText: 'Explore Courses',
          ctaLink: '/courses',
          secondaryCtaText: 'Join For Free',
          secondaryCtaLink: '/register',
          bgGradient: 'from-blue-600 to-indigo-900',
          alignment: 'center'
        }
      },
      {
        type: 'STATISTICS',
        title: 'Our Impact In Numbers',
        order: 2,
        content: {
          stats: [
            { label: 'Active Students', value: '50,000+' },
            { label: 'Expert Mentors', value: '120+' },
            { label: 'Course Completion Rate', value: '94%' },
            { label: '5-Star Reviews', value: '4.9/5' }
          ]
        }
      },
      {
        type: 'COURSE_GRID',
        title: 'Featured Programs',
        subtitle: 'Explore our top-rated, career-ready programs designed for modern professionals.',
        order: 3,
        content: {
          sourceType: 'FEATURED',
          limit: 6,
          layout: '3-column'
        }
      },
      {
        type: 'WHY_CHOOSE_US',
        title: 'Why Choose Our Academy',
        subtitle: 'Structured learning paths crafted by industry practitioners.',
        order: 4,
        content: {
          features: [
            { icon: 'Video', title: 'HD Video Lessons', description: 'Self-paced crystal-clear video lectures accessible on any device.' },
            { icon: 'Award', title: 'Verifiable Certificates', description: 'Shareable tamper-proof digital credentials for your LinkedIn profile.' },
            { icon: 'MessageSquare', title: '1-on-1 Faculty Q&A', description: 'Get your questions answered directly by course instructors.' }
          ]
        }
      },
      {
        type: 'TESTIMONIALS',
        title: 'What Our Graduates Say',
        order: 5,
        content: {
          testimonials: [
            { name: 'Rahul Sharma', role: 'Software Engineer', text: 'This course accelerated my career. The projects were directly applicable to real-world jobs.', rating: 5 },
            { name: 'Priya Patel', role: 'Data Analyst', text: 'The structured roadmap and instant instructor feedback made all the difference.', rating: 5 }
          ]
        }
      },
      {
        type: 'FAQ',
        title: 'Frequently Asked Questions',
        order: 6,
        content: {
          faqs: [
            { question: 'Do I get lifetime access?', answer: 'Yes, all purchased courses include lifetime on-demand access to all lessons and future updates.' },
            { question: 'Are certificates included?', answer: 'Yes, an official verifiable digital certificate is automatically generated upon 100% course completion.' }
          ]
        }
      },
      {
        type: 'CTA',
        title: 'Ready to Transform Your Career?',
        subtitle: 'Enroll today and start learning immediately.',
        order: 7,
        content: {
          buttonText: 'Browse All Courses',
          buttonLink: '/courses',
          bgStyle: 'gradient'
        }
      }
    ]
  },
  {
    id: 'creator',
    name: 'Creator Brand',
    category: 'Creator',
    description: 'High-converting personal brand template for content creators and independent coaches.',
    theme: {
      primaryColor: '#7C3AED',
      secondaryColor: '#4C1D95',
      fontFamily: 'Plus Jakarta Sans',
      borderRadius: '12px',
      buttonStyle: 'pill'
    },
    defaultSections: [
      {
        type: 'HERO',
        title: 'Learn the Playbook Behind 7-Figure Digital Growth',
        subtitle: 'Practical masterclasses with actionable frameworks, zero fluff.',
        order: 1,
        content: {
          badge: '🚀 Creator Cohort 2026',
          ctaText: 'Get Instant Access',
          ctaLink: '/courses',
          alignment: 'left'
        }
      },
      {
        type: 'COURSE_GRID',
        title: 'Masterclasses & Programs',
        order: 2,
        content: { sourceType: 'ALL', limit: 4, layout: '2-column' }
      },
      {
        type: 'TESTIMONIALS',
        title: 'Student Success Stories',
        order: 3,
        content: {
          testimonials: [
            { name: 'Ananya Roy', role: 'Creator & Founder', text: 'The ROI was 10x in the first 30 days.', rating: 5 }
          ]
        }
      },
      {
        type: 'CTA',
        title: 'Join the Next Generation of Creators',
        order: 4,
        content: { buttonText: 'Start Learning', buttonLink: '/courses' }
      }
    ]
  },
  {
    id: 'corporate_training',
    name: 'Corporate Training',
    category: 'Corporate',
    description: 'Sleek, enterprise-grade portal for B2B workforce upskilling and compliance training.',
    theme: {
      primaryColor: '#0F172A',
      secondaryColor: '#334155',
      fontFamily: 'Inter',
      borderRadius: '4px',
      buttonStyle: 'sharp'
    },
    defaultSections: [
      {
        type: 'HERO',
        title: 'Enterprise Workforce Upskilling & Compliance',
        subtitle: 'Scalable training programs aligned with enterprise standards.',
        order: 1,
        content: { ctaText: 'Explore Corporate Catalog', ctaLink: '/courses' }
      },
      {
        type: 'COURSE_GRID',
        title: 'Corporate Training Tracks',
        order: 2,
        content: { sourceType: 'ALL', limit: 6, layout: '3-column' }
      },
      {
        type: 'CTA',
        title: 'Train Your Organization at Scale',
        order: 3,
        content: { buttonText: 'Contact Enterprise Sales', buttonLink: '/contact' }
      }
    ]
  },
  {
    id: 'bootcamp',
    name: 'Intensive Bootcamp',
    category: 'Bootcamp',
    description: 'Fast-paced, outcome-oriented tech bootcamp template with cohort countdown and syllabus breakdown.',
    theme: {
      primaryColor: '#EA580C',
      secondaryColor: '#C2410C',
      fontFamily: 'Inter',
      borderRadius: '8px',
      buttonStyle: 'rounded'
    },
    defaultSections: [
      {
        type: 'HERO',
        title: 'Zero to Hired: Full Stack Engineering Bootcamp',
        subtitle: '12 weeks of immersive coding, live mentorship, and portfolio building.',
        order: 1,
        content: { ctaText: 'Apply Now', ctaLink: '/courses' }
      },
      {
        type: 'COURSE_GRID',
        title: 'Bootcamp Cohorts',
        order: 2,
        content: { sourceType: 'ALL', limit: 3, layout: '3-column' }
      }
    ]
  },
  {
    id: 'minimal_clean',
    name: 'Minimal Clean',
    category: 'Minimal',
    description: 'Distraction-free, typographic minimalist design focusing purely on course content.',
    theme: {
      primaryColor: '#18181B',
      secondaryColor: '#27272A',
      fontFamily: 'Inter',
      borderRadius: '6px',
      buttonStyle: 'sharp'
    },
    defaultSections: [
      {
        type: 'HERO',
        title: 'Thoughtfully Crafted Courses for Curious Minds',
        subtitle: 'Deep dives into engineering, design, and product craftsmanship.',
        order: 1,
        content: { ctaText: 'View Courses', ctaLink: '/courses' }
      },
      {
        type: 'COURSE_GRID',
        title: 'Available Courses',
        order: 2,
        content: { sourceType: 'ALL', limit: 6, layout: '3-column' }
      }
    ]
  }
];
