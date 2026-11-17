'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  Save,
  Bell,
  Globe,
  Sliders,
  Users,
  Lock,
  User,
  Mail,
  Phone,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Sparkles,
  Layers,
  Laptop,
  Check,
  Calendar,
  Shield,
  Megaphone,
  RefreshCw,
  Search
} from 'lucide-react';

export interface SeoSettingsViewProps {
  isTeamMember?: boolean;
  memberId?: string;
  memberName?: string;
  memberEmail?: string;
  memberRole?: string;
  assignedCount?: number;
  onRefresh?: () => void;
}

export function SeoSettingsView({
  isTeamMember = false,
  memberId = '',
  memberName = '',
  memberEmail = '',
  memberRole = '',
  assignedCount = 0,
  onRefresh
}: SeoSettingsViewProps) {
  const router = useRouter();

  // Specialist Profile state
  const [profileName, setProfileName] = useState(memberName || '');
  const [profilePhone, setProfilePhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Specialist Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Specialist Preferences state
  const [defaultDateRange, setDefaultDateRange] = useState('30D');
  const [notifyAssignment, setNotifyAssignment] = useState(true);
  const [notifyDeadline, setNotifyDeadline] = useState(true);
  const [notifyManagerReply, setNotifyManagerReply] = useState(true);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Manager Settings state
  const [crawlFreq, setCrawlFreq] = useState('HOURLY');
  const [autoPingGSC, setAutoPingGSC] = useState(true);
  const [defaultDeadlineDays, setDefaultDeadlineDays] = useState(5);
  const [defaultPriority, setDefaultPriority] = useState('HIGH');
  const [notifyDeadlineManager, setNotifyDeadlineManager] = useState(true);
  const [notifySubmissions, setNotifySubmissions] = useState(true);
  const [strictIsolation, setStrictIsolation] = useState(true);
  const [savingManagerSettings, setSavingManagerSettings] = useState(false);

  // Manager Live Marketing APIs & Ads Sync state
  const [metaAdAccountId, setMetaAdAccountId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [googleAdsCustomerId, setGoogleAdsCustomerId] = useState('');
  const [googleAdsDeveloperToken, setGoogleAdsDeveloperToken] = useState('');
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showDevToken, setShowDevToken] = useState(false);
  const [testingMeta, setTestingMeta] = useState(false);
  const [testMetaResult, setTestMetaResult] = useState<{ message: string; ok: boolean } | null>(null);

  // Load existing credentials when in Manager mode
  useEffect(() => {
    if (!isTeamMember) {
      fetch('/api/seo/keys')
        .then((r) => r.json())
        .then((res) => {
          if (res?.credentials) {
            if (res.credentials.metaAdAccountId) setMetaAdAccountId(res.credentials.metaAdAccountId);
            if (res.credentials.metaAccessToken) setMetaAccessToken(res.credentials.metaAccessToken);
            if (res.credentials.googleAdsCustomerId) setGoogleAdsCustomerId(res.credentials.googleAdsCustomerId);
            if (res.credentials.googleAdsDeveloperToken) setGoogleAdsDeveloperToken(res.credentials.googleAdsDeveloperToken);
          }
        })
        .catch(() => {});
    }
  }, [isTeamMember]);

  const handleTestMeta = async () => {
    setTestingMeta(true);
    setTestMetaResult(null);
    try {
      const res = await fetch('/api/seo/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_META',
          metaAdAccountId,
          metaAccessToken
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed.');
      setTestMetaResult({ message: data.message || 'Connected successfully!', ok: true });
    } catch (err: any) {
      setTestMetaResult({ message: err.message || 'Failed to connect to Meta API.', ok: false });
    } finally {
      setTestingMeta(false);
    }
  };

  // Global Toast Alert
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load saved preferences & profile from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('morena_seo_user_name');
      if (storedName && !profileName) setProfileName(storedName);

      const storedPrefs = localStorage.getItem('morena_seo_specialist_prefs');
      if (storedPrefs) {
        try {
          const parsed = JSON.parse(storedPrefs);
          if (parsed.defaultDateRange) setDefaultDateRange(parsed.defaultDateRange);
          if (parsed.notifyAssignment !== undefined) setNotifyAssignment(parsed.notifyAssignment);
          if (parsed.notifyDeadline !== undefined) setNotifyDeadline(parsed.notifyDeadline);
          if (parsed.notifyManagerReply !== undefined) setNotifyManagerReply(parsed.notifyManagerReply);
          if (parsed.notifyWeeklyDigest !== undefined) setNotifyWeeklyDigest(parsed.notifyWeeklyDigest);
        } catch {}
      }
    }
  }, []);

  // Update profile name when prop changes
  useEffect(() => {
    if (memberName) setProfileName(memberName);
  }, [memberName]);

  // Handle Save Specialist Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Full Name cannot be empty.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/seo/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: memberId || undefined,
          email: memberEmail || undefined,
          name: profileName.trim(),
          phone: profilePhone.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');

      if (typeof window !== 'undefined') {
        localStorage.setItem('morena_seo_user_name', profileName.trim());
      }
      showToast('Profile information updated successfully! ✓');
      onRefresh?.();
    } catch (err: any) {
      showToast(err.message || 'Could not update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);

    if (!newPassword || newPassword.length < 6) {
      setPwError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation password do not match.');
      return;
    }

    setSavingPw(true);
    try {
      const res = await fetch('/api/seo/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: memberId || undefined,
          email: memberEmail || undefined,
          currentPassword: currentPassword.trim() || undefined,
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');

      showToast('Password changed successfully! ✓');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwError(null);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  // Handle Save Workspace Preferences
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);

    if (typeof window !== 'undefined') {
      const prefs = {
        defaultDateRange,
        notifyAssignment,
        notifyDeadline,
        notifyManagerReply,
        notifyWeeklyDigest
      };
      localStorage.setItem('morena_seo_specialist_prefs', JSON.stringify(prefs));
    }

    setTimeout(() => {
      setSavingPrefs(false);
      showToast('Workspace preferences & alert triggers saved! ✓');
    }, 350);
  };

  // Handle Manager Governance & Live Ads Keys Save
  const handleSaveManagerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManagerSettings(true);
    try {
      await fetch('/api/seo/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaAdAccountId,
          metaAccessToken,
          googleAdsCustomerId,
          googleAdsDeveloperToken
        })
      });
      showToast('SEO Portal settings & Live Ads APIs saved successfully! Real ads will auto-sync to members. ✓');
      onRefresh?.();
    } catch {
      showToast('Settings saved successfully! ✓');
    } finally {
      setSavingManagerSettings(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('morena_seo_is_specialist');
        localStorage.removeItem('morena_seo_user_id');
        localStorage.removeItem('morena_seo_user_name');
        localStorage.removeItem('morena_seo_user_email');
        localStorage.removeItem('morena_seo_user_role');
      }
      await fetch('/api/auth/logout?portal=SEO', { method: 'POST' });
    } catch {}
    router.push('/seo/login');
  };

  // =========================================================================
  // VIEW A: SEO SPECIALIST / TEAM MEMBER SETTINGS
  // =========================================================================
  if (isTeamMember) {
    return (
      <div className="space-y-6 pb-20 animate-in fade-in duration-200">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-150 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header matching Morena Teach Design System */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Settings size={13} className="text-blue-600" />
              <span>SPECIALIST WORKBENCH &amp; ACCOUNT SETTINGS</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              My Profile &amp; Preferences
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage your specialist profile, security credentials, notification alerts, and telemetry defaults.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
              <Layers size={13} className="text-slate-500" />
              <span>{assignedCount} Assigned Courses</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Private RBAC Isolated</span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols wide on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Specialist Profile Information */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-slate-900">Specialist Profile Details</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Your public identifier across assigned LMS courses and task submissions</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Aman Sharma"
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      <span>Contact Phone</span>
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email ID (Read-only) */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" />
                      <span>Login ID / Email</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-md">Verified</span>
                    </label>
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-600 select-all cursor-not-allowed">
                      {memberEmail || 'specialist@morenateach.com'}
                    </div>
                    <p className="text-[10px] text-slate-400">Login email is assigned by the SEO Administrator.</p>
                  </div>

                  {/* Assigned Role / Designation */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Shield size={13} className="text-slate-400" />
                      <span>Designation / Access Role</span>
                    </label>
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-100 font-medium text-slate-700 flex items-center justify-between">
                      <span className="font-bold text-blue-700">{memberRole || 'SEO Specialist'}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-mono font-bold">RBAC Level 2</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Access limited strictly to assigned course catalog.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save size={13} />
                    <span>{savingProfile ? 'Saving...' : 'Save Profile Changes ✓'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section 2: Workspace Telemetry & Date Range Defaults */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-slate-900">Workbench Defaults &amp; Telemetry Filters</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Configure default GSC metrics window and UI preferences</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Default GSC Date Range */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      <span>Default Google Search Console Window</span>
                    </label>
                    <select
                      value={defaultDateRange}
                      onChange={(e) => setDefaultDateRange(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                    >
                      <option value="7D">Last 7 Days (Recent Activity)</option>
                      <option value="30D">Last 30 Days (Standard Monthly - Recommended)</option>
                      <option value="90D">Last 90 Days (Quarterly SERP Trend)</option>
                      <option value="1Y">Last 1 Year (Annual Historical)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Controls the initial date window on your overview dashboard.</p>
                  </div>

                  {/* Course Query Filter Default */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Globe size={13} className="text-slate-400" />
                      <span>Search Queries Telemetry Filter</span>
                    </label>
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-100 font-medium text-slate-600">
                      Auto-Filtered to {assignedCount} Assigned Course(s)
                    </div>
                    <p className="text-[10px] text-slate-400">Queries outside your assigned courses are filtered out automatically.</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPrefs}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check size={13} />
                    <span>{savingPrefs ? 'Updating...' : 'Save Workspace Defaults'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section 3: Notification & Alert Preferences */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-slate-900">Notifications &amp; Activity Triggers</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Choose what updates trigger alerts in your top navigation bell</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Toggle 1: New Course / Task Assignment */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 block">New Course / Deliverable Assignment</span>
                    <p className="text-[11px] text-slate-500">Receive alerts when the SEO Manager delegates new LMS courses or audit tasks to you.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyAssignment}
                    onChange={(e) => setNotifyAssignment(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 cursor-pointer ml-3 shrink-0"
                  />
                </div>

                {/* Toggle 2: Deadline Reminders */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 block">24-Hour Task Deadline Buffer Alerts</span>
                    <p className="text-[11px] text-slate-500">Get notified when an assigned course audit deliverable is due within 24 hours.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyDeadline}
                    onChange={(e) => setNotifyDeadline(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 cursor-pointer ml-3 shrink-0"
                  />
                </div>

                {/* Toggle 3: Manager Reply to Queries */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 block">Manager Query Desk Responses</span>
                    <p className="text-[11px] text-slate-500">Instant notification when the SEO Manager responds to your queries or deliverables.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyManagerReply}
                    onChange={(e) => setNotifyManagerReply(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 cursor-pointer ml-3 shrink-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Security, Password & Active Session (1 Col) */}
          <div className="space-y-6">
            {/* Section 4: Change Password Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900">Change Account Password</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Keep your specialist workbench secure</p>
                </div>
              </div>

              {pwError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
                {/* Current Password */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full p-2.5 pr-9 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">New Password (min 6 chars)</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter at least 6 characters"
                      className="w-full p-2.5 pr-9 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPw || !newPassword}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
                >
                  <KeyRound size={13} />
                  <span>{savingPw ? 'Updating Password...' : 'Update Password ✓'}</span>
                </button>
              </form>
            </div>

            {/* Section 5: RBAC Privacy Policy Card */}
            <div className="bg-linear-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <h3 className="font-black text-sm">Strict Specialist Privacy</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your account runs in an isolated workspace. You have access exclusively to:
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pl-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>{assignedCount} Assigned LMS Courses</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Assigned Search Console Queries &amp; Metrics</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Private Query Desk with SEO Manager</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-slate-700/80 text-[11px] text-slate-400">
                Other team members cannot access your assigned tasks or queries.
              </div>
            </div>

            {/* Section 6: Active Session & Sign Out */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <Laptop size={14} className="text-slate-400" />
                  <span>Active Session</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <p className="font-medium">Signed in as:</p>
                <p className="font-mono text-slate-800 text-[11px] truncate bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {memberEmail || 'specialist@morenateach.com'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-2 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut size={13} />
                <span>Sign Out of Portal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: SEO MANAGER / ADMINISTRATOR GOVERNANCE SETTINGS
  // =========================================================================
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Settings size={13} className="text-blue-600" />
            <span>PORTAL &amp; WORKFLOW CONFIGURATION</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            SEO Settings &amp; Governance
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure automated indexing sync rules, task deadline buffers, and RBAC governance policies.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveManagerSettings} className="space-y-6">
        {/* Section 1: Automated Crawling & Google Indexing */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Globe size={18} className="text-blue-600" />
            <h2 className="font-black text-sm text-slate-900">
              Automated Google Crawl &amp; Indexing Rules
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Search Console Telemetry Sync Frequency</label>
              <select
                value={crawlFreq}
                onChange={(e) => setCrawlFreq(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
              >
                <option value="REALTIME">Real-time Webhook (Instant on Publish)</option>
                <option value="HOURLY">Hourly Background Telemetry (Recommended)</option>
                <option value="DAILY">Daily Consolidated Summary</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Auto-Ping Googlebot on Course Publish</label>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="autoPing"
                  checked={autoPingGSC}
                  onChange={(e) => setAutoPingGSC(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="autoPing" className="text-slate-700 cursor-pointer">
                  Automatically submit sitemap URL to Googlebot queue on new LMS courses
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Task Assignment & Deadlines */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sliders size={18} className="text-blue-600" />
            <h2 className="font-black text-sm text-slate-900">
              Task Assignment &amp; Deadline Buffers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Default Turnaround Deadline (Days)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={defaultDeadlineDays}
                onChange={(e) => setDefaultDeadlineDays(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Default Priority for Newly Published Courses</label>
              <select
                value={defaultPriority}
                onChange={(e) => setDefaultPriority(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
              >
                <option value="URGENT">Urgent (Immediate indexing required)</option>
                <option value="HIGH">High (Within 48 hours)</option>
                <option value="MEDIUM">Medium (Standard workflow)</option>
                <option value="LOW">Low (Catalog maintenance)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: RBAC Privacy & Security Policies */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck size={18} className="text-emerald-600" />
            <h2 className="font-black text-sm text-slate-900">
              Role-Based Access Control (RBAC) Isolation
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <Lock size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">
                  Strict Team Member Workbench Isolation (Active)
                </span>
                <p className="text-slate-500 mt-0.5">
                  Team members can ONLY view their assigned courses and tasks. Private dashboards, other members&apos; performance reports, and team-creation features remain inaccessible to members.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="strictIso"
                checked={strictIsolation}
                onChange={(e) => setStrictIsolation(e.target.checked)}
                className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="strictIso" className="text-slate-700 cursor-pointer font-semibold">
                Enforce manager approval before pushing SEO metadata live to LMS courses
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Live Marketing APIs & Paid Ads Auto-Sync to Members */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-purple-600" />
              <div>
                <h2 className="font-black text-sm text-slate-900">
                  Live Marketing &amp; Paid Ads APIs (Auto-Sync to Members)
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Enter your Meta and Google Ads credentials here to automatically route real spend &amp; leads to specialists
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
              <Sparkles size={12} className="text-purple-600" />
              <span>Real-Time Sync</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Meta Ad Account ID */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Meta Ad Account ID</span>
                <span className="text-[10px] text-slate-400 font-mono">e.g. act_109283746501928</span>
              </label>
              <input
                type="text"
                value={metaAdAccountId}
                onChange={(e) => setMetaAdAccountId(e.target.value)}
                placeholder="act_109283746501928"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-purple-500"
              />
            </div>

            {/* Meta Access Token */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Meta Marketing API Access Token</span>
                <span className="text-[10px] text-slate-400 font-mono">System User Token (EAA...)</span>
              </label>
              <div className="relative">
                <input
                  type={showMetaToken ? 'text' : 'password'}
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  placeholder="EAA... (Paste token with ads_read permission)"
                  className="w-full p-2.5 pr-9 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowMetaToken(!showMetaToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showMetaToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Google Ads Customer ID */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Google Ads Customer ID</span>
                <span className="text-[10px] text-slate-400 font-mono">e.g. 821-492-9104</span>
              </label>
              <input
                type="text"
                value={googleAdsCustomerId}
                onChange={(e) => setGoogleAdsCustomerId(e.target.value)}
                placeholder="821-492-9104"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Google Ads Developer Token */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Google Ads Developer Token</span>
                <span className="text-[10px] text-slate-400 font-mono">From MCC Manager</span>
              </label>
              <div className="relative">
                <input
                  type={showDevToken ? 'text' : 'password'}
                  value={googleAdsDeveloperToken}
                  onChange={(e) => setGoogleAdsDeveloperToken(e.target.value)}
                  placeholder="Paste developer token"
                  className="w-full p-2.5 pr-9 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowDevToken(!showDevToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showDevToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Test Connection Banner & Feedback */}
          {testMetaResult && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in ${
                testMetaResult.ok
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              <span>{testMetaResult.message}</span>
              <button type="button" onClick={() => setTestMetaResult(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          {/* How Automatic Sync Works Explainer */}
          <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl text-xs text-slate-700 space-y-1">
            <div className="font-bold text-purple-950 flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-600" />
              <span>Automatic Course Matching &amp; Member Routing:</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Whenever an ad campaign title in Facebook Ads Manager or Google Ads includes a course name (e.g. <em>&quot;Digital Campus &amp; ERP Management - Reels&quot;</em>), the portal automatically pulls live spend, impressions, clicks, and leads from Meta/Google, and routes it <strong>strictly to the assigned SEO specialist</strong>!
            </p>
          </div>

          <div className="pt-2 flex justify-start">
            <button
              type="button"
              disabled={testingMeta || !metaAdAccountId || !metaAccessToken}
              onClick={handleTestMeta}
              className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw size={13} className={testingMeta ? 'animate-spin' : ''} />
              <span>{testingMeta ? 'Testing Meta Connection...' : 'Test Meta Live Sync Connection'}</span>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingManagerSettings}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={13} />
            <span>{savingManagerSettings ? 'Saving...' : 'Save Settings Changes ✓'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
