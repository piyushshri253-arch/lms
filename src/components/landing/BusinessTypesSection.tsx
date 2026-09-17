'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const BusinessTypesSection: React.FC = () => {
  const businessTypes = [
    {
      icon: '🎓',
      title: 'Online Academies',
      subtitle: 'Build and sell courses',
      description: 'Host video masterclasses, create cohort-based learning bootcamps, and issue verified certificates under your branded domain.',
      badge: 'Course Creators'
    },
    {
      icon: '👨‍🏫',
      title: 'Coaches & Mentors',
      subtitle: 'Turn expertise into an online business',
      description: 'Offer 1-on-1 consultations, bespoke strategic advisory services, and recurring paid mentorship communities.',
      badge: 'Consultants'
    },
    {
      icon: '🎨',
      title: 'Creators & Designers',
      subtitle: 'Sell digital knowledge and products',
      description: 'Distribute Figma kits, Canva assets, vector templates, presets, and digital e-books with instant automated fulfillment.',
      badge: 'Digital Assets'
    },
    {
      icon: '🏫',
      title: 'Training Institutes',
      subtitle: 'Manage courses and students',
      description: 'Multi-instructor governance, department-specific curriculum tracks, exam centers, and enterprise student enrollment CRM.',
      badge: 'Institutes'
    },
    {
      icon: '🏢',
      title: 'Companies & Enterprises',
      subtitle: 'Build internal learning & training programs',
      description: 'Deploy secure corporate training, employee onboarding tracks, compliance tests, and SSO-integrated workforce learning.',
      badge: 'Corporate L&D'
    },
    {
      icon: '💻',
      title: 'Software & Digital Businesses',
      subtitle: 'Sell products, memberships & subscriptions',
      description: 'License full-stack Next.js codebases, manage device activations, and distribute subscription-based developer assets.',
      badge: 'Developers & SaaS'
    }
  ];

  return (
    <section id="business-types" className="py-24 bg-[#060814] text-white border-t border-white/10 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-4">
            <span>Tailored Solutions</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Built For Different Kinds of Businesses
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            Whether you teach, consult, design, or write software — MORENA TEACH scales with your business model.
          </p>
        </div>

        {/* 6 Business Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businessTypes.map((biz) => (
            <div
              key={biz.title}
              className="p-8 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform inline-block">
                    {biz.icon}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 text-indigo-300 border border-white/10">
                    {biz.badge}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                  {biz.title}
                </h3>
                <h4 className="text-xs font-semibold text-indigo-400 mt-0.5">
                  {biz.subtitle}
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
                  {biz.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <Link href="/company-signup" className="text-indigo-300 hover:text-white font-semibold flex items-center gap-1">
                  <span>Start this business</span>
                  <Icon name="arrow_forward" size={12} />
                </Link>
                <Icon name="check" size={16} className="text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
