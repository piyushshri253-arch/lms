'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsProfilePage() {
  const { currentUser, showToast } = useApp();
  const [name, setName] = useState(currentUser?.name || 'Jane Doe');
  const [email] = useState(currentUser?.email || 'learner@company.com');
  const [bio, setBio] = useState('Senior Full-Stack Engineer and active learner in cloud computing.');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast?.({
        title: 'Profile Updated',
        description: 'Your profile changes have been saved.',
        type: 'success'
      });
    }, 500);
  };

  return (
    <LmsLayout activePath={LMS_ROUTES.PROFILE} pageTitle="Learner Profile">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">My Profile</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Learner Profile & Credentials
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage your personal identity, bio, and educational credentials.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center gap-2 self-start sm:self-auto">
            <span>🎓</span>
            <span>Platform: AADHYARA Learning</span>
          </div>
        </div>

        {/* Profile Card & Form */}
        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6 shadow-xl max-w-2xl">
          <div className="flex items-center gap-4 pb-6 border-b border-white/10">
            <div className="w-16 h-16 rounded-3xl bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center text-2xl font-black text-white">
              {name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{name}</h2>
              <p className="text-xs font-mono text-emerald-400">{email}</p>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 mt-1 inline-block">
                Role: Student Learner
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">
                Email Address (Read-Only)
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">
                Biography / Professional Summary
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </LmsLayout>
  );
}
