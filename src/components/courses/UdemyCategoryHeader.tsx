'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface UdemyCategoryHeaderProps {
  categoryName: string;
  totalCoursesCount: number;
  availableCategories: { id: string; name: string; slug: string }[];
  onSelectCategory: (catName: string) => void;
}

export const UdemyCategoryHeader: React.FC<UdemyCategoryHeaderProps> = ({
  categoryName,
  totalCoursesCount,
  availableCategories,
  onSelectCategory
}) => {
  const isAll = !categoryName || categoryName === 'all';
  const displayTitle = isAll ? 'All Courses' : `${categoryName} Courses`;

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

        {/* 3. Popular Topics / Categories Pill Bar (Udemy Style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-[#6a6f73] uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
            Popular Topics:
          </span>
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-colors border ${
              isAll
                ? 'bg-[#2d2f31] text-white border-[#2d2f31]'
                : 'bg-white text-[#2d2f31] border-[#2d2f31] hover:bg-[#f7f9fa]'
            }`}
          >
            All Courses
          </button>
          {availableCategories.map((cat) => {
            const isSelected = categoryName.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.name)}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'bg-[#2d2f31] text-white border-[#2d2f31]'
                    : 'bg-white text-[#2d2f31] border-[#2d2f31] hover:bg-[#f7f9fa]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
