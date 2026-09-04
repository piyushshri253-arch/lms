'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const TIERS = [
  {
    name: 'Starter Workspace',
    badge: '14-DAY TRIAL',
    planId: 'STARTER',
    priceMonthly: '$49',
    priceYearly: '$39',
    period: '/ month',
    desc: 'Dedicated LMS workspace for growing academies, small institutes, and corporate training.',
    features: [
      'Isolated Company Database Context',
      'Up to 100 Enrolled Students',
      '10 Published Masterclasses',
      '10 GB HD Video & Asset Storage',
      'Custom Subdomain Workspace',
      'Automated Verified Certificates',
      'Integrated Stripe & Razorpay Checkout'
    ],
    cta: 'Start 14-Day Free Trial',
    popular: false,
    href: '/company-signup?plan=STARTER'
  },
  {
    name: 'Professional LMS',
    badge: 'MOST POPULAR',
    planId: 'PRO',
    priceMonthly: '$149',
    priceYearly: '$119',
    period: '/ month',
    desc: 'For scaling companies, bootcamps, and universities expanding their online academy.',
    features: [
      'Everything in Starter Workspace',
      'Up to 1,000 Enrolled Students',
      '50 Published Masterclasses',
      '100 GB Cloud Storage & Video CDN',
      'Custom Brand Domain (learn.yourbrand.com)',
      'Multi-Instructor & TA Roles',
      'Dynamic Flash Coupons & Marketing Hub',
      'Targeted Multi-Audience Announcements',
      'Priority 24/7 Enterprise Support'
    ],
    cta: 'Launch Pro Workspace',
    popular: true,
    href: '/company-signup?plan=PRO'
  },
  {
    name: 'Enterprise Cloud',
    badge: 'CUSTOM SCALE',
    planId: 'ENTERPRISE',
    priceMonthly: '$499',
    priceYearly: '$399',
    period: '/ month',
    desc: 'Dedicated cloud infrastructure, custom SLAs, SSO/SAML, and compliance for global enterprises.',
    features: [
      'Everything in Professional LMS',
      'Up to 10,000+ Enrolled Students',
      '500+ Mastercourses & Curricula',
      '1,000 GB High-Throughput Video CDN',
      'Single Sign-On (SAML, Okta, Google SSO)',
      'Custom REST API & Webhook Ingestion',
      '99.99% Guaranteed SLA Uptime',
      'Dedicated Technical Account Architect'
    ],
    cta: 'Launch Enterprise LMS',
    popular: false,
    href: '/company-signup?plan=ENTERPRISE'
  }
];

export const PricingSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isYearly, setIsYearly] = useState(true);

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

      tl.from('.pricing-card', {
        opacity: 0,
        y: 40,
        scale: 0.92,
        stagger: 0.1,
        ease: 'power2.out'
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      id="pricing"
      ref={containerRef}
      className="relative py-28 md:py-36 bg-[#050711] text-white overflow-hidden border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
            TRANSPARENT B2B SAAS PRICING
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Predictable pricing for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              growing organizations.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Every organization receives an isolated database tenant with dedicated instructor access, student registries, and custom branding.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs font-bold ${!isYearly ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
            <button
              type="button"
              onClick={() => setIsYearly(!isYearly)}
              className="w-14 h-8 rounded-full bg-white/10 p-1 border border-white/20 relative transition-colors cursor-pointer"
            >
              <div
                className={`w-6 h-6 rounded-full bg-indigo-500 shadow-md transition-transform duration-200 ${
                  isYearly ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${isYearly ? 'text-white' : 'text-slate-400'}`}>Yearly</span>
              <span className="text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                SAVE 20%
              </span>
            </div>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {TIERS.map((tier, idx) => (
            <div
              key={idx}
              className={`pricing-card p-7 sm:p-8 rounded-3xl flex flex-col justify-between space-y-6 transition-all ${
                tier.popular
                  ? 'bg-gradient-to-b from-indigo-950/80 via-[#0d122e] to-[#070913] border-2 border-indigo-500 shadow-[0_0_80px_rgba(99,102,241,0.25)] relative scale-[1.03]'
                  : 'bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      tier.popular
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-md'
                        : 'bg-white/5 text-slate-400 border-white/10'
                    }`}
                  >
                    {tier.badge}
                  </span>
                  {tier.popular && (
                    <span className="text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
                      <Icon name="star" size={14} fill />
                      <span>Recommended</span>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-black text-white">{tier.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{tier.desc}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-white">
                    {isYearly ? tier.priceYearly : tier.priceMonthly}
                  </span>
                  {tier.period && (
                    <span className="text-xs text-slate-400 font-mono font-medium">{tier.period}</span>
                  )}
                </div>

                <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                  {tier.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2.5">
                      <Icon name="check_circle" size={16} className="text-indigo-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <Link
                  href={tier.href}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    tier.popular
                      ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02]'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  <span>{tier.cta}</span>
                  <Icon name="arrow_forward" size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
