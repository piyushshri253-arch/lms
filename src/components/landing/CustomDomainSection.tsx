'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const CustomDomainSection: React.FC = () => {
  return (
    <section id="custom-domain" className="py-24 bg-[#080b1e] text-white border-t border-white/10 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy & Explanation */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider">
              <span>White-Label Autonomy</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Your Brand. Your Domain. Your Business.
            </h2>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Build on MORENA TEACH while keeping your own brand identity. Connect your custom root domain or subdomain
              with automated SSL certificate provisioning.
            </p>

            {/* DNS Provider Icons / Support */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider block">
                Connect your existing domain provider:
              </span>
              <div className="flex flex-wrap gap-2.5">
                {['Cloudflare', 'GoDaddy', 'Namecheap', 'Hostinger', 'Google Domains', 'AWS Route53'].map((prov) => (
                  <span
                    key={prov}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-slate-200"
                  >
                    {prov}
                  </span>
                ))}
              </div>
            </div>

            {/* Value Points */}
            <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-2.5">
                <Icon name="check_circle" size={18} className="text-emerald-400 shrink-0" />
                <span>Zero MORENA TEACH badges or mandatory branding on your URL</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Icon name="check_circle" size={18} className="text-emerald-400 shrink-0" />
                <span>Automated Let's Encrypt TLS/SSL certificates generated in 60 seconds</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Icon name="check_circle" size={18} className="text-emerald-400 shrink-0" />
                <span>Global CDN routing with sub-50ms DNS resolution times</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <Link
                href="/company-signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-extrabold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all cursor-pointer"
              >
                <span>Build My Website</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Architecture Flow & DNS Record Inspector */}
          <div className="lg:col-span-6 space-y-6">
            {/* Visual Architecture Flowchart */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#090d24] border border-white/15 shadow-2xl space-y-4">
              <h4 className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                <span>DNS Connection Architecture</span>
                <span className="text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                  ACTIVE
                </span>
              </h4>

              {/* Connected Flowchart */}
              <div className="space-y-2 font-mono text-xs text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-bold text-slate-200">
                  ⚡ MORENA TEACH Core Engine
                </div>
                <div className="text-indigo-400 text-sm font-bold">↓</div>
                <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 font-bold text-indigo-200">
                  🎨 Build &amp; Style Website
                </div>
                <div className="text-indigo-400 text-sm font-bold">↓</div>
                <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/30 font-bold text-purple-200">
                  🔗 Connect Custom DNS
                </div>
                <div className="text-indigo-400 text-sm font-bold">↓</div>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-teal-950/50 border border-emerald-500/40 text-emerald-300 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2">
                  <span>🔒 https://www.yourbrand.com</span>
                </div>
                <div className="text-emerald-400 text-sm font-bold">↓</div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-bold text-white">
                  🚀 Your Branded Digital Business
                </div>
              </div>

              {/* DNS Table Preview */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-[11px] font-mono text-slate-400 mb-2 font-semibold">
                  Standard DNS Records Provided:
                </div>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-slate-300">
                    <span>CNAME</span>
                    <span className="text-indigo-300">www</span>
                    <span className="text-emerald-400">cname.morenateach.com</span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-slate-300">
                    <span>A Record</span>
                    <span className="text-indigo-300">@</span>
                    <span className="text-emerald-400">76.76.21.21</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
