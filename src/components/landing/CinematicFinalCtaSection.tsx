'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const CinematicFinalCtaSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
          end: 'bottom 70%',
          scrub: 1
        }
      });

      tl.from(titleRef.current, {
        opacity: 0,
        scale: 0.85,
        y: 40,
        ease: 'power3.out'
      });

      tl.from(
        cardRef.current,
        {
          opacity: 0,
          scale: 0.9,
          y: 60,
          ease: 'power3.out'
        },
        '-=0.4'
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative py-32 md:py-44 bg-[#03050c] text-white overflow-hidden flex flex-col items-center justify-center text-center border-t border-white/[0.06]"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/30 to-pink-500/20 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
            LAUNCH YOUR ENTERPRISE LMS WORKSPACE IN UNDER 2 MINUTES
          </span>
        </div>

        <h2
          ref={titleRef}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.08] font-display"
        >
          Your organization deserves{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
            better learning.
          </span>
          <br />
          <span className="text-white">Build it with AADHYARA.</span>
        </h2>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Join high-growth organizations and academies building modern learning infrastructure.
          Start your 14-day isolated workspace trial today.
        </p>

        <div
          ref={cardRef}
          className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-indigo-950/80 via-[#0d122e] to-[#070913] border-2 border-indigo-500/50 shadow-[0_0_100px_rgba(99,102,241,0.35)] max-w-2xl mx-auto space-y-6"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/company-signup"
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-extrabold text-base shadow-2xl shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer border border-white/20"
            >
              <span>Launch Company LMS →</span>
            </Link>
            <Link
              href="/courses"
              className="w-full sm:w-auto px-7 py-5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icon name="visibility" size={18} className="text-slate-400" />
              <span>Explore Course Catalog</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Icon name="check" size={14} className="text-emerald-400" />
              <span>14-Day Free Trial</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="check" size={14} className="text-emerald-400" />
              <span>Dedicated Workspace</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="check" size={14} className="text-emerald-400" />
              <span>Instant Provisioning</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
