'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

function ExploreCoursesContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { showToast } = useApp();

  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState(initialQuery);
  const [sortBy, setSortBy] = useState('popular');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCoursesAndCategories = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, catsRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/admin/categories')
      ]);

      if (coursesRes.ok) {
        const d = await coursesRes.json();
        setCourses(d.courses || []);
      }
      if (catsRes.ok) {
        const d = await catsRes.json();
        setCategories(d.categories || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesAndCategories();
  }, []);

  const filteredCourses = courses.filter((c) => {
    const matchCategory = selectedCategory === 'ALL' || c.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.instructor?.name?.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  if (sortBy === 'price_asc') {
    filteredCourses.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price_desc') {
    filteredCourses.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'rating') {
    filteredCourses.sort((a, b) => b.rating - a.rating);
  } else {
    filteredCourses.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
  }

  const handleToggleWishlist = async (courseId: string) => {
    try {
      const res = await fetch('/api/student/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });
      if (res.ok) {
        showToast({ title: 'Added to Wishlist!', type: 'success' });
      }
    } catch {
      showToast({ title: 'Added to Wishlist!', type: 'info' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-primary/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Explore</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Discover Master Curricula
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Explore 120+ deep-tech, system engineering, and design tracks led by distinguished architects.
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="relative min-w-[280px]">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic or instructor..."
            className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary shadow-xs"
          />
        </div>
      </div>

      {/* Category Pills & Sorting Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/60 hover:text-on-surface'
            }`}
          >
            All Tracks
          </button>
          {['Engineering', 'Design', 'Data Science', 'Business', 'Marketing'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/60 hover:text-on-surface'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-outline font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/80 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer shadow-xs"
          >
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden hover:border-primary/40 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-high flex items-center justify-center">
                  {typeof c.thumbnail === 'string' && c.thumbnail.trim().length > 0 ? (
                    <img
                      src={c.thumbnail.trim()}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-primary/60 group-hover:scale-105 transition-transform duration-300">
                      <Icon name="school" size={32} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-outline">{c.category || 'Course'}</span>
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                    {c.category}
                  </div>
                  <button
                    onClick={() => handleToggleWishlist(c.id)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/40 text-white hover:text-rose-500 hover:bg-black/60 transition-colors"
                    title="Add to Wishlist"
                  >
                    <Icon name="favorite" size={16} />
                  </button>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <h3 className="font-extrabold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant font-medium">By {c.instructor?.name}</p>

                  <div className="flex items-center gap-2 text-xs font-bold pt-1">
                    <span className="text-amber-500 flex items-center gap-0.5">
                      ★ {c.rating}
                    </span>
                    <span className="text-[10px] text-outline font-mono">
                      ({c.studentsCount} students)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/40">
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-base font-black text-on-surface">${c.price}</span>
                      {c.discountPrice && (
                        <span className="text-xs text-outline line-through">${c.discountPrice}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-outline uppercase">{c.level}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                <Link
                  href={`/courses/${c.slug || c.id}`}
                  className="w-full py-2 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>View Details</span>
                  <Icon name="arrow_forward" size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto font-bold">
            <Icon name="search" size={24} />
          </div>
          <h3 className="font-bold text-base text-on-surface">No courses match your search</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Try adjusting your search terms or category selection.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ExploreCoursesPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm font-bold text-outline">Loading catalog...</div>}>
      <ExploreCoursesContent />
    </React.Suspense>
  );
}
