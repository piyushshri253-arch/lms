'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Course } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { UdemyMarketplaceCard, MarketplaceCourse } from './UdemyMarketplaceCard';

interface UdemyTrendingCoursesProps {
  courses?: Course[];
}

const DEFAULT_TRENDING_COURSES: MarketplaceCourse[] = [
  {
    id: 'trending-pmp-2026',
    slug: 'pmp-exam-prep-course-35-pdus-2026',
    title: 'PMP Exam Prep Course 35 PDUs/Hours Updated for the 2026 Exam',
    instructor: 'TIA Training, Andrew Ramdayal',
    rating: 4.8,
    ratingsCount: 202001,
    price: 459,
    originalPrice: 3199,
    badge: 'Bestseller',
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop',
    durationHours: 35
  },
  {
    id: 'trending-claude-masterclass-2026',
    slug: 'complete-claude-code-masterclass-2026',
    title: 'The Complete Claude Code & Claude Cowork Masterclass [2026]',
    instructor: 'Prof. Ryan Ahmed, Ph.D., MBA',
    rating: 4.7,
    ratingsCount: 1155,
    price: 459,
    originalPrice: 1999,
    badge: 'Bestseller',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop',
    durationHours: 18
  },
  {
    id: 'trending-ai-coder-agents',
    slug: 'ai-coder-complete-claude-coding-agents',
    title: 'AI Coder: Complete Claude Code & Coding Agents Course',
    instructor: 'Ligency, Ed Donner',
    rating: 4.8,
    ratingsCount: 853,
    price: 459,
    originalPrice: 2299,
    badge: 'Bestseller',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop',
    durationHours: 14
  },
  {
    id: 'trending-python-bootcamp-angela',
    slug: '100-days-of-code-python-pro-bootcamp',
    title: '100 Days of Code™: The Complete Python Pro Bootcamp',
    instructor: 'Dr. Angela Yu, Developer and Lead Instructor',
    rating: 4.7,
    ratingsCount: 356842,
    price: 459,
    originalPrice: 3999,
    badge: 'Bestseller',
    thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=600&auto=format&fit=crop',
    durationHours: 58
  }
];

export const UdemyTrendingCourses: React.FC<UdemyTrendingCoursesProps> = ({ courses = [] }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Blend database published courses if available
  const displayCourses: MarketplaceCourse[] = React.useMemo(() => {
    const list = [...DEFAULT_TRENDING_COURSES];

    if (courses && courses.length > 0) {
      courses.forEach((c) => {
        // Only push if not duplicate title or slug
        if (!list.some((item) => item.slug === c.slug || item.id === c.id)) {
          list.push({
            id: c.id,
            slug: c.slug,
            title: c.title,
            instructor: c.instructor?.name || 'Faculty of Teacher Excellence',
            rating: typeof c.rating === 'number' ? c.rating : 4.8,
            ratingsCount: c.reviewsCount || 1420,
            price: c.price || 499,
            originalPrice: c.originalPrice || (c.price ? c.price * 2 : 1999),
            badge: c.bestseller ? 'Bestseller' : c.isNew ? 'Hot & New' : null,
            thumbnail:
              c.thumbnail && c.thumbnail.trim()
                ? c.thumbnail
                : 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop',
            durationHours: c.durationHours || 20
          });
        }
      });
    }

    return list;
  }, [courses]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [displayCourses]);

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
    <section className="py-8 md:py-12 bg-white border-b border-[#d1d7dc]/60">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-4">
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#2d2f31] tracking-tight">
            Trending Courses
          </h2>
        </div>

        {/* Carousel Container */}
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
            {displayCourses.map((course) => (
              <div
                key={course.id}
                className="w-[260px] sm:w-[280px] md:w-[295px] shrink-0"
              >
                <UdemyMarketplaceCard course={course} />
              </div>
            ))}
          </div>

          {/* Scroll Right Button */}
          {canScrollRight && displayCourses.length > 4 && (
            <button
              onClick={() => handleScroll('right')}
              className="absolute -right-3 sm:-right-5 top-1/3 -translate-y-1/2 w-11 h-11 rounded-full bg-[#1c1d1f] hover:bg-[#2d2f31] text-white flex items-center justify-center shadow-2xl z-20 transition-all hover:scale-105 cursor-pointer"
              aria-label="Scroll right"
            >
              <Icon name="chevron_right" size={24} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
