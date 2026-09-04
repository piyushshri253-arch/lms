'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const DASHBOARD_MODULES = [
  {
    title: 'Course Studio',
    metric: '18 Active Courses',
    detail: '4K video streaming, PDFs, quizzes',
    icon: 'video_library',
    color: 'text-indigo-400 border-indigo-500/30'
  },
  {
    title: 'Student CRM',
    metric: '12,840 Enrolled',
    detail: 'Real-time progress & permissions',
    icon: 'groups',
    color: 'text-blue-400 border-blue-500/30'
  },
  {
    title: 'Direct Monetization',
    metric: '₹14,28,500 Gross',
    detail: '0% fees, instant bank payouts',
    icon: 'payments',
    color: 'text-emerald-400 border-emerald-500/30'
  },
  {
    title: 'Learning Analytics',
    metric: '94.2% Completion',
    detail: 'Retention drop-off heatmaps',
    icon: 'insights',
    color: 'text-purple-400 border-purple-500/30'
  },
  {
    title: 'Offers & Coupons',
    metric: '3 Active Promos',
    detail: 'Time-limited flash sales',
    icon: 'local_offer',
    color: 'text-amber-400 border-amber-500/30'
  },
  {
    title: 'Broadcast Hub',
    metric: 'Instant Delivery',
    detail: 'Platform & course-targeted alerts',
    icon: 'campaign',
    color: 'text-rose-400 border-rose-500/30'
  },
  {
    title: 'Accredited Diplomas',
    metric: '1,420 Issued',
    detail: 'Verifiable LinkedIn certificates',
    icon: 'workspace_premium',
    color: 'text-yellow-400 border-yellow-500/30'
  },
  {
    title: 'Multi-Device Security',
    metric: '100% Protected',
    detail: '2FA, device logout, RBAC',
    icon: 'security',
    color: 'text-cyan-400 border-cyan-500/30'
  }
];

export const MasterDashboard3DSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

      tl.from('.module-card', {
        opacity: 0,
        y: 40,
        scale: 0.9,
        stagger: 0.08,
        ease: 'power2.out'
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative py-28 md:py-36 bg-[#03050c] text-white overflow-hidden border-t border-white/[0.06]"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-900/15 via-purple-900/15 to-transparent blur-[160px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
            06 — MASTER CONTROL CENTER
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Every superpower.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              One central command.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Eliminate operational chaos. Control curriculum development, student support, revenue distribution, and
            marketing campaigns from a singular, unified workstation.
          </p>
        </div>

        {/* 8-Card Modular Control Matrix */}
        <div
          ref={gridRef}
          className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          {DASHBOARD_MODULES.map((mod, idx) => (
            <div
              key={idx}
              className={`module-card p-5 sm:p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border backdrop-blur-md transition-all hover:scale-[1.02] hover:shadow-2xl space-y-3 group ${mod.color}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon name={mod.icon} size={22} />
                </div>
                <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded text-slate-300">
                  MOD 0{idx + 1}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-base text-white">{mod.title}</h4>
                <p className="text-sm font-bold text-slate-200 mt-1">{mod.metric}</p>
                <p className="text-xs text-slate-400 mt-1">{mod.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
