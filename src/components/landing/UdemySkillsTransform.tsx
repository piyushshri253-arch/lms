'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Course } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { UdemyMarketplaceCard, MarketplaceCourse } from './UdemyMarketplaceCard';

interface UdemySkillsTransformProps {
  courses?: Course[];
}

interface SkillCategory {
  id: string;
  name: string;
  queryParam: string;
  courses: MarketplaceCourse[];
}

const SKILL_CATEGORIES_DATA: SkillCategory[] = [
  {
    id: 'ai',
    name: 'Artificial Intelligence (AI)',
    queryParam: 'Artificial Intelligence',
    courses: [
      {
        id: 'skills-ai-engineer-bootcamp',
        slug: 'the-ai-engineer-course-2026-bootcamp',
        title: 'The AI Engineer Course 2026: Complete AI Engineer Bootcamp',
        instructor: '365 Careers',
        rating: 4.5,
        ratingsCount: 25331,
        price: 459,
        originalPrice: 2499,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=600&auto=format&fit=crop',
        durationHours: 24
      },
      {
        id: 'skills-ai-foundations-frank-kane',
        slug: 'ai-foundations-the-fundamentals-modern-ai',
        title: 'AI Foundations — The Fundamentals: Understanding Modern AI',
        instructor: 'Sundog Education by Frank Kane',
        rating: 4.6,
        ratingsCount: 708,
        price: 449,
        originalPrice: 1999,
        badge: null,
        thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop',
        durationHours: 8
      },
      {
        id: 'skills-ai-programming-python',
        slug: 'ai-programming-in-python-beginner-to-expert',
        title: 'AI Programming in Python - Beginner to Expert',
        instructor: 'Robert Gioia',
        rating: 4.6,
        ratingsCount: 23,
        price: 449,
        originalPrice: 1999,
        badge: 'Hot & New',
        thumbnail: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600&auto=format&fit=crop',
        durationHours: 12
      },
      {
        id: 'skills-intro-to-ai-agents',
        slug: 'intro-to-ai-agents-and-agentic-ai',
        title: 'Intro to AI Agents and Agentic AI',
        instructor: '365 Careers',
        rating: 4.5,
        ratingsCount: 84488,
        price: 449,
        originalPrice: 2299,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=600&auto=format&fit=crop',
        durationHours: 16
      }
    ]
  },
  {
    id: 'python',
    name: 'Python',
    queryParam: 'Python',
    courses: [
      {
        id: 'skills-100-days-python',
        slug: '100-days-of-code-python-pro-bootcamp',
        title: '100 Days of Code™: The Complete Python Pro Bootcamp',
        instructor: 'Dr. Angela Yu, Developer and Lead Instructor',
        rating: 4.7,
        ratingsCount: 356842,
        price: 459,
        originalPrice: 3999,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=600&auto=format&fit=crop',
        durationHours: 58
      },
      {
        id: 'skills-automate-boring-stuff',
        slug: 'automate-the-boring-stuff-with-python',
        title: 'Automate the Boring Stuff with Python Programming',
        instructor: 'Al Sweigart',
        rating: 4.6,
        ratingsCount: 112490,
        price: 449,
        originalPrice: 2499,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop',
        durationHours: 10
      },
      {
        id: 'skills-python-datascience',
        slug: 'python-for-data-science-machine-learning',
        title: 'Python for Data Science and Machine Learning Bootcamp',
        instructor: 'Jose Portilla',
        rating: 4.6,
        ratingsCount: 142389,
        price: 459,
        originalPrice: 3499,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop',
        durationHours: 25
      },
      {
        id: 'skills-python-zero-to-hero',
        slug: 'complete-python-developer-zero-to-mastery',
        title: 'Complete Python Developer in 2026: Zero to Mastery',
        instructor: 'Andrei Neagoie',
        rating: 4.7,
        ratingsCount: 78912,
        price: 449,
        originalPrice: 2799,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=600&auto=format&fit=crop',
        durationHours: 32
      }
    ]
  },
  {
    id: 'excel',
    name: 'Microsoft Excel',
    queryParam: 'Microsoft Excel',
    courses: [
      {
        id: 'skills-excel-bi-power-query',
        slug: 'microsoft-excel-business-intelligence-power-query',
        title: 'Microsoft Excel: Business Intelligence w/ Power Query & DAX',
        instructor: 'Maven Analytics',
        rating: 4.7,
        ratingsCount: 48912,
        price: 449,
        originalPrice: 2999,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop',
        durationHours: 15
      },
      {
        id: 'skills-excel-essentials',
        slug: 'excel-essentials-for-real-world',
        title: 'Excel Essentials for the Real World (Complete Excel Course)',
        instructor: 'Leila Gharani',
        rating: 4.7,
        ratingsCount: 98320,
        price: 459,
        originalPrice: 3199,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=600&auto=format&fit=crop',
        durationHours: 11
      },
      {
        id: 'skills-excel-beginner-advanced',
        slug: 'microsoft-excel-beginner-to-advanced',
        title: 'Microsoft Excel - Excel from Beginner to Advanced',
        instructor: 'Kyle Pew',
        rating: 4.7,
        ratingsCount: 420119,
        price: 459,
        originalPrice: 3499,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?q=80&w=600&auto=format&fit=crop',
        durationHours: 21
      },
      {
        id: 'skills-excel-financial-modeling',
        slug: 'data-analysis-excel-financial-modeling',
        title: 'Data Analysis in Excel: Master Financial Modeling',
        instructor: 'Start-Tech Academy',
        rating: 4.6,
        ratingsCount: 19410,
        price: 449,
        originalPrice: 1999,
        badge: null,
        thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=600&auto=format&fit=crop',
        durationHours: 13
      }
    ]
  },
  {
    id: 'ai-agents',
    name: 'AI Agents & Agentic AI',
    queryParam: 'AI Agents',
    courses: [
      {
        id: 'skills-intro-agents-dup',
        slug: 'intro-to-ai-agents-and-agentic-ai-pro',
        title: 'Intro to AI Agents and Agentic AI',
        instructor: '365 Careers',
        rating: 4.5,
        ratingsCount: 84488,
        price: 449,
        originalPrice: 2299,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=600&auto=format&fit=crop',
        durationHours: 16
      },
      {
        id: 'skills-langchain-llamaindex',
        slug: 'langchain-llamaindex-agentic-ai-bootcamp',
        title: 'LangChain & LlamaIndex: Complete Agentic AI Bootcamp',
        instructor: 'Eden Marco',
        rating: 4.8,
        ratingsCount: 12940,
        price: 459,
        originalPrice: 3199,
        badge: 'Hot & New',
        thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop',
        durationHours: 18
      },
      {
        id: 'skills-crewai-autogpt',
        slug: 'autogpt-crewai-multi-agent-systems-python',
        title: 'AutoGPT, CrewAI, and Multi-Agent Systems in Python',
        instructor: 'Dr. Ryan Ahmed',
        rating: 4.7,
        ratingsCount: 8310,
        price: 459,
        originalPrice: 2899,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
        durationHours: 14
      },
      {
        id: 'skills-production-agents',
        slug: 'building-production-ai-agents-anthropic-openai',
        title: 'Building Production AI Agents with Anthropic & OpenAI',
        instructor: 'Hadelin de Ponteves',
        rating: 4.6,
        ratingsCount: 5120,
        price: 449,
        originalPrice: 2199,
        badge: null,
        thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop',
        durationHours: 10
      }
    ]
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    queryParam: 'Digital Marketing',
    courses: [
      {
        id: 'skills-digital-marketing-12-in-1',
        slug: 'complete-digital-marketing-course-12-in-1',
        title: 'The Complete Digital Marketing Course - 12 Courses in 1',
        instructor: 'Rob Percival, Daragh Walsh',
        rating: 4.5,
        ratingsCount: 174210,
        price: 459,
        originalPrice: 3499,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1432888622747-4eb9a8f2c293?q=80&w=600&auto=format&fit=crop',
        durationHours: 36
      },
      {
        id: 'skills-mega-digital-marketing',
        slug: 'mega-digital-marketing-course-a-to-z',
        title: 'Mega Digital Marketing Course A-Z: 32 Courses in 1',
        instructor: 'Pouya Eti',
        rating: 4.6,
        ratingsCount: 43200,
        price: 449,
        originalPrice: 2999,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?q=80&w=600&auto=format&fit=crop',
        durationHours: 64
      },
      {
        id: 'skills-seo-training-mastery',
        slug: 'seo-2026-complete-seo-training-wordpress',
        title: 'SEO 2026: Complete SEO Training + WordPress SEO',
        instructor: 'Arun Nagarathanam',
        rating: 4.5,
        ratingsCount: 21390,
        price: 449,
        originalPrice: 1999,
        badge: null,
        thumbnail: 'https://images.unsplash.com/photo-1571786256017-aee7a0c009b6?q=80&w=600&auto=format&fit=crop',
        durationHours: 19
      },
      {
        id: 'skills-social-media-mastery',
        slug: 'social-media-marketing-mastery-learn-ads',
        title: 'Social Media Marketing MASTERY | Learn Ads on 10+ Platforms',
        instructor: 'COURSE ENVOY',
        rating: 4.5,
        ratingsCount: 39810,
        price: 459,
        originalPrice: 3299,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=600&auto=format&fit=crop',
        durationHours: 12
      }
    ]
  },
  {
    id: 'aws',
    name: 'Amazon AWS',
    queryParam: 'Amazon AWS',
    courses: [
      {
        id: 'skills-aws-solutions-architect',
        slug: 'ultimate-aws-certified-solutions-architect-associate',
        title: 'Ultimate AWS Certified Solutions Architect Associate SAA-C03',
        instructor: 'Stephane Maarek',
        rating: 4.7,
        ratingsCount: 248310,
        price: 459,
        originalPrice: 3999,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
        durationHours: 27
      },
      {
        id: 'skills-aws-cloud-practitioner',
        slug: 'aws-certified-cloud-practitioner-clf-c02',
        title: 'AWS Certified Cloud Practitioner CLF-C02',
        instructor: 'Stephane Maarek',
        rating: 4.7,
        ratingsCount: 195420,
        price: 459,
        originalPrice: 3499,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=600&auto=format&fit=crop',
        durationHours: 15
      },
      {
        id: 'skills-aws-developer-associate',
        slug: 'aws-certified-developer-associate-2026',
        title: 'AWS Certified Developer Associate 2026',
        instructor: 'Neal Davis',
        rating: 4.7,
        ratingsCount: 68910,
        price: 449,
        originalPrice: 2799,
        badge: 'Bestseller',
        thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop',
        durationHours: 31
      },
      {
        id: 'skills-aws-sysops-admin',
        slug: 'aws-certified-sysops-administrator-associate',
        title: 'AWS Certified SysOps Administrator Associate',
        instructor: 'Stephane Maarek',
        rating: 4.6,
        ratingsCount: 34120,
        price: 449,
        originalPrice: 2499,
        badge: null,
        thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=600&auto=format&fit=crop',
        durationHours: 20
      }
    ]
  }
];

