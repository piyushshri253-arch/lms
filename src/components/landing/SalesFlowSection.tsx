'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const SalesFlowSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Create Account',
      description: 'Create your MORENA TEACH Sales account in seconds with zero credit card required.',
      icon: 'sparkles'
    },
    {
      num: '02',
      title: 'Set Up Business',
      description: 'Add your business name, industry category, logo, and brand primary color palette.',
      icon: 'business'
    },
    {
      num: '03',
      title: 'Build Website',
      description: 'Create your branded website with the AI Business Builder or drag-and-drop studio.',
      icon: 'web'
    },
    {
      num: '04',
      title: 'Add Products',
      description: 'Create courses, digital files, software codebases, services, or subscriptions.',
      icon: 'shopping_bag'
    },
    {
      num: '05',
      title: 'Connect Payments',
      description: 'Connect Razorpay or Stripe to receive UPI, Cards, NetBanking & instant settlements.',
      icon: 'credit_card'
    },
    {
      num: '06',
      title: 'Connect Domain',
      description: 'Point your custom domain (www.yourbrand.com) with automated free SSL certificates.',
      icon: 'link'
    },
    {
      num: '07',
      title: 'Publish',
      description: 'Launch your digital business with 100% production uptime and high-speed CDN delivery.',
      icon: 'rocket_launch'
    },
    {
      num: '08',
      title: 'Grow',
      description: 'Use AI insights, automated email campaigns, coupons, and real-time revenue analytics.',
      icon: 'trending_up'
    }
  ];

  return (
    <section className="py-24 bg-[#080b1e] text-white border-t border-white/10 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-4">
            <span>The 8-Step Launch Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            From Idea to Online Business
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            A clear, frictionless path to turning your knowledge, skills, and software into a thriving commercial empire.
          </p>
        </div>

        {/* 8-Step Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step) => (
            <div
              key={step.num}
              className="p-6 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black font-mono text-indigo-400 group-hover:text-white transition-colors">
                    {step.num}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-indigo-300 transition-colors">
                    <Icon name={step.icon} size={16} />
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 text-[11px] font-mono text-slate-500 flex items-center gap-1">
                <span>Phase {step.num} Complete</span>
                <Icon name="check" size={12} className="text-emerald-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Final Step CTA */}
        <div className="mt-14 text-center">
          <Link
            href="/company-signup"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-extrabold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/60 hover:scale-[1.02] transition-all cursor-pointer border border-white/20"
          >
            <span>🚀 Start Building</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};
