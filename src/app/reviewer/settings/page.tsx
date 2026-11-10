'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuditorPortalShell } from '@/components/reviewer/AuditorPortalShell';
import { Settings, Shield, Bell, Lock, ArrowLeft, Check, KeyRound } from 'lucide-react';

export default function ReviewerSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc?: string; type: 'success' | 'error' } | null>(null);

  // Security password state
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  // Notification toggles
  const [notifications, setNotifications] = useState({
    emailOnSubmission: true,
    emailOnResubmission: true,
    emailOnInstructorOnboarding: true,
    soundAlerts: false
  });

  const showToast = (title: string, desc?: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.newPassword) {
      showToast('Error', 'Please enter a new password.', 'error');
      return;
    }
    if (passwords.newPassword.length < 6) {
      showToast('Error', 'Password must be at least 6 characters.', 'error');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('Mismatch', 'New passwords do not match.', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/reviewer/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwords.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      showToast('Password Updated ✅', 'Your auditor login password has been changed.');
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Server error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = () => {
    showToast('Preferences Saved ✅', 'Auditor alert preferences updated successfully.');
  };

  return (
    <AuditorPortalShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Toast */}
        {toastMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
              toastMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div>
              <span className="font-bold">{toastMsg.title}</span>
              {toastMsg.desc && <span className="ml-2 font-normal">{toastMsg.desc}</span>}
            </div>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/reviewer"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Auditor Settings &amp; Preferences
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure notification alerts, review queue preferences, and security passwords.
              </p>
            </div>
          </div>
        </div>

        {/* 1. Notification Alert Preferences */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-blue-600" />
            <span>Audit Notification Alerts</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-800">New Course Submissions</div>
                <div className="text-[11px] text-slate-500">Receive alert when an instructor submits a new course (v1.0).</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailOnSubmission}
                onChange={(e) => setNotifications({ ...notifications, emailOnSubmission: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-800">Resubmissions &amp; Major Updates</div>
                <div className="text-[11px] text-slate-500">Receive alert when revised syllabus or major updates are submitted.</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailOnResubmission}
                onChange={(e) => setNotifications({ ...notifications, emailOnResubmission: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <div className="text-xs font-bold text-slate-800">Instructor Onboarding Applications</div>
                <div className="text-[11px] text-slate-500">Notify when new instructor resumes and qualifications need review.</div>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailOnInstructorOnboarding}
                onChange={(e) => setNotifications({ ...notifications, emailOnInstructorOnboarding: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSavePreferences}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Save Alert Preferences
            </button>
          </div>
        </div>

        {/* 2. Security & Password Change */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-100 pb-3">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Auditor Login Password</span>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">New Password</label>
                <input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{saving ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuditorPortalShell>
  );
}
