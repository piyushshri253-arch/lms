'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export const UdemyPersonalPlanSection: React.FC = () => {
  return (
    <section className="w-full bg-white py-6 md:py-10">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Dark Feature Card Billboard */}
        <div className="relative w-full bg-[#202230] rounded-2xl md:rounded-3xl p-6 sm:p-10 lg:p-14 overflow-hidden text-white shadow-xl border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              {/* Main Headline */}
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-white tracking-tight leading-[1.2] mb-3">
                Build your career with a Personal Plan subscription
              </h2>

              {/* Value Proposition Subtitle in Pure White */}
              <p className="text-white text-sm sm:text-base leading-relaxed mb-8 max-w-xl font-normal">
                Subscribers save an average of ₹4,000 in their first month, stop paying per course. Join 5 lakh+ learners, starting at ₹500/month.
              </p>

              {/* 4 Feature Points in 2x2 Grid with Pure White Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6 mb-9">
                {/* Feature 1: Course Access */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#7c3aed]/25 text-[#d8b4fe] flex items-center justify-center shrink-0 border border-[#a855f7]/30 mt-0.5">
                    <Icon name="auto_awesome" size={17} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
                    Get access to 28,000+ top-rated courses
                  </span>
                </div>

                {/* Feature 2: Expert Instructors */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0284c7]/25 text-[#7dd3fc] flex items-center justify-center shrink-0 border border-[#38bdf8]/30 mt-0.5">
                    <Icon name="lightbulb" size={17} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
                    Learn from 9,000+ expert instructors
                  </span>
                </div>

                {/* Feature 3: Topics Variety */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e11d48]/25 text-[#fda4af] flex items-center justify-center shrink-0 border border-[#fb7185]/30 mt-0.5">
                    <Icon name="terminal" size={17} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
                    Dev, IT, Business, Design and 50+ more topics
                  </span>
                </div>

                {/* Feature 4: Certifications */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#059669]/25 text-[#6ee7b7] flex items-center justify-center shrink-0 border border-[#34d399]/30 mt-0.5">
                    <Icon name="emoji_events" size={17} />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-white leading-snug">
                    Certification prep for AWS, Microsoft, PMI, and more
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[#1c1d1f] hover:bg-[#f3f4f6] font-extrabold text-sm rounded-md transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  Subscribe now
                </Link>

                <Link
                  href="/courses"
                  className="text-sm font-bold text-white hover:text-purple-300 underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Learn more
                </Link>
              </div>
            </div>

            {/* Right Visual Collage Column */}
            <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl transition-transform duration-300 hover:scale-[1.01]">
                <img
                  src="/images/personal-plan-composite@2x.png"
                  alt="Personal Plan subscription with Morena Teach"
                  className="w-full h-auto object-cover rounded-2xl"
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
