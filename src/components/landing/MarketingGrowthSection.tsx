'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const MarketingGrowthSection: React.FC = () => {
  const tools = [
    { title: 'High-Converting Lead Capture', desc: 'Exit-intent popups, slide-ins, and free resource download lead magnets.', icon: 'filter_alt' },
    { title: 'Automated Email Campaigns', desc: 'Multi-tenant SMTP delivery, abandoned cart recovery sequences, and newsletters.', icon: 'mail' },
    { title: 'Dynamic Flash Coupons', desc: 'Percentage or flat discounts, expiration timers, usage limits, and custom promo codes.', icon: 'sell' },
    { title: 'Event-Driven Automations', desc: 'Trigger webhook notifications on purchases, course completions, and milestone deliveries.', icon: 'bolt' },
    { title: 'Google Ads Tracking', desc: 'Seamless Google Tag Manager & Google Enhanced Conversion API integration.', icon: 'track_changes' },
    { title: 'Meta Pixel & CAPI', desc: 'Server-side Conversion API tracking for high-accuracy Meta Facebook/Instagram ads.', icon: 'campaign' },
    { title: 'Funnel Analytics', desc: 'Visual drop-off funnels from landing page visit to checkout payment completion.', icon: 'query_stats' },
    { title: 'Multi-Currency Conversion', desc: 'Automated geo-currency conversion with localized pricing across international markets.', icon: 'currency_exchange' }
  ];

  return (
    <section className="py-24 bg-[#060814] text-white border-t border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-4">
            <span>Customer Acquisition</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Turn Visitors Into Customers
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            Enterprise-grade marketing, automation, and paid ad attribution built directly into your digital storefront.
          </p>
        </div>

        {/* 8 Feature Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map((t) => (
            <div
              key={t.title}
              className="p-6 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon name={t.icon} size={20} />
                </div>
                <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                  {t.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {t.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                <span>Enabled by default</span>
                <Icon name="check" size={14} className="text-emerald-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-12 text-center">
          <Link
            href="/company-signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all cursor-pointer"
          >
            <span>Explore Growth Tools</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};
