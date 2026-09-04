'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

export default function MarketingPage() {
  const { campaigns, addCampaign, toggleCampaignStatus } = useApp();

  const [campaignType, setCampaignType] = useState<'discount' | 'banner' | 'announcement'>('discount');
  const [internalTitle, setInternalTitle] = useState('');
  const [discountValue, setDiscountValue] = useState('25');
  const [targetStudents, setTargetStudents] = useState('All Active Students');
  const [expiryDate, setExpiryDate] = useState('2026-10-31T23:59');

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalTitle.trim()) return;

    addCampaign({
      type: campaignType,
      title: internalTitle,
      code: campaignType === 'discount' ? internalTitle.replace(/\s+/g, '').toUpperCase().slice(0, 8) + discountValue : undefined,
      discountPercent: campaignType === 'discount' ? parseInt(discountValue, 10) : undefined,
      targetAudience: targetStudents,
      expiryDate: expiryDate,
      status: 'active',
      bannerText:
        campaignType === 'discount'
          ? `✨ Special Offer: Get ${discountValue}% off all courses this week! Use code: ${internalTitle.replace(/\s+/g, '').toUpperCase().slice(0, 8) + discountValue}`
          : `🚀 Announcement: ${internalTitle}`,
      impressions: 0,
      conversions: 0
    });

    setInternalTitle('');
  };

  const activeCount = campaigns.filter((c) => c.status === 'active').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mb-2">
          Marketing &amp; Offers
        </h2>
        <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
          Design and deploy platform-wide announcements, promotional banners, and targeted discount offers.{' '}
          <span className="block mt-1 font-semibold text-primary">
            Updates configured here will be immediately reflected on qualifying student dashboards.
          </span>
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Form: Create New Campaign (Left Column) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface border border-outline-variant rounded-2xl ambient-shadow overflow-hidden group hover:border-primary/30 transition-colors duration-300">
            <div className="border-b border-outline-variant bg-surface-container-low/40 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Icon name="campaign" fill size={20} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-on-surface">
                Create New Campaign
              </h3>
            </div>

            <form onSubmit={handlePublish} className="p-6 sm:p-8 space-y-8">
              {/* Campaign Type Selection (Visual Radio Cards) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-3">
                  Campaign Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Discount Offer */}
                  <label
                    className={`relative flex cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                      campaignType === 'discount'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-outline-variant bg-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="radio"
                      name="offer_type"
                      value="discount"
                      checked={campaignType === 'discount'}
                      onChange={() => setCampaignType('discount')}
                      className="sr-only"
                    />
                    <div className="flex flex-col gap-2">
                      <Icon name="sell" fill size={22} className="text-primary" />
                      <span className="text-sm font-bold text-on-surface">Discount Offer</span>
                      <span className="text-xs text-on-surface-variant font-normal">
                        Percentage off specific courses.
                      </span>
                    </div>
                  </label>

                  {/* Promo Banner */}
                  <label
                    className={`relative flex cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                      campaignType === 'banner'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-outline-variant bg-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="radio"
                      name="offer_type"
                      value="banner"
                      checked={campaignType === 'banner'}
                      onChange={() => setCampaignType('banner')}
                      className="sr-only"
                    />
                    <div className="flex flex-col gap-2">
                      <Icon name="ad_units" size={22} className="text-tertiary" />
                      <span className="text-sm font-bold text-on-surface">Promo Banner</span>
                      <span className="text-xs text-on-surface-variant font-normal">
                        Visual hero banner on student portal.
                      </span>
                    </div>
                  </label>

                  {/* Announcement */}
                  <label
                    className={`relative flex cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                      campaignType === 'announcement'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-outline-variant bg-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="radio"
                      name="offer_type"
                      value="announcement"
                      checked={campaignType === 'announcement'}
                      onChange={() => setCampaignType('announcement')}
                      className="sr-only"
                    />
                    <div className="flex flex-col gap-2">
                      <Icon name="notifications_active" size={22} className="text-secondary" />
                      <span className="text-sm font-bold text-on-surface">Announcement</span>
                      <span className="text-xs text-on-surface-variant font-normal">
                        Text alert for system releases.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <hr className="border-outline-variant/50" />

              {/* Core Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Internal Campaign Title
                  </label>
                  <div className="relative soft-ring rounded-lg transition-shadow">
                    <input
                      type="text"
                      required
                      value={internalTitle}
                      onChange={(e) => setInternalTitle(e.target.value)}
                      placeholder="e.g., Summer Bootcamps 2026"
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Shown in reports and student banners.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Discount Value (%)
                  </label>
                  <div className="relative soft-ring rounded-lg transition-shadow flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="25"
                      className="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors font-mono font-bold"
                    />
                    <span className="absolute right-4 text-outline font-bold">%</span>
                  </div>
                </div>
              </div>

              {/* Targeting & Scheduling */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Target Students
                  </label>
                  <div className="relative soft-ring rounded-lg transition-shadow">
                    <select
                      value={targetStudents}
                      onChange={(e) => setTargetStudents(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary cursor-pointer appearance-none"
                    >
                      <option>All Active Students</option>
                      <option>New Sign-ups (Last 30 Days)</option>
                      <option>Inactive Students (&gt; 60 Days)</option>
                      <option>Completed Intro Course</option>
                    </select>
                    <Icon name="expand_more" size={20} className="absolute right-3 top-3 text-outline pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Expiry Date &amp; Time
                  </label>
                  <div className="relative soft-ring rounded-lg transition-shadow">
                    <input
                      type="datetime-local"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-on-surface-variant font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 flex justify-end gap-3 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setInternalTitle('')}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-on-surface border border-outline-variant hover:bg-surface-container transition-colors"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-on-primary hover:bg-primary-container hover:shadow-md transition-all shadow-sm"
                >
                  Publish Campaign
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Active & Scheduled Overview Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface border border-outline-variant rounded-2xl ambient-shadow overflow-hidden">
            <div className="border-b border-outline-variant bg-surface-container-low/40 px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">
                Active &amp; Scheduled
              </h3>
              <span className="bg-primary/10 text-primary text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                {activeCount} Live
              </span>
            </div>

            <div className="divide-y divide-outline-variant/30 max-h-[500px] overflow-y-auto">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-4 hover:bg-surface-container-low transition-colors cursor-pointer group flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        camp.type === 'discount'
                          ? 'bg-error/10 text-error'
                          : camp.type === 'banner'
                          ? 'bg-tertiary/10 text-tertiary'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <Icon
                        name={
                          camp.type === 'discount'
                            ? 'sell'
                            : camp.type === 'banner'
                            ? 'ad_units'
                            : 'notifications_active'
                        }
                        size={16}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                        {camp.title}
                      </h4>
                      {camp.code && (
                        <p className="text-[11px] font-mono text-primary font-bold mt-0.5">
                          Code: {camp.code}
                        </p>
                      )}
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Target: {camp.targetAudience}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => toggleCampaignStatus(camp.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      camp.status === 'active' ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        camp.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
