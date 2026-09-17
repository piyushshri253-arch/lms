'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const SalesValuePropSection: React.FC = () => {
  const features = [
    {
      icon: '🌐',
      title: 'Your Website',
      description: 'Create a professional, high-converting digital storefront without writing a single line of code.',
      badge: 'No-Code Builder'
    },
    {
      icon: '🔗',
      title: 'Your Domain',
      description: 'Connect your custom domain (e.g. www.youracademy.com). No MORENA TEACH branding required on your domain.',
      badge: 'Zero-Branding Required'
    },
    {
      icon: '🛍️',
      title: 'Your Products',
      description: 'Sell Courses, Digital files, Software licenses, Memberships, Recurring subscriptions, and Bespoke client services.',
      badge: 'Universal Catalog'
    },
    {
      icon: '💳',
      title: 'Your Payments',
      description: 'Direct integration with Razorpay and Stripe. Collect UPI, Credit Cards, NetBanking and international currencies.',
      badge: 'Direct Gateways'
    },
    {
      icon: '👥',
      title: 'Your Customers',
      description: 'Centralized customer relationship manager (CRM) to track leads, active orders, deliverable milestones, and refunds.',
      badge: 'Built-in CRM'
    },
    {
      icon: '📈',
      title: 'Your Growth',
      description: 'Track real-time gross revenue, conversion rates, abandoned cart recoveries, coupons, and customer lifetime value.',
      badge: 'Real-Time Ledger'
    },
    {
      icon: '🤖',
      title: 'Your AI Assistant',
      description: 'Let AI generate product descriptions, course curriculum outlines, marketing campaigns, and analyze conversion bottlenecks.',
      badge: 'AI Growth Copilot'
    }
  ];

  return (
    <section className="py-24 bg-[#060814] text-white relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-4">
            <span>MORENA TEACH Sales Powerhouse</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Everything You Need to Sell Online
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            Stop stitching together multiple tools. Build your online business from one place.
          </p>
        </div>

        {/* 7 Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, index) => (
            <div
              key={item.title}
              className={`rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/40 p-8 transition-all duration-300 flex flex-col justify-between group shadow-lg ${
                index === 6 ? 'md:col-span-2 lg:col-span-3 bg-gradient-to-r from-purple-950/30 via-indigo-950/20 to-slate-950 border-indigo-500/30' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 text-indigo-300 border border-white/10">
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="group-hover:text-white transition-colors">Enterprise Ready</span>
                <Icon name="arrow_forward" size={14} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA for Sales Value Prop */}
        <div className="mt-12 text-center">
          <Link
            href="/company-signup"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all cursor-pointer"
          >
            <span>🚀 Start Selling with MORENA TEACH Sales</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};
