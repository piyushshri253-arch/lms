'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const MorenaHeroSection: React.FC = () => {
  const [activeMetricTab, setActiveMetricTab] = useState<'OVERVIEW' | 'STORE' | 'AI'>('OVERVIEW');

  return (
    <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 overflow-hidden bg-[#060814] text-white">
      {/* Dynamic Ambient Background Gradients & Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[1000px] h-[450px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-40 right-10 w-80 h-80 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Top Product Ecosystem Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/15 text-xs font-semibold tracking-wide text-indigo-300 mb-8 backdrop-blur-md hover:bg-white/[0.08] transition-all cursor-default">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping inline-block" />
          <span className="font-mono uppercase text-[11px] text-slate-300">The Dual Platform Architecture</span>
          <span className="text-white/40">•</span>
          <span className="text-white font-bold">MORENA TEACH Sales + Learning</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.08]">
          Build Your Business.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            Teach Your Skills.
          </span>{' '}
          Grow With AI.
        </h1>

        {/* Supporting Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
          MORENA TEACH brings learning and business tools together — helping creators, educators, coaches and companies
          build their digital presence, sell knowledge and manage their growth.
        </p>

        {/* Primary & Secondary Action CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary Sales CTA */}
          <Link
            href="/company-signup"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-white/20 flex items-center justify-center gap-2.5 group cursor-pointer"
          >
            <span>🚀</span>
            <span>Start with Sales</span>
            <Icon name="arrow_forward" size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Secondary Learning CTA */}
          <Link
            href="/courses"
            className="w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-sm text-slate-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🎓</span>
            <span>Explore Learning</span>
          </Link>
        </div>

        {/* Trust Badges below CTA */}
        <div className="mt-5 text-xs text-slate-400 font-medium flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <Icon name="check" size={14} className="text-emerald-400" />
            <span>No credit card required</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1">
            <Icon name="check" size={14} className="text-emerald-400" />
            <span>Start free</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1">
            <Icon name="check" size={14} className="text-emerald-400" />
            <span>Build your own brand</span>
          </span>
        </div>

        {/* HERO PRODUCT VISUAL: Real Business Operating System Mockup */}
        <div className="mt-14 sm:mt-18 max-w-6xl mx-auto">
          <div className="relative p-2 sm:p-4 rounded-[28px] sm:rounded-[36px] bg-gradient-to-b from-white/15 via-white/5 to-white/5 border border-white/20 shadow-2xl shadow-black/90 backdrop-blur-2xl">
            {/* Mac-style Window Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 rounded-t-[20px] sm:rounded-t-[28px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-[11px] font-mono text-slate-400 hidden sm:inline">
                  https://app.morenateach.com/sales-command-center
                </span>
              </div>

              {/* Top View Mode Buttons */}
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setActiveMetricTab('OVERVIEW')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] ${
                    activeMetricTab === 'OVERVIEW'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Operating System
                </button>
                <button
                  onClick={() => setActiveMetricTab('STORE')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] ${
                    activeMetricTab === 'STORE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Custom Domain Store
                </button>
                <button
                  onClick={() => setActiveMetricTab('AI')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] ${
                    activeMetricTab === 'AI'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  AI Business Architect
                </button>
              </div>
            </div>

            {/* Main Interactive Screen Content */}
            <div className="p-4 sm:p-8 bg-[#080b1e] rounded-b-[20px] sm:rounded-b-[28px] text-left">
              {activeMetricTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* Top Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Stat 1: Revenue */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Gross Revenue (30d)</span>
                        <span className="text-emerald-400 font-bold font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded">
                          +28.4%
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white">₹4,82,500</div>
                      <div className="text-[11px] text-slate-500 mt-1">₹43,400 today via Razorpay &amp; Stripe</div>
                    </div>

                    {/* Stat 2: Orders */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Total Orders</span>
                        <span className="text-emerald-400 font-bold font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded">
                          +14.2%
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white">1,248</div>
                      <div className="text-[11px] text-slate-500 mt-1">100% digital fulfillment</div>
                    </div>

                    {/* Stat 3: Customers */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Active Customers</span>
                        <span className="text-indigo-400 font-bold font-mono text-[11px] bg-indigo-500/10 px-2 py-0.5 rounded">
                          892 active
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white">3,890</div>
                      <div className="text-[11px] text-slate-500 mt-1">Learners, clients &amp; subscribers</div>
                    </div>

                    {/* Stat 4: Conversion Rate */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Checkout Conversion</span>
                        <span className="text-purple-400 font-bold font-mono text-[11px] bg-purple-500/10 px-2 py-0.5 rounded">
                          AI Tuned
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white">4.82%</div>
                      <div className="text-[11px] text-slate-500 mt-1">1-click frictionless checkout</div>
                    </div>
                  </div>

                  {/* Visual Chart & Real-Time Orders Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Main Chart Area */}
                    <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-extrabold text-white">Live Business Revenue Velocity</h4>
                          <p className="text-xs text-slate-400">Courses, Digital Software, Services &amp; Subscriptions</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-indigo-300">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                          <span>Realtime Sync</span>
                        </div>
                      </div>

                      {/* Simulated Chart Bars */}
                      <div className="h-44 sm:h-52 flex items-end gap-2 sm:gap-3 pt-6 pb-2 border-b border-white/10">
                        {[45, 62, 58, 80, 75, 90, 84, 110, 135, 120, 160, 195, 230, 210, 260].map((val, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group/bar">
                            <div
                              style={{ height: `${(val / 280) * 100}%` }}
                              className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 via-indigo-500 to-purple-400 group-hover/bar:from-indigo-400 group-hover/bar:to-pink-400 transition-all duration-300 relative"
                            >
                              <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-[10px] font-mono text-white rounded border border-white/20 whitespace-nowrap z-20 pointer-events-none transition-opacity">
                                ₹{val * 1500}
                              </div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 hidden sm:inline">D{idx + 1}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Feature Badges */}
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                            <span>Digital Storefront</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                            <span>Course Masterclasses</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                            <span>Bespoke Services</span>
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">Auto-Settled via Wallet</span>
                      </div>
                    </div>

                    {/* Right Side: Live Orders & Custom Domain Preview */}
                    <div className="lg:col-span-4 space-y-4">
                      {/* Connected Custom Domain Card */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-indigo-300 uppercase">
                            🔗 Connected Domain
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                            SSL Active
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-white font-mono truncate">
                          www.yourbrand.com
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Zero MORENA TEACH branding required on your custom URL.
                        </p>
                      </div>

                      {/* Live Recent Orders Feed */}
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                        <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                          Recent Sales Feed
                        </h5>

                        <div className="space-y-2 text-xs">
                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white">Full-Stack SaaS Codebase</div>
                              <div className="text-[10px] text-slate-400">Software License • Single User</div>
                            </div>
                            <span className="font-mono font-bold text-emerald-400">+₹3,999</span>
                          </div>

                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white">Brand Identity Consulting</div>
                              <div className="text-[10px] text-slate-400">Service Booking • 4-Day Milestone</div>
                            </div>
                            <span className="font-mono font-bold text-emerald-400">+₹7,500</span>
                          </div>

                          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-white">AI Automation Masterclass</div>
                              <div className="text-[10px] text-slate-400">Course • LMS Access Granted</div>
                            </div>
                            <span className="font-mono font-bold text-emerald-400">+₹1,999</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeMetricTab === 'STORE' && (
                <div className="p-6 rounded-2xl bg-slate-950 border border-white/10 space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-lg">
                        Y
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-base">Your Brand Academy &amp; Store</div>
                        <div className="text-xs text-indigo-400 font-mono">https://www.yourbrand.com</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full">
                      Live Storefront
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
                      <span className="text-2xl mb-2 block">💻</span>
                      <div className="font-bold text-white text-sm">Next.js SaaS Boilerplate</div>
                      <div className="text-xs text-slate-400 mt-1">Instant license key dispatch</div>
                      <div className="text-xs font-mono font-bold text-indigo-300 mt-3">₹3,999 • Instant Buy</div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
                      <span className="text-2xl mb-2 block">🎨</span>
                      <div className="font-bold text-white text-sm">Canva &amp; Figma UI System</div>
                      <div className="text-xs text-slate-400 mt-1">500+ premium components</div>
                      <div className="text-xs font-mono font-bold text-indigo-300 mt-3">₹1,499 • Instant Buy</div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
                      <span className="text-2xl mb-2 block">🎓</span>
                      <div className="font-bold text-white text-sm">Zero to 1M Growth Bootcamp</div>
                      <div className="text-xs text-slate-400 mt-1">12 Masterclass Modules</div>
                      <div className="text-xs font-mono font-bold text-indigo-300 mt-3">₹2,499 • Enroll Now</div>
                    </div>
                  </div>
                </div>
              )}

              {activeMetricTab === 'AI' && (
                <div className="p-6 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-lg">
                      ✨
                    </div>
                    <div>
                      <h4 className="font-black text-white text-base">MORENA TEACH AI Business Architect</h4>
                      <p className="text-xs text-purple-300">Turn a one-line prompt into a live business structure</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-slate-300 space-y-1.5">
                    <p className="text-indigo-400 font-bold">&gt; USER PROMPT: "Launch a digital graphic design academy and sell bespoke logo packages"</p>
                    <p className="text-emerald-400">✓ Auto-configured Branded Website on custom subdomain</p>
                    <p className="text-emerald-400">✓ Generated 3 Digital Product tiers with Razorpay checkout</p>
                    <p className="text-emerald-400">✓ Configured Service Booking Pipeline with 4-day milestone delivery</p>
                    <p className="text-emerald-400">✓ Seeded LMS Masterclass player with 8 curriculum modules</p>
                    <p className="text-purple-300 font-bold">&gt; READY TO PUBLISH AT https://yourbrand.com</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const AadhyaraHeroSection = MorenaHeroSection;
export default MorenaHeroSection;
