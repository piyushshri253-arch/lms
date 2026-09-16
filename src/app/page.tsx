import React from 'react';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyHeroBillboard } from '@/components/landing/UdemyHeroBillboard';
import { UdemyCourseSelection } from '@/components/landing/UdemyCourseSelection';
import { UdemyLearnersViewing } from '@/components/landing/UdemyLearnersViewing';
import { UdemyPersonalPlanSection } from '@/components/landing/UdemyPersonalPlanSection';
import { UdemyTopCategories } from '@/components/landing/UdemyTopCategories';
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

        {/* 02. "A broad selection of courses" (Category Tabs + Filtered Dynamic Courses Grid) */}
        <UdemyCourseSelection
          initialCourses={courses}
          initialCategories={categories}
        />

        {/* 03. "Learners are viewing" Trending Course Showcase */}
        <UdemyLearnersViewing courses={courses} />

        {/* 04. "Build your career with a Personal Plan subscription" Feature Billboard */}
        <UdemyPersonalPlanSection />

        {/* 05. Top Categories 8-Card Grid */}
        <UdemyTopCategories />

        {/* 05. Why Learn With T.E.A.C.H (4 Value Pillars) */}
        <UdemyWhyUs />

        {/* 06. Become an Instructor & Institutional Training Banners */}
        <UdemyInstructorCta />

        {/* 07. Verified Learner Testimonials */}
        <UdemyTestimonials />
      </main>

      {/* 08. Comprehensive Multi-Column Footer with T.E.A.C.H Logo */}
      <UdemyFooter />
    </div>
  );
}
