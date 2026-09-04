'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { CompanyEmailSettingsTab } from '@/components/admin/CompanyEmailSettingsTab';

export default function AdminEmailSettingsPage() {
  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 p-6 md:p-10 space-y-8">
      {/* Top Header & Breadcrumbs */}
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Link href="/admin/dashboard" className="hover:text-indigo-400 transition-colors">
            Admin
          </Link>
          <span>/</span>
          <Link href="/admin/settings" className="hover:text-indigo-400 transition-colors">
            Settings
          </Link>
          <span>/</span>
          <span className="text-indigo-400">Email & SMTP</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Icon name="mail" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  Company Email / SMTP Configuration
                </h1>
                <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                  Configure isolated outbound SMTP delivery and custom branded email templates for your academy.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors shadow-sm"
            >
              <Icon name="arrowLeft" className="w-4 h-4" />
              All Settings
            </Link>
          </div>
        </div>

        {/* Embedded Isolated Email Tab Component */}
        <div className="mt-6">
          <CompanyEmailSettingsTab />
        </div>
      </div>
    </div>
  );
}
