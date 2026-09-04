'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useApp } from '@/context/AppContext';
import { CourseCard } from '../courses/CourseCard';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const FeaturedProgramsSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { courses } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const categories = ['all', 'Engineering', 'Design', 'Data Science', 'Business'];

  const filtered = useMemo(() => {
    if (selectedFilter === 'all') return courses;
    return courses.filter((c) => c.category.toLowerCase() === selectedFilter.toLowerCase());
  }, [courses, selectedFilter]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.course-grid-card', {
        scrollTrigger: {
          trigger: '.courses-grid-wrapper',
          start: 'top 80%'
        },
        y: 30,
        opacity: 0,
        stagger: 0.12,
        duration: 0.7,
        ease: 'power2.out'
      });
    }, containerRef);

    return () => ctx.revert();
  }, [filtered]);

  return (
    <section
      id="courses"
      ref={containerRef}
      className="py-20 lg:py-28 px-4 sm:px-8 lg:px-10 bg-surface border-b border-outline-variant/60 relative overflow-hidden"
    >
      <div className="max-w-container-max mx-auto space-y-12">
        {/* Header with Title & Filter Pills */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-outline-variant/60">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider font-mono">
              <Icon name="stars" size={16} />
              <span>World-Class Curricula</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight">
              Featured Masterclasses
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Explore in-depth technical curricula designed to take you from foundational understanding to enterprise-grade execution.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/80 shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedFilter(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap cursor-pointer ${
                  selectedFilter === cat
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {cat === 'all' ? 'All Curricula' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Courses Bento Grid */}
        {filtered.length > 0 ? (
          <div className="courses-grid-wrapper grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map((course) => (
              <div key={course.id} className="course-grid-card">
                <CourseCard course={course} variant="grid" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Icon name="school" size={24} />
            </div>
            <h3 className="font-bold text-base text-on-surface">No courses available in this track yet</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Check back soon as new masterclasses are published by our faculty.
            </p>
          </div>
        )}

        {/* View All CTA Footer */}
        <div className="text-center pt-4">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-8 py-4 bg-surface-container-lowest text-on-surface border border-outline-variant rounded-2xl font-bold text-sm hover:border-primary hover:bg-surface-container-low transition-all shadow-xs group cursor-pointer"
          >
            <span>Browse Full Course Catalog ({courses.length} Masterclasses)</span>
            <Icon
              name="arrow_forward"
              size={18}
              className="group-hover:translate-x-1 transition-transform text-primary"
            />
          </Link>
        </div>
      </div>
    </section>
  );
};
