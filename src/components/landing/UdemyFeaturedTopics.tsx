'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface FeaturedAreaDefinition {
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  categoryQuery: string;
  defaultTopics: { title: string; subtitle: string; isTrending?: boolean }[];
}

const FEATURED_AREAS: FeaturedAreaDefinition[] = [
  {
    title: 'Early Childhood Education',
    subtitle: 'Child growth, cognitive & social foundations',
    icon: 'child_care',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-700',
    borderColor: 'hover:border-teal-400',
    categoryQuery: 'Early Childhood Education',
    defaultTopics: [
      { title: 'Early Brain Development & Milestones', subtitle: 'Foundation ECCD', isTrending: true },
      { title: 'Sensory & Motor Discovery Activities', subtitle: 'Preschool Practice', isTrending: true },
      { title: 'Montessori Practical Life Skills', subtitle: 'Classroom Methods' },
      { title: 'Social & Emotional Intelligence in Toddlers', subtitle: 'Behavior Guidance' }
    ]
  },
  {
    title: 'Teacher Development & Mentorship',
    subtitle: 'Classroom leadership, pedagogy & mentoring',
    icon: 'school',
    iconBg: 'bg-purple-50',
    iconColor: 'text-[#5624d0]',
    borderColor: 'hover:border-purple-400',
    categoryQuery: 'Teacher Development',
    defaultTopics: [
      { title: 'Mastering Contemporary Pedagogy', subtitle: 'Core Teaching Skills', isTrending: true },
      { title: 'Formative Assessment & Rubrics Design', subtitle: 'Student Evaluation', isTrending: true },
      { title: 'Educator Mentorship & Peer Coaching', subtitle: 'Faculty Growth' },
      { title: 'Active Student Engagement Protocols', subtitle: 'Classroom Interaction' }
    ]
  },
  {
    title: 'School Leadership & Management',
    subtitle: 'Academic administration & quality benchmarks',
    icon: 'verified',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-700',
    borderColor: 'hover:border-amber-400',
    categoryQuery: 'Leadership & School Development',
    defaultTopics: [
      { title: 'School Operations & Quality Benchmarks', subtitle: 'Academic Leadership', isTrending: true },
      { title: 'Continuous Professional Development (CPD)', subtitle: 'Teacher Training', isTrending: true },
      { title: 'Positive Discipline & School Culture', subtitle: 'Culture Building' },
      { title: 'Parent-Community Collaboration Mastery', subtitle: 'Engagement' }
    ]
  },
  {
    title: 'Primary Years & Curriculum',
    subtitle: 'Foundational literacy, phonics & numeracy',
    icon: 'auto_stories',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-700',
    borderColor: 'hover:border-blue-400',
    categoryQuery: 'Primary Years & Curriculum',
    defaultTopics: [
      { title: 'Systematic Synthetic Phonics Mastery', subtitle: 'Reading Foundations', isTrending: true },
      { title: 'Early Numeracy & Math Play Frameworks', subtitle: 'Hands-on Learning', isTrending: true },
      { title: 'Storytelling & Expressive Language Skills', subtitle: 'Oral Development' },
      { title: 'Play-Based STEM Discovery in Primary', subtitle: 'Curiosity Building' }
    ]
  }
];

