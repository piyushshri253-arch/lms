'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [inviteData, setInviteData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.invitation) {
          setInviteData(data.invitation);
        }
      })
      .catch((err) => setError(err.message || 'Failed to verify invitation'))
      .finally(() => setIsFetching(false));
  }, [token]);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation.');
      }

      window.location.href = data.redirectUrl || '/admin';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060814] text-white flex flex-col justify-between antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden font-body-md">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-sm text-white shadow-lg">
            M
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            MORENA LMS <span className="text-xs text-indigo-400 font-mono font-normal">Team Portal</span>
          </span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-md mx-auto px-4 py-12 w-full">
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1126] border border-white/15 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/30">
              <Icon name="mark_email_read" size={24} />
            </div>
            <h1 className="text-2xl font-black text-white">
              Accept Organization Invitation
            </h1>
            <p className="text-xs text-slate-400">
              {isFetching ? (
                'Validating invitation link...'
              ) : inviteData ? (
                <>
                  You have been invited to join{' '}
                  <strong className="text-white">{inviteData.organizationName}</strong> as{' '}
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold uppercase text-[10px]">
                    {inviteData.role}
                  </span>
                </>
              ) : (
                'Please set your name and credentials below to activate your account.'
              )}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <Icon name="error" size={16} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1">Your Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1">
                Invited Email Address (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={inviteData?.email || ''}
                placeholder="colleague@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-slate-400 text-xs font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-200 block mb-1">Create Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={16} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isFetching || !!error}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-xs shadow-xl shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Activating Account...</span>
              ) : (
                <>
                  <span>Accept Invitation &amp; Open Workspace</span>
                  <Icon name="arrow_forward" size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} MORENA LMS SaaS. Isolated Tenant Security.
      </footer>
    </div>
  );
}
