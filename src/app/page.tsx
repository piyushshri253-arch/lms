import React from 'react';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyHeroBillboard } from '@/components/landing/UdemyHeroBillboard';
import { UdemyTrendingCourses } from '@/components/landing/UdemyTrendingCourses';
import { UdemyPersonalPlanSection } from '@/components/landing/UdemyPersonalPlanSection';
import { UdemySkillsTransform } from '@/components/landing/UdemySkillsTransform';
import { UdemyTopCategories } from '@/components/landing/UdemyTopCategories';
import { UdemyFeaturedTopics } from '@/components/landing/UdemyFeaturedTopics';
import { UdemyWhyUs } from '@/components/landing/UdemyWhyUs';
import { UdemyInstructorCta } from '@/components/landing/UdemyInstructorCta';
import { UdemyTestimonials } from '@/components/landing/UdemyTestimonials';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { getPublishedCourses, getActiveCategories } from '@/lib/courses';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [courses, categories] = await Promise.all([
    getPublishedCourses(),
    getActiveCategories()
  ]);

  return (
    <div className="bg-white text-[#1c1d1f] min-h-screen flex flex-col antialiased selection:bg-purple-100 selection:text-purple-900 font-sans">
      {/* 1. Header with Categories Dropdown, Wide Search & Cart */}
      <UdemyNavbar />

      {/* Main Educational Course Marketplace */}
      <main className="flex-grow">
        {/* 01. Hero Billboard Carousel + Trust Metric Badges */}
        <UdemyHeroBillboard />

        {/* 02. "Trending Courses" Showcase Carousel */}
        <UdemyTrendingCourses courses={courses} />

        {/* 03. "Build your career with a Personal Plan subscription" Feature Billboard */}
        <UdemyPersonalPlanSection />

        {/* 04. "Skills to transform your career and life" Interactive Tabs */}
        <UdemySkillsTransform courses={courses} initialCategories={categories} />

        {/* 05. Top Categories Dynamic Grid */}
        <UdemyTopCategories categories={categories} />

        {/* 07. "Featured topics by category" 4-Column Directory */}
        <UdemyFeaturedTopics />

        {/* 08. Why Learn With Morena Teach (4 Value Pillars) */}
        <UdemyWhyUs />

        {/* 09. Verified Learner Testimonials */}
        <UdemyTestimonials />

        {/* 10. Become an Instructor & Institutional Training Banners */}
        <UdemyInstructorCta />
      </main>

      {/* 08. Comprehensive Multi-Column Footer with T.E.A.C.H Logo */}
      <UdemyFooter />
    </div>
  );
}
