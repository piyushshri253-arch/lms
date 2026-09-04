'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';

export const AadhyaraFaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is AADHYARA Sales?',
      a: 'AADHYARA Sales is a complete digital commerce, website, and growth platform. It allows businesses, creators, developers, coaches, and academies to launch custom-branded websites on their own domains, sell digital products, software licenses, memberships, and client services, and collect instant payments.'
    },
    {
      q: 'Is AADHYARA Sales the same as AADHYARA Learning?',
      a: 'No. They are two distinct, specialized products under the AADHYARA ecosystem. AADHYARA Sales handles your branded website, custom domain, checkout, payments, customer CRM, and business analytics. AADHYARA Learning is the dedicated LMS that handles student course progression, video streaming, quizzes, assignments, and certificates.'
    },
    {
      q: 'Can I use my own domain?',
      a: 'Yes! You can easily connect your own custom root domain or subdomain (such as www.yourbrand.com or academy.yourcompany.com). AADHYARA provisions automated, free 256-bit SSL encryption and does not require any platform branding on your custom domain.'
    },
    {
      q: 'Can I sell courses?',
      a: 'Absolutely. You can create and price course masterclasses in AADHYARA Sales. When a student completes checkout, they are instantly and automatically provisioned with access inside AADHYARA Learning without any manual intervention.'
    },
    {
      q: 'Can I connect Razorpay?',
      a: 'Yes. AADHYARA has native first-class integration with Razorpay. You can accept UPI, Credit/Debit Cards, NetBanking, and Indian digital wallets with direct webhook settlement.'
    },
    {
      q: 'Can I connect Stripe?',
      a: 'Yes. You can connect your Stripe account to accept international credit cards, multi-currency transactions, Apple Pay, and Google Pay with zero friction.'
    },
    {
      q: 'Can I build my website with AI?',
      a: 'Yes! The AADHYARA AI Business Architect can scaffold your entire website layout, product catalog, service tiers, curriculum outline, and SEO metadata from a single descriptive natural-language prompt.'
    },
    {
      q: 'Do I need coding knowledge?',
      a: 'No coding knowledge is required. AADHYARA provides no-code visual website builders, point-and-click product creators, automated DNS guides, and ready-to-use storefront templates.'
    },
    {
      q: 'Can I connect Sales with AADHYARA Learning?',
      a: 'Yes, they interoperate seamlessly. AADHYARA Sales handles the storefront, checkout, and transactions. Once an order is confirmed, access is granted automatically to AADHYARA Learning so learners can immediately stream lessons and earn certificates.'
    },
    {
      q: 'Can I create a business account?',
      a: 'Yes! Anyone can register for an AADHYARA Sales business account through our 4-step signup wizard. You can select your industry (Academy, Software, Agency, Coaching, Creator, etc.) and launch in minutes.'
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-[#080b1e] text-white border-t border-white/10 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-4">
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            Everything you need to know about the AADHYARA platform, Sales vs. Learning separation, custom domains, and payments.
          </p>
        </div>

        {/* 10 Accordion Items */}
        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={faq.q}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-white/[0.06] border-indigo-500/50 shadow-lg'
                    : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/10'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-extrabold text-white">
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-300 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-indigo-600 text-white' : ''
                    }`}
                  >
                    <Icon name="expand_more" size={16} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