export const UdemyFeaturedTopics: React.FC = () => {
  const { courses: allCourses = [] } = useApp();

  const publishedCourses = useMemo(() => {
    return (allCourses || []).filter((c) => c.status === 'PUBLISHED');
  }, [allCourses]);

  return (
    <section className="w-full bg-[#f7f9fa] py-14 md:py-20 border-t border-[#d1d7dc]/70">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100/70 border border-purple-200/60 rounded-full text-xs font-bold text-[#5624d0] uppercase tracking-wider mb-3">
              <Icon name="trending_up" size={15} />
              <span>Curated Disciplines</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-[#1c1d1f] tracking-tight leading-tight">
              Featured Learning Areas
            </h2>
            <p className="text-[#6a6f73] text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Explore high-demand educational topics and develop practical educator skills taught by verified faculty.
            </p>
          </div>

          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#5624d0] hover:text-[#401b9c] transition-colors self-start md:self-auto group"
          >
            <span>Explore all categories</span>
            <Icon name="arrow_forward" size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Exactly 4 Elevated Learning Area Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_AREAS.map((area, colIdx) => {
            // Find real published courses matching this area query
            const matchingCourses = publishedCourses.filter((c) => {
              const catName = (typeof c.category === 'string' ? c.category : (c.category as any)?.name || '').toLowerCase();
              const q = area.categoryQuery.toLowerCase();
              const title = (c.title || '').toLowerCase();
              return catName.includes(q) || q.includes(catName) || title.includes(q.split(' ')[0]);
            });

            // Guaranteed exactly 4 items per box for consistent grid alignment
            const displayItems: {
              title: string;
              subtitle: string;
              href: string;
              badge: string;
              badgeClass: string;
            }[] = [];

            // 1. Add available dynamic matching courses
            for (const c of matchingCourses.slice(0, 4)) {
              displayItems.push({
                title: c.title,
                subtitle: c.durationHours ? `${c.durationHours} hrs • Certified` : 'Self-paced',
                href: `/course/${c.slug}`,
                badge: c.price === 0 ? 'Free' : `₹${c.price}`,
                badgeClass: c.price === 0 ? 'text-emerald-800 bg-emerald-100/80' : 'text-purple-800 bg-purple-100/80',
              });
            }

            // 2. Pad remaining slots up to 4 using area.defaultTopics
            let defIdx = 0;
            while (displayItems.length < 4 && defIdx < area.defaultTopics.length) {
              const dt = area.defaultTopics[defIdx];
              displayItems.push({
                title: dt.title,
                subtitle: dt.subtitle,
                href: `/courses?category=${encodeURIComponent(area.categoryQuery)}`,
                badge: dt.isTrending ? 'Popular' : 'Featured',
                badgeClass: dt.isTrending ? 'text-purple-800 bg-purple-100/80' : 'text-gray-700 bg-gray-100',
              });
              defIdx++;
            }

            return (
              <div
                key={colIdx}
                className={`flex flex-col bg-white rounded-2xl p-6 border border-[#d1d7dc] shadow-[0_2px_4px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-300 group ${area.borderColor}`}
              >
                {/* Card Header with Icon Badge */}
                <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-gray-100">
                  <div className={`w-11 h-11 rounded-xl ${area.iconBg} ${area.iconColor} flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105`}>
                    <Icon name={area.icon} size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#1c1d1f] leading-snug group-hover:text-[#5624d0] transition-colors">
                      {area.title}
                    </h3>
                    <p className="text-[11px] text-[#6a6f73] font-normal mt-0.5 line-clamp-1">
                      {area.subtitle}
                    </p>
                  </div>
                </div>

                {/* Topics / Courses List: Exactly 4 uniform items */}
                <div className="flex-1 space-y-3 mb-6">
                  {displayItems.map((item, itemIdx) => (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      className="flex flex-col p-2.5 -mx-2.5 rounded-xl hover:bg-purple-50/60 transition-all duration-200 group/item cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#2d2f31] group-hover/item:text-[#5624d0] transition-colors leading-snug line-clamp-1">
                          {item.title}
                        </span>
                        <Icon
                          name="chevron_right"
                          size={16}
                          className="text-gray-400 group-hover/item:text-[#5624d0] group-hover/item:translate-x-0.5 transition-all shrink-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-[#6a6f73] font-medium truncate">
                          {item.subtitle}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${item.badgeClass}`}>
                          {item.badge}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Card Footer Link */}
                <div className="pt-4 border-t border-gray-100 mt-auto">
                  <Link
                    href={`/courses?category=${encodeURIComponent(area.categoryQuery)}`}
                    className="flex items-center justify-between text-xs font-bold text-[#5624d0] hover:text-[#401b9c] transition-colors group/link cursor-pointer"
                  >
                    <span>View all courses</span>
                    <Icon name="arrow_forward" size={14} className="transition-transform group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UdemyFeaturedTopics;
