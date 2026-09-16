'use client';

import React from 'react';
import Link from 'next/link';

export const UdemyInstructorCta: React.FC = () => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 space-y-16">
        {/* 1. Become an Instructor (Exact Udemy Split Layout) */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 lg:gap-16 max-w-4xl mx-auto">
          {/* Left Image */}
          <div className="w-full md:w-[400px] shrink-0 aspect-[4/3] overflow-hidden bg-[#f7f9fa]">
            <img
              src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop"
              alt="Inspiring Master Educator"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col items-start">
            <h2 className="text-2xl sm:text-[32px] font-bold text-[#2d2f31] leading-tight mb-3">
              Become an instructor
            </h2>
            <p className="text-sm sm:text-base text-[#2d2f31] leading-relaxed mb-6 font-normal">
              Instructors and academic masters from around the country teach thousands of learners on Morena Teach. We provide the curriculum builder, video hosting, student discussion boards, and payment infrastructure to teach what you love.
            </p>
            <Link
              href="/instructor"
              className="px-5 py-3 bg-[#2d2f31] hover:bg-[#1c1d1f] text-white text-sm font-bold rounded-none sm:rounded-[4px] transition-colors"
            >
              Start teaching today
            </Link>
          </div>
        </div>

        {/* 2. Morena Teach for Business Section */}
        <div className="border-t border-[#d1d7dc] pt-16 flex flex-col-reverse md:flex-row items-center justify-center gap-10 lg:gap-16 max-w-4xl mx-auto">
          {/* Left Content */}
          <div className="flex-1 flex flex-col items-start">
            <div className="text-xs font-bold text-[#5022c3] uppercase tracking-wider mb-2 font-mono">
              Morena Teach Business
            </div>
            <h2 className="text-2xl sm:text-[32px] font-bold text-[#2d2f31] leading-tight mb-3">
              Upskill your entire organization
            </h2>
            <p className="text-sm sm:text-base text-[#2d2f31] leading-relaxed mb-6 font-normal">
              Get unlimited enterprise access to accredited masterclasses and courses for your entire staff with centralized learning analytics and certificates.
            </p>
            <Link
              href="/courses"
              className="px-5 py-3 bg-[#2d2f31] hover:bg-[#1c1d1f] text-white text-sm font-bold rounded-none sm:rounded-[4px] transition-colors"
            >
              Get Morena Teach Business
            </Link>
          </div>

          {/* Right Image */}
          <div className="w-full md:w-[400px] shrink-0 aspect-[4/3] overflow-hidden bg-[#f7f9fa]">
            <img
              src="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop"
              alt="School Faculty Team Collaboration"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
