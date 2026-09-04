'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';
import { useApp } from '@/context/AppContext';

export const ActiveOffersSection: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useApp();

  useEffect(() => {
    fetch('/api/coupons')
      .then((res) => res.ok && res.json())
      .then((d) => {
        if (d?.campaigns) {
          const activeOnly = d.campaigns.filter((c: any) => c.status === 'active' || c.status === 'ACTIVE');
          setCoupons(activeOnly);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleCopyCode = (code: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(code);
      showToast({
        title: 'Coupon Copied!',
        description: `Code "${code}" copied to clipboard. Apply at checkout!`,
        type: 'success'
      });
    }
  };

  if (!isLoading && coupons.length === 0) {
    return null; // Gracefully hide if no active offers in DB
  }

  return (
    <section
      id="offers"
      className="py-20 lg:py-28 px-4 sm:px-8 lg:px-10 bg-surface border-b border-outline-variant/60 relative overflow-hidden"
    >
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-container-max mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-outline-variant/60">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-bold uppercase tracking-wider font-mono">
              <Icon name="sell" size={16} />
              <span>Limited Time Specials</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight">
              Active Promotional Offers
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Unlock exclusive promotional discounts verified on our database. Copy any coupon code below to apply at checkout.
            </p>
          </div>

          <span className="text-xs font-mono font-bold bg-surface-container-low px-3.5 py-1.5 rounded-xl border border-outline-variant/80 text-outline">
            ● Real-Time Database Verified
          </span>
        </div>

        {/* Offers Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="bg-surface-container-lowest border-2 border-outline-variant rounded-3xl p-7 shadow-sm hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Corner Badge */}
              <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-full font-mono uppercase tracking-wider">
                {c.discountPercent}% Off
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Icon name="percent" size={24} />
                </div>

                <div>
                  <h3 className="font-extrabold text-xl text-on-surface mb-1">
                    {c.title || `${c.discountPercent}% Special Discount`}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Valid for all enrolled courses including masterclasses with 1-on-1 instructor reviews.
                  </p>
                </div>

                {/* Coupon Code Pill */}
                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/80 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-outline block">Coupon Code:</span>
                    <span className="font-mono text-base font-black text-primary tracking-wider">
                      {c.code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(c.code)}
                    className="px-3.5 py-2 bg-surface text-on-surface border border-outline-variant hover:border-primary hover:text-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Icon name="content_copy" size={14} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-6 border-t border-outline-variant/60">
                <Link
                  href="/courses"
                  className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Apply Code &amp; Browse Courses</span>
                  <Icon name="arrow_forward" size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
