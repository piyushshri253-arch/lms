'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const STAGES = [
  {
    tier: 'STAGE 1: CREATOR',
    scale: '1 Course',
    learners: '100 Students',
    revenue: '$2.5k / mo',
    features: ['Zero infrastructure setup', 'Hosted video streaming', 'Automated payments']
  },
  {
    tier: 'STAGE 2: PRO EDUCATOR',
    scale: '5 Courses',
    learners: '1,000 Students',
    revenue: '$25k / mo',
    features: ['Custom branding & domain', 'Promotional coupon engine', 'Interactive quizzes']
  },
  {
    tier: 'STAGE 3: BOOTCAMP',
    scale: '20 Courses',
    learners: '10,000 Students',
    revenue: '$150k / mo',
    features: ['Multi-instructor cohorts', 'Deep retention analytics', 'Automated LinkedIn diplomas']
  },
  {
    tier: 'STAGE 4: ENTERPRISE',
    scale: 'Unlimited',
    learners: '100k+ Learners',
    revenue: '$1M+ ARR',
    features: ['Dedicated cloud cluster', 'SSO & Role-based security', '99.99% SLA & custom API']
  }
];

export const BuiltForGrowthSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
          end: 'bottom 60%',
          scrub: 1
        }
      });

      tl.from('.growth-tier-card', {
        opacity: 0,
        y: 40,
        scale: 0.9,
        stagger: 0.12,
        ease: 'power2.out'
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative py-28 md:py-36 bg-[#070913] text-white overflow-hidden border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
            07 — BUILT FOR SCALE
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Start small.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              Scale without limits.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Whether you're launching your first weekend workshop or powering an international tech institute with
            100,000 engineers, MORENA TEACH scales seamlessly with your ambitions.
          </p>
        </div>

        {/* 4-Stage Progressive Growth Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STAGES.map((stg, idx) => (
            <div
              key={idx}
              className="growth-tier-card p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-6 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                    {stg.tier}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white">{stg.scale}</h3>
                  <p className="text-sm font-bold text-slate-300 mt-1">{stg.learners}</p>
                  <p className="text-xs font-mono font-extrabold text-emerald-400 mt-1">Est. {stg.revenue}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-slate-300">
                  {stg.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2">
                      <Icon name="check" size={14} className="text-indigo-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Elastic Scalability
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

