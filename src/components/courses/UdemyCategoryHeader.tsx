'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface UdemyCategoryHeaderProps {
  categoryName: string;
  totalCoursesCount: number;
  availableCategories: { id: string; name: string; slug: string }[];
  onSelectCategory: (catName: string) => void;
  selectedPrice?: string;
  onSelectPrice?: (price: string) => void;
  freeCount?: number;
}

export const UdemyCategoryHeader: React.FC<UdemyCategoryHeaderProps> = ({
  categoryName,
  totalCoursesCount,
  availableCategories,
  onSelectCategory,
  selectedPrice,
  onSelectPrice,
  freeCount,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [availableCategories]);

  const handleScroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const delta = 280;
      scrollRef.current.scrollBy({
        left: dir === 'left' ? -delta : delta,
        behavior: 'smooth',
      });
    }
  };

  const isAll =
    (!categoryName || categoryName === 'all') &&
    (!selectedPrice || selectedPrice === 'all');

  const displayTitle =
    selectedPrice === 'free'
      ? 'Free Courses & Masterclasses'
      : isAll
      ? 'All Courses'
      : `${categoryName} Courses`;

  return (
    <div className="bg-white border-b border-[#d1d7dc] py-6 mb-6">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* 1. Breadcrumb Path */}
        <nav className="flex items-center gap-2 text-xs text-[#6a6f73] font-medium mb-3">
          <Link href="/" className="hover:text-[#2d2f31] transition-colors">
            Home
          </Link>
          <Icon name="chevron_right" size={14} className="text-[#6a6f73]" />
          <Link href="/courses" className="hover:text-[#2d2f31] transition-colors">
            Courses
          </Link>
          {!isAll && (
            <>
              <Icon name="chevron_right" size={14} className="text-[#6a6f73]" />
              <span className="text-[#2d2f31] font-bold truncate max-w-xs">{categoryName}</span>
            </>
          )}
        </nav>

        {/* 2. Main Title & Subtitle */}
        <h1 className="text-2xl sm:text-[32px] font-bold text-[#2d2f31] tracking-tight leading-tight mb-2">
          {displayTitle}
        </h1>
        <p className="text-sm sm:text-base text-[#2d2f31] leading-relaxed max-w-3xl font-normal mb-5">
          {isAll
            ? 'Explore our comprehensive catalog of accredited teacher education, early childhood pedagogy, Montessori methods, and classroom leadership courses.'
            : `Learn foundational frameworks, active classroom protocols, and verified pedagogical strategies in ${categoryName}.`}
        </p>

        {/* 3. Popular Courses / Categories Carousel Bar with Left & Right Arrows */}
        <div className="relative flex items-center group/carousel">
          <span className="text-xs font-bold text-[#6a6f73] uppercase tracking-wider shrink-0 mr-2 hidden md:inline">
            Popular Courses:
          </span>

          {/* Left Scroll Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll('left')}
              aria-label="Scroll left"
              className="absolute left-0 z-10 w-8 h-8 rounded-full bg-white/95 border border-[#d1d7dc] shadow-md flex items-center justify-center text-[#2d2f31] hover:bg-[#f7f9fa] hover:scale-105 transition-all cursor-pointer"
            >
              <Icon name="chevron_left" size={18} />
            </button>
          )}

          {/* Scrollable Pills Container */}
          <div
            ref={scrollRef}
            className="flex items-center gap-2 overflow-x-auto py-1 px-1 scroll-smooth no-scrollbar scrollbar-none w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* All Courses Pill */}
            <button
              onClick={() => {
                if (onSelectPrice) onSelectPrice('all');
                onSelectCategory('all');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-colors border shrink-0 cursor-pointer ${
                isAll
                  ? 'bg-[#2d2f31] text-white border-[#2d2f31] shadow-xs'
                  : 'bg-white text-[#2d2f31] border-[#d1d7dc] hover:border-[#2d2f31] hover:bg-[#f7f9fa]'
              }`}
            >
              All Courses
            </button>

            {/* Free Courses Pill */}
            {onSelectPrice && (
              <button
                onClick={() => {
                  if (selectedPrice === 'free') {
                    onSelectPrice('all');
                  } else {
                    onSelectPrice('free');
                    onSelectCategory('all');
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-colors border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedPrice === 'free'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedPrice === 'free' ? 'bg-white' : 'bg-emerald-500'
                  }`}
                />
                <span>
                  Free Courses {freeCount !== undefined && freeCount > 0 ? `(${freeCount})` : ''}
                </span>
              </button>
            )}

            {/* Dynamic Category Pills */}
            {(availableCategories || []).map((cat, idx) => {
              if (!cat) return null;
              const catName = cat.name || '';
              const catSlug = cat.slug || '';
              const curLower = (categoryName || '').toLowerCase().trim();
              const isSelected =
                selectedPrice !== 'free' &&
                (curLower === catName.toLowerCase().trim() ||
                  curLower === catSlug.toLowerCase().trim());

              return (
                <button
                  key={cat.id || catSlug || idx}
                  onClick={() => {
                    // Always clear free price filter so that category courses show up immediately!
                    if (onSelectPrice) onSelectPrice('all');
                    onSelectCategory(catName || catSlug);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-colors border shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#2d2f31] text-white border-[#2d2f31] shadow-xs'
                      : 'bg-white text-[#2d2f31] border-[#d1d7dc] hover:border-[#2d2f31] hover:bg-[#f7f9fa]'
                  }`}
                >
                  {catName || catSlug}
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll('right')}
              aria-label="Scroll right"
              className="absolute right-0 z-10 w-8 h-8 rounded-full bg-white/95 border border-[#d1d7dc] shadow-md flex items-center justify-center text-[#2d2f31] hover:bg-[#f7f9fa] hover:scale-105 transition-all cursor-pointer"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UdemyCategoryHeader;
