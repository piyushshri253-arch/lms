'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export default function StudentProfilePage() {
  const { currentUser, refreshUser, showToast } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch real profile record from database on mount
  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/profile', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          // If logged-in user is an Admin or Faculty, route them to their role-specific profile
          if (data.user.role === 'ADMIN') {
            window.location.replace('/admin/profile');
            return;
          }
          if (data.user.role === 'SUPER_ADMIN') {
            window.location.replace('/super-admin/profile');
            return;
          }
          if (data.user.role === 'INSTRUCTOR') {
            window.location.replace('/instructor/profile');
            return;
          }

          setName(data.user.name || '');
          setAvatar(data.user.avatar || null);
          setEmail(data.user.email || '');
          setBio(data.user.bio || '');
          setPhone(data.user.phone || '');
          setRole(data.user.role || 'STUDENT');
          setCreatedAt(data.user.createdAt || null);
          return;
        }
      }
      // Fallback to currentUser from context
      if (currentUser) {
        setName(currentUser.name || '');
        setAvatar(currentUser.avatar || null);
        setEmail(currentUser.email || '');
        setBio(currentUser.bio || '');
        setPhone(currentUser.phone || '');
        setRole(currentUser.role || 'STUDENT');
      }
    } catch {
      if (currentUser) {
        setName(currentUser.name || '');
        setAvatar(currentUser.avatar || null);
        setEmail(currentUser.email || '');
        setBio(currentUser.bio || '');
        setPhone(currentUser.phone || '');
        setRole(currentUser.role || 'STUDENT');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  // Handle local file image upload (converts to Base64 data URL)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({ title: 'Invalid File', description: 'Please select a valid PNG, JPEG, or WEBP image.', type: 'error' });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast({ title: 'File Too Large', description: 'Please select an image smaller than 3MB.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatar(result);
      showToast({ title: 'Photo Loaded', description: 'Click "Save Profile" to persist your new picture.', type: 'info' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToast({ title: 'Photo Removed', description: 'Avatar reset to clean empty placeholder. Click Save Profile to apply.', type: 'info' });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, bio, phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      await refreshUser();
      showToast({ title: 'Profile Updated 🎉', description: data.message || 'Your profile has been saved.', type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl animate-pulse">
        <div className="h-24 bg-surface-container-lowest rounded-3xl border border-outline-variant/60" />
        <div className="h-96 bg-surface-container-lowest rounded-3xl border border-outline-variant/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Profile</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Student Profile</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage your personal learning identity, contact info, and profile avatar
          </p>
        </div>

        {createdAt && (
          <div className="text-left sm:text-right text-[11px] text-outline font-mono">
            <span>Student Since: </span>
            <span className="font-bold text-on-surface">
              {new Date(createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* Profile Form Card */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar Showcase & Controls */}
          <div className="p-5 bg-surface-container-low rounded-3xl border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <UserAvatar
                avatar={avatar}
                name={name || 'Student'}
                size="xl"
                shape="rounded"
                className="w-18 h-18 text-2xl font-black border-2 border-outline-variant shadow-md"
              />
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-on-surface">{name || 'Your Name'}</h3>
                <p className="text-xs text-on-surface-variant font-mono">{email}</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-mono">
                    {role || 'STUDENT'}
                  </span>
                  {!avatar ? (
                    <span className="text-[10px] text-outline font-medium">Default Empty Avatar</span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <Icon name="check_circle" size={12} />
                      <span>Custom Photo</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="upload" size={16} />
                <span>Upload Picture</span>
              </button>

              {avatar && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3.5 py-2 bg-error-container/20 text-error hover:bg-error-container/40 border border-error/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="delete" size={16} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Registered Email Address
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs font-mono text-outline cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Direct Avatar URL (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={avatar || ''}
                  onChange={(e) => setAvatar(e.target.value || null)}
                  placeholder="https://... (or use Upload Picture above)"
                  className="w-full bg-surface border border-outline-variant rounded-xl pl-4 pr-10 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
                />
                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-error p-1 transition-colors cursor-pointer"
                    title="Clear avatar"
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Bio &amp; Technical Goals
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell instructors and the community about your technical background and focus areas..."
              className="w-full bg-surface border border-outline-variant rounded-xl p-3.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/40 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Icon name={isSaving ? 'sync' : 'check'} size={16} className={isSaving ? 'animate-spin' : ''} />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
