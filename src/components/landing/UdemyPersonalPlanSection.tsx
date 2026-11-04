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
              <h2
                className="text-2xl sm:text-3xl lg:text-[34px] font-black text-white !text-white tracking-tight leading-[1.2] mb-3"
                style={{ color: '#ffffff' }}
              >
                Build your Career, Invest in Your Growth
              </h2>

              {/* Value Proposition Subtitle in Pure White */}
              <p
                className="text-white !text-white text-sm sm:text-base leading-relaxed mb-8 max-w-xl font-normal"
                style={{ color: '#ffffff' }}
              >
                Explore practical courses to strengthen your teaching skills, gain new classroom approaches, and take the next step in your teaching career with Morena Teach.
              </p>

              {/* 4 Feature Points in 2x2 Grid with Pure White Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6 mb-9">
                {/* Feature 1: Practical Educator Learning */}
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-[#7c3aed]/25 text-[#d8b4fe] flex items-center justify-center shrink-0 border border-[#a855f7]/30">
                    <Icon name="school" size={17} />
                  </div>
                  <span
                    className="text-xs sm:text-sm font-semibold text-white !text-white leading-snug"
                    style={{ color: '#ffffff' }}
                  >
                    Practical, educator-focused learning
                  </span>
                </div>

                {/* Feature 2: Early Years & Teaching Skills */}
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-[#0284c7]/25 text-[#7dd3fc] flex items-center justify-center shrink-0 border border-[#38bdf8]/30">
                    <Icon name="child_care" size={17} />
                  </div>
                  <span
                    className="text-xs sm:text-sm font-semibold text-white !text-white leading-snug"
                    style={{ color: '#ffffff' }}
                  >
                    Early years and teaching skills
                  </span>
                </div>

                {/* Feature 3: Learn At Your Own Pace */}
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-[#e11d48]/25 text-[#fda4af] flex items-center justify-center shrink-0 border border-[#fb7185]/30">
                    <Icon name="schedule" size={17} />
                  </div>
                  <span
                    className="text-xs sm:text-sm font-semibold text-white !text-white leading-snug"
                    style={{ color: '#ffffff' }}
                  >
                    Learn at your own pace
                  </span>
                </div>

                {/* Feature 4: Build Confidence */}
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-[#059669]/25 text-[#6ee7b7] flex items-center justify-center shrink-0 border border-[#34d399]/30">
                    <Icon name="trending_up" size={17} />
                  </div>
                  <span
                    className="text-xs sm:text-sm font-semibold text-white !text-white leading-snug"
                    style={{ color: '#ffffff' }}
                  >
                    Build confidence for your next step
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-[#5624d0] hover:bg-[#401b9c] text-white font-extrabold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  Explore Courses
                </Link>
              </div>
            </div>

            {/* Right Visual Collage Column */}
            <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl transition-transform duration-300 hover:scale-[1.01]">
                <img
                  src="/images/personal-plan-career.jpg"
                  alt="Build your career with Personal Plan subscription on Morena Teach"
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
