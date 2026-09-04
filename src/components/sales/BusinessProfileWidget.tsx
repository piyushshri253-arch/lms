'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface BusinessProfileWidgetProps {
  organization: any;
}

export const BusinessProfileWidget: React.FC<BusinessProfileWidgetProps> = ({ organization }) => {
  return (
    <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="business" size={18} className="text-indigo-400" />
          <h3 className="text-sm font-black text-white">Business Profile</h3>
        </div>

        <Link
          href="/admin/settings"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
        >
          Settings →
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {organization?.logo ? (
            <img src={organization.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base text-white shadow-md"
              style={{ backgroundColor: organization?.primaryColor || '#4f46e5' }}
            >
              {organization?.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{organization?.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{organization?.industry || 'Digital Commerce'}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-500 font-mono">Country:</span>{' '}
            <span className="text-slate-300 font-medium">{organization?.country || 'India'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-mono">Currency:</span>{' '}
            <span className="text-slate-300 font-mono font-bold">{organization?.currency || 'INR'} (₹)</span>
          </div>
          <div>
            <span className="text-slate-500 font-mono">GST Status:</span>{' '}
            <span className="text-emerald-400 font-bold font-mono">
              {organization?.hasGst === 'YES' ? 'Registered' : 'Exempt / Not Set'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-mono">Seller Status:</span>{' '}
            <span className="text-emerald-400 font-bold font-mono">Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
