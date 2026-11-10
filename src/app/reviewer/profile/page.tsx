'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AuditorPortalShell } from '@/components/reviewer/AuditorPortalShell';
import { Icon } from '@/components/ui/Icon';
import { Camera, Check, Upload, Trash2, ShieldCheck, Mail, Phone, User, Award, ArrowLeft } from 'lucide-react';

export default function ReviewerProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<{
    id?: string;
    name: string;
    email: string;
    phone?: string | null;
    bio?: string | null;
    avatar?: string | null;
    role?: string;
    customRole?: string | null;
  }>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    avatar: null,
    role: 'REVIEWER'
  });

  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc?: string; type: 'success' | 'error' } | null>(null);

  const showToast = (title: string, desc?: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    fetch('/api/reviewer/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.user) {
          setUser({
            id: d.user.id,
            name: d.user.name || '',
            email: d.user.email || '',
            phone: d.user.phone || '',
            bio: d.user.bio || '',
            avatar: d.user.avatar || null,
            role: d.user.role || 'REVIEWER',
            customRole: d.user.customRole || 'Course Reviewer'
          });
          setPreviewAvatar(d.user.avatar || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File Too Large', 'Please select an image smaller than 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreviewAvatar(base64String);
      setUser((prev) => ({ ...prev, avatar: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setPreviewAvatar(null);
    setUser((prev) => ({ ...prev, avatar: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.name.trim()) {
      showToast('Validation Error', 'Full name is required.', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/reviewer/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          avatar: previewAvatar,
          phone: user.phone,
          bio: user.bio
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      showToast('Profile Updated ✅', 'Your avatar and auditor details have been saved.');
      // Dispatch storage or custom event so shells can refresh avatar immediately
      window.dispatchEvent(new Event('reviewer_profile_updated'));
    } catch (err: any) {
      showToast('Save Failed', err.message || 'Server error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initials = (user.name || 'Auditor')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

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
                My Profile &amp; Auditor Credentials
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your public reviewer identity, avatar photo, and verification info.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Certified Auditor</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-xs font-bold text-slate-700">Loading Profile Data...</div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* 1. Profile Avatar Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-blue-600" />
                <span>Auditor Avatar &amp; Photo</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                {/* Avatar Display */}
                <div className="relative group shrink-0 mx-auto sm:mx-0">
                  <div className="w-28 h-28 rounded-3xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                    {previewAvatar ? (
                      <img
                        src={previewAvatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-50 text-blue-600 font-black text-2xl flex items-center justify-center">
                        {initials}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
                    title="Change Photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Upload Action Details */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="text-sm font-bold text-slate-900">Upload Profile Photo</div>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                    Upload a clear professional photo so instructors and admins can recognize you during course evaluations.
                    PNG, JPG, or WebP up to 5MB.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose New Photo</span>
                    </button>

                    {previewAvatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Personal & Contact Information */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-100 pb-3">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Auditor Credentials &amp; Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={user.name}
                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                    placeholder="e.g. Anurag Singh"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Official Email (Read-Only)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full text-xs p-3 pr-8 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={user.phone || ''}
                      onChange={(e) => setUser({ ...user, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full text-xs p-3 pr-8 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Assigned Role &amp; Access Tier
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${user.role} • ${user.customRole || 'Course Reviewer'}`}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Auditor Bio / Evaluation Methodology Summary
                </label>
                <textarea
                  rows={3}
                  value={user.bio || ''}
                  onChange={(e) => setUser({ ...user, bio: e.target.value })}
                  placeholder="Detail your background, pedagogy expertise, and quality verification standards..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/reviewer"
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <span>Saving Changes...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AuditorPortalShell>
  );
}
