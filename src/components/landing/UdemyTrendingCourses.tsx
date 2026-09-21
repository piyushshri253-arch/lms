'use client';

import React from 'react';
import Link from 'next/link';
import { Course } from '@/types';
import { UdemyCourseCard } from './UdemyCourseCard';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface UdemyTrendingCoursesProps {
  courses?: Course[];
}

export const UdemyTrendingCourses: React.FC<UdemyTrendingCoursesProps> = ({ courses: initialCourses = [] }) => {
  const { courses: contextCourses } = useApp();

  // Prefer live context courses if available, fallback to SSR courses
  const realCourses = React.useMemo(() => {
    const list = contextCourses && contextCourses.length > 0 ? contextCourses : initialCourses;
    return list.filter((c) => c.status === 'PUBLISHED');
  }, [contextCourses, initialCourses]);

  // Display only top 4 courses
  const displayCourses = React.useMemo(() => {
    return realCourses.slice(0, 4);
  }, [realCourses]);

  if (realCourses.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 bg-white border-b border-[#d1d7dc]/60">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-bold text-[#2d2f31] tracking-tight leading-tight">
              Trending Courses
            </h2>
            <p className="text-sm text-[#6a6f73] mt-1">
              Top-rated programs published by certified faculty & master educators.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/courses?price=free"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Free Courses</span>
            </Link>
            <Link
              href="/courses"
              className="text-xs sm:text-sm font-bold text-[#5022c3] hover:text-[#401b9c] flex items-center gap-1 shrink-0"
            >
              <span>Explore all courses</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </div>

        {/* Real Courses Grid with Udemy Hover Popover (Top 4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {displayCourses.map((course, idx) => (
            <UdemyCourseCard
              key={course.id}
              course={course}
              cardIndex={idx}
              totalCards={displayCourses.length}
            />
          ))}
        </div>

        {/* Explore All Courses Action Button */}
        {realCourses.length > 4 && (
          <div className="mt-8">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-[#2d2f31] text-[#2d2f31] hover:bg-[#f7f9fa] text-sm font-bold rounded-[4px] transition-colors"
            >
              <span>Explore all courses ({realCourses.length})</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
