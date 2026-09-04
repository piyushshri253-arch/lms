'use client';

import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const STAGES = [
  {
    id: 1,
    title: 'Create Courses',
    tagline: 'World-Class Studio',
    desc: 'Structure comprehensive multi-tier curricula with 4K adaptive video streaming, downloadable PDFs, coding sandboxes, and interactive quizzes.',
    icon: 'video_library'
  },
  {
    id: 2,
    title: 'Manage Students',
    tagline: 'Real-time CRM & Directory',
    desc: 'Monitor individual student progress, lesson completion percentages, troubleshoot access issues, and manage permissions from a unified portal.',
    icon: 'group'
  },
  {
    id: 3,
    title: 'Sell & Monetize',
    tagline: 'Global Multi-Currency Checkout',
    desc: 'Accept payments via UPI, Credit Cards, PayPal, and Stripe with instant verification and direct payouts to your bank account with 0% platform take.',
    icon: 'payments'
  },
  {
    id: 4,
    title: 'Track Analytics',
    tagline: 'Retention & Drop-off Intelligence',
    desc: 'Deep learning insights, retention curves, lesson drop-off heatmaps, and student quiz accuracy to continuously optimize your curriculum.',
    icon: 'insights'
  },
  {
    id: 5,
    title: 'Scale & Grow',
    tagline: 'Marketing & Automated Diplomas',
    desc: 'Launch promotional coupons, broadcast targeted announcements, and automatically award verifiable certificates upon course completion.',
    icon: 'rocket_launch'
  }
];

