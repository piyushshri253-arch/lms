'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { UdemyCategoryHeader } from '@/components/courses/UdemyCategoryHeader';
import { UdemyFeaturedCourseCard } from '@/components/courses/UdemyFeaturedCourseCard';
import { UdemyCourseRow } from '@/components/courses/UdemyCourseRow';
import { UdemyCourseCard } from '@/components/landing/UdemyCourseCard';
import { UdemyFilterSidebar, FilterState } from '@/components/courses/UdemyFilterSidebar';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { Course } from '@/types';

function getCategoryName(cat: any): string {
  if (!cat) return 'General';
  if (typeof cat === 'string') return cat.trim() || 'General';
  if (typeof cat === 'object') {
    if (typeof cat.name === 'string') return cat.name.trim() || 'General';
    if (typeof cat.title === 'string') return cat.title.trim() || 'General';
  }
  return String(cat || 'General');
}

// Smart Alphanumeric & Punctuation-Insensitive Matcher (e.g. "full stack" / "fullstack" matches "Full-Stack")
function matchCourseSearch(course: Course, query: string): boolean {
  if (!query || !query.trim()) return true;

  const rawQuery = query.trim().toLowerCase();
  const strip = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const strippedQuery = strip(rawQuery);

  const title = course.title || '';
  const desc = course.description || '';
  const shortDesc = (course as any).shortDescription || '';
  const cat = getCategoryName(course.category);
  const inst = course.instructor?.name || '';
  const tags = Array.isArray((course as any).tags)
    ? (course as any).tags.join(' ')
    : String((course as any).tags || '');

  // 1. Direct substring match
  if (
    title.toLowerCase().includes(rawQuery) ||
    desc.toLowerCase().includes(rawQuery) ||
    shortDesc.toLowerCase().includes(rawQuery) ||
    cat.toLowerCase().includes(rawQuery) ||
    inst.toLowerCase().includes(rawQuery) ||
    tags.toLowerCase().includes(rawQuery)
  ) {
    return true;
  }

  // 2. Normalized stripped match (ignoring hyphens, spaces, underscores, periods)
  // E.g. "full stack" matches "Full-Stack Web Development", "fullstack" matches "Full-Stack"
  if (strippedQuery) {
    const strippedTitle = strip(title);
    const strippedDesc = strip(desc);
    const strippedCat = strip(cat);
    const strippedInst = strip(inst);
    const strippedTags = strip(tags);

    if (
      strippedTitle.includes(strippedQuery) ||
      strippedDesc.includes(strippedQuery) ||
      strippedCat.includes(strippedQuery) ||
      strippedInst.includes(strippedQuery) ||
      strippedTags.includes(strippedQuery)
    ) {
      return true;
    }
  }

  // 3. Multi-word token match (every word in query matches either with space, hyphen, or stripped)
  const tokens = rawQuery.split(/[\s\-_]+/).filter(Boolean);
  if (tokens.length > 1) {
    const combinedContent = `${title} ${desc} ${shortDesc} ${cat} ${inst} ${tags}`;
    const strippedCombined = strip(combinedContent);
    const allTokensFound = tokens.every((token) => {
      const strippedToken = strip(token);
      return (
        combinedContent.toLowerCase().includes(token) ||
        (strippedToken && strippedCombined.includes(strippedToken))
      );
    });
    if (allTokensFound) return true;
  }

  return false;
}

