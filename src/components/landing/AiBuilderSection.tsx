'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const AiBuilderSection: React.FC = () => {
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);

  const prompts = [
    {
      prompt: 'Create a premium website for my graphic design academy and sell Figma templates.',
      industry: 'Design & Creative Academy',
      checklist: [
        'Homepage with interactive 3D hero & portfolio grid created',
        'Figma UI Kit & Icon Pack digital product listings configured',
        'Masterclass course modules for UI/UX Foundations generated',
        'Custom brand color palette (#6366f1 & #a855f7) applied',
        'SEO meta tags, OpenGraph images & sitemap generated',
        'Razorpay checkout & instant digital download webhooks activated'
      ]
    },
    {
      prompt: 'Build a high-ticket business consulting practice with client booking calendar.',
      industry: 'Executive Coaching & Strategy',
      checklist: [
        'Executive advisory landing page & client case studies created',
        '4-day milestone deliverables & requirements intake pipeline configured',
        'Hourly & retainer tier payment packages generated',
        'Client private portal & document upload vault initialized',
        'Automated onboarding emails & calendar sync activated'
      ]
    },
    {
      prompt: 'Launch a Next.js developer bootcamp and sell commercial SaaS boilerplate codebases.',
      industry: 'Software & Tech Bootcamps',
      checklist: [
        'Developer dark-mode storefront & code snippet previews created',
        'Cryptographic software licensing system (AADHYARA-XXXX-XXXX-XXXX) enabled',
        'Hardware device fingerprinting & activation APIs wired',
        '10-module full-stack curriculum with code assignments configured',
        'Automated developer community invite emails setup'
      ]
    }
  ];

  const current = prompts[selectedPromptIndex];

  return (
    <section id="ai-builder" className="py-24 bg-[#060814] text-white relative overflow-hidden">
      {/* Background Gradient Blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-purple-600/15 via-indigo-600/15 to-pink-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs font-mono uppercase text-purple-300 font-bold tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>AI Foundation Architect</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Let AI Build the Foundation
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            Describe what you want. AADHYARA AI helps create it. From product catalogs to complete curricula and landing pages.
          </p>
        </div>

        {/* Interactive Prompt Selector Tabs */}
        <div className="flex items-center justify-center gap-2.5 mb-8 flex-wrap">
          {prompts.map((p, idx) => (
            <button
              key={p.industry}
              onClick={() => setSelectedPromptIndex(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPromptIndex === idx
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {p.industry}
            </button>
          ))}
        </div>

        {/* AI Prompt Simulator Terminal */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-[#0b0e24] border border-white/15 shadow-2xl p-6 sm:p-10 space-y-6 text-left">
          {/* User Prompt Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
                User Vision Input:
              </span>
              <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded">
                Natural Language Prompt
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-sm sm:text-base font-semibold text-white flex items-center gap-3">
              <span className="text-purple-400 text-xl font-mono">&gt;</span>
              <span>&ldquo;{current.prompt}&rdquo;</span>
            </div>
          </div>

          {/* AI Response Checklist Box */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-purple-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AADHYARA AI Generative Execution Engine:</span>
            </div>

            <div className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-2.5 font-mono text-xs sm:text-sm">
              {current.checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-slate-200">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              ⚡ Generated and scaffolded in less than 5 seconds using custom AI models.
            </div>

            <Link
              href="/ai/business-builder"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Try AI Builder</span>
              <Icon name="arrow_forward" size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
