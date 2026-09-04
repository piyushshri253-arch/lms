'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const FRAGMENTED_TOOLS = [
  {
    name: 'Video Hosting',
    cost: '$99/mo',
    issue: 'Bandwidth limits & separate logins',
    icon: 'videocam',
    color: 'border-rose-500/30 text-rose-400 bg-rose-500/10'
  },
  {
    name: 'Payment Gateways',
    cost: '$49/mo + 4%',
    issue: 'Disjointed webhooks & payment errors',
    icon: 'credit_card',
    color: 'border-amber-500/30 text-amber-400 bg-amber-500/10'
  },
  {
    name: 'Student CRM / Portal',
    cost: '$149/mo',
    issue: 'No deep synchronization with LMS',
    icon: 'groups',
    color: 'border-blue-500/30 text-blue-400 bg-blue-500/10'
  },
  {
    name: 'Email & Announcements',
    cost: '$79/mo',
    issue: 'Spam filters & disconnected student lists',
    icon: 'mail',
    color: 'border-purple-500/30 text-purple-400 bg-purple-500/10'
  },
  {
    name: 'Certificates Generator',
    cost: '$29/mo',
    issue: 'Manual verification & broken PDF links',
    icon: 'workspace_premium',
    color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
  },
  {
    name: 'Quiz & Assessments',
    cost: '$39/mo',
    issue: 'Isolated scores and no auto-grading',
    icon: 'quiz',
    color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
  }
];

export const ProblemFragmentedSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsWrapperRef = useRef<HTMLDivElement>(null);
  const unifiedPlatformRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
          end: 'bottom 60%',
          scrub: 1.2
        }
      });

      // Scattered cards enter floating
      tl.from('.frag-card', {
        opacity: 0,
        scale: 0.8,
        y: 60,
        stagger: 0.1,
        ease: 'power2.out'
      });

      // As user scrolls further, fragmented cards converge toward the center and fade
      tl.to('.frag-card', {
        scale: 0.85,
        opacity: 0.2,
        y: 40,
        stagger: 0.05
      });

      // The Unified AADHYARA Monolith expands from center
      tl.fromTo(
        unifiedPlatformRef.current,
        {
          opacity: 0,
          scale: 0.7,
          y: 50
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          ease: 'power3.out'
        },
        '-=0.3'
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative py-28 md:py-36 bg-[#050711] text-white overflow-hidden border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
            01 — THE PROBLEM
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Teaching shouldn't require{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-orange-400">
              ten different tools.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The old way of running an academy is broken, expensive, and scattered across dozens of disjointed software
            subscriptions.
          </p>
        </div>

        {/* Fragmented Tool Stack Grid */}
        <div
          ref={cardsWrapperRef}
          className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left max-w-5xl mx-auto"
        >
          {FRAGMENTED_TOOLS.map((tool, idx) => (
            <div
              key={idx}
              className={`frag-card p-5 rounded-2xl bg-white/[0.02] border backdrop-blur-md transition-all ${tool.color}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon name={tool.icon} size={20} />
                  <h4 className="font-extrabold text-sm text-white">{tool.name}</h4>
                </div>
                <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  {tool.cost}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">{tool.issue}</p>
            </div>
          ))}
        </div>

        {/* Total Pain Metric */}
        <div className="mt-6 text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
          <span>Average Monthly Stack: </span>
          <span className="text-rose-400 font-bold line-through">$445+/month</span>
          <span className="text-slate-400">• High cognitive load &amp; fragile API integrations</span>
        </div>

        {/* Scroll Convergence Target: The AADHYARA Unified Solution */}
        <div
          ref={unifiedPlatformRef}
          className="mt-16 p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-indigo-950/60 via-[#0d122b] to-[#070913] border border-indigo-500/40 shadow-[0_0_80px_rgba(99,102,241,0.25)] text-center relative overflow-hidden"
        >
          {/* Internal ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-indigo-500/20 blur-[90px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
              <Icon name="check_circle" size={14} />
              <span>THE ALL-IN-ONE SOLUTION</span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              One platform. Everything you need.
            </h3>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              AADHYARA unites video streaming, student CRM, multi-currency checkout, quizzes, coupons,
              broadcasts, and accredited certificates inside a single, blazing-fast operating system.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs font-mono text-indigo-300">
              <span className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10">✓ 0% Tool Sprawl</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10">✓ 1 Single Dashboard</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10">✓ $0 Extra Plugin Fees</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10">✓ Real-time DB Sync</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

