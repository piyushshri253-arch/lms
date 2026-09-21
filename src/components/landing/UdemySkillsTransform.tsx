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
  courseCount?: number;
}

interface UdemySkillsTransformProps {
  courses?: Course[];
  initialCategories?: CategoryInfo[];
}

// Smart, flexible category matcher that handles exact IDs, slugs, names, substrings and keyword overlap
export function isCourseInCategory(
  course: Course,
  targetCategory: { id: string; name: string; slug?: string }
): boolean {
  if (targetCategory.id === 'all' || targetCategory.name.toLowerCase() === 'all courses') {
    return true;
  }

  // 1. Direct Category ID match
  if (course.categoryId && targetCategory.id && course.categoryId === targetCategory.id) {
    return true;
  }

  const courseCatName = (
    typeof course.category === 'string'
      ? course.category
      : (course.category as any)?.name || ''
  ).toLowerCase().trim();

  const targetName = targetCategory.name.toLowerCase().trim();
  const targetSlug = (targetCategory.slug || '').toLowerCase().trim();

  // 2. Exact name match (case-insensitive)
  if (courseCatName === targetName) {
    return true;
  }

  // 3. Slug match
  const courseSlug = courseCatName.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (courseSlug === targetSlug) {
    return true;
  }

  // 4. Substring / Containment match (e.g. "pedagogy" in "Pedagogy & Teaching Methods")
  if (courseCatName && targetName && (courseCatName.includes(targetName) || targetName.includes(courseCatName))) {
    return true;
  }

  // 5. Keyword overlap (e.g. "pedagogy", "childhood", "engineering")
  const cWords = courseCatName.split(/[\s&,/_-]+/).filter((w: string) => w.length > 3);
  const tWords = targetName.split(/[\s&,/_-]+/).filter((w: string) => w.length > 3);
  if (cWords.some((w: string) => tWords.includes(w))) {
    return true;
  }

  // 6. Check title keywords if category string might be generic
  const titleWords = (course.title || '').toLowerCase().split(/[\s&,/_-]+/).filter((w: string) => w.length > 3);
  if (tWords.some((w: string) => titleWords.includes(w))) {
    return true;
  }

  return false;
}

