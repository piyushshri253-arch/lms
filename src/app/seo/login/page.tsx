'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Lock, Mail, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';

function SeoLoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reason') === 'inactivity') {
        setError('You have been logged out due to inactivity. Please log in again.');
      }
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) return;

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          requestedPortal: 'SEO'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      if (typeof window !== 'undefined' && data.user) {
        const isSpec = data.user.role === 'SEO_SPECIALIST' || data.user.role === 'SEO';
        localStorage.setItem('morena_seo_is_specialist', isSpec ? 'true' : 'false');
        localStorage.setItem('morena_seo_user_id', data.user.id || '');
        localStorage.setItem('morena_seo_user_name', data.user.name || '');
        localStorage.setItem('morena_seo_user_email', data.user.email || '');
        localStorage.setItem('morena_seo_user_role', data.user.role || '');
      }

      window.location.href = data.redirectUrl || '/seo';
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* 1. Official Platform Header */}
      <UdemyNavbar />

      {/* 2. Main White-Themed Login Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 bg-[#f8fafc] relative overflow-hidden">
        {/* Subtle decorative background gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-blue-100/60 via-indigo-50/40 to-sky-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/50 space-y-6 relative z-10">
          {/* Morena Teach Official Brand Logo Header */}
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <Link href="/" className="inline-flex flex-col items-center gap-2 group cursor-pointer">
              <img
                src="/logo.png"
                alt="Morena Teach"
                className="h-16 sm:h-18 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <div className="flex flex-col items-center select-none">
                <span
                  className="text-xl sm:text-2xl font-black tracking-[-0.01em] leading-none"
                  style={{ color: '#183257' }}
                >
                  Morena Teach
                </span>
                <span
                  className="text-xs font-bold tracking-[0.01em] leading-tight mt-1"
                  style={{ color: '#9190b3' }}
                >
                  Teacher Excellence Hub
                </span>
              </div>
            </Link>

            <div className="pt-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                SEO Portal Sign In
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto mt-1">
                Sign in with your specialist account to manage course metadata, PPC ads, and Google Search Console performance.
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold leading-relaxed animate-in fade-in">
              {error}
            </div>
          )}

          {/* Clean Sign In Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Email Address (Login ID)
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="specialist@morenateach.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">
                  Password
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  Provided by SEO Admin
                </span>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to SEO Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Clean Portal Footnote & Main Login Link */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-2.5">
            <p className="text-[11px] text-slate-400">
              Need account access or password reset? Contact your <strong>SEO Lead / Admin</strong>.
            </p>
            <div>
              <Link
                href="/login"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors inline-flex items-center gap-1"
              >
                <span>← Back to Student &amp; Main Login</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Official Platform Footer */}
      <UdemyFooter />
    </div>
  );
}

export default function SeoLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SeoLoginContent />
    </Suspense>
  );
}