export const UdemySkillsTransform: React.FC<UdemySkillsTransformProps> = ({ courses = [] }) => {
  const [selectedTabId, setSelectedTabId] = useState<string>('ai');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const activeCategory = SKILL_CATEGORIES_DATA.find((c) => c.id === selectedTabId) || SKILL_CATEGORIES_DATA[0];

  // Merge database courses into the active category if relevant
  const currentCategoryCourses: MarketplaceCourse[] = React.useMemo(() => {
    const list = [...activeCategory.courses];

    if (courses && courses.length > 0) {
      courses.forEach((c) => {
        const catName = (c.category || '').toLowerCase();
        const activeName = activeCategory.name.toLowerCase();
        const activeParam = activeCategory.queryParam.toLowerCase();

        if (catName.includes(activeParam) || activeName.includes(catName)) {
          if (!list.some((item) => item.slug === c.slug || item.id === c.id)) {
            list.unshift({
              id: c.id,
              slug: c.slug,
              title: c.title,
              instructor: c.instructor?.name || 'Faculty of Teacher Excellence',
              rating: typeof c.rating === 'number' ? c.rating : 4.8,
              ratingsCount: c.reviewsCount || 1180,
              price: c.price || 459,
              originalPrice: c.originalPrice || (c.price ? c.price * 2 : 1999),
              badge: c.bestseller ? 'Bestseller' : c.isNew ? 'Hot & New' : null,
              thumbnail:
                c.thumbnail && c.thumbnail.trim()
                  ? c.thumbnail
                  : 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop',
              durationHours: c.durationHours || 18
            });
          }
        }
      });
    }

    return list;
  }, [activeCategory, courses]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [selectedTabId]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-4">
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#2d2f31] tracking-tight leading-tight">
            Skills to transform your career and life
          </h2>
          <p className="text-sm sm:text-base text-[#6a6f73] mt-1 font-normal">
            From critical skills to technical topics, Morena Teach supports your professional development.
          </p>
        </div>

        {/* 1. Category Filter Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2 mb-6">
          {SKILL_CATEGORIES_DATA.map((cat) => {
            const isSelected = selectedTabId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedTabId(cat.id)}
                className={`cursor-pointer px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#2d2f31] text-white shadow-xs'
                    : 'bg-white text-[#2d2f31] hover:bg-[#f7f9fa] border border-[#d1d7dc] hover:border-[#2d2f31]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* 2. Course Cards Carousel Container */}
        <div className="relative group/carousel">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              className="absolute -left-3 sm:-left-5 top-1/3 -translate-y-1/2 w-11 h-11 rounded-full bg-[#1c1d1f] hover:bg-[#2d2f31] text-white flex items-center justify-center shadow-2xl z-20 transition-all hover:scale-105 cursor-pointer"
              aria-label="Scroll left"
            >
              <Icon name="chevron_left" size={24} />
            </button>
          )}

          {/* Cards Track */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-none scroll-smooth pb-3"
          >
            {currentCategoryCourses.map((course) => (
              <div
                key={course.id}
                className="w-[260px] sm:w-[280px] md:w-[295px] shrink-0"
              >
                <UdemyMarketplaceCard course={course} />
              </div>
            ))}
          </div>

          {/* Scroll Right Button */}
          {canScrollRight && currentCategoryCourses.length > 4 && (
            <button
              onClick={() => handleScroll('right')}
              className="absolute -right-3 sm:-right-5 top-1/3 -translate-y-1/2 w-11 h-11 rounded-full bg-[#1c1d1f] hover:bg-[#2d2f31] text-white flex items-center justify-center shadow-2xl z-20 transition-all hover:scale-105 cursor-pointer"
              aria-label="Scroll right"
            >
              <Icon name="chevron_right" size={24} />
            </button>
          )}
        </div>

        {/* 3. Section Footer Link (Exact match to reference screenshot) */}
        <div className="mt-6">
          <Link
            href={`/courses?search=${encodeURIComponent(activeCategory.queryParam)}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#2d2f31] text-[#2d2f31] hover:bg-[#f7f9fa] text-sm font-bold rounded-[4px] transition-colors"
          >
            <span>Show all {activeCategory.name} courses</span>
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};
