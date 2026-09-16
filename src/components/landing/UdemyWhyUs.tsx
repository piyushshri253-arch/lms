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
    <section className="py-12 bg-[#f7f9fa] border-t border-b border-[#d1d7dc]">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-[#5022c3] uppercase tracking-wider font-mono">
            Elevate Your Teaching Standards
          </span>
          <h2 className="text-2xl sm:text-[32px] font-bold text-[#2d2f31] tracking-tight mt-1 mb-2">
            Why learners & educators choose Morena Teach
          </h2>
          <p className="text-sm sm:text-base text-[#2d2f31] font-normal">
            We bridge the gap between academic theory and practical preschool and primary classroom excellence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-6 border border-[#d1d7dc] flex flex-col"
            >
              <div
                className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center mb-4`}
              >
                <Icon name={item.icon} size={24} />
              </div>
              <h3 className="text-base font-bold text-[#2d2f31] mb-2 leading-snug">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#6a6f73] leading-relaxed font-normal">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