export const OnePlatformPinnedSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState(0);

  useGSAP(
    () => {
      // Pinning container on desktop
      const isDesktop = window.innerWidth >= 1024;
      if (!isDesktop) return;

      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: '+=2500',
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          const stageIndex = Math.min(
            STAGES.length - 1,
            Math.floor(progress * STAGES.length)
          );
          setActiveStage(stageIndex);
        }
      });

      return () => {
        trigger.kill();
      };
    },
    { scope: containerRef }
  );

  return (
    <section
      id="platform"
      ref={containerRef}
      className="relative min-h-screen py-20 lg:py-0 bg-[#070913] text-white flex items-center justify-center overflow-hidden border-t border-white/[0.06]"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Interactive Stages list */}
          <div ref={leftColRef} className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
                02 — ONE PLATFORM
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Everything your learning business needs.
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                Scroll to see how AADHYARA powers every phase of your educational enterprise.
              </p>
            </div>

            {/* Stage Selector Tabs */}
            <div className="space-y-3 pt-2">
              {STAGES.map((stage, idx) => {
                const isActive = activeStage === idx;
                return (
                  <div
                    key={stage.id}
                    onClick={() => setActiveStage(idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-950/70 to-[#121633] border-indigo-500/60 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          <Icon name={stage.icon} size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{stage.title}</h4>
                          <span className="text-[10px] font-mono uppercase text-indigo-400 font-semibold">
                            {stage.tagline}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">0{stage.id}</span>
                    </div>
                    {isActive && (
                      <p className="mt-3 text-xs text-slate-300 leading-relaxed animate-in fade-in duration-300">
                        {stage.desc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Dynamic Screen Mockup changing per stage */}
          <div className="lg:col-span-7">
            <div className="relative rounded-3xl p-3 bg-gradient-to-b from-white/15 via-white/5 to-transparent border border-white/20 shadow-2xl shadow-black/80">
              {/* Mockup Frame Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0d1124] rounded-t-2xl border-b border-white/10 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400 truncate">
                    aadhyara.com/app/{STAGES[activeStage].title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded font-bold">
                  STAGE 0{activeStage + 1}
                </span>
              </div>

              {/* Dynamic Screen Contents */}
              <div className="bg-[#0b0f1f] rounded-b-2xl p-5 sm:p-7 min-h-[440px] flex flex-col justify-center">
                {/* SCREEN 1: Course Studio */}
                {activeStage === 0 && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <h4 className="font-extrabold text-base text-white">Curriculum Studio Builder</h4>
                        <p className="text-xs text-slate-400">Add modules, video streams, quizzes, and resources</p>
                      </div>
                      <span className="px-3 py-1 bg-indigo-600 text-white font-bold text-xs rounded-xl">
                        + Add Lecture
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon name="play_circle" size={20} className="text-indigo-400" />
                          <div>
                            <p className="font-bold text-xs text-white">01. Distributed Architecture Overview</p>
                            <p className="text-[10px] text-slate-400">4K Ultra HD • 24m 12s • 1080p Transcoded</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                          READY
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon name="description" size={20} className="text-purple-400" />
                          <div>
                            <p className="font-bold text-xs text-white">02. Microservices Blueprint &amp; Diagram</p>
                            <p className="text-[10px] text-slate-400">PDF Guide • 14 Pages • Downloadable</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                          READY
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon name="quiz" size={20} className="text-amber-400" />
                          <div>
                            <p className="font-bold text-xs text-white">03. High-Concurrency Assessment Quiz</p>
                            <p className="text-[10px] text-slate-400">10 Questions • 80% Passing Score Required</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-bold">
                          AUTO-GRADE
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCREEN 2: Student CRM */}
                {activeStage === 1 && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <h4 className="font-extrabold text-base text-white">Learners CRM Directory</h4>
                        <p className="text-xs text-slate-400">12,840 Active Students Enrolled</p>
                      </div>
                      <span className="px-3 py-1 bg-white/10 text-slate-200 font-mono text-xs rounded-xl">
                        Filter: All Active
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs text-white">
                            RS
                          </div>
                          <div>
                            <p className="font-bold text-xs text-white">Rahul Sharma</p>
                            <p className="text-[10px] text-slate-400 font-mono">rahul@gmail.com</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">92% Completed</span>
                          <p className="text-[9px] text-slate-400">Enrolled 2 days ago</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-xs text-white">
                            AK
                          </div>
                          <div>
                            <p className="font-bold text-xs text-white">Amit Kumar</p>
                            <p className="text-[10px] text-slate-400 font-mono">amit@test.com</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Certified</span>
                          <p className="text-[9px] text-slate-400">Diploma issued</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs text-white">
                            PN
                          </div>
                          <div>
                            <p className="font-bold text-xs text-white">Priya Nair</p>
                            <p className="text-[10px] text-slate-400 font-mono">priya.n@tech.io</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-indigo-400 font-bold">48% In Progress</span>
                          <p className="text-[9px] text-slate-400">Active today</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCREEN 3: Sell Courses */}
                {activeStage === 2 && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <h4 className="font-extrabold text-base text-white">Monetization &amp; Payouts</h4>
                        <p className="text-xs text-slate-400">Multi-Currency Global Checkout</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                        ₹14,28,500 Total
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                        <p className="text-[10px] font-mono uppercase text-slate-400">Today's Sales</p>
                        <p className="text-xl font-black text-white mt-1">₹48,500.00</p>
                        <p className="text-[10px] text-emerald-400 font-bold font-mono">18 new transactions</p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                        <p className="text-[10px] font-mono uppercase text-slate-400">Active Gateways</p>
                        <p className="text-xs font-bold text-white mt-1.5 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">Stripe</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">UPI</span>
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">Cards</span>
                        </p>
                        <p className="text-[10px] text-indigo-400 font-mono mt-1">0% Commission</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-300">Direct creator settlement to ICICI Bank ****4092</span>
                      <span className="font-mono text-emerald-400 font-bold">AUTOMATED</span>
                    </div>
                  </div>
                )}

                {/* SCREEN 4: Track Performance */}
                {activeStage === 3 && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <h4 className="font-extrabold text-base text-white">Curriculum Analytics</h4>
                        <p className="text-xs text-slate-400">Student Retention &amp; Quiz Success</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-xl">
                        94.2% Completion
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">Module 1: Architecture Core</span>
                          <span className="text-emerald-400 font-mono">98% Retention</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full w-[98%]" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">Module 2: High Concurrency</span>
                          <span className="text-indigo-400 font-mono">91% Retention</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full w-[91%]" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">Module 3: Production Labs</span>
                          <span className="text-purple-400 font-mono">87% Retention</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full w-[87%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCREEN 5: Scale & Grow */}
                {activeStage === 4 && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <h4 className="font-extrabold text-base text-white">Growth &amp; Retention Hub</h4>
                        <p className="text-xs text-slate-400">Marketing Coupons &amp; Accredited Diplomas</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-xl">
                        + New Campaign
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                          COUPON ACTIVE
                        </span>
                        <p className="font-bold text-sm text-white mt-1">RAKSHA50 (50% OFF)</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">320 Redeemed • ₹3,84,000 Volume</p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                          BROADCAST SENT
                        </span>
                        <p className="font-bold text-sm text-white mt-1">Platform Notice</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">12,840 Students Notified</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Icon name="workspace_premium" size={20} className="text-purple-400" />
                        <span className="text-xs font-bold text-white">Automated Verifiable Certificate Engine</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-300 font-bold">ACTIVE</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

