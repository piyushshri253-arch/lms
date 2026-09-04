'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const CategoriesSection: React.FC = () => {
  const tracks = [
    {
      id: 'engineering',
      name: 'Software Engineering',
      categoryQuery: 'Engineering',
      icon: 'code',
      accentColor: 'from-blue-500/10 to-indigo-500/10 text-blue-600',
      description: 'Distributed services, Next.js 15, microservices, Redlock concurrency, and performance tuning.',
      coursesCount: '2 Masterclasses',
      lessonsCount: '48 Lectures'
    },
    {
      id: 'design',
      name: 'UI/UX Design Systems',
      categoryQuery: 'Design',
      icon: 'palette',
      accentColor: 'from-purple-500/10 to-pink-500/10 text-purple-600',
      description: 'Design token architectures, spatial hierarchy, Figma variables, and accessible dark modes.',
      coursesCount: '1 Masterclass',
      lessonsCount: '34 Lectures'
    },
    {
      id: 'datascience',
      name: 'Data Science & AI',
      categoryQuery: 'Data Science',
      icon: 'analytics',
      accentColor: 'from-emerald-500/10 to-teal-500/10 text-emerald-600',
      description: 'Machine learning pipelines, predictive telemetry, LLM orchestration, and vector search.',
      coursesCount: '1 Masterclass',
      lessonsCount: '28 Lectures'
    },
    {
      id: 'business',
      name: 'Product & Business Strategy',
      categoryQuery: 'Business',
      icon: 'insights',
      accentColor: 'from-amber-500/10 to-orange-500/10 text-amber-600',
      description: 'Technical product management, executive roadmap execution, unit economics, and SaaS scaling.',
      coursesCount: '1 Track',
      lessonsCount: '22 Lectures'
    },
    {
      id: 'cloud',
      name: 'Cloud & DevOps Architecture',
      categoryQuery: 'Engineering',
      icon: 'cloud',
      accentColor: 'from-cyan-500/10 to-sky-500/10 text-cyan-600',
      description: 'Kubernetes orchestration, Terraform automation, CI/CD pipelines, and zero-trust security.',
      coursesCount: '1 Masterclass',
      lessonsCount: '36 Lectures'
    },
    {
      id: 'mobile',
      name: 'Mobile Engineering',
      categoryQuery: 'Mobile Dev',
      icon: 'phone_iphone',
      accentColor: 'from-rose-500/10 to-red-500/10 text-rose-600',
      description: 'Cross-platform Flutter & React Native architectures with native C++ asset compilation.',
      coursesCount: '1 Track',
      lessonsCount: '18 Lectures'
    }
  ];

  return (
    <section
      id="categories"
      className="py-20 lg:py-28 px-4 sm:px-8 lg:px-10 bg-surface-container-low border-b border-outline-variant/60 relative overflow-hidden"
    >
      <div className="max-w-container-max mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider font-mono">
            <Icon name="category" size={16} />
            <span>Technical Disciplines</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight">
            Explore Curricula by Track
          </h2>
          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
            Targeted learning paths curated for engineers, designers, and engineering leaders looking to reach staff and principal levels.
          </p>
        </div>

        {/* 6 Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => (
            <Link
              key={track.id}
              href={`/courses?category=${encodeURIComponent(track.categoryQuery)}`}
              className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-7 shadow-xs hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${track.accentColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs`}
                  >
                    <Icon name={track.icon} size={28} />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-outline uppercase bg-surface-container px-2.5 py-1 rounded-full">
                    {track.coursesCount}
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-on-surface mb-2 group-hover:text-primary transition-colors">
                  {track.name}
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-4">
                  {track.description}
                </p>
              </div>

              <div className="pt-4 border-t border-outline-variant/60 flex items-center justify-between text-xs font-bold text-primary">
                <span>{track.lessonsCount}</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Explore Track</span>
                  <Icon name="arrow_forward" size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
