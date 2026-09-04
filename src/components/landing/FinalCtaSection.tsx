'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const FinalCtaSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 px-4 sm:px-8 lg:px-10 bg-surface border-b border-outline-variant/60 relative overflow-hidden">
      <div className="max-w-container-max mx-auto">
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-14 lg:p-20 shadow-2xl border-2 border-primary/40 relative overflow-hidden text-center space-y-8">
          {/* Radial Ambient Illumination */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Micro-Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-indigo-300 text-xs font-bold uppercase tracking-wider font-mono">
            <Icon name="rocket_launch" size={16} />
            <span>Accelerate Your Career Today</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
            Ready to master deep-tech and build your future?
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join thousands of engineers and designers elevating their craft through our masterclasses. Start learning with instant access to on-demand video lectures and verified diplomas.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-primary text-on-primary font-bold text-sm rounded-2xl hover:bg-primary-container shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Create Free Account</span>
              <Icon name="arrow_forward" size={16} />
            </Link>

            <Link
              href="/courses"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl border border-white/20 hover:border-white/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icon name="school" size={18} />
              <span>Browse All Masterclasses</span>
            </Link>
          </div>

          {/* Guarantee Footer */}
          <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Icon name="verified_user" size={16} className="text-emerald-400" />
              <span>30-Day Money-Back Guarantee</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="lock" size={16} className="text-indigo-400" />
              <span>Server-Verified Checkout</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="workspace_premium" size={16} className="text-amber-400" />
              <span>Cryptographic Diplomas</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
