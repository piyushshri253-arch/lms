'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Create Your Free Account',
      description: 'Sign up in 30 seconds with your email. Verify via our 6-digit cryptographic OTP to activate your student workspace.',
      icon: 'person_add',
      ctaText: 'Sign Up Free',
      ctaLink: '/register'
    },
    {
      step: '02',
      title: 'Choose Your Masterclass',
      description: 'Browse our syllabus, lesson previews, instructor backgrounds, and capstone milestones to find the perfect technical match.',
      icon: 'search',
      ctaText: 'Browse Catalog',
      ctaLink: '/courses'
    },
    {
      step: '03',
      title: 'Enroll Securely',
      description: 'Apply active discount coupons, complete checkout with Stripe or Razorpay, and instantly unlock your full curriculum.',
      icon: 'lock',
      ctaText: 'View Pricing',
      ctaLink: '/courses'
    },
    {
      step: '04',
      title: 'Master the Craft & Get Certified',
      description: 'Learn through video lectures, write synced personal notes, interact in discussion threads, and claim your verified diploma.',
      icon: 'workspace_premium',
      ctaText: 'Start Learning',
      ctaLink: '/register'
    }
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 lg:py-28 px-4 sm:px-8 lg:px-10 bg-surface-container-low border-b border-outline-variant/60 relative overflow-hidden"
    >
      <div className="max-w-container-max mx-auto space-y-14">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider font-mono">
            <Icon name="route" size={16} />
            <span>4-Step Learning Roadmap</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight">
            How AADHYARA Works
          </h2>
          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
            From initial onboarding to verified certification, our platform is structured for friction-free learning and proven career growth.
          </p>
        </div>

        {/* 4 Steps Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((s, idx) => (
            <div
              key={s.step}
              className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-7 shadow-xs hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative"
            >
              {/* Step Pill */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-2xl font-black text-primary/40 group-hover:text-primary transition-colors">
                    {s.step}
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300 shadow-xs">
                    <Icon name={s.icon} size={22} />
                  </div>
                </div>

                <h3 className="font-extrabold text-lg text-on-surface mb-2.5 group-hover:text-primary transition-colors">
                  {s.title}
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6">
                  {s.description}
                </p>
              </div>

              <Link
                href={s.ctaLink}
                className="pt-4 border-t border-outline-variant/60 text-xs font-bold text-primary flex items-center justify-between group/link hover:underline"
              >
                <span>{s.ctaText}</span>
                <Icon name="arrow_forward" size={14} className="group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

