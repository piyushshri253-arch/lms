'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';

export default function AdminProfilePage() {
  const { currentUser, refreshUser, showToast, logout } = useApp();
  const { activeFacility, facilities, switchFacility, permissions } = useAdmin();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setAvatar(currentUser.avatar || '');
    } else {
      fetch('/api/auth/me')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setName(data.user.name || '');
            setEmail(data.user.email || '');
            setPhone(data.user.phone || '');
            setAvatar(data.user.avatar || '');
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, avatar })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      await refreshUser();
      showToast({ title: 'Profile Updated', description: 'Your administrator profile has been saved.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast({ title: 'Mismatch', description: 'New passwords do not match.', type: 'error' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast({ title: 'Password Changed 🔒', description: 'Your credentials have been securely updated.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('Are you sure you want to log out of all active devices? You will need to sign in again.')) return;
    try {
      await fetch('/api/auth/logout-all', { method: 'POST' });
      showToast({ title: 'Sessions Terminated', description: 'All active sessions invalidated.', type: 'info' });
      await logout();
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Breadcrumb & Header */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Profile &amp; Security</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Administrator Profile
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage your personal administrative identity, company affiliation, and credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 font-mono font-bold text-xs">
            Role: {currentUser?.role || 'ADMIN'}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 font-mono font-bold text-xs">
            {currentUser?.organizationName || 'Company Admin'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile Card & Avatar (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs text-center space-y-4">
            <div className="relative inline-block mx-auto">
              <UserAvatar
                avatar={avatar || currentUser?.avatar}
                name={currentUser?.name || 'Admin'}
                size="2xl"
                className="w-24 h-24 border-4 border-primary/20 shadow-md"
              />
            </div>

            <div>
              <h2 className="text-lg font-black text-on-surface">{currentUser?.name || 'Administrator'}</h2>
              <p className="text-xs text-on-surface-variant font-mono">{currentUser?.email}</p>
              <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-extrabold text-[10px] uppercase">
                {currentUser?.organizationName || 'Company Administrator'}
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/40 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-outline">Assigned Company:</span>
                <span className="font-bold text-on-surface">{currentUser?.organizationName || 'Primary Workspace'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Plan Level:</span>
                <span className="font-bold text-indigo-600 uppercase font-mono">{currentUser?.plan || 'PRO'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Status:</span>
                <span className="font-bold text-emerald-600">ACTIVE</span>
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={handleLogoutAllDevices}
                className="w-full py-2 bg-surface-container hover:bg-error/10 text-error rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Icon name="logout" size={16} />
                <span>Log Out All Other Devices</span>
              </button>
            </div>
          </div>

          {/* Assigned Educational Facilities Card */}
          <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="domain" size={18} className="text-primary" />
                <h3 className="font-extrabold text-xs text-on-surface uppercase tracking-wider">Assigned Facilities</h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-outline">{facilities.length} Assigned</span>
            </div>
            <div className="space-y-2">
              {facilities.map((f) => (
                <div
                  key={f.id}
                  onClick={() => switchFacility(f.id)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    f.id === activeFacility?.id
                      ? 'border-primary bg-primary/10 font-bold text-primary'
                      : 'border-outline-variant hover:bg-surface-container-low text-on-surface'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="truncate">{f.name}</p>
                    <p className="text-[10px] text-outline font-mono">{f.slug}</p>
                  </div>
                  {f.id === activeFacility?.id && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary text-on-primary font-bold shrink-0">
                      ACTIVE
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Permissions Badges & Profile Edit & Password Forms (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Permissions Badges */}
          <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="verified_user" size={20} className="text-emerald-600" />
                <h3 className="text-base font-extrabold text-on-surface">You have access to:</h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
                {permissions.length > 0 ? `${permissions.length} PERMISSIONS GRANTED` : 'ADMIN SCOPE'}
              </span>
            </div>
            <p className="text-xs text-outline">
              Your administrative credentials provide the following cryptographic role and policy capabilities within <strong>{activeFacility?.name}</strong>:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {(permissions.length > 0 ? permissions : [
                'student.view', 'student.create', 'student.edit', 'student.delete', 'student.import', 'student.export',
                'course.view', 'course.create', 'course.edit', 'course.publish', 'course.delete', 'course.archive',
                'content.view', 'content.create', 'content.edit', 'content.delete', 'content.upload',
                'enrollment.view', 'enrollment.create', 'enrollment.edit', 'enrollment.cancel',
                'payment.view', 'payment.export', 'payment.refund',
                'certificate.view', 'certificate.issue', 'certificate.revoke', 'certificate.export',
                'coupon.view', 'coupon.create', 'coupon.edit', 'coupon.delete',
                'report.student', 'report.course', 'report.enrollment', 'report.payment', 'report.learning', 'report.certificate',
                'notification.view', 'notification.send',
                'setting.view', 'setting.edit'
              ]).map((perm) => (
                <span
                  key={perm}
                  className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl border ${
                    perm.includes('publish') || perm.includes('refund')
                      ? 'bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-800'
                      : perm.includes('delete') || perm.includes('cancel') || perm.includes('revoke')
                      ? 'bg-rose-500/10 text-rose-700 border-rose-300 dark:border-rose-800'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/80'
                  }`}
                >
                  ✓ {perm}
                </span>
              ))}
            </div>
          </div>

          {/* Identity Form */}
          <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
            <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <Icon name="badge" size={20} className="text-primary" />
              <span>Personal Details</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">Work Email (Read Only)</label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-xs text-outline font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">Avatar Image URL</label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-sm hover:bg-primary-container transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Icon name={isSaving ? 'sync' : 'save'} size={16} className={isSaving ? 'animate-spin' : ''} />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
            <h3 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <Icon name="lock" size={20} className="text-primary" />
              <span>Change Password</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Icon name={isChangingPassword ? 'sync' : 'lock_reset'} size={16} className={isChangingPassword ? 'animate-spin' : ''} />
                  <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
