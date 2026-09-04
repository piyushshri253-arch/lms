'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface GlobalCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalCreateModal: React.FC<GlobalCreateModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = [
    {
      title: 'SELL',
      items: [
        { label: 'Digital Product or Course', desc: 'Add downloadable files, software or video curriculum', href: '/admin/products', icon: 'inventory_2', color: 'text-indigo-400' },
        { label: 'Recurring Subscription', desc: 'Create monthly or annual recurring membership plan', href: '/admin/subscriptions', icon: 'autorenew', color: 'text-purple-400' },
        { label: 'Flash Promo Coupon', desc: 'Generate percentage or fixed checkout discount code', href: '/admin/coupons', icon: 'sell', color: 'text-emerald-400' }
      ]
    },
    {
      title: 'BUILD',
      items: [
        { label: 'Custom Storefront Page', desc: 'Build a high-conversion landing page', href: '/admin/website/pages', icon: 'web', color: 'text-blue-400' },
        { label: 'Navigation Link or Menu', desc: 'Configure header dropdowns and footer columns', href: '/admin/website/navigation', icon: 'menu', color: 'text-cyan-400' }
      ]
    },
    {
      title: 'GROW',
      items: [
        { label: 'Email Campaign', desc: 'Send newsletter or promo blast via verified SMTP', href: '/admin/marketing/campaigns', icon: 'campaign', color: 'text-amber-400' },
        { label: 'Lifecycle Automation', desc: 'Set up abandoned checkout recovery workflows', href: '/admin/marketing/automations', icon: 'bolt', color: 'text-yellow-400' },
        { label: 'Manual Customer Lead', desc: 'Record incoming B2B prospect or inquiry', href: '/admin/website/leads', icon: 'person_add', color: 'text-teal-400' }
      ]
    },
    {
      title: 'AI GENERATION',
      items: [
        { label: 'AI Website Architect', desc: 'Prompt AI to generate full landing page & copy', href: '/admin/website/builder?mode=ai', icon: 'auto_awesome', color: 'text-pink-400' },
        { label: 'AI Product Generator', desc: 'Generate course syllabus or software spec outline', href: '/admin/products?mode=ai', icon: 'psychology', color: 'text-purple-400' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#090d24] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Icon name="add" size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Create New Entity</h2>
              <p className="text-[11px] text-slate-400">Choose what you would like to build or launch</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Grid of Categories */}
        <div className="space-y-5">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-2">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                {cat.title}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {cat.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/40 flex items-start gap-3 transition-all group cursor-pointer"
                  >
                    <div className={`p-2 rounded-xl bg-white/5 ${item.color} shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon name={item.icon} size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
