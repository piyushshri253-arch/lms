'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

interface CoursePricingProps {
  price: number;
  discountPrice?: number | null;
  currency?: string;
  accessType: string;
  accessDays?: number | null;
  onChange: (field: string, val: any) => void;
}

export const CoursePricingStep: React.FC<CoursePricingProps> = ({
  price,
  discountPrice,
  currency = 'INR',
  accessType,
  accessDays,
  onChange
}) => {
  const isFree = price === 0;
  const curr = currency || 'INR';
  const currencySymbol = curr === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Pricing Models */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-black text-on-surface">Course Monetization &amp; Pricing Model</h3>
          <p className="text-xs text-on-surface-variant">
            Set student enrollment fees, choose currency (INR / USD), discount campaigns, and access periods.
          </p>
        </div>

        {/* Free vs Paid Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => {
              onChange('price', 0);
              onChange('discountPrice', null);
            }}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
              isFree
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-outline-variant hover:border-primary/40 bg-surface'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Icon name="card_giftcard" size={22} />
              </div>
              <input
                type="radio"
                name="pricing_mode"
                checked={isFree}
                onChange={() => {}}
                className="text-primary focus:ring-primary"
              />
            </div>
            <h4 className="font-extrabold text-sm text-on-surface">100% Free Course</h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Students can enroll with 1-click without payment processing or card checkout.
            </p>
          </div>

          <div
            onClick={() => {
              if (price === 0) onChange('price', curr === 'INR' ? 1499 : 49);
            }}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
              !isFree
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-outline-variant hover:border-primary/40 bg-surface'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon name="payments" size={22} />
              </div>
              <input
                type="radio"
                name="pricing_mode"
                checked={!isFree}
                onChange={() => {}}
                className="text-primary focus:ring-primary"
              />
            </div>
            <h4 className="font-extrabold text-sm text-on-surface">Paid Masterclass</h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Students checkout via UPI, Cards, NetBanking (INR) or Stripe/PayPal (USD).
            </p>
          </div>
        </div>

        {/* Currency & Paid Price Inputs */}
        {!isFree && (
          <div className="space-y-4 p-5 bg-surface-container-low rounded-2xl border border-outline-variant/60">
            {/* Currency Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Enrollment Currency *
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => onChange('currency', 'INR')}
                  className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    curr === 'INR'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-outline-variant bg-surface text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black">₹</span>
                    <div>
                      <p className="font-extrabold">INR (Indian Rupee)</p>
                      <p className="text-[10px] text-on-surface-variant font-normal">UPI, Cards, NetBanking</p>
                    </div>
                  </div>
                  {curr === 'INR' && <Icon name="check" size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => onChange('currency', 'USD')}
                  className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    curr === 'USD'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-outline-variant bg-surface text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black">$</span>
                    <div>
                      <p className="font-extrabold">USD (US Dollar)</p>
                      <p className="text-[10px] text-on-surface-variant font-normal">Global Cards, PayPal</p>
                    </div>
                  </div>
                  {curr === 'USD' && <Icon name="check" size={16} />}
                </button>
              </div>
            </div>

            {/* Price Values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                  Standard Price ({curr} {currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-outline">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => onChange('price', Number(e.target.value))}
                    placeholder={curr === 'INR' ? '1499' : '49'}
                    className="w-full pl-8 pr-4 py-3 bg-surface border border-outline-variant rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                  Discounted / Launch Price ({curr} {currencySymbol}) (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-outline">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={discountPrice || ''}
                    onChange={(e) =>
                      onChange('discountPrice', e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder={curr === 'INR' ? 'e.g. 999' : 'e.g. 29'}
                    className="w-full pl-8 pr-4 py-3 bg-surface border border-outline-variant rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Access Duration & Policy */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-black text-on-surface">Student Access Rules</h3>
          <p className="text-xs text-on-surface-variant">
            Determine how long enrolled students retain access to videos, assignments, and certificates.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => {
              onChange('accessType', 'LIFETIME');
              onChange('accessDays', null);
            }}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              accessType === 'LIFETIME'
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant bg-surface'
            }`}
          >
            <h4 className="text-xs font-extrabold text-on-surface">Lifetime Unlimited Access</h4>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Students keep access forever with free future syllabus updates.
            </p>
          </div>

          <div
            onClick={() => {
              onChange('accessType', 'LIMITED_DAYS');
              if (!accessDays) onChange('accessDays', 365);
            }}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              accessType === 'LIMITED_DAYS'
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant bg-surface'
            }`}
          >
            <h4 className="text-xs font-extrabold text-on-surface">Time-Limited Access</h4>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Access expires after a configured number of days from enrollment date.
            </p>
          </div>
        </div>

        {accessType === 'LIMITED_DAYS' && (
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Access Validity (Days)
            </label>
            <input
              type="number"
              min="7"
              value={accessDays || 365}
              onChange={(e) => onChange('accessDays', Number(e.target.value))}
              placeholder="365"
              className="w-48 bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono font-bold"
            />
          </div>
        )}
      </div>
    </div>
  );
};
