'use client';

import React, { useState, useMemo } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { CourseCard } from '@/components/courses/CourseCard';
import { CourseFilters } from '@/components/courses/CourseFilters';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

export default function CoursesPage() {
  const { courses, searchQuery } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('All Levels');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('popular');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    courses.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [courses]);

  // Filtered & Sorted Courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = c.title.toLowerCase().includes(q);
          const matchDesc = c.description.toLowerCase().includes(q);
          const matchInstructor = c.instructor.name.toLowerCase().includes(q);
          const matchCat = c.category.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchInstructor && !matchCat) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && c.category !== selectedCategory) {
          return false;
        }

        // Level filter
        if (selectedLevel !== 'All Levels' && c.level !== selectedLevel) {
          return false;
        }

        // Rating filter
        if (selectedRating > 0 && c.rating < selectedRating) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return b.studentsCount - a.studentsCount;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        return 0;
      });
  }, [courses, searchQuery, selectedCategory, selectedLevel, selectedRating, sortBy]);

  const pageTitle = selectedCategory === 'all' ? 'All Courses' : `${selectedCategory} Courses`;
  const pageSubtitle = `Explore ${filteredCourses.length} world-class courses designed to accelerate your career.`;

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col font-body-md overflow-x-hidden">
      {/* Top Bar */}
      <PublicNavbar />

      {/* Main Body with Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar Filters */}
        <div className="hidden md:block">
          <CourseFilters
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
            selectedRating={selectedRating}
            onRatingChange={setSelectedRating}
            categoryCounts={categoryCounts}
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-surface p-4 sm:p-6 lg:p-10 pb-24 md:pb-12">
          <div className="max-w-container-max mx-auto">
            {/* Header & Sorting Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 pb-6 border-b border-outline-variant/50">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight mb-1">
                  {pageTitle}
                </h1>
                <p className="text-sm text-on-surface-variant">{pageSubtitle}</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                  className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs font-semibold"
                >
                  <Icon name="tune" size={16} />
                  <span>Filters</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant hidden sm:inline">
                    Sort by:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant text-on-surface text-xs sm:text-sm font-semibold rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary py-2 pl-3 pr-8 cursor-pointer outline-none"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile Filters Dropdown Panel */}
            {isMobileFiltersOpen && (
              <div className="md:hidden mb-6 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg">
                <CourseFilters
                  selectedCategory={selectedCategory}
                  onCategoryChange={(c) => {
                    setSelectedCategory(c);
                    setIsMobileFiltersOpen(false);
                  }}
                  selectedLevel={selectedLevel}
                  onLevelChange={(l) => {
                    setSelectedLevel(l);
                    setIsMobileFiltersOpen(false);
                  }}
                  selectedRating={selectedRating}
                  onRatingChange={(r) => {
                    setSelectedRating(r);
                    setIsMobileFiltersOpen(false);
                  }}
                  categoryCounts={categoryCounts}
                />
              </div>
            )}

            {/* Course Grid */}
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} variant="grid" />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant rounded-2xl p-8">
                <Icon name="search_off" size={48} className="text-outline mb-3" />
                <h3 className="text-lg font-bold text-on-surface mb-1">No courses matched your filters</h3>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto mb-6">
                  Try clearing your search query or selecting another category to see available content.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedLevel('All Levels');
                    setSelectedRating(0);
                  }}
                  className="bg-primary text-on-primary text-xs font-bold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
