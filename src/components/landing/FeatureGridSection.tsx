'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const FEATURES = [
  {
    title: 'Course Studio Builder',
    desc: 'Structure rich multi-section curricula with 4K adaptive video streaming, downloadable PDFs, coding sandboxes, and interactive quizzes.',
    icon: 'video_library',
    badge: 'STUDIO'
  },
  {
    title: 'Student CRM & Access Control',
    desc: 'Manage learners, verify email onboarding, inspect real-time progress, troubleshoot access, and enforce strict role-based isolation.',
    icon: 'group',
    badge: 'CRM'
  },
  {
    title: 'Global Checkout & Payouts',
    desc: 'Sell courses worldwide in INR ₹ and USD $ via UPI, Credit Cards, and Stripe with automated database capture and 0% transaction fees.',
    icon: 'payments',
    badge: 'MONETIZATION'
  },
  {
    title: 'Promotional Offers & Coupons',
    desc: 'Launch high-converting festive flash sales with percentage discounts, fixed reductions, and usage limits.',
    icon: 'local_offer',
    badge: 'GROWTH'
  },
  {
    title: 'Deep Learning Analytics',
    desc: 'Understand revenue trajectories, student completion curves, quiz accuracy rates, and curriculum drop-off points.',
    icon: 'insights',
    badge: 'INTELLIGENCE'
  },
  {
    title: 'Automated Accredited Diplomas',
    desc: 'Issue tamper-proof certificates with unique verification IDs and 1-click LinkedIn additions when learners hit 100% completion.',
    icon: 'workspace_premium',
    badge: 'CREDENTIALS'
  },
  {
    title: 'Broadcast Announcements',
    desc: 'Send targeted broadcasts to platform-wide learners or specific enrolled course batches with high-visibility dashboard banners.',
    icon: 'campaign',
    badge: 'BROADCASTS'
  },
  {
    title: 'Multi-Channel Notifications',
    desc: 'Keep learners informed via real-time header bells, in-app notifications hubs, and automated transactional email alerts.',
    icon: 'notifications',
    badge: 'COMMUNICATION'
  }
];

export const FeatureGridSection: React.FC = () => {
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

      tl.from('.feature-bento-card', {
        opacity: 0,
        y: 40,
        scale: 0.92,
        stagger: 0.08,
        ease: 'power2.out'
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      id="features"
      ref={containerRef}
      className="relative py-28 md:py-36 bg-[#050711] text-white overflow-hidden border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
            08 — PRODUCT MATRIX
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Engineered for modern{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              educational excellence.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Every feature is purpose-built to eliminate friction, maximize student completion rates, and maximize creator
            monetization.
          </p>
        </div>

        {/* 8-Card Bento Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feat, idx) => (
            <div
              key={idx}
              className="feature-bento-card p-6 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-indigo-500/40 transition-all hover:scale-[1.02] flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white/5 text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md">
                    <Icon name={feat.icon} size={22} />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                    {feat.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-white group-hover:text-indigo-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">{feat.desc}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                <Icon name="check" size={14} className="text-emerald-400" />
                <span>Production Ready</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
