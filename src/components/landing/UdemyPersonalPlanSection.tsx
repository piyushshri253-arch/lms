'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export const UdemyPersonalPlanSection: React.FC = () => {
  return (
    <section className="w-full bg-white py-6 md:py-10">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Crisp White Feature Card Billboard */}
        <div className="relative w-full bg-white rounded-2xl md:rounded-3xl p-6 sm:p-10 lg:p-14 overflow-hidden border border-[#d1d7dc] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_28px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              {/* Main Headline */}
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#1c1d1f] tracking-tight leading-[1.2] mb-3">
                Build your career with a Personal Plan subscription
              </h2>

              {/* Value Proposition Subtitle */}
              <p className="text-[#2d2f31] text-sm sm:text-base leading-relaxed mb-8 max-w-xl">
                Subscribers save an average of ₹4,000 in their first month, stop paying per course. Join 5 lakh+ learners, starting at ₹500/month.
              </p>

              {/* 4 Feature Points in 2x2 Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6 mb-9">
                {/* Feature 1: Course Access */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-[#5624d0] flex items-center justify-center shrink-0 border border-purple-200 mt-0.5">
                    <Icon name="auto_awesome" size={17} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#1c1d1f] leading-snug">
                    Get access to 28,000+ top-rated courses
                  </span>
                </div>

                {/* Feature 2: Expert Instructors */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0 border border-sky-200 mt-0.5">
                    <Icon name="lightbulb" size={17} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#1c1d1f] leading-snug">
                    Learn from 9,000+ expert instructors
                  </span>
                </div>

                {/* Feature 3: Topics Variety */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-[#e11d48] flex items-center justify-center shrink-0 border border-rose-200 mt-0.5">
                    <Icon name="terminal" size={17} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#1c1d1f] leading-snug">
                    Dev, IT, Business, Design and 50+ more topics
                  </span>
                </div>

                {/* Feature 4: Certifications */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0 border border-emerald-200 mt-0.5">
                    <Icon name="emoji_events" size={17} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#1c1d1f] leading-snug">
                    Certification prep for AWS, Microsoft, PMI, and more
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-[#1c1d1f] hover:bg-[#2d2f31] text-white font-extrabold text-sm rounded-md transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  Subscribe now
                </Link>

                <Link
                  href="/courses"
                  className="text-sm font-bold text-[#5624d0] hover:text-[#401b9c] underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Learn more
                </Link>
              </div>
            </div>

            {/* Right Visual Collage Column */}
            <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[480px] rounded-2xl overflow-hidden transition-transform duration-300 hover:scale-[1.01]">
                <img
                  src="/images/personal-plan-clean-composite@2x.png"
                  alt="Personal Plan subscription with Morena Teach"
                  className="w-full h-auto object-contain rounded-2xl drop-shadow-md"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UdemyPersonalPlanSection;