const SORT_OPTIONS = [
  { value: 'free-first', label: 'Free Courses First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

function CoursesCatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { courses: contextCourses, isLoadingCourses, searchQuery: contextSearch, setSearchQuery } = useApp();

  const [directCourses, setDirectCourses] = useState<Course[] | null>(null);
  const [isDirectLoading, setIsDirectLoading] = useState(false);

  // Resilient direct fallback: if context courses are empty or delayed, fetch directly from /api/courses
  useEffect(() => {
    if (!contextCourses || contextCourses.length === 0) {
      let isSubscribed = true;
      setIsDirectLoading(true);
      fetch('/api/courses')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isSubscribed && data && Array.isArray(data.courses)) {
            setDirectCourses(data.courses);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isSubscribed) setIsDirectLoading(false);
        });
      return () => {
        isSubscribed = false;
      };
    }
  }, [contextCourses]);

  const allCourses = useMemo(() => {
    if (Array.isArray(contextCourses) && contextCourses.length > 0) return contextCourses;
    if (Array.isArray(directCourses) && directCourses.length > 0) return directCourses;
    return [];
  }, [contextCourses, directCourses]);

  const isLoading = (isLoadingCourses && allCourses.length === 0) || (isDirectLoading && allCourses.length === 0);

  const urlCategory = searchParams.get('category') || 'all';
  const urlSearch = searchParams.get('search') || '';
  const urlPrice = searchParams.get('price') || 'all';
  const urlRating = Number(searchParams.get('rating')) || 0;
  const urlLevel = searchParams.get('level') || 'all';
  const urlDuration = searchParams.get('duration') || 'all';

  // Local filter states
  const [filters, setFilters] = useState<FilterState>({
    category: urlCategory,
    level: urlLevel,
    rating: urlRating,
    duration: urlDuration,
    price: urlPrice,
    features: []
  });

  const [sortBy, setSortBy] = useState<string>('');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    if (isSortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortDropdownOpen]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Dynamic categories from database
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; slug: string }[]>([]);

  // Synchronize state whenever searchParams changes from outside/back-forward navigation
  useEffect(() => {
    setFilters((prev) => {
      const curCat = searchParams.get('category') || 'all';
      const curPrice = searchParams.get('price') || 'all';
      const curRating = Number(searchParams.get('rating')) || 0;
      const curLevel = searchParams.get('level') || 'all';
      const curDuration = searchParams.get('duration') || 'all';

      if (
        prev.category === curCat &&
        prev.price === curPrice &&
        prev.rating === curRating &&
        prev.level === curLevel &&
        prev.duration === curDuration
      ) {
        return prev;
      }

      return {
        ...prev,
        category: curCat,
        price: curPrice,
        rating: curRating,
        level: curLevel,
        duration: curDuration
      };
    });
  }, [searchParams]);

  // Sync search input whenever URL query changes (including when cleared to empty)
  useEffect(() => {
    const cleanUrlSearch = (urlSearch || '').trim();
    if (cleanUrlSearch !== (contextSearch || '').trim()) {
      setSearchQuery(cleanUrlSearch);
    }
  }, [urlSearch, contextSearch, setSearchQuery]);

  // Fetch categories from API
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.categories)) {
            setCategoriesList(
              data.categories.map((c: any) => ({
                id: String(c.id),
                name: String(c.name || ''),
                slug: String(c.slug || '')
              }))
            );
          }
        }
      } catch {
        if (isMounted) {
          setCategoriesList([
            { id: '1', name: 'Early Childhood Education', slug: 'early-childhood-education' },
            { id: '2', name: 'Pedagogy & Teaching Methods', slug: 'pedagogy-teaching-methods' },
            { id: '3', name: 'Engineering', slug: 'engineering' }
          ]);
        }
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!Array.isArray(allCourses)) return counts;
    allCourses.forEach((c) => {
      if (!c) return;
      const cat = getCategoryName(c.category);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allCourses]);

  // Price counts (Paid vs Free)
  const priceCounts = useMemo(() => {
    let paid = 0;
    let free = 0;
    if (!Array.isArray(allCourses)) return { paid: 0, free: 0 };
    allCourses.forEach((c) => {
      if (!c) return;
      if (Number(c.price || 0) === 0) free++;
      else paid++;
    });
    return { paid, free };
  }, [allCourses]);

  // Calculate active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.category && filters.category !== 'all') count++;
    if (filters.level && filters.level !== 'all') count++;
    if (filters.rating > 0) count++;
    if (filters.duration && filters.duration !== 'all') count++;
    if (filters.price && filters.price !== 'all') count++;
    count += (filters.features?.length || 0);
    return count;
  }, [filters]);

  // Unified filter updater using Next.js router.replace to avoid history desync
  const updateUrlWithFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.category && newFilters.category !== 'all') {
      params.set('category', newFilters.category);
    }
    if (newFilters.price && newFilters.price !== 'all') {
      params.set('price', newFilters.price);
    }
    if (newFilters.rating && newFilters.rating > 0) {
      params.set('rating', String(newFilters.rating));
    }
    if (newFilters.level && newFilters.level !== 'all') {
      params.set('level', newFilters.level);
    }
    if (newFilters.duration && newFilters.duration !== 'all') {
      params.set('duration', newFilters.duration);
    }
    const currentSearch = (searchParams.get('search') || '').trim();
    if (currentSearch) {
      params.set('search', currentSearch);
    }
    const query = params.toString();
    router.replace(query ? `/courses?${query}` : '/courses', { scroll: false });
  };

  // Handle category pill clicks: reset price to 'all' so category courses are never blocked
  const handleSelectCategory = (catName: string) => {
    updateUrlWithFilters({
      ...filters,
      category: catName,
      price: 'all'
    });
  };

  // Handle price toggle (All vs Free vs Paid)
  const handleSelectPrice = (priceVal: string) => {
    updateUrlWithFilters({
      ...filters,
      price: priceVal,
      category: priceVal === 'free' ? 'all' : filters.category
    });
  };

  const handleResetFilters = () => {
    const cleared: FilterState = {
      category: 'all',
      level: 'all',
      rating: 0,
      duration: 'all',
      price: 'all',
      features: []
    };
    setFilters(cleared);
    setSearchQuery('');
    router.replace('/courses', { scroll: false });
  };

  // Filter and Sort Courses
  const filteredCourses = useMemo(() => {
    if (!Array.isArray(allCourses)) return [];

    return allCourses
      .filter((course) => {
        if (!course) return false;

        try {
          // 1. Search Query (live AJAX sync with fuzzy alphanumeric & punctuation matching)
          const activeSearch = (urlSearch || (searchParams.has('search') ? '' : contextSearch || '')).trim();
          if (activeSearch) {
            if (!matchCourseSearch(course, activeSearch)) return false;
          }

          // 2. Category Filter
          if (filters.category && filters.category !== 'all') {
            const catLower = String(filters.category).toLowerCase().trim();
            if (catLower === 'free' || catLower === 'free courses') {
              if (Number(course.price || 0) > 0) return false;
            } else {
              const courseCat = getCategoryName(course.category).toLowerCase().trim();
              const matchExact = courseCat === catLower;
              const matchSlug = courseCat.replace(/\s+/g, '-') === catLower.replace(/\s+/g, '-');
              const matchSub = courseCat && (courseCat.includes(catLower) || catLower.includes(courseCat));
              const matchId = String((course as any).categoryId || '') === filters.category;

              if (!matchExact && !matchSlug && !matchSub && !matchId) return false;
            }
          }

          // 3. Rating Filter
          if (filters.rating > 0) {
            if ((Number(course.rating) || 0) < filters.rating) return false;
          }

          // 4. Level Filter
          if (filters.level && filters.level !== 'all') {
            const lvl = String(course.level || '').toLowerCase().replace(/_/g, ' ');
            const target = String(filters.level).toLowerCase().replace(/_/g, ' ');
            if (lvl !== target && lvl !== 'all levels') return false;
          }

          // 5. Price Filter
          if (filters.price === 'free' && Number(course.price || 0) > 0) return false;
          if (filters.price === 'paid' && Number(course.price || 0) === 0) return false;

          // 6. Duration Filter
          if (filters.duration && filters.duration !== 'all') {
            const dur = Number(course.durationHours || 0);
            if (filters.duration === '0-1' && dur > 1) return false;
            if (filters.duration === '1-3' && (dur < 1 || dur > 3)) return false;
            if (filters.duration === '3-6' && (dur < 3 || dur > 6)) return false;
            if (filters.duration === '6-17' && (dur < 6 || dur > 17)) return false;
            if (filters.duration === '17+' && dur < 17) return false;
          }

          return true;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          if (sortBy === 'free-first') {
            const isFreeA = Number(a.price || 0) === 0 ? 0 : 1;
            const isFreeB = Number(b.price || 0) === 0 ? 0 : 1;
            if (isFreeA !== isFreeB) return isFreeA - isFreeB;
            const bestDiff = (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0);
            if (bestDiff !== 0) return bestDiff;
            return (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0);
          }
          if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
          if (sortBy === 'newest') {
            const newDiff = (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
            if (newDiff !== 0) return newDiff;
            const dateA = new Date((a as any).createdAt || 0).getTime();
            const dateB = new Date((b as any).createdAt || 0).getTime();
            return dateB - dateA;
          }
          if (sortBy === 'price-low') return (Number(a.price) || 0) - (Number(b.price) || 0);
          if (sortBy === 'price-high') return (Number(b.price) || 0) - (Number(a.price) || 0);
        } catch {}
        return 0;
      });
  }, [allCourses, contextSearch, urlSearch, filters, sortBy]);

  // Pick top featured course for the header if available
  const featuredCourse = useMemo(() => {
    if (filteredCourses.length === 0) return null;
    return filteredCourses.find((c) => c.bestseller) || filteredCourses[0];
  }, [filteredCourses]);

  const categoryDisplayName = (!filters.category || filters.category === 'all') ? 'All' : filters.category;

  return (
    <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col antialiased">
      {/* 1. Standard Udemy Navbar */}
      <UdemyNavbar />

      {/* 2. Udemy Category Header with Breadcrumbs & Topic Pills */}
      <UdemyCategoryHeader
        categoryName={filters.category}
        totalCoursesCount={filteredCourses.length}
        availableCategories={categoriesList}
        onSelectCategory={handleSelectCategory}
        selectedPrice={filters.price}
        onSelectPrice={handleSelectPrice}
        freeCount={priceCounts.free}
      />

      {/* 3. Main Catalog Body */}
      <main className="flex-1 max-w-[1340px] mx-auto px-4 sm:px-6 w-full pb-16">
        {/* Optional Featured Course Highlight */}
        {featuredCourse && activeFiltersCount === 0 && !contextSearch && (
          <UdemyFeaturedCourseCard course={featuredCourse} />
        )}

        {/* Section Heading */}
        <h2 className="text-2xl font-bold text-[#2d2f31] tracking-tight mb-4">
          {filters.price === 'free'
            ? `Free Courses & Masterclasses (${filteredCourses.length})`
            : (!filters.category || filters.category === 'all')
            ? 'All Courses'
            : `${filters.category} Courses`}
        </h2>

        {/* Action & Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#d1d7dc] mb-6">
          <div className="flex items-center gap-3">
            {/* Filter Toggle Button (Desktop & Tablet) */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 border border-[#2d2f31] font-bold text-sm text-[#2d2f31] hover:bg-[#f7f9fa] rounded-none sm:rounded-[4px] transition-colors"
            >
              <Icon name="filter_list" size={18} />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#2d2f31] text-white text-xs flex items-center justify-center ml-0.5">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Filter Drawer Toggle Button (Mobile) */}
            <button
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="md:hidden inline-flex items-center gap-2 px-3.5 py-2 border border-[#2d2f31] font-bold text-xs text-[#2d2f31] rounded"
            >
              <Icon name="filter_list" size={16} />
              <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
            </button>

            {/* Sort Dropdown (Shows Selected Sort Option in Box, or Icon Only when Default) */}
            <div className="relative" ref={sortDropdownRef}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs font-bold text-[#6a6f73] hidden lg:inline">Sort by:</span>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                  className="h-9 sm:h-10 px-3 border border-[#2d2f31] bg-white rounded-none sm:rounded-[4px] cursor-pointer outline-none hover:bg-[#f7f9fa] flex items-center justify-between gap-2.5 text-[#2d2f31] transition-colors"
                  aria-label="Sort options"
                  title={sortBy ? `Sort: ${SORT_OPTIONS.find((o) => o.value === sortBy)?.label}` : 'Sort courses'}
                >
                  {sortBy && (
                    <span className="text-xs sm:text-sm font-bold text-[#2d2f31]">
                      {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                    </span>
                  )}
                  <Icon
                    name="expand_more"
                    size={20}
                    className={`transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* Dropdown Menu */}
              {isSortDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-[#2d2f31] rounded-none sm:rounded-[4px] shadow-lg py-1 z-40">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-[#6a6f73] uppercase tracking-wider border-b border-[#e4e8eb] mb-1">
                    Sort by
                  </div>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(sortBy === opt.value ? '' : opt.value);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-[#f7f9fa] transition-colors ${
                        sortBy === opt.value ? 'font-bold text-purple-700 bg-purple-50' : 'text-[#2d2f31]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.value && <Icon name="check" size={16} className="text-purple-700" />}
                    </button>
                  ))}
                  {sortBy && (
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border-t border-[#e4e8eb] mt-1 font-semibold flex items-center gap-1.5"
                    >
                      <Icon name="close" size={14} />
                      <span>Clear sort</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Price Filter Dropdown (All, Free, Paid) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold text-[#6a6f73] hidden sm:inline">Price:</span>
              <select
                value={filters.price}
                onChange={(e) => updateUrlWithFilters({ ...filters, price: e.target.value })}
                className="px-3 py-2 sm:py-2.5 border border-[#2d2f31] text-xs sm:text-sm font-bold text-[#2d2f31] bg-white rounded-none sm:rounded-[4px] cursor-pointer outline-none focus:ring-1 focus:ring-[#2d2f31]"
              >
                <option value="all">All Prices</option>
                <option value="free">Free Courses only ({priceCounts.free})</option>
                <option value="paid">Paid Courses ({priceCounts.paid})</option>
              </select>
            </div>
          </div>

          {/* Results Count & View Mode Switcher */}
          <div className="flex items-center gap-4">
            <span className="text-xs sm:text-sm font-bold text-[#6a6f73]">
              {filteredCourses.length} results
            </span>

            {/* View Mode Buttons (List vs Grid) */}
            <div className="hidden sm:flex items-center border border-[#d1d7dc] rounded overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#2d2f31] text-white'
                    : 'bg-white text-[#2d2f31] hover:bg-[#f7f9fa]'
                }`}
                title="List View"
              >
                <Icon name="view_list" size={18} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#2d2f31] text-white'
                    : 'bg-white text-[#2d2f31] hover:bg-[#f7f9fa]'
                }`}
                title="Grid View"
              >
                <Icon name="grid_view" size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Filter Modal/Drawer */}
        {isMobileFiltersOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 flex justify-end">
            <div className="w-4/5 max-w-sm bg-white h-full overflow-y-auto p-6 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-[#d1d7dc] mb-4">
                <h3 className="font-bold text-lg text-[#2d2f31]">Filters</h3>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1 text-[#6a6f73]"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>

              <UdemyFilterSidebar
                filters={filters}
                onChange={updateUrlWithFilters}
                onReset={handleResetFilters}
                categoryCounts={categoryCounts}
                availableCategories={categoriesList}
                priceCounts={priceCounts}
              />

              <div className="mt-auto pt-4 border-t border-[#d1d7dc]">
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="w-full py-3 bg-[#2d2f31] text-white font-bold text-sm rounded"
                >
                  Show {filteredCourses.length} results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Side-by-Side Filters + Courses Catalog Area */}
        <div className="flex gap-8 items-start">
          {/* Desktop Left Sidebar (Toggleable) */}
          {isSidebarOpen && (
            <div className="hidden md:block">
              <UdemyFilterSidebar
                filters={filters}
                onChange={updateUrlWithFilters}
                onReset={handleResetFilters}
                categoryCounts={categoryCounts}
                availableCategories={categoriesList}
                priceCounts={priceCounts}
              />
            </div>
          )}

          {/* Right Courses Listing Area */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-[#5022c3] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[#6a6f73] font-medium">Loading courses...</p>
              </div>
            ) : filteredCourses.length > 0 ? (
              viewMode === 'list' ? (
                <div className="divide-y divide-[#d1d7dc]">
                  {filteredCourses.map((course) => (
                    <UdemyCourseRow key={course.id || course.slug} course={course} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCourses.map((course, idx) => (
                    <UdemyCourseCard key={course.id || course.slug} course={course} cardIndex={idx} />
                  ))}
                </div>
              )
            ) : (
              <div className="py-20 text-center border border-dashed border-[#d1d7dc] p-8">
                <div className="w-14 h-14 rounded-full bg-gray-100 text-[#6a6f73] mx-auto flex items-center justify-center mb-3">
                  <Icon name="search_off" size={32} />
                </div>
                <h3 className="text-lg font-bold text-[#2d2f31] mb-1">
                  Sorry, we couldn&apos;t find any results
                </h3>
                <p className="text-sm text-[#6a6f73] max-w-md mx-auto mb-6">
                  Try adjusting your search query or clearing some of the active filters to explore more courses.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 bg-[#2d2f31] text-white text-sm font-bold rounded-none sm:rounded-[4px] hover:bg-[#1c1d1f] transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 5. Standard Udemy Footer */}
      <UdemyFooter />
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CoursesCatalogContent />
    </Suspense>
  );
}
