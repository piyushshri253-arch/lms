'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

export const UdemyWhyUs: React.FC = () => {
  const features = [
    {
      icon: 'auto_stories',
      color: 'bg-purple-100 text-[#5022c3]',
      title: 'Practical, Classroom-Ready Curricula',
      description:
        'Designed by experienced pedagogues and early childhood researchers with real-world lesson plans, rubrics, and video demonstrations.'
    },
    {
      icon: 'workspace_premium',
      color: 'bg-teal-100 text-teal-800',
      title: 'Accredited Educator Certifications',
      description:
        'Earn verifiable credentials upon completing course modules, quizzes, and practical assignments to boost your teaching portfolio.'
    },
    {
      icon: 'all_inclusive',
      color: 'bg-amber-100 text-amber-800',
      title: 'Lifetime Self-Paced Access',
      description:
        'Learn whenever and wherever you want. Enjoy unlimited lifetime access across desktop, tablet, and mobile with downloadable resources.'
    },
    {
      icon: 'support_agent',
      color: 'bg-blue-100 text-blue-800',
      title: 'Direct Faculty & Community Support',
      description:
        'Ask questions, join discussion forums with peer educators, and receive constructive critique from veteran academic mentors.'
    }
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#f7f9fa] border-t border-b border-[#d1d7dc]/80">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header: Headline Kept in a Single Line */}
        <div className="text-center max-w-5xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200/80 rounded-full text-xs font-bold text-[#5022c3] uppercase tracking-wider mb-3 font-mono">
            Elevate Your Teaching Standards
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#2d2f31] tracking-tight mt-1 mb-3 whitespace-normal md:whitespace-nowrap">
            Why learners & educators choose Morena Teach
          </h2>
          <p className="text-sm sm:text-base text-[#6a6f73] font-normal max-w-2xl mx-auto leading-relaxed">
            We bridge the gap between academic theory and practical preschool and primary classroom excellence.
          </p>
        </div>

        {/* 4 Feature Cards with Perfectly Aligned Text Boxes in a Single Horizontal Row on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-6 sm:p-7 rounded-2xl border border-[#d1d7dc] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-start group"
            >
              {/* Feature Icon */}
              <div
                className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-5 shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
              >
                <Icon name={item.icon} size={24} />
              </div>

              {/* Title with Uniform Min-Height for Perfect Horizontal Alignment */}
              <h3 className="text-base sm:text-[17px] font-bold text-[#2d2f31] mb-2.5 leading-snug min-h-[48px] sm:min-h-[52px] flex items-center group-hover:text-[#5022c3] transition-colors">
                {item.title}
              </h3>

              {/* Description Body Perfectly Aligned Across All 4 Cards */}
              <p className="text-xs sm:text-sm text-[#6a6f73] leading-relaxed font-normal flex-1">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
