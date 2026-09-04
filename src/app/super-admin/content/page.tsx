'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function SuperAdminContentPage() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState<any>({
    platformName: 'AADHYARA',
    supportEmail: 'support@aadhyara.com',
    contactEmail: 'contact@aadhyara.com',
    heroHeadline: 'Where Great Teaching Inspires Great Learning',
    heroSubheadline: 'Learn system design, product leadership, and engineering architecture from distinguished industry leads.',
    primaryCtaText: 'Explore Masterclasses'
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

      showToast({ title: 'Website Content Saved', description: data.message, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Content</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Website Content &amp; Homepage CMS
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage public landing hero headlines, marketing copy, and brand metadata
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
          <Icon name="web" size={20} className="text-primary" />
          <span>Landing Page Hero Section</span>
        </h3>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Main Hero Headline
            </label>
            <input
              type="text"
              required
              value={settings.heroHeadline || ''}
              onChange={(e) => setSettings({ ...settings, heroHeadline: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Hero Tagline / Sub-headline
            </label>
            <textarea
              rows={3}
              required
              value={settings.heroSubheadline || ''}
              onChange={(e) => setSettings({ ...settings, heroSubheadline: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Primary Button Text
              </label>
              <input
                type="text"
                required
                value={settings.primaryCtaText || ''}
                onChange={(e) => setSettings({ ...settings, primaryCtaText: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
              />
            </div>

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
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant/40 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary text-on-primary hover:bg-primary-container font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            {isSaving ? 'Saving CMS Updates...' : 'Publish Website Content'}
          </button>
        </div>
      </form>
    </div>
  );
}

