'use client';

import React from 'react';
import { Icon } from '../ui/Icon';

export const WhyChooseUsSection: React.FC = () => {
  const differentiators = [
    {
      title: 'Practical, Capstone-First Learning',
      description: 'You do not write throwaway hello-world snippets. Every masterclass guides you through production-grade capstones designed for your engineering portfolio.',
      icon: 'construction',
      badge: 'Portfolio Ready'
    },
    {
      title: 'Learn at Your Own Pace',
      description: 'Enjoy unlimited lifetime access to all lecture modules, code repositories, downloadable assets, and subsequent curriculum updates.',
      icon: 'all_inclusive',
      badge: 'Lifetime Access'
    },
    {
      title: 'Granular Progress Tracking',
      description: 'Our backend records your exact lecture progress, timestamps, personal notes, and code exercises across all your desktop and mobile devices.',
      icon: 'timeline',
      badge: 'Real-Time Sync'
    },
    {
      title: 'Taught by Senior Industry Leads',
      description: 'Learn directly from staff distributed systems engineers, principal design token architects, and VP-level technical leaders actively building modern software.',
      icon: 'verified_user',
      badge: 'Distinguished Faculty'
    },
    {
      title: 'Multi-Gateway Secure Checkout',
      description: 'Purchase masterclasses with confidence through server-verified Stripe and Razorpay integrations with automatic 30-day money-back guarantee protection.',
      icon: 'lock',
      badge: 'Bank-Grade Security'
    },
    {
      title: 'Cryptographically Verified Diplomas',
      description: 'Earn unique credential numbers upon 100% curriculum completion that link to permanent public verification pages for LinkedIn and resume credentials.',
      icon: 'workspace_premium',
      badge: 'Public Verification ID'
    }
  ];

  return (
    <section
      id="why-us"
      className="py-20 lg:py-28 px-4 sm:px-8 lg:px-10 bg-surface border-b border-outline-variant/60 relative overflow-hidden"
    >
      <div className="max-w-container-max mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider font-mono">
            <Icon name="military_tech" size={16} />
            <span>The AADHYARA Standard</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight">
            Why Ambitious Learners Choose Us
          </h2>
          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
            Engineered from the ground up for deep comprehension, real accountability, and measurable career outcomes.
          </p>
        </div>

        {/* 6 Feature Bento Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((d) => (
            <div
              key={d.title}
              className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-7 shadow-xs hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary group-hover:scale-110 transition-all duration-300 shadow-xs">
                    <Icon name={d.icon} size={24} />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-primary bg-primary/5 border border-primary/15 px-2.5 py-1 rounded-full uppercase">
                    {d.badge}
                  </span>
                </div>

                <h3 className="font-extrabold text-base sm:text-lg text-on-surface mb-2 group-hover:text-primary transition-colors">
                  {d.title}
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {d.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

