'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export const UdemyInstructorCta: React.FC = () => {
  const [instructorImgSrc, setInstructorImgSrc] = useState(
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop'
  );
  const [schoolImgSrc, setSchoolImgSrc] = useState(
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop'
  );

  return (
    <section className="py-14 sm:py-20 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 space-y-16 lg:space-y-24">
        {/* 1. Become an Instructor */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 lg:gap-16 max-w-5xl mx-auto">
          {/* Left Image with Modern Rounded Card & Shadow */}
          <div className="w-full md:w-[440px] shrink-0 aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-[#f7f9fa] relative group">
            <img
              src={instructorImgSrc}
              alt="Master Educator Teaching on Morena Teach"
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setInstructorImgSrc('/images/hero-violet-teacher.jpg')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col items-start">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200/80 rounded-full text-xs font-bold text-[#5624d0] uppercase tracking-wider mb-3">
              <Icon name="school" size={15} />
              <span>Teach on Morena Teach</span>
            </div>
            <h2 className="text-2xl sm:text-[32px] lg:text-[36px] font-black text-[#2d2f31] leading-tight tracking-tight mb-3">
              Become an instructor
            </h2>
            <p className="text-sm sm:text-base text-[#6a6f73] leading-relaxed mb-6 font-normal">
              Instructors and academic masters from around the country teach thousands of learners on Morena Teach. We provide the curriculum builder, video hosting, student discussion boards, and payment infrastructure to teach what you love.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/instructor"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#2d2f31] hover:bg-[#1c1d1f] text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <span>Start teaching today</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Morena Teach for Schools Section */}
        <div className="border-t border-[#d1d7dc]/70 pt-16 lg:pt-20 flex flex-col-reverse md:flex-row items-center justify-center gap-10 lg:gap-16 max-w-5xl mx-auto">
          {/* Left Content */}
          <div className="flex-1 flex flex-col items-start">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200/80 rounded-full text-xs font-bold text-teal-800 uppercase tracking-wider mb-3 font-mono">
              <Icon name="corporate_fare" size={15} />
              <span>MORENA TEACH FOR SCHOOLS</span>
            </div>
            <h2 className="text-2xl sm:text-[32px] lg:text-[36px] font-black text-[#2d2f31] leading-tight tracking-tight mb-3">
              Strengthen Teaching. Transform Your School.
            </h2>
            <p className="text-sm sm:text-base text-[#6a6f73] leading-relaxed mb-6 font-normal">
              Partner with Morena Teach to strengthen teaching practices, build educator capacity, and support school improvement through tailored School Solutions and Continuing Professional Development (CPD) programs.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/contact?type=school"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#5624d0] hover:bg-[#401b9c] text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <span>Get in Touch</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
              <Link
                href="/contact"
                className="text-sm font-bold text-[#2d2f31] hover:text-[#5624d0] underline underline-offset-4 transition-colors"
              >
                Contact our Solutions Team
              </Link>
            </div>
          </div>

          {/* Right Image with Modern Rounded Card & Shadow */}
          <div className="w-full md:w-[440px] shrink-0 aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-[#f7f9fa] relative group">
            <img
              src={schoolImgSrc}
              alt="School Faculty Team Collaboration & CPD Programs"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setSchoolImgSrc('/images/personal-plan-career.jpg')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default UdemyInstructorCta;
