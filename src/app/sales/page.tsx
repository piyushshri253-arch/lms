'use client';

import React from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { SalesValuePropSection } from '@/components/landing/SalesValuePropSection';
import { CustomDomainSection } from '@/components/landing/CustomDomainSection';
import { AiBuilderSection } from '@/components/landing/AiBuilderSection';
import { SalesFlowSection } from '@/components/landing/SalesFlowSection';
import { BusinessAnalyticsSection } from '@/components/landing/BusinessAnalyticsSection';
import { MarketingGrowthSection } from '@/components/landing/MarketingGrowthSection';
import { AadhyaraPricingSection } from '@/components/landing/AadhyaraPricingSection';
import { AadhyaraFaqSection } from '@/components/landing/AadhyaraFaqSection';
import { AadhyaraFinalCtaSection } from '@/components/landing/AadhyaraFinalCtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Icon } from '@/components/ui/Icon';

export default function SalesProductLandingPage() {
  return (
    <div className="bg-[#060814] text-white min-h-screen flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      <PublicNavbar />

      <main className="flex-grow">
        {/* Dedicated Sales Hero Header */}
        <section className="relative pt-32 sm:pt-40 pb-20 overflow-hidden bg-gradient-to-b from-[#060814] via-[#090d24] to-[#060814]">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[140px] rounded-full pointer-events-none" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-6">
              <span>🚀 AADHYARA Sales</span>
              <span>•</span>
              <span>Business &amp; Commerce Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
              Build, Sell and Grow Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
                Online Business.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Your website, custom domain, checkout, digital products, software licenses, services, and AI growth tools — all in one operating system.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/company-signup"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20"
              >
                <span>🚀 Launch with AADHYARA Sales</span>
                <Icon name="arrow_forward" size={16} />
              </Link>

              <Link
                href="/login?portal=admin"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-sm text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sales Login</span>
              </Link>
            </div>

            <div className="mt-5 text-xs text-slate-400 font-medium flex items-center justify-center gap-3">
              <span>No credit card required</span>
              <span>•</span>
              <span>Connect your domain</span>
              <span>•</span>
              <span>0% Platform lock-in</span>
            </div>
          </div>
        </section>

        {/* Sales Sections */}
        <SalesValuePropSection />
        <CustomDomainSection />
        <AiBuilderSection />
        <SalesFlowSection />
        <BusinessAnalyticsSection />
        <MarketingGrowthSection />
        <AadhyaraPricingSection />
        <AadhyaraFaqSection />
        <AadhyaraFinalCtaSection />
      </main>

      <LandingFooter />
    </div>
  );
}
