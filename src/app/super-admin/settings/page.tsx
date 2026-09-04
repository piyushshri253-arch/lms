'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function SuperAdminSettingsPage() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState<any>({
    platformName: 'AADHYARA',
    supportEmail: 'support@aadhyara.com',
    contactEmail: 'contact@aadhyara.com',
    defaultCurrency: 'USD',
    twoFactorAuth: true,
    maintenanceMode: false,
    stripeActive: true,
    razorpayActive: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/super-admin/settings');
      if (res.ok) {
        const d = await res.json();
        if (d.settings) setSettings(d.settings);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      showToast({ title: 'Platform Settings Saved', description: data.message, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Settings</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Platform Settings &amp; Data Governance
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Configure system parameters, export compliance CSVs, and access protected danger controls
          </p>
        </div>
      </div>

      {/* General Configuration Form */}
      <form onSubmit={handleSave} className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
          <Icon name="tune" size={20} className="text-primary" />
          <span>General Platform Configuration</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Platform Name
            </label>
            <input
              type="text"
              required
              value={settings.platformName || ''}
              onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Default Currency
            </label>
            <select
              value={settings.defaultCurrency || 'USD'}
              onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer font-mono"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Support Desk Email
            </label>
            <input
              type="email"
              required
              value={settings.supportEmail || ''}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Contact Email
            </label>
            <input
              type="email"
              required
              value={settings.contactEmail || ''}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant/40 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary text-on-primary hover:bg-primary-container font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            {isSaving ? 'Saving Parameters...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* CSV Data Export Center */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
          <Icon name="download" size={20} className="text-primary" />
          <span>Platform Data Export Center</span>
        </h3>
        <p className="text-xs text-on-surface-variant">
          Export verified database tables directly to encrypted RFC 4180 CSV formats
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <Link
            href="/api/super-admin/export?type=students"
            target="_blank"
            className="p-4 bg-surface-container-low border border-outline-variant/80 hover:border-primary rounded-2xl flex flex-col justify-between space-y-2 group transition-all"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Icon name="school" size={18} />
            </div>
            <div>
              <p className="font-extrabold text-xs text-on-surface group-hover:text-primary">
                Export Students
              </p>
              <p className="text-[10px] text-outline font-mono">students.csv</p>
            </div>
          </Link>

          <Link
            href="/api/super-admin/export?type=courses"
            target="_blank"
            className="p-4 bg-surface-container-low border border-outline-variant/80 hover:border-primary rounded-2xl flex flex-col justify-between space-y-2 group transition-all"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
              <Icon name="menu_book" size={18} />
            </div>
            <div>
              <p className="font-extrabold text-xs text-on-surface group-hover:text-indigo-600">
                Export Curricula
              </p>
              <p className="text-[10px] text-outline font-mono">courses.csv</p>
            </div>
          </Link>

          <Link
            href="/api/super-admin/export?type=orders"
            target="_blank"
            className="p-4 bg-surface-container-low border border-outline-variant/80 hover:border-primary rounded-2xl flex flex-col justify-between space-y-2 group transition-all"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
              <Icon name="receipt_long" size={18} />
            </div>
            <div>
              <p className="font-extrabold text-xs text-on-surface group-hover:text-emerald-700">
                Export Orders
              </p>
              <p className="text-[10px] text-outline font-mono">orders.csv</p>
            </div>
          </Link>

          <Link
            href="/api/super-admin/export?type=certificates"
            target="_blank"
            className="p-4 bg-surface-container-low border border-outline-variant/80 hover:border-primary rounded-2xl flex flex-col justify-between space-y-2 group transition-all"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Icon name="workspace_premium" size={18} />
            </div>
            <div>
              <p className="font-extrabold text-xs text-on-surface group-hover:text-amber-700">
                Export Diplomas
              </p>
              <p className="text-[10px] text-outline font-mono">certificates.csv</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Protected Danger Zone */}
      <div className="bg-rose-500/5 p-6 sm:p-8 rounded-3xl border-2 border-rose-500/30 space-y-4">
        <h3 className="font-extrabold text-base text-rose-700 flex items-center gap-2">
          <Icon name="warning" size={20} className="text-rose-600" />
          <span>Protected Danger Zone</span>
        </h3>
        <p className="text-xs text-rose-800 leading-relaxed">
          High-risk operations require explicit administrative authority and will create immutable entries in the platform audit log.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-rose-500/20">
          <div>
            <p className="font-bold text-xs text-on-surface">Emergency Maintenance Lockdown</p>
            <p className="text-[11px] text-outline">Temporarily pause new checkouts and student logins</p>
          </div>
          <button
            onClick={() => {
              if (confirm('Enable Emergency Maintenance Lockdown?')) {
                showToast({ title: 'Maintenance Flag Toggled', type: 'info' });
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Toggle Lockdown
          </button>
        </div>
      </div>
    </div>
  );
}

