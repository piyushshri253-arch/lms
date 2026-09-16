'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Course } from '@/types';
import { UdemyCourseCard } from './UdemyCourseCard';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface UdemyCourseSelectionProps {
  initialCourses: Course[];
  initialCategories: CategoryInfo[];
}

export const UdemyCourseSelection: React.FC<UdemyCourseSelectionProps> = ({
  initialCourses,
  initialCategories
}) => {
  const { courses: contextCourses, searchQuery } = useApp();

  // Prefer context courses if available, fallback to initial SSR courses
  const allCourses = useMemo(() => {
    return contextCourses && contextCourses.length > 0 ? contextCourses : initialCourses;
  }, [contextCourses, initialCourses]);

  const [activeTab, setActiveTab] = useState<string>('all');

  // Derive unique categories from existing courses and database categories
  const categoriesList = useMemo(() => {
    const list: { id: string; name: string; slug: string; description: string }[] = [
      {
        id: 'all',
        name: 'All Courses',
        slug: 'all',
        description:
          'Explore our full catalog of teacher education, early childhood pedagogy, classroom psychology, and modern educational technology courses.'
      }
    ];

    initialCategories.forEach((cat) => {
      list.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description:
          cat.description ||
          `Specialized, accredited curriculum in ${cat.name} to help educators excel in modern classrooms.`
      });
    });

    // Also include any categories present in courses that might not be in initialCategories
    allCourses.forEach((course) => {
      const catName = course.category;
      if (catName && !list.some((c) => c.name.toLowerCase() === catName.toLowerCase())) {
        list.push({
          id: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: catName,
          slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: `Comprehensive master curriculum in ${catName} designed by industry and educational architects.`
        });
      }
    });

    return list;
  }, [initialCategories, allCourses]);

  // Filter courses based on active tab and search query
  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = course.title.toLowerCase().includes(q);
        const matchDesc = (course.description || '').toLowerCase().includes(q);
        const matchCat = (course.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      // 2. Category Tab Filter
      if (activeTab === 'all') return true;
      const selectedCategoryObj = categoriesList.find((c) => c.id === activeTab);
      if (!selectedCategoryObj) return true;

      return (
        course.category?.toLowerCase() === selectedCategoryObj.name.toLowerCase() ||
        (course as any).categoryId === selectedCategoryObj.id
      );
    });
  }, [allCourses, activeTab, searchQuery, categoriesList]);

  const activeCategoryObj = categoriesList.find((c) => c.id === activeTab) || categoriesList[0];

  return (
    <section id="courses-selection" className="py-8 md:py-12 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-4">
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#2d2f31] tracking-tight leading-tight mb-2">
            A broad selection of courses
          </h2>
          <p className="text-sm sm:text-base text-[#2d2f31] font-normal">
            Choose from accredited online video courses with new additions published every month by certified master educators.
          </p>
        </div>

        {/* 1. Horizontal Category Tabs (Exact Udemy Tab Strip) */}
        <div className="border-b border-[#d1d7dc] mb-4 overflow-x-auto scrollbar-none flex items-center gap-6">
          {categoriesList.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`pb-3 text-sm sm:text-base font-bold whitespace-nowrap transition-colors border-b-2 -mb-[2px] ${
                  isActive
                    ? 'border-[#2d2f31] text-[#2d2f31]'
                    : 'border-transparent text-[#6a6f73] hover:text-[#2d2f31]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* 2. Udemy Bordered Focus Box */}
        <div className="border border-[#d1d7dc] p-6 sm:p-8 bg-white">
          {/* Header of Active Category */}
          <div className="max-w-3xl mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-[#2d2f31] mb-2">
              Expand your teaching career with {activeCategoryObj.name}
            </h3>
            <p className="text-sm sm:text-base text-[#2d2f31] leading-relaxed mb-5 font-normal">
              {activeCategoryObj.description}
            </p>
            <Link
              href={
                activeTab === 'all'
                  ? '/courses'
                  : `/courses?category=${encodeURIComponent(activeCategoryObj.name)}`
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#2d2f31] text-[#2d2f31] text-sm font-bold rounded-none sm:rounded-[4px] hover:bg-[#f7f9fa] transition-colors"
            >
              <span>Explore {activeCategoryObj.name}</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>

          {/* 3. Dynamic Course Cards Grid (Sitting on pure white) */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 pt-2">
              {filteredCourses.map((course, idx) => (
                <UdemyCourseCard key={course.id} course={course} cardIndex={idx} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#f7f9fa] border border-dashed border-[#d1d7dc] p-8 rounded">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-[#5022c3] mx-auto flex items-center justify-center mb-3">
                <Icon name="school" size={24} />
              </div>
              <h4 className="text-base font-bold text-[#2d2f31] mb-1">
                {allCourses.length === 0
                  ? 'Catalog Ready: No Courses Published Yet'
                  : `No courses currently in ${activeCategoryObj.name}`}
              </h4>
              <p className="text-xs sm:text-sm text-[#6a6f73] max-w-md mx-auto mb-4">
                {allCourses.length === 0
                  ? 'Courses published by Admins, Super Admins, or Faculty will appear here automatically in real time with live date, time, and instant purchase.'
                  : 'New courses added by authorized instructors in this subject will be listed here.'}
              </p>
              <Link
                href="/courses"
                className="px-4 py-2 bg-[#2d2f31] text-white text-xs font-bold rounded hover:bg-[#1c1d1f] transition-colors inline-block"
              >
                Browse Course Catalog
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
