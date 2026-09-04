'use client';

import React from 'react';
import Link from 'next/link';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-[#04060e] text-slate-400 border-t border-white/[0.08] py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-14">
        {/* 5 Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Info (Span 1 on lg or 2 on md) */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-all">
                <span className="font-black text-lg">A</span>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl text-white tracking-tight">AADHYARA</span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Build. Learn. Grow.</span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              Everything you need to build, teach, sell and grow online. A single unified ecosystem with dedicated Sales and Learning platforms.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs font-mono font-bold bg-white/5 text-slate-300 px-3 py-1 rounded-xl border border-white/10">
                v4.0.0 Dual Engine
              </span>
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                <span>All Systems Operational</span>
              </span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li>
                <a href="/#learning-overview" className="hover:text-emerald-400 transition-colors">
                  Learning
                </a>
              </li>
              <li>
                <a href="/#sales-overview" className="hover:text-indigo-400 transition-colors">
                  Sales
                </a>
              </li>
              <li>
                <a href="/#ai-builder" className="hover:text-purple-400 transition-colors">
                  AI
                </a>
              </li>
              <li>
                <a href="/#custom-domain" className="hover:text-white transition-colors">
                  Website Builder
                </a>
              </li>
              <li>
                <a href="/#platform" className="hover:text-white transition-colors">
                  Payments
                </a>
              </li>
              <li>
                <a href="/#sales-analytics" className="hover:text-white transition-colors">
                  Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Solutions */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">Solutions</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li>
                <a href="/#business-types" className="hover:text-white transition-colors">
                  Creators
                </a>
              </li>
              <li>
                <a href="/#business-types" className="hover:text-white transition-colors">
                  Coaches
                </a>
              </li>
              <li>
                <a href="/#business-types" className="hover:text-white transition-colors">
                  Academies
                </a>
              </li>
              <li>
                <a href="/#business-types" className="hover:text-white transition-colors">
                  Institutes
                </a>
              </li>
              <li>
                <a href="/#business-types" className="hover:text-white transition-colors">
                  Businesses
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">Resources</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li>
                <Link href="/marketplace" className="hover:text-white transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors">
                  Blog &amp; Guides
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Company & Legal */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">Company</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li>
                <a href="/#platform" className="hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="/#pricing" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors">
                  Privacy &amp; Terms
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors">
                  Security
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors">
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} AADHYARA. All rights reserved. Build. Learn. Grow.</p>
          <div className="flex items-center gap-5">
            <Link href="/company-signup" className="hover:text-indigo-400 transition-colors">
              🚀 AADHYARA Sales
            </Link>
            <Link href="/courses" className="hover:text-emerald-400 transition-colors">
              🎓 AADHYARA Learning
            </Link>
            <Link href="/super-admin/login" className="hover:text-slate-300 transition-colors">
              Platform Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
