'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const StatsCounterSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [platformStats, setPlatformStats] = useState<any>({
    completionRate: 96,
    totalStudents: 12000,
    avgRating: 4.9,
    totalCourses: 3,
    totalEnrollments: 8400
  });

  useEffect(() => {
    fetch('/api/platform/stats')
      .then((res) => res.ok && res.json())
      .then((d) => {
        if (d) {
          setPlatformStats((prev: any) => ({
            ...prev,
            ...d,
            totalStudents: d.totalStudents > 5 ? d.totalStudents : 12400,
            totalCourses: d.totalCourses || 3
          }));
        }
      })
      .catch(() => {});
  }, []);

  const stats = [
    {
      label: 'Active Learners',
      value: 12.4,
      suffix: 'k+',
      desc: 'Engineers, designers & tech architects',
      icon: 'groups'
    },
    {
      label: 'Course Completion Rate',
      value: platformStats.completionRate || 96.4,
      suffix: '%',
      desc: '4x industry standard for online LMS',
      icon: 'trending_up'
    },
    {
      label: 'Student Rating',
      value: platformStats.avgRating || 4.9,
      suffix: '/5',
      desc: 'Across verified graduate evaluations',
      icon: 'star'
    },
    {
      label: 'Career Transition',
      value: 88,
      suffix: '%',
      desc: 'Promoted or placed within 6 months',
      icon: 'workspace_premium'
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      const countElements = gsap.utils.toArray<HTMLElement>('.stat-number');
      countElements.forEach((el) => {
        const targetVal = parseFloat(el.getAttribute('data-val') || '0');
        gsap.fromTo(
          el,
          { innerText: '0' },
          {
            innerText: targetVal,
            duration: 2,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%'
            },
            snap: { innerText: targetVal % 1 === 0 ? 1 : 0.1 }
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="py-12 sm:py-16 px-4 sm:px-8 lg:px-10 bg-surface-container-low border-b border-outline-variant/60 relative overflow-hidden"
    >
      <div className="max-w-container-max mx-auto">
        <div className="bg-surface-container-lowest border-2 border-outline-variant/80 rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 lg:divide-x divide-outline-variant/60">
            {stats.map((st, i) => (
              <div
                key={st.label}
                className={`pt-6 sm:pt-0 ${i !== 0 ? 'lg:pl-8' : ''} flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Icon name={st.icon} size={20} />
                  </div>
                  <span className="text-[10px] font-mono text-outline font-extrabold uppercase">
                    Metric 0{i + 1}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span
                      className="stat-number font-black text-3xl sm:text-4xl lg:text-5xl text-on-surface font-mono tracking-tight"
                      data-val={st.value}
                    >
                      {st.value}
                    </span>
                    <span className="font-extrabold text-2xl sm:text-3xl text-primary font-mono">
                      {st.suffix}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-on-surface mb-1">{st.label}</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
