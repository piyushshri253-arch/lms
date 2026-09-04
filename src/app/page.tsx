'use client';

import React from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { AadhyaraHeroSection } from '@/components/landing/AadhyaraHeroSection';
import { ProductSwitcherSection } from '@/components/landing/ProductSwitcherSection';
import { SalesValuePropSection } from '@/components/landing/SalesValuePropSection';
import { CustomDomainSection } from '@/components/landing/CustomDomainSection';
import { AiBuilderSection } from '@/components/landing/AiBuilderSection';
import { SalesFlowSection } from '@/components/landing/SalesFlowSection';
import { LmsFeaturesSection } from '@/components/landing/LmsFeaturesSection';
import { SalesLmsConnectionSection } from '@/components/landing/SalesLmsConnectionSection';
import { BusinessTypesSection } from '@/components/landing/BusinessTypesSection';
import { BusinessAnalyticsSection } from '@/components/landing/BusinessAnalyticsSection';
import { MarketingGrowthSection } from '@/components/landing/MarketingGrowthSection';
import { EnterpriseTrustSection } from '@/components/landing/EnterpriseTrustSection';
import { AadhyaraPricingSection } from '@/components/landing/AadhyaraPricingSection';
import { AadhyaraFaqSection } from '@/components/landing/AadhyaraFaqSection';
import { AadhyaraFinalCtaSection } from '@/components/landing/AadhyaraFinalCtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { AmbientCursorGlow } from '@/components/ui/AmbientCursorGlow';

export default function HomePage() {
  return (
    <div className="bg-[#060814] text-white min-h-screen flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* Dynamic Ambient Cursor Follower */}
      <AmbientCursorGlow />

      {/* 1. Header with Sales Mega-Menu & Dual Product Entry */}
      <PublicNavbar />

      {/* Main High-Conversion Storytelling Canvas */}
      <main className="flex-grow">
        {/* 01. Hero Section + Business OS Product Visual */}
        <AadhyaraHeroSection />

        {/* 02. Product Switcher: One Ecosystem, Two Powerful Platforms */}
        <ProductSwitcherSection />

        {/* 03. Sales Value Proposition: Everything You Need to Sell Online (7 Features) */}
        <SalesValuePropSection />

        {/* 04. Custom Domain Feature: Your Brand. Your Domain. Your Business. */}
        <CustomDomainSection />

        {/* 05. AI Business Foundation: Interactive Generative Prompt Simulator */}
        <AiBuilderSection />

        {/* 06. The 8-Step Sales Flow Roadmap */}
        <SalesFlowSection />

        {/* 07. LMS Section: Teach With AADHYARA Learning */}
        <LmsFeaturesSection />

        {/* 08. Sales + LMS Connection Pipeline */}
        <SalesLmsConnectionSection />

        {/* 09. Business Types & Industry Solutions */}
        <BusinessTypesSection />

        {/* 10. Analytics & Predictive AI Insight Dashboard */}
        <BusinessAnalyticsSection />

        {/* 11. Marketing, Attribution & Conversion Tools */}
        <MarketingGrowthSection />

        {/* 12. Enterprise Trust, RBAC & Multi-Tenant Security */}
        <EnterpriseTrustSection />

        {/* 13. Transparent SaaS Pricing Tiers */}
        <AadhyaraPricingSection />

        {/* 14. 10-Question Comprehensive Architecture FAQ */}
        <AadhyaraFaqSection />

        {/* 15. Cosmic Final Conversion Call-To-Action */}
        <AadhyaraFinalCtaSection />
      </main>

      {/* Comprehensive 5-Column SaaS Footer */}
      <LandingFooter />
    </div>
  );
}
