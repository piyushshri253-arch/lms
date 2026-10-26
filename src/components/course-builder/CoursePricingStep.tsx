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
  isMinorEditMode?: boolean;
}

export const CoursePricingStep: React.FC<CoursePricingProps> = ({
  price,
  discountPrice,
  currency = 'INR',
  accessType,
  accessDays,
  onChange,
  isMinorEditMode = false
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

        {/* Quick Minor Edit Pricing Lock Notice */}
        {isMinorEditMode && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 rounded-2xl flex items-start gap-3">
            <Icon name="lock" size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                Pricing &amp; Access Locked in Quick Minor Edit Mode
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-800/80 dark:text-amber-300/80">
                Course pricing and student access policies cannot be modified during minor edits of a live course. To alter pricing or launch promotional discounts, please create an &quot;Update Version&quot; from My Courses.
              </p>
            </div>
          </div>
        )}

        {/* Free vs Paid Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => {
              if (isMinorEditMode) return;
              onChange('price', 0);
              onChange('discountPrice', null);
            }}
            className={`p-5 rounded-2xl border-2 transition-all ${
              isMinorEditMode
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer'
            } ${
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
                disabled={isMinorEditMode}
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
              if (isMinorEditMode) return;
              if (price === 0) onChange('price', curr === 'INR' ? 1499 : 49);
            }}
            className={`p-5 rounded-2xl border-2 transition-all ${
              isMinorEditMode
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer'
            } ${
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
                  disabled={isMinorEditMode}
                  onClick={() => {
                    if (isMinorEditMode) return;
                    onChange('currency', 'INR');
                  }}
                  className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all ${
                    isMinorEditMode ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  } ${
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
                  disabled={isMinorEditMode}
                  onClick={() => {
                    if (isMinorEditMode) return;
                    onChange('currency', 'USD');
                  }}
                  className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all ${
                    isMinorEditMode ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  } ${
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
                    disabled={isMinorEditMode}
                    value={price}
                    onChange={(e) => onChange('price', Number(e.target.value))}
                    placeholder={curr === 'INR' ? '1499' : '49'}
                    className={`w-full pl-8 pr-4 py-3 bg-surface border border-outline-variant rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:border-primary ${
                      isMinorEditMode ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
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
                    disabled={isMinorEditMode}
                    value={discountPrice || ''}
                    onChange={(e) =>
                      onChange('discountPrice', e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder={curr === 'INR' ? 'e.g. 999' : 'e.g. 29'}
                    className={`w-full pl-8 pr-4 py-3 bg-surface border border-outline-variant rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:border-primary ${
                      isMinorEditMode ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
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
              if (isMinorEditMode) return;
              onChange('accessType', 'LIFETIME');
              onChange('accessDays', null);
            }}
            className={`p-4 rounded-2xl border transition-all ${
              isMinorEditMode ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            } ${
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
              if (isMinorEditMode) return;
              onChange('accessType', 'LIMITED_DAYS');
              if (!accessDays) onChange('accessDays', 365);
            }}
            className={`p-4 rounded-2xl border transition-all ${
              isMinorEditMode ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            } ${
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
              disabled={isMinorEditMode}
              value={accessDays || 365}
              onChange={(e) => onChange('accessDays', Number(e.target.value))}
              placeholder="365"
              className={`w-48 bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono font-bold ${
                isMinorEditMode ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
};
