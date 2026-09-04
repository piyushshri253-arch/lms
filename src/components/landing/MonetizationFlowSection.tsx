'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const FLOW_STEPS = [
  {
    step: '01',
    title: 'Course Published',
    subtitle: '1-click live on your academy',
    icon: 'storefront',
    badge: 'LIVE CATALOG'
  },
  {
    step: '02',
    title: 'Global Checkout',
    subtitle: 'UPI, Credit Cards, Stripe, PayPal',
    icon: 'shopping_cart_checkout',
    badge: 'MULTI-CURRENCY'
  },
  {
    step: '03',
    title: 'Instant Verification',
    subtitle: 'Automated DB payment capture',
    icon: 'verified_user',
    badge: 'ZERO FRAUD'
  },
  {
    step: '04',
    title: 'Student Unlocks Access',
    subtitle: 'Immediate enrollment & dashboard',
    icon: 'lock_open',
    badge: 'INSTANT'
  },
  {
    step: '05',
    title: 'Creator Payout',
    subtitle: 'Direct bank settlement (0% fee)',
    icon: 'account_balance_wallet',
    badge: '100% REVENUE'
  }
];

export const MonetizationFlowSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const flowTrackRef = useRef<HTMLDivElement>(null);
  const revenueCardRef = useRef<HTMLDivElement>(null);

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

      // Flow steps enter horizontally
      tl.from('.monetize-step-card', {
        opacity: 0,
        x: 40,
        stagger: 0.12,
        ease: 'power2.out'
      });

      // Revenue card scale & glow
      tl.from(
        revenueCardRef.current,
        {
          opacity: 0,
          scale: 0.9,
          y: 40,
          ease: 'back.out(1.5)'
        },
        '-=0.3'
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      id="monetization"
      ref={containerRef}
      className="relative py-28 md:py-36 bg-[#070913] text-white overflow-hidden border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
            04 — SELL YOUR KNOWLEDGE
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Turn knowledge into{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              predictable revenue.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            A friction-free global checkout engine engineered for maximum conversion. Sell courses in INR ₹ and USD $,
            issue flash coupons, and receive direct bank settlements.
          </p>
        </div>

        {/* 5-Step Horizontal Animated Transaction Pipeline */}
        <div className="mt-16 overflow-x-auto pb-4 scrollbar-none">
          <div ref={flowTrackRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 min-w-[700px] lg:min-w-0">
            {FLOW_STEPS.map((item, idx) => (
              <div
                key={idx}
                className="monetize-step-card p-5 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.01] border border-white/10 hover:border-emerald-500/40 transition-all space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs border border-emerald-500/30">
                    {item.step}
                  </span>
                  <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                    {item.badge}
                  </span>
                </div>

                <div className="w-10 h-10 rounded-xl bg-white/5 text-slate-200 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-all">
                  <Icon name={item.icon} size={22} />
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Revenue & Financial Dashboard Mockup */}
        <div
          ref={revenueCardRef}
          className="mt-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0e1626] to-[#080d18] border border-emerald-500/30 shadow-[0_0_80px_rgba(16,185,129,0.15)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                FINANCIAL HUB • DIRECT SETTLEMENT
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">Academy Revenue Metrics</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-300">Currency: INR (₹) / USD ($)</span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold rounded-xl border border-emerald-500/30">
                0% Platform Take
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="text-[10px] uppercase font-mono text-slate-400">Total Net Revenue</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">₹14,28,500</p>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">↑ +24.8% MoM</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="text-[10px] uppercase font-mono text-slate-400">Paid Course Orders</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">3,420</p>
              <span className="text-[10px] text-indigo-400 font-mono font-bold">100% verified</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="text-[10px] uppercase font-mono text-slate-400">Checkout Conversion</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">18.4%</p>
              <span className="text-[10px] text-purple-400 font-mono font-bold">Industry standard: 4%</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <p className="text-[10px] uppercase font-mono text-slate-400">Average Order Value</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">₹4,180</p>
              <span className="text-[10px] text-amber-400 font-mono font-bold">Masterclass tier</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase font-mono text-slate-400">Next Payout</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">₹1,48,200</p>
              <span className="text-[10px] text-slate-400 font-mono font-bold">Tomorrow 9:00 AM</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
