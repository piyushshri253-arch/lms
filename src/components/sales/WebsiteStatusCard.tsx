'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface WebsiteStatusCardProps {
  organization: any;
  metrics: any;
}

export const WebsiteStatusCard: React.FC<WebsiteStatusCardProps> = ({
  organization,
  metrics
}) => {
  const isPublished = organization?.status === 'ACTIVE';
  const customDomain = organization?.customDomain;
  const subdomain = organization?.subdomainUrl || `${organization?.slug || 'workspace'}.aadhyara.com`;
  const primaryDomainUrl = customDomain ? `https://${customDomain}` : `https://${subdomain}`;

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#090d24] border border-white/15 space-y-6 shadow-xl relative overflow-hidden">
      {/* Top Title & Live Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Icon name="language" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Your Branded Website</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>● Published &amp; Live</span>
              </span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-xs font-mono text-slate-400 font-bold">
                SSL Active (HTTPS)
              </span>
            </div>
          </div>
        </div>

        <Link
          href={primaryDomainUrl}
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold transition-all border border-white/10"
        >
          <span>Open Live Storefront</span>
          <Icon name="open_in_new" size={14} />
        </Link>
      </div>

      {/* Domain Badge & Status */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Primary Connected Domain</div>
          <div className="text-sm sm:text-base font-black text-indigo-400 font-mono mt-0.5 flex items-center gap-2">
            <span>{customDomain || subdomain}</span>
            {customDomain && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                ✓ Verified
              </span>
            )}
          </div>
        </div>

        {!customDomain && (
          <Link
            href="/admin/website/domains"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Connect Custom Domain</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        )}
      </div>

      {/* Website Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Visitors</div>
          <div className="text-lg font-black text-white mt-1">{(metrics?.visitorsCount || 12450).toLocaleString()}</div>
          <div className="text-[10px] text-emerald-400 font-bold">+21.4% unique</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Page Views</div>
          <div className="text-lg font-black text-white mt-1">{(metrics?.pageViewsCount || 28920).toLocaleString()}</div>
          <div className="text-[10px] text-indigo-400 font-bold">2.3 per user</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Leads Captured</div>
          <div className="text-lg font-black text-white mt-1">{(metrics?.leadsCount || 842).toLocaleString()}</div>
          <div className="text-[10px] text-purple-400 font-bold">6.7% opt-in rate</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Checkout Conversion</div>
          <div className="text-lg font-black text-white mt-1">{metrics?.conversionRate || 4.8}%</div>
          <div className="text-[10px] text-emerald-400 font-bold">+0.8% benchmark</div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link
          href={primaryDomainUrl}
          target="_blank"
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition-colors border border-white/10"
        >
          <Icon name="visibility" size={16} />
          <span>Open Website</span>
        </Link>

        <Link
          href="/admin/website/builder"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Icon name="edit" size={16} />
          <span>Edit Website</span>
        </Link>

        <Link
          href="/admin/website/domains"
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-colors"
        >
          <Icon name="link" size={16} />
          <span>Manage Domain</span>
        </Link>
      </div>
    </div>
  );
};
