'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function StudentSettingsPage() {
  const router = useRouter();
  const { showToast, logout } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const [preferences, setPreferences] = useState<any>({
    emailCourseUpdates: true,
    emailPayments: true,
    emailCertificates: true,
    emailPromotions: true,
    emailSecurityAlerts: true,
    inAppLearning: true,
    inAppPayments: true,
    inAppOffers: true,
    inAppSupport: true
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  useEffect(() => {
    fetch('/api/auth/notification-preferences')
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data?.preferences) {
          setPreferences(data.preferences);
        }
      })
      .catch(() => {});
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast({ title: 'Error', description: 'New passwords do not match.', type: 'error' });
      return;
    }

    if (newPassword.length < 8) {
      showToast({ title: 'Weak Password', description: 'Password must be at least 8 characters long.', type: 'error' });
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      showToast({ title: 'Password Changed!', description: 'Your password was updated securely.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsChanging(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const res = await fetch('/api/auth/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save preferences');

      showToast({ title: 'Preferences Saved', description: 'Notification settings updated.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (
      !confirm(
        'Are you sure you want to log out of all devices? You will be signed out everywhere including this session.'
      )
    )
      return;

    setIsLoggingOutAll(true);
    try {
      const res = await fetch('/api/auth/logout-all', { method: 'POST' });
      if (res.ok) {
        showToast({ title: 'Logged Out Everywhere', description: 'All active sessions were revoked.', type: 'info' });
        router.push('/login');
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to logout from all devices', type: 'error' });
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Settings</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Account &amp; Security</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage your credentials, multi-device sessions, and notification preferences
          </p>
        </div>
      </div>

      {/* Security & Password */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <div>
          <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
            <Icon name="lock" size={18} className="text-primary" />
            <span>Change Password</span>
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ensure your account is using a long, random password to stay secure
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              New Password (min 8 chars)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isChanging}
            className="px-6 py-2.5 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            {isChanging ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Multi-Device Session Security */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
        <div>
          <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
            <Icon name="devices" size={18} className="text-primary" />
            <span>Active Devices &amp; Session Management</span>
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Revoke all active logins across browsers and devices if you suspect unauthorized access
          </p>
        </div>

        <div className="p-4 bg-surface-container-low rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-outline-variant/60">
          <div>
            <p className="font-bold text-xs text-on-surface">Log Out of All Devices</p>
            <p className="text-[11px] text-outline">
              Invalidates all active session tokens immediately across all computers, tablets, and phones.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogoutAllDevices}
            disabled={isLoggingOutAll}
            className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            {isLoggingOutAll ? 'Revoking Sessions...' : 'Log Out All Devices'}
          </button>
        </div>
      </div>

      {/* Notifications Preferences */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <div>
          <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
            <Icon name="notifications" size={18} className="text-primary" />
            <span>Notification Preferences</span>
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Configure your email and in-app communication channels
          </p>
        </div>

        <div className="space-y-4 divide-y divide-outline-variant/40">
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-bold text-xs text-on-surface">Course Announcements &amp; Lectures</p>
              <p className="text-[11px] text-on-surface-variant">Notify when instructors post new lectures or resources</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailCourseUpdates}
              onChange={(e) => setPreferences({ ...preferences, emailCourseUpdates: e.target.checked })}
              className="w-4 h-4 text-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="font-bold text-xs text-on-surface">Payment &amp; Invoice Receipts</p>
              <p className="text-[11px] text-on-surface-variant">Receive transactional receipts and invoice confirmations</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailPayments}
              onChange={(e) => setPreferences({ ...preferences, emailPayments: e.target.checked })}
              className="w-4 h-4 text-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="font-bold text-xs text-on-surface">Certificate &amp; Diploma Alerts</p>
              <p className="text-[11px] text-on-surface-variant">Email verified certificate download links when earned</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailCertificates}
              onChange={(e) => setPreferences({ ...preferences, emailCertificates: e.target.checked })}
              className="w-4 h-4 text-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="font-bold text-xs text-on-surface">Promotional Offers &amp; Discounts</p>
              <p className="text-[11px] text-on-surface-variant">Receive seasonal coupons and early bird course access</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailPromotions}
              onChange={(e) => setPreferences({ ...preferences, emailPromotions: e.target.checked })}
              className="w-4 h-4 text-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="font-bold text-xs text-on-surface">Security &amp; Login Alerts</p>
              <p className="text-[11px] text-on-surface-variant">Critical security alerts regarding new logins and password updates</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailSecurityAlerts}
              onChange={(e) => setPreferences({ ...preferences, emailSecurityAlerts: e.target.checked })}
              className="w-4 h-4 text-primary rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={isSavingPrefs}
            className="px-6 py-2.5 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            {isSavingPrefs ? 'Saving Preferences...' : 'Save Notification Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
