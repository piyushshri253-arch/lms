'use client';

import React, { useEffect, useState } from 'react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Lock,
  CheckCircle2,
  XCircle,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function InstructorProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    avatar: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/instructor/profile')
      .then((r) => r.json())
      .then((res) => {
        if (res.profile) {
          setProfile(res.profile);
          setForm((prev) => ({
            ...prev,
            name: res.profile.name || '',
            phone: res.profile.phone || '',
            avatar: res.profile.avatar || '',
            bio: res.profile.bio || '',
            address: res.profile.address || '',
            city: res.profile.city || '',
            state: res.profile.state || '',
            country: res.profile.country || 'India',
            pincode: res.profile.pincode || ''
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const pwChecks = {
    minLength: form.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(form.newPassword),
    lowercase: /[a-z]/.test(form.newPassword),
    number: /[0-9]/.test(form.newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(form.newPassword)
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/instructor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update profile.');
      } else {
        setProfile(data.profile);
        setForm((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        }));
        setSuccess(data.message || 'Profile updated successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <InstructorPortalShell title="My Profile & Account Security">
        <div className="py-24 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      </InstructorPortalShell>
    );
  }

  return (
    <InstructorPortalShell
      title="My Profile & Account Security"
      subtitle="Manage your personal information, complete address, and password security"
      profile={profile}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Personal Info & Security Form */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#0f131d] border border-slate-800/80 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-violet-400" />
                Personal &amp; Contact Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address (Verified)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mobile Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Profile Photo URL
                  </label>
                  <input
                    type="url"
                    value={form.avatar}
                    onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Complete Address
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Security / Password Change */}
            <div
              id="security"
              className="p-6 rounded-2xl bg-[#0f131d] border border-slate-800/80 space-y-4"
            >
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-violet-400" />
                Change Password (Optional)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    placeholder="Abc@12345"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={form.confirmNewPassword}
                    onChange={(e) => setForm({ ...form, confirmNewPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              {form.newPassword && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] pt-1">
                  {[
                    { k: 'minLength', l: '8+ Chars' },
                    { k: 'uppercase', l: '1 Uppercase' },
                    { k: 'lowercase', l: '1 Lowercase' },
                    { k: 'number', l: '1 Number' },
                    { k: 'special', l: '1 Special' }
                  ].map((r) => {
                    const ok = pwChecks[r.k as keyof typeof pwChecks];
                    return (
                      <div
                        key={r.k}
                        className={`flex items-center gap-1 ${
                          ok ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{r.l}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg shadow-violet-600/25"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Profile &amp; Security Settings</span>
            </button>
          </form>
        </div>

        {/* Right: Account Information Summary */}
        <div className="p-6 rounded-2xl bg-[#0f131d] border border-slate-800/80 h-fit space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
              Account Information
            </h2>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400">User ID</div>
              <div className="font-mono text-white mt-0.5 break-all">{profile?.id}</div>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Role</span>
              <span className="font-bold text-violet-400">{profile?.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Account Status</span>
              <span className="font-bold text-emerald-400">{profile?.status}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Email Verification</span>
              <span className="font-bold text-emerald-400">
                {profile?.emailVerified ? 'Verified ✓' : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Welcome Email</span>
              <span className="font-bold text-emerald-400">
                {profile?.welcomeEmailStatus || 'SENT'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Registration Date</span>
              <span className="text-slate-200">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Last Login</span>
              <span className="text-slate-200">
                {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Active Session'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </InstructorPortalShell>
  );
}