export const UdemySkillsTransform: React.FC<UdemySkillsTransformProps> = ({
  courses: initialCourses = [],
  initialCategories = []
}) => {
  const { courses: contextCourses } = useApp();

  // Prefer live context courses if available, fallback to initial SSR courses
  const allCourses = useMemo(() => {
    const list = contextCourses && contextCourses.length > 0 ? contextCourses : initialCourses;
    return list.filter((c) => c.status === 'PUBLISHED');
  }, [contextCourses, initialCourses]);

  const [activeTab, setActiveTab] = useState<string>('all');

  // Build category list derived from actual published courses + active database categories
  const categoriesList = useMemo(() => {
    const list: { id: string; name: string; slug: string; description: string; count: number }[] = [
      {
        id: 'all',
        name: 'All Courses',
        slug: 'all',
        description: 'Explore all verified master curriculum courses published by our certified faculty.',
        count: allCourses.length
      }
    ];

    // 1. Insert Free Courses tab right after All Courses if free courses exist
    const freeCount = allCourses.filter((c) => c.price === 0).length;
    if (freeCount > 0) {
      list.push({
        id: 'free',
        name: 'Free Courses',
        slug: 'free',
        description: 'Complimentary foundation courses and educator workshops available at zero cost.',
        count: freeCount
      });
    }

    // 2. Gather all categories directly from published courses (guaranteed to contain courses)
    allCourses.forEach((course) => {
      const cCatName =
        typeof course.category === 'string'
          ? course.category
          : (course.category as any)?.name;

      if (cCatName && cCatName.trim()) {
        const trimmedName = cCatName.trim();
        const existing = list.find(
          (item) =>
            item.id !== 'all' &&
            (item.name.toLowerCase() === trimmedName.toLowerCase() ||
              (item.name.toLowerCase().includes('pedagogy') && trimmedName.toLowerCase().includes('pedagogy')) ||
              item.id === course.categoryId)
        );

        if (!existing) {
          list.push({
            id: course.categoryId || trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: trimmedName,
            slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: `Accredited programs and master modules in ${trimmedName}.`,
            count: 1
          });
        } else {
          existing.count += 1;
        }
      }
    });

    // 2. Also check if any passed database categories have matching courses and aren't added yet
    if (initialCategories && initialCategories.length > 0) {
      initialCategories.forEach((cat) => {
        const existing = list.find(
          (item) =>
            item.id === cat.id ||
            item.name.toLowerCase() === cat.name.toLowerCase() ||
            (item.name.toLowerCase().includes('pedagogy') && cat.name.toLowerCase().includes('pedagogy'))
        );

        if (!existing) {
          const matchingCount = allCourses.filter((course) =>
            isCourseInCategory(course, { id: cat.id, name: cat.name, slug: cat.slug })
          ).length;

          if (matchingCount > 0) {
            list.push({
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              description: cat.description || `Specialized curriculum in ${cat.name}.`,
              count: matchingCount
            });
          }
        }
      });
    }

    return list;
  }, [allCourses, initialCategories]);

  // Filter courses based on active category
  const activeCategoryObj = useMemo(() => {
    return categoriesList.find((c) => c.id === activeTab) || categoriesList[0];
  }, [categoriesList, activeTab]);

  const filteredCourses = useMemo(() => {
    if (activeTab === 'all') return allCourses;
    if (activeTab === 'free') return allCourses.filter((course) => course.price === 0);
    return allCourses.filter((course) =>
      isCourseInCategory(course, {
        id: activeCategoryObj.id,
        name: activeCategoryObj.name,
        slug: activeCategoryObj.slug
      })
    );
  }, [allCourses, activeTab, activeCategoryObj]);

  // Display only top 4 courses in the grid
  const displayCourses = useMemo(() => {
    return filteredCourses.slice(0, 4);
  }, [filteredCourses]);

  if (allCourses.length === 0) {
    return null;
  }

  return (
    <section id="skills-transform" className="py-8 md:py-12 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl sm:text-[28px] font-bold text-[#2d2f31] tracking-tight leading-tight">
              Skills to transform your career and life
            </h2>
            <p className="text-sm sm:text-base text-[#6a6f73] mt-1 font-normal">
              From critical skills to technical topics, Morena Teach supports your professional development.
            </p>
          </div>
          <Link
            href="/courses"
            className="text-xs sm:text-sm font-bold text-[#5022c3] hover:text-[#401b9c] flex items-center gap-1 shrink-0"
          >
            <span>Explore all courses</span>
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>

        {/* 1. Category Filter Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2 mb-6">
          {categoriesList.map((cat) => {
            const isSelected = activeTab === cat.id;
            const isFreeTab = cat.id === 'free';
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`cursor-pointer px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? isFreeTab
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-[#2d2f31] text-white shadow-xs'
                    : isFreeTab
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                    : 'bg-white text-[#2d2f31] hover:bg-[#f7f9fa] border border-[#d1d7dc] hover:border-[#2d2f31]'
                }`}
              >
                {isFreeTab && (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
                <span>{cat.name}</span>
                {cat.count > 0 && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : isFreeTab
                        ? 'bg-emerald-200 text-emerald-900 font-bold'
                        : 'bg-gray-100 text-[#6a6f73]'
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 2. Real Course Cards Grid with Udemy Desktop Hover Popovers (Top 4) */}
        {filteredCourses.length > 0 ? (
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
        ) : (
          <div className="py-12 text-center bg-[#f7f9fa] border border-dashed border-[#d1d7dc] p-8 rounded">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-[#5022c3] mx-auto flex items-center justify-center mb-3">
              <Icon name="school" size={24} />
            </div>
            <h4 className="text-base font-bold text-[#2d2f31] mb-1">
              No courses in {activeCategoryObj.name} yet
            </h4>
            <p className="text-xs sm:text-sm text-[#6a6f73] max-w-md mx-auto mb-4">
              New courses published by faculty in this subject will appear here automatically.
            </p>
            <button
              onClick={() => setActiveTab('all')}
              className="px-4 py-2 bg-[#2d2f31] text-white text-xs font-bold rounded hover:bg-[#1c1d1f] transition-colors"
            >
              View All Courses
            </button>
          </div>
        )}

        {/* 3. Dynamic Section Footer Button */}
        <div className="mt-8">
          <Link
            href={
              activeTab === 'all'
                ? '/courses'
                : activeTab === 'free'
                ? '/courses?price=free'
                : `/courses?category=${encodeURIComponent(activeCategoryObj.name)}`
            }
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-[#2d2f31] text-[#2d2f31] hover:bg-[#f7f9fa] text-sm font-bold rounded-[4px] transition-colors"
          >
            <span>
              {activeTab === 'all'
                ? 'Explore all courses'
                : activeTab === 'free'
                ? 'Explore all free courses'
                : `Explore all ${activeCategoryObj.name} courses`}
            </span>
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};
