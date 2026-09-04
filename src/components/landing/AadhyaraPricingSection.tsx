'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const AadhyaraPricingSection: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const plans = [
    {
      name: 'Free',
      badge: 'STARTER',
      tagline: 'Start building your digital business',
      priceMonthly: '₹0',
      priceYearly: '₹0',
      period: 'forever',
      features: [
        'Branded digital storefront',
        'Up to 3 products or courses',
        'Razorpay & Stripe checkout',
        'Standard video player',
        'AADHYARA subdomain included',
        'Community support'
      ],
      ctaText: 'Get Started Free',
      ctaHref: '/company-signup?plan=free',
      isPopular: false,
      noCardRequired: true
    },
    {
      name: 'Creator',
      badge: 'MOST POPULAR',
      tagline: 'For individual creators, coaches & consultants',
      priceMonthly: '₹1,999',
      priceYearly: '₹1,599',
      period: '/month',
      features: [
        'Custom domain connection (www.yourbrand.com)',
        'Unlimited products, courses & services',
        'Software license management',
        '4K adaptive video streaming CDN',
        'Custom SMTP email configuration',
        'AI Business Architect (50 generations/mo)',
        '24/7 Priority support'
      ],
      ctaText: 'Get Started',
      ctaHref: '/company-signup?plan=creator',
      isPopular: true,
      noCardRequired: true
    },
    {
      name: 'Business',
      badge: 'FAST GROWTH',
      tagline: 'For growing academies, agencies & tech businesses',
      priceMonthly: '₹4,999',
      priceYearly: '₹3,999',
      period: '/month',
      features: [
        'Everything in Creator',
        'Multi-instructor & staff team roles',
        'Automated abandoned cart recovery',
        'Google Ads & Meta Pixel CAPI tracking',
        'Milestone client deliverable vault',
        'Unlimited AI generations & course copilot',
        'Dedicated onboarding specialist'
      ],
      ctaText: 'Get Started',
      ctaHref: '/company-signup?plan=business',
      isPopular: false,
      noCardRequired: true
    },
    {
      name: 'Enterprise',
      badge: 'CUSTOM SCALE',
      tagline: 'For large institutes, universities & corporations',
      priceMonthly: 'Custom',
      priceYearly: 'Custom',
      period: '',
      features: [
        'Everything in Business',
        'Dedicated isolated cloud infrastructure',
        'Single Sign-On (SAML / Okta / Azure AD)',
        'Custom REST API & Webhook streaming',
        '99.99% Guaranteed uptime SLA',
        'Custom legal & compliance DPA',
        '24/7 Dedicated account architect'
      ],
      ctaText: 'Contact Enterprise',
      ctaHref: '/company-signup?plan=enterprise',
      isPopular: false,
      noCardRequired: false
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-[#060814] text-white border-t border-white/10 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-4">
            <span>Transparent SaaS Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Simple, Transparent Plans for Every Stage
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            Start free without a credit card. Upgrade as your digital business, courses, and sales grow.
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'YEARLY'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] font-mono font-extrabold uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 4 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const price = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;

            return (
              <div
                key={plan.name}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative shadow-xl ${
                  plan.isPopular
                    ? 'bg-gradient-to-b from-indigo-950/60 via-purple-950/30 to-[#080b1e] border-2 border-indigo-500 shadow-indigo-950/50'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-mono font-extrabold uppercase rounded-full shadow-md border border-white/20">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-black text-white">{plan.name}</h3>
                    {!plan.isPopular && (
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {plan.tagline}
                  </p>

                  {/* Price */}
                  <div className="mb-6 pb-6 border-b border-white/10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-white">{price}</span>
                      {plan.period && <span className="text-xs font-mono text-slate-400">{plan.period}</span>}
                    </div>
                    {plan.noCardRequired && (
                      <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                        No credit card required
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Icon name="check" size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card CTA */}
                <div className="mt-8 pt-4">
                  <Link
                    href={plan.ctaHref}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      plan.isPopular
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/35 hover:shadow-indigo-600/50'
                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <Icon name="arrow_forward" size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
