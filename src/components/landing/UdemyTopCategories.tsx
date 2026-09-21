'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface CategoryCardItem {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'early childhood': 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=800&auto=format&fit=crop',
  childhood: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=800&auto=format&fit=crop',
  pedagogy: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop',
  teaching: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop',
  'teacher development': 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop',
  teacher: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop',
  primary: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop',
  curriculum: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop',
  leadership: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop',
  school: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop',
  professional: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
  engineering: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop',
  design: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=800&auto=format&fit=crop',
  business: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop',
  science: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop',
  ai: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop',
  tech: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop',
  python: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=800&auto=format&fit=crop'
};

function getCategoryImage(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, img] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (lower.includes(key)) return img;
  }
  return 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop';
}

interface UdemyTopCategoriesProps {
  categories?: { id: string; name: string; slug: string }[];
}

export const UdemyTopCategories: React.FC<UdemyTopCategoriesProps> = ({ categories: initialCategories }) => {
  const [categories, setCategories] = useState<CategoryCardItem[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth'
    });
  };

  const formatCategories = (list: any[]) => {
    const seen = new Set<string>();
    const unique: CategoryCardItem[] = [];
    for (const c of list) {
      const normalized = c.name.trim().toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push({
          id: c.id,
          name: c.name,
          slug: c.slug || c.name,
          image: c.image || getCategoryImage(c.name)
        });
      }
    }
    return unique;
  };

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(formatCategories(initialCategories));
      return;
    }

    // Fetch live published categories
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories && data.categories.length > 0) {
          setCategories(formatCategories(data.categories));
        }
      })
      .catch(() => {});
  }, [initialCategories]);

  useEffect(() => {
    checkScroll();
  }, [categories]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header with Navigation Arrows */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#2d2f31] tracking-tight">
              Top categories
            </h2>
            <p className="text-xs sm:text-sm text-[#6a6f73] mt-1">
              Explore diverse fields of study and specialized teaching domains.
            </p>
          </div>

          {/* Scroll Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Previous categories"
              className="w-9 h-9 rounded-full border border-[#d1d7dc] bg-white hover:bg-[#f7f9fa] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#1c1d1f] transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Next categories"
              className="w-9 h-9 rounded-full border border-[#d1d7dc] bg-white hover:bg-[#f7f9fa] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#1c1d1f] transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Category Cards Carousel */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-start gap-4 sm:gap-6 overflow-x-auto scroll-smooth pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((item) => (
            <Link
              key={item.id}
              href={`/courses?category=${encodeURIComponent(item.name)}`}
              className="group cursor-pointer flex flex-col w-[180px] sm:w-[220px] md:w-[240px] shrink-0"
            >
              {/* Square Image Box with subtle hover zoom */}
              <div className="aspect-square w-full overflow-hidden bg-[#f7f9fa] border border-[#d1d7dc] rounded-lg mb-2.5 shadow-xs">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <span className="font-bold text-sm sm:text-base text-[#2d2f31] leading-snug group-hover:text-[#5022c3] transition-colors truncate">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
