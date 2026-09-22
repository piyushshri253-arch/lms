import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function seed16Courses() {
  console.log('🚀 Starting replacement of courses with the 16 exact curriculum courses...');

  // 1. Clean up previous course data
  console.log('🧹 Cleaning up previous courses, sections, and lessons...');
  await prisma.lessonProgress.deleteMany();
  await prisma.review.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.order.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.courseSection.deleteMany();
  await prisma.course.deleteMany();

  // 2. Ensure Categories
  const categoryDefs = [
    {
      name: 'Early Childhood Education',
      slug: 'early-childhood-education',
      description: 'Foundational child development, early learning, play-based methodologies, and developmental milestones.'
    },
    {
      name: 'Teacher Development',
      slug: 'teacher-development',
      description: 'Modern pedagogical strategies, learner agency, active classrooms, and assessment for learning.'
    },
    {
      name: 'Primary Years & Curriculum',
      slug: 'primary-years-curriculum',
      description: 'Inquiry-based learning, concept-based curriculum design, and international primary frameworks.'
    },
    {
      name: 'Professional Learning',
      slug: 'professional-learning',
      description: 'Inclusive classrooms, universal design for learning, and teacher wellbeing and growth.'
    },
    {
      name: 'Leadership & School Development',
      slug: 'leadership-school-development',
      description: 'Guiding school improvement, leading organisational change, and teacher mentoring & coaching.'
    }
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoryDefs) {
    let record = await prisma.category.findFirst({
      where: { slug: cat.slug }
    });
    if (!record) {
      record = await prisma.category.create({
        data: cat
      });
    } else {
      record = await prisma.category.update({
        where: { id: record.id },
        data: { name: cat.name, description: cat.description }
      });
    }
    categoryMap.set(cat.name, record.id);
  }
  console.log(`✅ Ensured ${categoryMap.size} categories.`);

  // 3. Ensure Instructors
  const defaultPasswordHash = await bcrypt.hash('instructor123', 10);
  const instructorDefs = [
    { name: 'Dr. Ananya Mehra', email: 'ananya.mehra@morenateach.com', bio: 'Senior Early Childhood Educator & Child Development Specialist' },
    { name: 'Pihu Kapoor', email: 'pihu.kapoor@morenateach.com', bio: 'Early Years Play-Based Learning Architect & Educator' },
    { name: 'Dr. Rohan Malhotra', email: 'rohan.malhotra@morenateach.com', bio: 'Lead Instructional Designer & Modern Pedagogical Strategist' },
    { name: 'Kavita Sharma', email: 'kavita.sharma@morenateach.com', bio: 'Formative Assessment Specialist & Curriculum Lead' },
    { name: 'Meera Iyer', email: 'meera.iyer@morenateach.com', bio: 'Inquiry-Based Learning Practitioner & PYP Mentor' },
    { name: 'Arvind Menon', email: 'arvind.menon@morenateach.com', bio: 'Concept-Based Curriculum Architect & Academic Dean' },
    { name: 'Dr. Neha Kapoor', email: 'neha.kapoor@morenateach.com', bio: 'Inclusive Education Consultant & Diverse Learner Specialist' },
    { name: 'Dr. Rajiv Bhatia', email: 'rajiv.bhatia@morenateach.com', bio: 'School Leadership Advisor & Change Management Specialist' },
    { name: 'Dr. Sunita Rao', email: 'sunita.rao@morenateach.com', bio: 'Academic Mentorship Director & Faculty Coach' }
  ];

  const instructorMap = new Map<string, string>();
  for (const inst of instructorDefs) {
    let user = await prisma.user.findFirst({
      where: { email: inst.email }
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: inst.name,
          email: inst.email,
          password: defaultPasswordHash,
          role: 'INSTRUCTOR',
          customRole: 'Distinguished Faculty',
          emailVerified: true,
          bio: inst.bio
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: inst.name, bio: inst.bio, role: 'INSTRUCTOR' }
      });
    }
    instructorMap.set(inst.name, user.id);
  }
  console.log(`✅ Ensured ${instructorMap.size} instructors.`);

  // 4. Default high-resolution educational thumbnails for each course
  const thumbnails = [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60', // 1. Early Childhood
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60', // 2. Play
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60', // 3. Teaching Strategies
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60', // 4. Assessment
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=60', // 5. Inquiry
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=60', // 6. Curriculum
    'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&auto=format&fit=crop&q=60', // 7. Inclusive
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=60', // 8. Wellbeing
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60', // 9. Leading Change
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=60', // 10. Mentoring
    'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&auto=format&fit=crop&q=60', // 11. Montessori
    'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800&auto=format&fit=crop&q=60', // 12. Reggio Emilia
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60', // 13. IB PYP
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=60', // 14. Cambridge
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=60', // 15. Waldorf
    'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?w=800&auto=format&fit=crop&q=60'  // 16. Emergent
  ];

  // Helper to parse duration string like "18:30" to seconds
  function parseDurationToSeconds(dur: string): number {
    const parts = dur.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 600;
  }

  // 5. Define All 16 Courses with Full Curricula
  const courseData = [
    // 1. Foundations of Early Childhood Education & Child Development
    {
      title: 'Foundations of Early Childhood Education & Child Development',
      slug: 'foundations-of-early-childhood-education-child-development',
      category: 'Early Childhood Education',
      instructor: 'Dr. Ananya Mehra',
      duration: 12,
      level: 'BEGINNER',
      price: 2499,
      discountPrice: 1999,
      description: 'Build a strong foundation in early childhood education, child development and developmentally appropriate teaching practices for young learners.',
      shortDescription: 'Core early childhood education, child development stages and developmentally appropriate practice.',
      whatYouWillLearn: [
        'Understand key stages of physical, cognitive, social and emotional development.',
        'Apply developmentally appropriate practices in early years classrooms.',
        'Design learning experiences that support the whole child.'
      ],
      modules: [
        {
          title: 'MODULE 1: Foundations of Early Childhood Education',
          lessons: [
            { title: '1.1 Introduction to Early Childhood Education', duration: '18:30' },
            { title: '1.2 Understanding the Early Years', duration: '24:15' },
            { title: '1.3 Principles of Developmentally Appropriate Practice', duration: '32:20' }
          ]
        },
        {
          title: 'MODULE 2: Understanding Child Development',
          lessons: [
            { title: '2.1 Physical & Motor Development', duration: '28:40' },
            { title: '2.2 Cognitive & Language Development', duration: '35:10' },
            { title: '2.3 Social & Emotional Development', duration: '31:25' }
          ]
        },
        {
          title: 'MODULE 3: The Early Years Classroom',
          lessons: [
            { title: '3.1 Creating Developmentally Appropriate Environments', duration: '29:15' },
            { title: '3.2 Observation & Understanding Children', duration: '34:20' },
            { title: '3.3 Putting Development into Practice', duration: '38:30' }
          ]
        }
      ]
    },

    // 2. Learning Through Play: Designing Meaningful Early Years Experiences
    {
      title: 'Learning Through Play: Designing Meaningful Early Years Experiences',
      slug: 'learning-through-play-designing-meaningful-early-years-experiences',
      category: 'Early Childhood Education',
      instructor: 'Pihu Kapoor',
      duration: 8,
      level: 'INTERMEDIATE',
      price: 1999,
      discountPrice: 1499,
      description: 'Explore how purposeful play can become a powerful vehicle for learning, development, creativity and social-emotional growth.',
      shortDescription: 'Harness purposeful play, guided play, and materials to inspire early exploration.',
      whatYouWillLearn: [
        'Distinguish between free play, guided play and purposeful learning.',
        'Design play-based activities linked to developmental outcomes.',
        'Create engaging classroom environments that encourage exploration and curiosity.'
      ],
      modules: [
        {
          title: 'MODULE 1: Understanding Play',
          lessons: [
            { title: '1.1 Why Play Matters', duration: '25:00' },
            { title: '1.2 Types of Play & Their Developmental Value', duration: '32:00' },
            { title: '1.3 The Teacher\'s Role in Play', duration: '28:30' }
          ]
        },
        {
          title: 'MODULE 2: Designing Play-Based Learning',
          lessons: [
            { title: '2.1 Designing Purposeful Play Experiences', duration: '35:00' },
            { title: '2.2 Learning Through Stories, Music & Movement', duration: '29:30' },
            { title: '2.3 Learning Through Materials & Exploration', duration: '31:00' }
          ]
        },
        {
          title: 'MODULE 3: Creating a Playful Classroom',
          lessons: [
            { title: '3.1 Classroom Environment & Learning Corners', duration: '27:00' },
            { title: '3.2 Planning, Observing & Reflecting on Play', duration: '34:00' }
          ]
        }
      ]
    },

    // 3. Modern Teaching Strategies for Future-Ready Classrooms
    {
      title: 'Modern Teaching Strategies for Future-Ready Classrooms',
      slug: 'modern-teaching-strategies-for-future-ready-classrooms',
      category: 'Teacher Development',
      instructor: 'Dr. Rohan Malhotra',
      duration: 10,
      level: 'INTERMEDIATE',
      price: 2499,
      discountPrice: 1999,
      description: 'Explore practical teaching strategies that help educators create engaging, inclusive and learner-centred classroom experiences.',
      shortDescription: 'Learner-centred teaching, active collaboration, and differentiated instruction.',
      whatYouWillLearn: [
        'Apply learner-centred teaching strategies in everyday classroom practice.',
        'Increase student engagement through collaborative and active learning.',
        'Adapt teaching approaches to different learner needs.'
      ],
      modules: [
        {
          title: 'MODULE 1: Moving Beyond Traditional Teaching',
          lessons: [
            { title: '1.1 From Teaching to Learning', duration: '30:00' },
            { title: '1.2 Understanding Learner Agency', duration: '28:30' },
            { title: '1.3 Creating Engaging Learning Experiences', duration: '34:00' }
          ]
        },
        {
          title: 'MODULE 2: Active & Collaborative Learning',
          lessons: [
            { title: '2.1 Collaborative Learning Strategies', duration: '32:00' },
            { title: '2.2 Discussion, Questioning & Classroom Dialogue', duration: '29:30' },
            { title: '2.3 Project & Problem-Based Learning', duration: '38:00' }
          ]
        },
        {
          title: 'MODULE 3: Differentiated Classroom Practice',
          lessons: [
            { title: '3.1 Understanding Learner Differences', duration: '30:00' },
            { title: '3.2 Differentiation in Practice', duration: '35:00' },
            { title: '3.3 Designing the Future-Ready Classroom', duration: '42:00' }
          ]
        }
      ]
    },

    // 4. Assessment for Learning: Moving Beyond Marks
    {
      title: 'Assessment for Learning: Moving Beyond Marks',
      slug: 'assessment-for-learning-moving-beyond-marks',
      category: 'Teacher Development',
      instructor: 'Kavita Sharma',
      duration: 8,
      level: 'INTERMEDIATE',
      price: 1999,
      discountPrice: 1499,
      description: 'Learn how formative assessment can provide meaningful evidence of learning and help teachers make better instructional decisions.',
      shortDescription: 'Rethink assessment with formative feedback, questioning, and learning checks.',
      whatYouWillLearn: [
        'Understand assessment of learning and assessment for learning.',
        'Design effective formative assessment strategies.',
        'Use assessment evidence to adapt instruction and provide meaningful feedback.'
      ],
      modules: [
        {
          title: 'MODULE 1: Rethinking Assessment',
          lessons: [
            { title: '1.1 Why Do We Assess?', duration: '24:00' },
            { title: '1.2 Assessment of, for & as Learning', duration: '31:00' },
            { title: '1.3 Moving Beyond Marks', duration: '27:00' }
          ]
        },
        {
          title: 'MODULE 2: Formative Assessment',
          lessons: [
            { title: '2.1 Effective Questioning', duration: '28:30' },
            { title: '2.2 Exit Tickets & Learning Checks', duration: '25:00' },
            { title: '2.3 Observation & Evidence of Learning', duration: '30:30' }
          ]
        },
        {
          title: 'MODULE 3: Feedback & Improvement',
          lessons: [
            { title: '3.1 Giving Meaningful Feedback', duration: '29:00' },
            { title: '3.2 Using Evidence to Improve Learning', duration: '36:00' }
          ]
        }
      ]
    },

    // 5. Inquiry-Based Learning: From Questions to Understanding
    {
      title: 'Inquiry-Based Learning: From Questions to Understanding',
      slug: 'inquiry-based-learning-from-questions-to-understanding',
      category: 'Primary Years & Curriculum',
      instructor: 'Meera Iyer',
      duration: 10,
      level: 'INTERMEDIATE',
      price: 2499,
      discountPrice: 1999,
      description: 'Develop inquiry-driven classrooms where students ask meaningful questions, investigate ideas and construct deeper understanding.',
      shortDescription: 'From curiosity to investigation: develop deep conceptual inquiry in young learners.',
      whatYouWillLearn: [
        'Understand the principles and stages of inquiry-based learning.',
        'Develop powerful questions that drive meaningful investigation.',
        'Design classroom experiences that promote student agency and reflection.'
      ],
      modules: [
        {
          title: 'MODULE 1: Foundations of Inquiry',
          lessons: [
            { title: '1.1 What Is Inquiry-Based Learning?', duration: '27:00' },
            { title: '1.2 Curiosity, Questions & Thinking', duration: '31:00' },
            { title: '1.3 The Inquiry Cycle', duration: '35:00' }
          ]
        },
        {
          title: 'MODULE 2: Designing Inquiry',
          lessons: [
            { title: '2.1 Developing Powerful Questions', duration: '32:00' },
            { title: '2.2 From Questions to Investigation', duration: '34:00' },
            { title: '2.3 Resources, Research & Evidence', duration: '29:00' }
          ]
        },
        {
          title: 'MODULE 3: Facilitating Inquiry',
          lessons: [
            { title: '3.1 The Teacher as Facilitator', duration: '30:00' },
            { title: '3.2 Student Voice & Agency', duration: '34:00' },
            { title: '3.3 Reflection & Assessment in Inquiry', duration: '38:00' }
          ]
        }
      ]
    },

    // 6. Concept-Based Curriculum Design for Primary Classrooms
    {
      title: 'Concept-Based Curriculum Design for Primary Classrooms',
      slug: 'concept-based-curriculum-design-for-primary-classrooms',
      category: 'Primary Years & Curriculum',
      instructor: 'Arvind Menon',
      duration: 12,
      level: 'ADVANCED',
      price: 2999,
      discountPrice: 2499,
      description: 'Learn how to move beyond topic-based teaching and design curriculum around concepts, connections and transferable understanding.',
      shortDescription: 'Move beyond topics to deep concepts, generalisations, and transferable ideas.',
      whatYouWillLearn: [
        'Differentiate concepts, topics, facts and skills.',
        'Develop conceptual understandings and meaningful learning goals.',
        'Build units that encourage connections across subjects and contexts.'
      ],
      modules: [
        {
          title: 'MODULE 1: Understanding Concept-Based Learning',
          lessons: [
            { title: '1.1 What Is Concept-Based Curriculum?', duration: '30:00' },
            { title: '1.2 Concepts, Facts & Skills', duration: '32:00' },
            { title: '1.3 Conceptual Understanding', duration: '35:00' }
          ]
        },
        {
          title: 'MODULE 2: Curriculum Design',
          lessons: [
            { title: '2.1 Identifying Big Ideas', duration: '29:00' },
            { title: '2.2 Developing Generalisations', duration: '34:00' },
            { title: '2.3 Mapping Concepts Across Subjects', duration: '38:00' }
          ]
        },
        {
          title: 'MODULE 3: Designing Learning Units',
          lessons: [
            { title: '3.1 From Concepts to Learning Experiences', duration: '35:00' },
            { title: '3.2 Planning Questions & Investigations', duration: '31:00' },
            { title: '3.3 Connecting Learning to Context', duration: '36:00' }
          ]
        },
        {
          title: 'MODULE 4: Assessment & Reflection',
          lessons: [
            { title: '4.1 Assessing Conceptual Understanding', duration: '32:00' },
            { title: '4.2 Designing Authentic Assessment', duration: '35:00' },
            { title: '4.3 Reviewing & Refining the Unit', duration: '30:00' }
          ]
        }
      ]
    },

    // 7. Inclusive Classrooms: Supporting Diverse Learners
    {
      title: 'Inclusive Classrooms: Supporting Diverse Learners',
      slug: 'inclusive-classrooms-supporting-diverse-learners',
      category: 'Professional Learning',
      instructor: 'Dr. Neha Kapoor',
      duration: 8,
      level: 'INTERMEDIATE',
      price: 1999,
      discountPrice: 1499,
      description: 'Equip educators with practical approaches for creating inclusive classrooms that respond to diverse learning needs and abilities.',
      shortDescription: 'Universal design for learning, belonging, and supporting all student abilities.',
      whatYouWillLearn: [
        'Recognise different learner needs and barriers to participation.',
        'Adapt classroom strategies for diverse learners.',
        'Build an inclusive classroom culture based on belonging and participation.'
      ],
      modules: [
        {
          title: 'MODULE 1: Understanding Inclusion',
          lessons: [
            { title: '1.1 What Does Inclusion Mean?', duration: '26:00' },
            { title: '1.2 Understanding Learner Diversity', duration: '31:00' },
            { title: '1.3 Barriers to Learning & Participation', duration: '28:00' }
          ]
        },
        {
          title: 'MODULE 2: Inclusive Teaching Strategies',
          lessons: [
            { title: '2.1 Differentiation & Adaptation', duration: '34:00' },
            { title: '2.2 Universal Design for Learning', duration: '32:00' },
            { title: '2.3 Supporting Social & Emotional Needs', duration: '29:00' }
          ]
        },
        {
          title: 'MODULE 3: Building Inclusive Classrooms',
          lessons: [
            { title: '3.1 Creating a Culture of Belonging', duration: '27:00' },
            { title: '3.2 Working with Families & Support Teams', duration: '35:00' }
          ]
        }
      ]
    },

    // 8. Teacher Wellbeing & Professional Growth
    {
      title: 'Teacher Wellbeing & Professional Growth',
      slug: 'teacher-wellbeing-professional-growth',
      category: 'Professional Learning',
      instructor: 'Pihu Kapoor',
      duration: 6,
      level: 'BEGINNER',
      price: 1499,
      discountPrice: 999,
      description: 'Explore practical strategies that help educators manage professional demands, build resilience and create sustainable growth habits.',
      shortDescription: 'Manage stress, create healthy boundaries, and build a lasting professional growth plan.',
      whatYouWillLearn: [
        'Identify common sources of professional stress.',
        'Develop practical strategies for maintaining wellbeing.',
        'Create a personal professional growth and reflection plan.'
      ],
      modules: [
        {
          title: 'MODULE 1: Understanding Teacher Wellbeing',
          lessons: [
            { title: '1.1 The Changing Role of the Teacher', duration: '25:00' },
            { title: '1.2 Recognising Professional Stress', duration: '28:00' }
          ]
        },
        {
          title: 'MODULE 2: Building Sustainable Practices',
          lessons: [
            { title: '2.1 Managing Time & Priorities', duration: '30:00' },
            { title: '2.2 Boundaries & Professional Relationships', duration: '27:00' },
            { title: '2.3 Reflection & Emotional Resilience', duration: '31:00' }
          ]
        },
        {
          title: 'MODULE 3: Professional Growth',
          lessons: [
            { title: '3.1 Developing a Growth Mindset', duration: '26:00' },
            { title: '3.2 Creating Your Professional Growth Plan', duration: '35:00' }
          ]
        }
      ]
    },

    // 9. Leading Change: Building a Culture of School Improvement
    {
      title: 'Leading Change: Building a Culture of School Improvement',
      slug: 'leading-change-building-a-culture-of-school-improvement',
      category: 'Leadership & School Development',
      instructor: 'Dr. Rajiv Bhatia',
      duration: 12,
      level: 'ADVANCED',
      price: 3499,
      discountPrice: 2999,
      description: 'Develop leadership skills needed to guide meaningful school improvement, manage change and build a culture of continuous development.',
      shortDescription: 'Guide school improvement, manage change resistance, and foster collaborative faculty teams.',
      whatYouWillLearn: [
        'Understand the principles of effective school improvement.',
        'Develop strategies for leading organisational change.',
        'Build collaborative cultures that support continuous improvement.'
      ],
      modules: [
        {
          title: 'MODULE 1: Understanding School Improvement',
          lessons: [
            { title: '1.1 What Makes Schools Improve?', duration: '30:00' },
            { title: '1.2 Identifying School Priorities', duration: '34:00' },
            { title: '1.3 Using Evidence for Improvement', duration: '32:00' }
          ]
        },
        {
          title: 'MODULE 2: Leading Change',
          lessons: [
            { title: '2.1 Understanding Change in Schools', duration: '31:00' },
            { title: '2.2 Communicating the Need for Change', duration: '35:00' },
            { title: '2.3 Managing Resistance & Building Trust', duration: '38:00' }
          ]
        },
        {
          title: 'MODULE 3: Building People & Culture',
          lessons: [
            { title: '3.1 Developing Teacher Leadership', duration: '30:00' },
            { title: '3.2 Building Collaborative Teams', duration: '34:00' },
            { title: '3.3 Creating a Professional Learning Culture', duration: '36:00' }
          ]
        },
        {
          title: 'MODULE 4: Sustaining Improvement',
          lessons: [
            { title: '4.1 School Improvement Planning', duration: '31:00' },
            { title: '4.2 Monitoring Progress', duration: '29:00' },
            { title: '4.3 Sustaining Change', duration: '35:00' }
          ]
        }
      ]
    },

    // 10. Mentoring Teachers: From Supervision to Professional Growth
    {
      title: 'Mentoring Teachers: From Supervision to Professional Growth',
      slug: 'mentoring-teachers-from-supervision-to-professional-growth',
      category: 'Leadership & School Development',
      instructor: 'Dr. Sunita Rao',
      duration: 8,
      level: 'ADVANCED',
      price: 2499,
      discountPrice: 1999,
      description: 'Learn how academic leaders and coordinators can use mentoring and coaching to strengthen teacher practice and professional learning.',
      shortDescription: 'Move from inspection to transformative coaching, active listening, and teacher growth plans.',
      whatYouWillLearn: [
        'Understand the difference between supervision, mentoring and coaching.',
        'Conduct productive professional conversations with teachers.',
        'Develop structured mentoring plans that support sustained teacher growth.'
      ],
      modules: [
        {
          title: 'MODULE 1: Foundations of Teacher Mentoring',
          lessons: [
            { title: '1.1 Mentoring vs Coaching vs Supervision', duration: '28:00' },
            { title: '1.2 The Role of the Academic Mentor', duration: '30:00' },
            { title: '1.3 Building Trusting Professional Relationships', duration: '32:00' }
          ]
        },
        {
          title: 'MODULE 2: Effective Mentoring Conversations',
          lessons: [
            { title: '2.1 Active Listening & Powerful Questions', duration: '29:00' },
            { title: '2.2 Giving Constructive Feedback', duration: '34:00' },
            { title: '2.3 Difficult Professional Conversations', duration: '31:00' }
          ]
        },
        {
          title: 'MODULE 3: Mentoring in Practice',
          lessons: [
            { title: '3.1 Classroom Observation & Reflection', duration: '35:00' },
            { title: '3.2 Creating Individual Growth Plans', duration: '30:00' },
            { title: '3.3 Building a Sustainable Mentoring Programme', duration: '38:00' }
          ]
        }
      ]
    },

    // 11. Montessori Method: Principles & Practice for Early Years
    {
      title: 'Montessori Method: Principles & Practice for Early Years',
      slug: 'montessori-method-principles-practice-for-early-years',
      category: 'Early Childhood Education',
      instructor: 'Dr. Ananya Mehra',
      duration: 10,
      level: 'BEGINNER',
      price: 2499,
      discountPrice: 1999,
      description: 'Explore the core principles of Montessori education and learn how prepared environments, hands-on materials and independence support young children\'s development.',
      shortDescription: 'Prepared environments, sensorial materials, and child-led independence.',
      whatYouWillLearn: [
        'Understand the fundamental principles of the Montessori approach.',
        'Explore the role of the prepared environment and Montessori materials.',
        'Apply Montessori-inspired practices that encourage independence and self-directed learning.'
      ],
      modules: [
        {
          title: 'MODULE 1: Foundations of Montessori Education',
          lessons: [
            { title: '1.1 Introduction to the Montessori Approach', duration: '28:00' },
            { title: '1.2 The Montessori Child & Development', duration: '32:00' },
            { title: '1.3 Principles of Independence & Self-Directed Learning', duration: '30:00' }
          ]
        },
        {
          title: 'MODULE 2: The Prepared Environment',
          lessons: [
            { title: '2.1 Creating a Prepared Environment', duration: '35:00' },
            { title: '2.2 Montessori Materials & Hands-On Learning', duration: '34:00' },
            { title: '2.3 Practical Life & Sensorial Experiences', duration: '31:00' }
          ]
        },
        {
          title: 'MODULE 3: Montessori Practice',
          lessons: [
            { title: '3.1 The Role of the Montessori Educator', duration: '29:00' },
            { title: '3.2 Observation & Individualised Learning', duration: '35:00' },
            { title: '3.3 Bringing Montessori Principles into Everyday Practice', duration: '38:00' }
          ]
        }
      ]
    },

    // 12. Reggio Emilia Approach: The Child as a Capable Learner
    {
      title: 'Reggio Emilia Approach: The Child as a Capable Learner',
      slug: 'reggio-emilia-approach-the-child-as-a-capable-learner',
      category: 'Early Childhood Education',
      instructor: 'Pihu Kapoor',
      duration: 8,
      level: 'INTERMEDIATE',
      price: 1999,
      discountPrice: 1499,
      description: 'Discover the Reggio Emilia approach and explore how relationships, environment, documentation and children\'s ideas can shape meaningful early learning experiences.',
      shortDescription: 'The Hundred Languages of Children, the environment as third teacher, and provocations.',
      whatYouWillLearn: [
        'Understand the core philosophy and principles of the Reggio Emilia approach.',
        'Use children\'s interests and questions as starting points for learning.',
        'Explore documentation and the environment as tools for learning.'
      ],
      modules: [
        {
          title: 'MODULE 1: Understanding Reggio Emilia',
          lessons: [
            { title: '1.1 Origins & Philosophy of Reggio Emilia', duration: '30:00' },
            { title: '1.2 The Image of the Child', duration: '28:00' },
            { title: '1.3 The Hundred Languages of Children', duration: '32:00' }
          ]
        },
        {
          title: 'MODULE 2: Environment & Relationships',
          lessons: [
            { title: '2.1 The Environment as the Third Teacher', duration: '35:00' },
            { title: '2.2 Relationships, Collaboration & Community', duration: '31:00' },
            { title: '2.3 Designing Provocations for Learning', duration: '34:00' }
          ]
        },
        {
          title: 'MODULE 3: Documentation & Project Work',
          lessons: [
            { title: '3.1 Observation & Pedagogical Documentation', duration: '30:00' },
            { title: '3.2 Project-Based Exploration', duration: '35:00' }
          ]
        }
      ]
    },

    // 13. IB Primary Years Programme: Foundations for New Educators
    {
      title: 'IB Primary Years Programme: Foundations for New Educators',
      slug: 'ib-primary-years-programme-foundations-for-new-educators',
      category: 'Primary Years & Curriculum',
      instructor: 'Meera Iyer',
      duration: 10,
      level: 'BEGINNER',
      price: 2499,
      discountPrice: 1999,
      description: 'An introductory exploration of the principles, learner profile and inquiry-driven approach associated with the IB Primary Years Programme.',
      shortDescription: 'Learner profile, transdisciplinary units, and international-mindedness.',
      whatYouWillLearn: [
        'Understand the foundational philosophy of the IB Primary Years Programme.',
        'Explore inquiry, learner agency and conceptual understanding.',
        'Connect classroom practice with internationally minded learning.'
      ],
      modules: [
        {
          title: 'MODULE 1: Introduction to PYP',
          lessons: [
            { title: '1.1 Understanding the PYP', duration: '30:00' },
            { title: '1.2 Learner Profile & International-Mindedness', duration: '32:00' },
            { title: '1.3 Agency, Voice & Choice', duration: '29:00' }
          ]
        },
        {
          title: 'MODULE 2: Inquiry & Conceptual Learning',
          lessons: [
            { title: '2.1 Inquiry-Based Learning in the PYP', duration: '34:00' },
            { title: '2.2 Concepts & Big Ideas', duration: '31:00' },
            { title: '2.3 Transdisciplinary Learning', duration: '36:00' }
          ]
        },
        {
          title: 'MODULE 3: Classroom Practice',
          lessons: [
            { title: '3.1 Designing Learning Experiences', duration: '32:00' },
            { title: '3.2 Assessment & Reflection', duration: '30:00' },
            { title: '3.3 From Teacher-Led to Learner-Centred Practice', duration: '38:00' }
          ]
        }
      ]
    },

    // 14. Cambridge Early Years: Foundations of Early Learning
    {
      title: 'Cambridge Early Years: Foundations of Early Learning',
      slug: 'cambridge-early-years-foundations-of-early-learning',
      category: 'Early Childhood Education',
      instructor: 'Kavita Sharma',
      duration: 8,
      level: 'INTERMEDIATE',
      price: 2499,
      discountPrice: 1999,
      description: 'Explore principles of early childhood learning and development with a focus on active learning, communication, creativity and holistic development.',
      shortDescription: 'Holistic child development, active communication, and creative expression.',
      whatYouWillLearn: [
        'Understand key principles of effective early years learning.',
        'Design developmentally appropriate and engaging learning experiences.',
        'Support communication, creativity and holistic child development.'
      ],
      modules: [
        {
          title: 'MODULE 1: Understanding Early Years Learning',
          lessons: [
            { title: '1.1 Principles of Early Years Education', duration: '28:00' },
            { title: '1.2 Child Development & Learning', duration: '32:00' },
            { title: '1.3 Creating Positive Learning Environments', duration: '30:00' }
          ]
        },
        {
          title: 'MODULE 2: Active Learning',
          lessons: [
            { title: '2.1 Learning Through Exploration', duration: '31:00' },
            { title: '2.2 Communication & Language Development', duration: '34:00' },
            { title: '2.3 Creativity, Movement & Expression', duration: '29:00' }
          ]
        },
        {
          title: 'MODULE 3: Supporting Every Child',
          lessons: [
            { title: '3.1 Observation & Assessment', duration: '30:00' },
            { title: '3.2 Supporting Individual Learning Needs', duration: '36:00' }
          ]
        }
      ]
    },

    // 15. Waldorf-Inspired Education: Rhythm, Imagination & Development
    {
      title: 'Waldorf-Inspired Education: Rhythm, Imagination & Development',
      slug: 'waldorf-inspired-education-rhythm-imagination-development',
      category: 'Early Childhood Education',
      instructor: 'Dr. Sunita Rao',
      duration: 6,
      level: 'BEGINNER',
      price: 1499,
      discountPrice: 999,
      description: 'Explore Waldorf-inspired educational principles with an emphasis on imagination, rhythm, storytelling, creativity and developmentally appropriate experiences.',
      shortDescription: 'Rhythm, storytelling, imaginative play, and nurturing development.',
      whatYouWillLearn: [
        'Understand key ideas associated with Waldorf-inspired education.',
        'Explore storytelling, rhythm, music and imaginative play.',
        'Create nurturing learning experiences appropriate to young children\'s development.'
      ],
      modules: [
        {
          title: 'MODULE 1: Foundations',
          lessons: [
            { title: '1.1 Understanding Waldorf-Inspired Education', duration: '27:00' },
            { title: '1.2 Childhood Development & Readiness', duration: '30:00' }
          ]
        },
        {
          title: 'MODULE 2: Learning Through Imagination',
          lessons: [
            { title: '2.1 Storytelling & Imaginative Learning', duration: '31:00' },
            { title: '2.2 Art, Music & Creative Expression', duration: '28:00' },
            { title: '2.3 Rhythm, Routine & the Learning Environment', duration: '30:00' }
          ]
        },
        {
          title: 'MODULE 3: Classroom Practice',
          lessons: [
            { title: '3.1 Creating Developmentally Appropriate Experiences', duration: '29:00' },
            { title: '3.2 Reflection & Teacher Practice', duration: '32:00' }
          ]
        }
      ]
    },

    // 16. Emergent Curriculum: Following Children's Curiosity
    {
      title: 'Emergent Curriculum: Following Children\'s Curiosity',
      slug: 'emergent-curriculum-following-childrens-curiosity',
      category: 'Early Childhood Education',
      instructor: 'Dr. Neha Kapoor',
      duration: 8,
      level: 'INTERMEDIATE',
      price: 1999,
      discountPrice: 1499,
      description: 'Learn how educators can use children\'s interests, questions and observations to develop responsive and meaningful learning experiences.',
      shortDescription: 'Responsive teaching, child curiosity as learning provocations, and documentation.',
      whatYouWillLearn: [
        'Understand the principles of emergent curriculum.',
        'Turn children\'s interests and questions into learning opportunities.',
        'Plan responsively while maintaining meaningful learning goals.'
      ],
      modules: [
        {
          title: 'MODULE 1: Understanding Emergent Curriculum',
          lessons: [
            { title: '1.1 What Is Emergent Curriculum?', duration: '28:00' },
            { title: '1.2 Children\'s Interests as Learning Opportunities', duration: '31:00' },
            { title: '1.3 Observation as the Starting Point', duration: '30:00' }
          ]
        },
        {
          title: 'MODULE 2: Planning Responsively',
          lessons: [
            { title: '2.1 From Observation to Planning', duration: '34:00' },
            { title: '2.2 Designing Learning Provocations', duration: '32:00' },
            { title: '2.3 Balancing Child Interest & Curriculum Intent', duration: '35:00' }
          ]
        },
        {
          title: 'MODULE 3: Reflection & Documentation',
          lessons: [
            { title: '3.1 Documenting Children\'s Learning', duration: '29:00' },
            { title: '3.2 Reflective Teaching & Next Steps', duration: '34:00' }
          ]
        }
      ]
    },

    // 17. Introduction to Modern Pedagogy & Active Classrooms (Free Masterclass)
    {
      title: 'Introduction to Modern Pedagogy & Active Classrooms (Free Masterclass)',
      slug: 'intro-modern-pedagogy-active-classrooms-free',
      category: 'Teacher Development',
      instructor: 'Dr. Rohan Malhotra',
      duration: 4,
      level: 'BEGINNER',
      price: 0,
      discountPrice: 1499,
      description: 'A foundational complimentary masterclass covering student-centric pedagogy, active participation techniques, and engaging 45-minute lesson blueprints.',
      shortDescription: 'Master modern learner-centric pedagogy, active classroom techniques, and 45-minute lesson blueprints.',
      whatYouWillLearn: [
        'Core principles of learner-centric modern pedagogy.',
        'Proven techniques to boost student engagement and participation.',
        'Simple differentiated instruction strategies for mixed-ability classrooms.',
        'Designing structured 45-minute interactive lesson blueprints.'
      ],
      modules: [
        {
          title: 'MODULE 1: Principles of Modern Pedagogy',
          lessons: [
            { title: '1.1 Welcome & Course Orientation', duration: '06:30' },
            { title: '1.2 Moving from Teacher-Led to Learner-Centric Classrooms', duration: '14:20' },
            { title: '1.3 Understanding Diverse Learning Modalities', duration: '12:15' }
          ]
        },
        {
          title: 'MODULE 2: Active Participation & Lesson Blueprinting',
          lessons: [
            { title: '2.1 Think-Pair-Share and Rapid Classroom Polling', duration: '15:45' },
            { title: '2.2 Crafting a 45-Minute Interactive Lesson Plan', duration: '18:10' },
            { title: '2.3 Reflection & Masterclass Summary', duration: '08:40' }
          ]
        }
      ]
    },

    // 18. Foundations of Play-Based Learning: Quickstart Guide (Free Masterclass)
    {
      title: 'Foundations of Play-Based Learning: Quickstart Guide (Free Masterclass)',
      slug: 'foundations-play-based-learning-quickstart-free',
      category: 'Early Childhood Education',
      instructor: 'Pihu Kapoor',
      duration: 3,
      level: 'BEGINNER',
      price: 0,
      discountPrice: 1299,
      description: 'Discover how to ignite curiosity, communication, and cognitive growth in early learners through purposeful play and observation.',
      shortDescription: 'Neuroscience of play, open-ended invitations, and observing development through play.',
      whatYouWillLearn: [
        'The neuroscience of play in early brain development.',
        'Creating low-cost, sensory-rich play invitations.',
        'Balancing child-led free play with teacher-guided inquiry.',
        'Observing and documenting developmental milestones through play.'
      ],
      modules: [
        {
          title: 'MODULE 1: The Power & Science of Play',
          lessons: [
            { title: '1.1 Why Play Matters: Brain Architecture in Years 0-6', duration: '09:15' },
            { title: '1.2 Types of Play: Sensory, Constructive & Dramatic', duration: '13:40' }
          ]
        },
        {
          title: 'MODULE 2: Practical Play Environments & Observation',
          lessons: [
            { title: '2.1 Setting Up Open-Ended Play Stations on a Budget', duration: '16:20' },
            { title: '2.2 The Art of Pedagogical Observation & Next Steps', duration: '11:50' }
          ]
        }
      ]
    },

    // 19. Digital Tools & Formative Assessment for Educators (Free Masterclass)
    {
      title: 'Digital Tools & Formative Assessment for Educators (Free Masterclass)',
      slug: 'digital-tools-formative-assessment-educators-free',
      category: 'Professional Learning',
      instructor: 'Kavita Sharma',
      duration: 4,
      level: 'BEGINNER',
      price: 0,
      discountPrice: 1599,
      description: 'Master real-time check-ins, digital exit tickets, and interactive rubrics to track student comprehension without exam anxiety.',
      shortDescription: 'Assessment for learning, digital exit tickets, low-stakes pulse checks, and rubrics.',
      whatYouWillLearn: [
        'Differences between assessment OF learning vs assessment FOR learning.',
        'Implementing 5-minute digital exit tickets and pulse checks.',
        'Designing actionable student-friendly rubrics.',
        'Using assessment data to adjust tomorrow’s teaching plan.'
      ],
      modules: [
        {
          title: 'MODULE 1: The Philosophy of Formative Assessment',
          lessons: [
            { title: '1.1 Beyond Grades: Why Real-Time Assessment Matters', duration: '08:20' },
            { title: '1.2 Continuous Feedback vs Final Exams: Impact on Learner Anxiety', duration: '12:45' }
          ]
        },
        {
          title: 'MODULE 2: Practical Tools & Rubrics',
          lessons: [
            { title: '2.1 Rapid Check-in Strategies: Exit Tickets, Polls & Traffic Lights', duration: '14:10' },
            { title: '2.2 Building Descriptive, Criterion-Referenced Rubrics', duration: '15:30' },
            { title: '2.3 Course Wrap-Up & Implementation Blueprint', duration: '07:15' }
          ]
        }
      ]
    }
  ];

  // 6. Insert All Courses and their Curricula
  console.log('📚 Inserting all courses with modules and lessons into Supabase...');

  for (let i = 0; i < courseData.length; i++) {
    const c = courseData[i];
    const categoryId = categoryMap.get(c.category);
    const instructorId = instructorMap.get(c.instructor);

    if (!categoryId || !instructorId) {
      console.error(`Skipping course: ${c.title} (missing category or instructor)`);
      continue;
    }

    const createdCourse = await prisma.course.create({
      data: {
        title: c.title,
        slug: c.slug,
        description: c.description,
        shortDescription: c.shortDescription,
        thumbnail: thumbnails[i] || thumbnails[0],
        price: c.price,
        discountPrice: c.discountPrice,
        currency: 'INR',
        categoryId,
        instructorId,
        level: c.level,
        status: 'PUBLISHED',
        durationHours: c.duration,
        language: 'English',
        bestseller: i < 4,
        isNew: i >= 10,
        whatYouWillLearn: JSON.stringify(c.whatYouWillLearn),
        requirements: JSON.stringify([
          'Passion for teaching and early childhood development',
          'Access to a classroom or early years learning environment (recommended)',
          'Commitment to child-centred and reflective education'
        ]),
        targetAudience: JSON.stringify([
          'Early Childhood & Primary Educators',
          'Montessori, Kindergarten & Nursery Teachers',
          'School Coordinators & Academic Leaders',
          'Aspiring Teachers & Child Care Specialists'
        ])
      }
    });

    console.log(`+ Created Course [${i + 1}/16]: ${createdCourse.title}`);

    // Create Sections and Lessons
    for (let sIdx = 0; sIdx < c.modules.length; sIdx++) {
      const mod = c.modules[sIdx];
      const section = await prisma.courseSection.create({
        data: {
          courseId: createdCourse.id,
          title: mod.title,
          order: sIdx + 1
        }
      });

      for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
        const les = mod.lessons[lIdx];
        const durationSec = parseDurationToSeconds(les.duration);
        await prisma.lesson.create({
          data: {
            sectionId: section.id,
            title: les.title,
            duration: les.duration,
            durationSeconds: durationSec,
            order: lIdx + 1,
            type: 'VIDEO',
            isFree: sIdx === 0 && lIdx === 0, // First lesson is preview free
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
          }
        });
      }
    }
  }

  console.log('\n🎉 ALL 16 COURSES HAVE BEEN SUCCESSFULLY SEEDED INTO SUPABASE!');
  await prisma.$disconnect();
  process.exit(0);
}

seed16Courses().catch((err) => {
  console.error('Error seeding 16 courses:', err);
  process.exit(1);
});
