import React from 'react';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyHeroBillboard } from '@/components/landing/UdemyHeroBillboard';
import { UdemyCourseSelection } from '@/components/landing/UdemyCourseSelection';
import { UdemyPersonalPlanSection } from '@/components/landing/UdemyPersonalPlanSection';
import { UdemyLearnersViewing } from '@/components/landing/UdemyLearnersViewing';
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

        {/* 02. "All the skills you need in one place" / "A broad selection of courses" */}
        <UdemyCourseSelection
          initialCourses={courses}
          initialCategories={categories}
        />

        {/* 03. "Build your career with a Personal Plan subscription" Feature Billboard */}
        <UdemyPersonalPlanSection />

        {/* 04. "Learners are viewing" Trending Course Showcase */}
        <UdemyLearnersViewing courses={courses} />

        {/* 05. Top Categories 8-Card Grid */}
        <UdemyTopCategories />

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
