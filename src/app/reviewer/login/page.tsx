'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

function ReviewerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/reviewer';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password, 'ADMIN');

      if (user.role !== 'REVIEWER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        showToast({
          title: 'Review Studio Restricted',
          description: 'This portal requires Course Reviewer or Administrative permissions.',
          type: 'error'
        });
        return;
      }

      showToast({
        title: 'Welcome to Course Review Studio!',
        description: `Logged in as ${user.name}.`,
        type: 'success'
      });

      router.push(callbackUrl);
    } catch (err: any) {
      showToast({
        title: 'Sign In Failed',
        description: err.message || 'Invalid reviewer credentials.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('reviewer@morenateach.com');
    setPassword('Reviewer@123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Icon name="verified" size={28} />
          </div>
        </Link>
        <h2 className="text-2xl font-black tracking-tight text-white">
          Course Review Studio
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Sign in to evaluate curriculum, approve quality courses, and publish constructive critique.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl border border-slate-800 rounded-3xl sm:px-10 space-y-6">
          {/* Quick Fill Button */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-200">Demo Reviewer Login</p>
              <p className="text-[11px] text-slate-500">reviewer@morenateach.com</p>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              Fill Credentials
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reviewer Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reviewer@morenateach.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Icon name="sync" size={16} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Icon name="login" size={16} />
                  <span>Enter Review Studio</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
            <p>
              Need an account? Contact your Platform Administrator to appoint you as a Reviewer.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-medium">
              <Link href="/admin/login" className="text-slate-400 hover:text-white transition-colors">
                Admin Portal →
              </Link>
              <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
                Student Login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Loading Review Studio Portal...
        </div>
      }
    >
      <ReviewerLoginContent />
    </Suspense>
  );
}
