'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface QuickActionsRowProps {
  onOpenAiAssistant: () => void;
}

export const QuickActionsRow: React.FC<QuickActionsRowProps> = ({ onOpenAiAssistant }) => {
  const actions = [
    { label: '+ Create Product', desc: 'Add course, software, or digital goods', href: '/sales/products', icon: 'add_shopping_cart', color: 'from-indigo-600/30 to-indigo-950/40 border-indigo-500/40 text-indigo-300' },
    { label: '🌐 Build Website', desc: 'Edit visual landing pages and hero sections', href: '/sales/website/builder', icon: 'language', color: 'from-blue-600/30 to-blue-950/40 border-blue-500/40 text-blue-300' },
    { label: '👥 Add Customer', desc: 'Enroll or register client account', href: '/sales/customers', icon: 'person_add', color: 'from-emerald-600/30 to-emerald-950/40 border-emerald-500/40 text-emerald-300' },
    { label: '🎟 Create Coupon', desc: 'Generate discount promo code', href: '/sales/coupons', icon: 'sell', color: 'from-purple-600/30 to-purple-950/40 border-purple-500/40 text-purple-300' },
    { label: '📧 Create Campaign', desc: 'Send newsletter blast to leads', href: '/sales/marketing/campaigns', icon: 'campaign', color: 'from-amber-600/30 to-amber-950/40 border-amber-500/40 text-amber-300' },
    { label: '✨ Ask AI Copilot', desc: 'Natural language business queries', onClick: onOpenAiAssistant, icon: 'psychology', color: 'from-pink-600/30 to-purple-950/40 border-pink-500/40 text-pink-300' }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase font-mono tracking-wider">Quick Actions</h3>
        <span className="text-[10px] text-slate-500 font-mono">1-Click Launchpad</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((act) => {
          if (act.onClick) {
            return (
              <button
                key={act.label}
                type="button"
                onClick={act.onClick}
                className={`p-4 rounded-2xl bg-gradient-to-b ${act.color} border hover:border-white/40 transition-all duration-200 text-left flex flex-col justify-between group shadow-md hover:scale-[1.02] cursor-pointer`}
              >
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Icon name={act.icon} size={18} />
                </div>
                <div>
                  <div className="text-xs font-black text-white group-hover:text-pink-200">{act.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{act.desc}</div>
                </div>
              </button>
            );
          }

          return (
            <Link
              key={act.label}
              href={act.href!}
              className={`p-4 rounded-2xl bg-gradient-to-b ${act.color} border hover:border-white/40 transition-all duration-200 text-left flex flex-col justify-between group shadow-md hover:scale-[1.02] cursor-pointer`}
            >
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Icon name={act.icon} size={18} />
              </div>
              <div>
                <div className="text-xs font-black text-white group-hover:text-white">{act.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{act.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
