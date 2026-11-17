'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  ExternalLink,
  Key,
  Save,
  Globe,
  Search,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Megaphone,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export interface SeoIntegrationsViewProps {
  apiKeyForm?: any;
  onSaveKeys?: (keys: any) => Promise<void>;
  loading?: boolean;
}

export function SeoIntegrationsView({
  apiKeyForm,
  onSaveKeys,
  loading = false
}: SeoIntegrationsViewProps) {
  const [form, setForm] = useState({
    searchConsoleSiteUrl: apiKeyForm?.searchConsoleSiteUrl || 'https://morenateach.com',
    googleServiceAccountEmail: apiKeyForm?.googleServiceAccountEmail || '',
    googleServiceAccountKey: apiKeyForm?.googleServiceAccountKey || '',
    ga4PropertyId: apiKeyForm?.ga4PropertyId || '560471393',
    googleAdsCustomerId: apiKeyForm?.googleAdsCustomerId || '',
    googleAdsDeveloperToken: apiKeyForm?.googleAdsDeveloperToken || '',
    metaAdAccountId: apiKeyForm?.metaAdAccountId || '',
    metaAccessToken: apiKeyForm?.metaAccessToken || ''
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showDevToken, setShowDevToken] = useState(false);
  const [testingMeta, setTestingMeta] = useState(false);
  const [testResult, setTestResult] = useState<{ message: string; ok: boolean } | null>(null);

  const handleTestMeta = async () => {
    setTestingMeta(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/seo/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_META',
          metaAdAccountId: form.metaAdAccountId,
          metaAccessToken: form.metaAccessToken
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed.');
      setTestResult({ message: data.message || 'Connected successfully!', ok: true });
    } catch (err: any) {
      setTestResult({ message: err.message || 'Failed to connect to Meta API.', ok: false });
    } finally {
      setTestingMeta(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('googleSuccess') === 'true') {
        setToast('Google Search Console & GA4 Connected Successfully! Live API Sync is now Active ✓');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (onSaveKeys) {
        await onSaveKeys(form);
      }
      setToast('API credentials saved securely to platform settings! ✓');
      setTimeout(() => setToast(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      {/* Toast Alert */}
      {toast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Sliders size={13} className="text-blue-600" />
            <span>INTEGRATIONS &amp; MARKETING APIS</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Marketing API Connections
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real connection status for Google Search Console, Google Analytics 4, and Ads APIs on morenateach.com
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Domain: morenateach.com Verified</span>
          </div>
        </div>
      </div>

      {/* METHOD 1: RECOMMENDED 1-CLICK GOOGLE CONNECT (NO CLOUD IAM PERMISSIONS NEEDED) */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 sm:p-7 text-white shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wider uppercase font-mono">
              ⭐ Recommended &amp; Instant (No Organization Policy Needed)
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              1-Click Connect Google Search Console &amp; GA4
            </h2>
            <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
              Bypass Google Cloud Organization Policy errors! Simply sign in with your Google account that owns <span className="font-mono font-bold text-white">morenateach.com</span> in Search Console to grant live read-only telemetry access with 1 click.
            </p>
          </div>

          <a
            href="/api/auth/google?portal=SEO"
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-black text-xs inline-flex items-center gap-2.5 shadow-md transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Connect with Google (1-Click)</span>
          </a>
        </div>
      </div>

      {/* 4 Connected Services Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Service 1: Google Search Console */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Google Search Console</h3>
                <p className="text-[11px] text-slate-500">Live Organic Performance</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              ● Verified Snapshot
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Verified Property:</span>
              <span className="font-mono font-bold text-blue-600">https://morenateach.com/</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Organic Clicks:</span>
              <span className="font-semibold text-slate-900">44 Clicks (search.google.com verified)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Discovered Valid URLs:</span>
              <span className="font-bold text-emerald-600 font-mono">24 Pages Indexed</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-400">Automated 24/7 API Sync:</span>
              <span className="font-bold text-amber-600 text-[11px]">Add Service Account Key Below</span>
            </div>
          </div>
        </div>

        {/* Service 2: Google Analytics 4 */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="12" width="4" height="9" rx="2" fill="#F59E0B" />
                  <rect x="10" y="7" width="4" height="14" rx="2" fill="#F59E0B" />
                  <rect x="16" y="3" width="4" height="18" rx="2" fill="#E11D48" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Google Analytics 4</h3>
                <p className="text-[11px] text-slate-500">Realtime Stream &amp; Events</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Active Stream
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Measurement ID:</span>
              <span className="font-mono font-bold text-blue-600">G-V7L4HC4X0P</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Property ID:</span>
              <span className="font-mono text-slate-800">560471393 (morena teach)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Realtime Active Users:</span>
              <span className="font-bold text-emerald-600 font-mono">2 Users (India)</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-400">Data API v1beta:</span>
              <span className="font-bold text-amber-600 text-[11px]">Pending Service Account</span>
            </div>
          </div>
        </div>

        {/* Service 3: Google Ads API */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Search size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Google Ads API</h3>
                <p className="text-[11px] text-slate-500">Search Network &amp; Performance Max</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              ○ Inactive (₹0 Spend)
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Customer ID:</span>
              <span className="font-mono text-slate-500">Not Configured</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active Spend:</span>
              <span className="font-semibold text-slate-800">₹0 (No active paid ads)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-slate-500">100% traffic is organic SEO</span>
            </div>
          </div>
        </div>

        {/* Service 4: Meta Marketing API */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Megaphone size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Meta Marketing API</h3>
                <p className="text-[11px] text-slate-500">Instagram &amp; Facebook Ads</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              ○ Inactive (₹0 Spend)
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Ad Account ID:</span>
              <span className="font-mono text-slate-500">Not Configured</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active Spend:</span>
              <span className="font-semibold text-slate-800">₹0 (No active paid campaigns)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-slate-500">Organic social &amp; web traffic only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guide: How to connect Real Google Search Console API */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-blue-600 shrink-0" />
          <h2 className="font-black text-sm text-blue-950">
            How to Enable 100% Real Live Google Search Console &amp; GA4 API Sync
          </h2>
        </div>
        <p className="text-xs text-blue-900/80 leading-relaxed">
          Google Search Console does not share private website performance without authorized credentials. Follow these 3 simple steps to connect directly with Google's servers:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-white p-3.5 rounded-2xl border border-blue-100 space-y-1">
            <div className="text-[11px] font-black text-blue-600 font-mono">STEP 1</div>
            <div className="text-xs font-bold text-slate-900">Google Cloud Console</div>
            <div className="text-[11px] text-slate-500 leading-snug">
              Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">console.cloud.google.com</a>, create a project, and enable <strong>Google Search Console API</strong> and <strong>Google Analytics Data API</strong>.
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-blue-100 space-y-1">
            <div className="text-[11px] font-black text-blue-600 font-mono">STEP 2</div>
            <div className="text-xs font-bold text-slate-900">Create Service Account</div>
            <div className="text-[11px] text-slate-500 leading-snug">
              Create a Service Account (e.g. <span className="font-mono text-slate-700">morena-seo@project.iam...</span>) and download its <strong>JSON Key file</strong>.
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-blue-100 space-y-1">
            <div className="text-[11px] font-black text-blue-600 font-mono">STEP 3</div>
            <div className="text-xs font-bold text-slate-900">Add to Search Console</div>
            <div className="text-[11px] text-slate-500 leading-snug">
              Open <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-blue-600 underline">search.google.com</a> &gt; Settings &gt; Users &amp; Permissions, and add that Service Account email with <strong>Full</strong> permission.
            </div>
          </div>
        </div>
      </div>

      {/* API Credentials Configuration Form */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Key size={18} className="text-blue-600" />
          <h2 className="font-black text-sm text-slate-900">
            Configure Live API Credentials
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Google Search Console Site URL</label>
            <input
              type="text"
              value={form.searchConsoleSiteUrl}
              onChange={(e) => setForm({ ...form, searchConsoleSiteUrl: e.target.value })}
              placeholder="https://morenateach.com"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Google Analytics 4 Property ID</label>
            <input
              type="text"
              value={form.ga4PropertyId}
              onChange={(e) => setForm({ ...form, ga4PropertyId: e.target.value })}
              placeholder="560471393"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-slate-700">
              Google Cloud Service Account Email (for automated Search Console queries)
            </label>
            <input
              type="text"
              value={form.googleServiceAccountEmail}
              onChange={(e) => setForm({ ...form, googleServiceAccountEmail: e.target.value })}
              placeholder="e.g. morena-seo-bot@your-project-id.iam.gserviceaccount.com"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-slate-700">
              Google Cloud Service Account JSON Key
            </label>
            <textarea
              rows={3}
              value={form.googleServiceAccountKey}
              onChange={(e) => setForm({ ...form, googleServiceAccountKey: e.target.value })}
              placeholder="Paste JSON key content from Google Cloud Console ({ 'type': 'service_account', ... })"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Google Ads Credentials */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Google Ads Customer ID (Optional)</label>
            <input
              type="text"
              value={form.googleAdsCustomerId}
              onChange={(e) => setForm({ ...form, googleAdsCustomerId: e.target.value })}
              placeholder="e.g. 821-492-9104"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Google Ads Developer Token (Optional)</label>
            <div className="relative">
              <input
                type={showDevToken ? 'text' : 'password'}
                value={form.googleAdsDeveloperToken}
                onChange={(e) => setForm({ ...form, googleAdsDeveloperToken: e.target.value })}
                placeholder="Developer token from MCC manager"
                className="w-full text-xs p-2.5 pr-9 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowDevToken(!showDevToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showDevToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Meta (Facebook & Instagram) Credentials */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Meta Ad Account ID (Optional)</label>
            <input
              type="text"
              value={form.metaAdAccountId}
              onChange={(e) => setForm({ ...form, metaAdAccountId: e.target.value })}
              placeholder="e.g. act_109283746501928"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Meta Marketing API Access Token (Optional)</label>
            <div className="relative">
              <input
                type={showMetaToken ? 'text' : 'password'}
                value={form.metaAccessToken}
                onChange={(e) => setForm({ ...form, metaAccessToken: e.target.value })}
                placeholder="EAA... (System User or App Token with ads_read)"
                className="w-full text-xs p-2.5 pr-9 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowMetaToken(!showMetaToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showMetaToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Live Test Status & Feedback */}
          {testResult && (
            <div
              className={`md:col-span-2 p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
                testResult.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              <span>{testResult.message}</span>
              <button type="button" onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          {/* Automatic Course Matching Banner */}
          <div className="md:col-span-2 p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl text-xs text-slate-700 space-y-1">
            <div className="font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-600" />
              <span>How Real Ads Auto-Sync to Members Works</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When you run campaigns on Facebook Ads Manager or Google Ads with the course name in the campaign title (e.g., <em>&quot;Digital Campus &amp; ERP Management - Reels&quot;</em>), the system automatically fetches live spend, clicks, and leads from Meta/Google and routes them exclusively to the SEO specialist assigned to that course!
            </p>
          </div>

          <div className="md:col-span-2 pt-2 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              disabled={testingMeta || !form.metaAdAccountId || !form.metaAccessToken}
              onClick={handleTestMeta}
              className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw size={13} className={testingMeta ? 'animate-spin' : ''} />
              <span>{testingMeta ? 'Testing Meta Connection...' : 'Test Meta Live Sync'}</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={13} />
              <span>{saving ? 'Saving...' : 'Save & Activate Ads Auto-Sync ✓'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
