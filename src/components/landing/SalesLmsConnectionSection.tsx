'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const SalesLmsConnectionSection: React.FC = () => {
  const pipelineSteps = [
    { label: 'YOUR WEBSITE', desc: 'Custom Domain Storefront', color: 'border-indigo-500/40 bg-indigo-950/40 text-indigo-200' },
    { label: 'CUSTOMER', desc: 'Visitor Browses Catalog', color: 'border-white/10 bg-white/5 text-white' },
    { label: 'CHECKOUT', desc: '1-Click Frictionless Flow', color: 'border-purple-500/40 bg-purple-950/40 text-purple-200' },
    { label: 'PAYMENT', desc: 'Razorpay / Stripe Webhook', color: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200' },
    { label: 'ORDER', desc: 'Invoice & Wallet Credited', color: 'border-indigo-500/40 bg-indigo-950/40 text-indigo-200' },
    { label: 'LMS COURSE ACCESS', desc: 'Instant Student Auto-Enroll', color: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200' },
    { label: 'STUDENT LEARNING', desc: 'Video, Quizzes & Assignments', color: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200' },
    { label: 'CERTIFICATE', desc: 'Hash-Verifiable Credential', color: 'border-amber-500/40 bg-amber-950/40 text-amber-200' }
  ];

  return (
    <section className="py-24 bg-[#080b1e] text-white border-t border-white/10 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-emerald-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-4">
            <span>Harmonious Synergy</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Sell With Sales. Deliver With Learning.
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            <span className="text-indigo-400 font-bold">AADHYARA Sales</span> handles the business, marketing, custom domain, and transaction side.{' '}
            <span className="text-emerald-400 font-bold">AADHYARA Learning</span> handles the video delivery, assignments, grading, and student certification.
          </p>
        </div>

        {/* Visual Pipeline Flowchart */}
        <div className="p-6 sm:p-10 rounded-3xl bg-[#090d24] border border-white/15 shadow-2xl space-y-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 text-center">
            {pipelineSteps.map((step, idx) => (
              <React.Fragment key={step.label}>
                <div className={`w-full lg:w-auto flex-1 p-3 sm:p-4 rounded-2xl border ${step.color} shadow-md flex flex-col justify-center`}>
                  <div className="text-[11px] font-mono font-black tracking-wider uppercase">
                    {step.label}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {step.desc}
                  </div>
                </div>

                {idx < pipelineSteps.length - 1 && (
                  <div className="text-slate-500 font-bold rotate-90 lg:rotate-0 text-sm">
                    →
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Division of Responsibilities Callout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10 text-left">
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <span>💼</span>
                <span>AADHYARA Sales Domain</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Manages custom domain DNS, website pages, SEO, cart optimization, Razorpay/Stripe payment verification, 10% platform commission calculation, seller wallet, and lead captures.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <span>🎓</span>
                <span>AADHYARA Learning Domain</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Manages video DRM streaming, lesson progress tracking, interactive quizzes, student discussions, instructor grading, and automated certificate issuance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
