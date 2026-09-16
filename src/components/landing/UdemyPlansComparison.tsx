'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface PlanFeature {
  text: string;
}

interface PlanItem {
  id: string;
  name: string;
  targetAudience: string;
  userCount: string;
  price: string;
  billingFrequency: string;
  ctaText: string;
  ctaLink: string;
  ctaVariant: 'primary' | 'dark' | 'outline';
  popularBadge?: string;
  features: PlanFeature[];
}

const PLANS: PlanItem[] = [
  {
    id: 'personal',
    name: 'Personal Plan',
    targetAudience: 'For you',
    userCount: 'Individual',
    price: '₹500',
    billingFrequency: 'Billed monthly or annually. Cancel anytime.',
    ctaText: 'Start subscription',
    ctaLink: '/courses',
    ctaVariant: 'primary',
    popularBadge: 'Most Popular',
    features: [
      { text: 'Access to 26,000+ top courses' },
      { text: 'Certification prep for accredited diplomas' },
      { text: 'Goal-focused learning paths & benchmarks' },
      { text: 'AI-assisted practice assessments' },
      { text: 'Offline viewing and mobile app access' }
    ]
  },
  {
    id: 'team',
    name: 'Team Plan',
    targetAudience: 'For your team',
    userCount: '2 to 20 people',
    price: '₹1,800',
    billingFrequency: 'per user / month (billed annually)',
    ctaText: 'Start subscription',
    ctaLink: '/courses',
    ctaVariant: 'dark',
    features: [
      { text: 'Access to 26,000+ top courses' },
      { text: 'Certification prep for educator teams' },
      { text: 'Goal-focused learning paths' },
      { text: 'Team analytics & engagement adoption reports' },
      { text: 'Centralized admin license management' }
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    targetAudience: 'For your whole organization',
    userCount: 'More than 20 people',
    price: 'Contact sales',
    billingFrequency: 'Custom tailored enterprise contract',
    ctaText: 'Request a demo',
    ctaLink: '/courses',
    ctaVariant: 'outline',
    features: [
      { text: 'Access to 26,000+ top courses' },
      { text: 'Customizable learning pathways & courses' },
      { text: 'Dedicated Strategic Customer Success Manager' },
      { text: 'Single Sign-On (SSO) & LMS integrations' },
      { text: 'Advanced cohort performance API analytics' }
    ]
  }
];

export const UdemyPlansComparison: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'individual' | 'team'>('all');

  const filteredPlans = PLANS.filter((plan) => {
    if (activeTab === 'individual') return plan.id === 'personal';
    if (activeTab === 'team') return plan.id === 'team' || plan.id === 'enterprise';
    return true;
  });

  return (
    <section className="w-full bg-[#f7f9fa] py-12 md:py-16 border-y border-[#d1d7dc]/60">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-8 md:mb-10 text-left">
          <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-[#1c1d1f] tracking-tight mb-2.5">
            Accelerate growth — for you or your organization
          </h2>
          <p className="text-[#6a6f73] text-sm sm:text-base max-w-2xl">
            Reach goals faster with one of our plans or programs. Try one free today or contact sales to learn more.
          </p>

          {/* Audience Filter Pills */}
          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#1c1d1f] text-white shadow-xs'
                  : 'bg-white text-[#2d2f31] border border-[#d1d7dc] hover:bg-gray-100'
              }`}
            >
              All Plans
            </button>
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-all cursor-pointer ${
                activeTab === 'individual'
                  ? 'bg-[#1c1d1f] text-white shadow-xs'
                  : 'bg-white text-[#2d2f31] border border-[#d1d7dc] hover:bg-gray-100'
              }`}
            >
              For Individuals
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-[#1c1d1f] text-white shadow-xs'
                  : 'bg-white text-[#2d2f31] border border-[#d1d7dc] hover:bg-gray-100'
              }`}
            >
              For Teams & Organizations
            </button>
          </div>
        </div>

        {/* 3-Card Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {filteredPlans.map((plan) => {
            const isPersonal = plan.id === 'personal';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col bg-white rounded-lg p-6 sm:p-7 transition-all duration-300 ${
                  isPersonal
                    ? 'border-2 border-[#5624d0] shadow-[0_4px_16px_rgba(86,36,208,0.12)]'
                    : 'border border-[#d1d7dc] shadow-xs hover:shadow-md'
                }`}
              >
                {/* Popular Pill */}
                {plan.popularBadge && (
                  <div className="absolute -top-3 left-6 bg-[#5624d0] text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                    {plan.popularBadge}
                  </div>
                )}

                {/* Plan Header */}
                <div className="border-b border-[#e4e8eb] pb-5 mb-5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-xl font-extrabold text-[#1c1d1f]">
                      {plan.name}
                    </h3>
                  </div>
                  <p className="text-xs font-semibold text-[#5624d0] uppercase tracking-wide">
                    {plan.targetAudience}
                  </p>
                  <p className="text-xs text-[#6a6f73] mt-0.5">
                    {plan.userCount}
                  </p>

                  {/* Price */}
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-[#1c1d1f]">
                        {plan.price}
                      </span>
                      {plan.price.startsWith('₹') && (
                        <span className="text-xs text-[#6a6f73] font-medium">/ month</span>
                      )}
                    </div>
                    <p className="text-xs text-[#6a6f73] mt-1 leading-snug">
                      {plan.billingFrequency}
                    </p>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-5">
                    <Link
                      href={plan.ctaLink}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-md transition-all cursor-pointer ${
                        plan.ctaVariant === 'primary'
                          ? 'bg-[#5624d0] hover:bg-[#401b9c] text-white shadow-sm'
                          : plan.ctaVariant === 'dark'
                          ? 'bg-[#1c1d1f] hover:bg-[#2d2f31] text-white shadow-sm'
                          : 'bg-white hover:bg-gray-50 text-[#1c1d1f] border border-[#1c1d1f]'
                      }`}
                    >
                      <span>{plan.ctaText}</span>
                      <Icon name="arrow_forward" size={16} />
                    </Link>
                  </div>
                </div>

                {/* Features List */}
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wider mb-3">
                    What&apos;s included:
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#2d2f31]">
                        <Icon
                          name="check_circle"
                          size={18}
                          className="text-[#198055] shrink-0 mt-0.5"
                          fill={true}
                        />
                        <span className="leading-snug">{feat.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UdemyPlansComparison;
