import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTeachCourses() {
  console.log('📚 Seeding T.E.A.C.H categories and courses...');

  // Find admin user to attribute courses to
  let admin = await prisma.user.findFirst({
    where: {
      OR: [
        { role: 'ADMIN' },
        { role: 'SUPER_ADMIN' },
        { email: 'admin@morenateach.com' }
      ]
    }
  });

  if (!admin) {
    console.error('No admin user found to assign courses.');
    return;
  }

  // Categories to ensure
  const categoriesData = [
    {
      name: 'Early Childhood Education',
      slug: 'early-childhood-education',
      description: 'Foundational child development, nursery methodologies, sensory play, and early learning frameworks.'
    },
    {
      name: 'Pedagogy & Teaching Methods',
      slug: 'pedagogy-teaching-methods',
      description: 'Instructional design, active learning techniques, classroom management, and student engagement.'
    },
    {
      name: 'Montessori & Child Psychology',
      slug: 'montessori-child-psychology',
      description: 'Montessori materials, cognitive psychology, social-emotional learning, and behavioral milestones.'
    },
    {
      name: 'Special Needs & Inclusion',
      slug: 'special-needs-inclusion',
      description: 'Individualized education plans (IEPs), neurodiversity support, sensory adaptations, and inclusive environments.'
    },
    {
      name: 'STEM for Young Learners',
      slug: 'stem-young-learners',
      description: 'Hands-on discovery science, early mathematics, logical reasoning, and inquiry-based learning.'
    },
    {
      name: 'Phonics & Language Arts',
      slug: 'phonics-language-arts',
      description: 'Jolly Phonics, orthographic mapping, phonemic awareness, and dynamic storytelling.'
    }
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesData) {
    let existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: cat.name }, { slug: cat.slug }]
      }
    });

    if (!existing) {
      existing = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description
        }
      });
      console.log(`+ Created category: ${cat.name}`);
    } else {
      console.log(`= Existing category: ${cat.name}`);
    }
    categoryMap.set(cat.name, existing.id);
  }

  // Realistic TEACH Curricula
  const sampleCourses = [
    {
      title: 'Foundations of Early Childhood Care & Development (ECCD)',
      slug: 'foundations-early-childhood-care-development',
      description: 'A comprehensive diploma curriculum covering brain development from 0-6 years, milestone tracking, play-based pedagogical models, and creating safe, stimulating preschool learning ecosystems.',
      shortDescription: 'Master 0-6 years brain development, milestone observation, and play-based learning design.',
      thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop',
      price: 499,
      discountPrice: 3499,
      categoryName: 'Early Childhood Education',
      level: 'ALL_LEVELS',
      durationHours: 32.5,
      language: 'English',
      bestseller: true,
      isNew: false,
      whatYouWillLearn: [
        'Understand neurological stages and developmental windows in children aged 0 to 6',
        'Design age-appropriate experiential learning environments and daily routines',
        'Implement standardized observational rubrics and child growth trackers',
        'Partner effectively with parents for holistic childhood wellness'
      ]
    },
    {
      title: 'Modern Classroom Pedagogy: Active Learning & Differentiated Instruction',
      slug: 'modern-classroom-pedagogy-active-learning',
      description: 'Transform traditional rote classrooms into dynamic hubs of curiosity. Learn Bloom\'s taxonomy 2.0, Kagan cooperative structures, scaffolding techniques, and real-time student check-ins.',
      shortDescription: 'Master active pedagogy, differentiated instruction, and 21st-century classroom engagement.',
      thumbnail: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop',
      price: 599,
      discountPrice: 2999,
      categoryName: 'Pedagogy & Teaching Methods',
      level: 'INTERMEDIATE',
      durationHours: 24.0,
      language: 'English',
      bestseller: true,
      isNew: false,
      whatYouWillLearn: [
        'Apply active learning strategies to maintain 90%+ student engagement',
        'Differentiate lesson content for diverse learning speeds without burnout',
        'Construct higher-order inquiry questions using revised Bloom taxonomy',
        'Facilitate cooperative group dynamics and peer assessment rituals'
      ]
    },
    {
      title: 'Montessori Method Mastery: Practical Life, Sensorial & Language',
      slug: 'montessori-method-mastery-practical-life',
      description: 'An authentic deep dive into the Montessori philosophy, prepared environments, self-directed learning, sensitive periods, and proper presentation of Montessori apparatus.',
      shortDescription: 'Complete guide to prepared environments, Montessori apparatus presentation, and child autonomy.',
      thumbnail: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=800&auto=format&fit=crop',
      price: 799,
      discountPrice: 4499,
      categoryName: 'Montessori & Child Psychology',
      level: 'ALL_LEVELS',
      durationHours: 40.0,
      language: 'English',
      bestseller: false,
      isNew: true,
      whatYouWillLearn: [
        'Understand Dr. Montessori\'s plane of development and the absorbent mind',
        'Prepare and maintain clean, low-shelf self-accessible Montessori materials',
        'Present three-period lessons for language, sensorial, and math exploration',
        'Cultivate inner discipline and concentration in young children'
      ]
    },
    {
      title: 'Inclusive Classrooms: ADHD, Autism Spectrum & Sensory Needs Support',
      slug: 'inclusive-classrooms-adhd-autism-support',
      description: 'Equip yourself with practical, compassionate strategies to support neurodivergent learners. Learn sensory integration, IEP development, de-escalation protocols, and social stories.',
      shortDescription: 'Evidence-based inclusion strategies for ADHD, autism spectrum, and sensory processing.',
      thumbnail: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop',
      price: 899,
      discountPrice: 4999,
      categoryName: 'Special Needs & Inclusion',
      level: 'EXPERT',
      durationHours: 28.5,
      language: 'English',
      bestseller: true,
      isNew: false,
      whatYouWillLearn: [
        'Identify sensory triggers and design calming sensory corners in regular classrooms',
        'Create and implement actionable Individualized Education Plans (IEPs)',
        'Use visual schedules, first-then boards, and emotion regulation thermometers',
        'Foster an empathetic peer culture that celebrates neurological diversity'
      ]
    },
    {
      title: 'Phonics Masterclass: Synthetic Phonics & Early Reading Fluency',
      slug: 'phonics-masterclass-synthetic-phonics',
      description: 'Master the 44 sounds of the English language, digraphs, blending, segmenting, and decodable reader sequencing using tactile multisensory methods.',
      shortDescription: 'Step-by-step synthetic phonics, sound blending, and early decoding fluency.',
      thumbnail: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop',
      price: 499,
      discountPrice: 2499,
      categoryName: 'Phonics & Language Arts',
      level: 'BEGINNER',
      durationHours: 18.0,
      language: 'English',
      bestseller: false,
      isNew: true,
      whatYouWillLearn: [
        'Teach the 42 letter sounds and alternative spelling patterns systematically',
        'Guide emergent readers through oral blending and phoneme segmentation',
        'Tackle tricky irregular words with orthographic mapping techniques',
        'Create engaging phonics games, sound songs, and flashcard activities'
      ]
    },
    {
      title: 'Experiential STEM for Primary Classrooms: Inquiry & Project Learning',
      slug: 'experiential-stem-primary-classrooms',
      description: 'Inspire scientific wonder through low-cost, high-impact hands-on experiments, design challenges, computational thinking unplugged, and mathematical modeling.',
      shortDescription: 'Hands-on experiments, engineering design challenges, and inquiry science for kids.',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
      price: 649,
      discountPrice: 3299,
      categoryName: 'STEM for Young Learners',
      level: 'ALL_LEVELS',
      durationHours: 22.0,
      language: 'English',
      bestseller: false,
      isNew: false,
      whatYouWillLearn: [
        'Build 30+ low-cost STEM experiments using easily available recycled materials',
        'Teach the 5E inquiry cycle: Engage, Explore, Explain, Elaborate, Evaluate',
        'Introduce algorithmic thinking through screen-free unplugged games',
        'Assess student problem-solving using maker portfolio rubrics'
      ]
    }
  ];

  for (const c of sampleCourses) {
    const categoryId = categoryMap.get(c.categoryName);
    if (!categoryId) continue;

    const existing = await prisma.course.findFirst({
      where: { slug: c.slug }
    });

    if (!existing) {
      const createdCourse = await prisma.course.create({
        data: {
          title: c.title,
          slug: c.slug,
          description: c.description,
          shortDescription: c.shortDescription,
          thumbnail: c.thumbnail,
          price: c.price,
          discountPrice: c.discountPrice,
          categoryId: categoryId,
          level: c.level,
          instructorId: admin.id,
          status: 'PUBLISHED',
          durationHours: c.durationHours,
          language: c.language,
          bestseller: c.bestseller,
          isNew: c.isNew,
          whatYouWillLearn: JSON.stringify(c.whatYouWillLearn),
          requirements: JSON.stringify([
            'Interest in early childhood education or pedagogical excellence',
            'No prior formal certification required'
          ]),
          targetAudience: JSON.stringify([
            'Preschool and primary school teachers',
            'Aspiring educators and daycare facilitators',
            'Parents desiring structured home-learning frameworks'
          ])
        }
      });

      // Add an initial lesson
      const sec = await prisma.courseSection.create({
        data: {
          courseId: createdCourse.id,
          title: 'Module 1: Orientation & Foundational Principles',
          order: 1
        }
      });

      await prisma.lesson.create({
        data: {
          sectionId: sec.id,
          title: '1.1 Welcome to T.E.A.C.H & Course Overview',
          type: 'VIDEO',
          duration: '08:30',
          durationSeconds: 510,
          isFree: true,
          order: 1
        }
      });

      console.log(`+ Created TEACH course: ${c.title}`);
    } else {
      console.log(`= Existing TEACH course: ${c.title}`);
    }
  }

  console.log('✅ T.E.A.C.H Courses and Categories seeded successfully!');
}

seedTeachCourses()
  .catch((e) => {
    console.error('Error seeding teach courses:', e);
  })
  .finally(() => {
    prisma.$disconnect();
  });
