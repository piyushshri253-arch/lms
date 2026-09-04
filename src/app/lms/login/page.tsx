'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

function LmsLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useApp();

  const [roleType, setRoleType] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [unauthNotice, setUnauthNotice] = useState<string | null>(null);

  useEffect(() => {
    const msg = searchParams.get('msg');
    const unauthorized = searchParams.get('unauthorized');
    if (msg) {
      setUnauthNotice(msg);
    } else if (unauthorized === 'sales_user') {
      setUnauthNotice('You are currently logged into a Sales account. Accessing the LMS requires logging into or creating a separate LMS account.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setUnauthNotice(null);

    try {
      const res = await fetch('/api/lms/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          requestedPortal: roleType === 'ADMIN' ? 'ADMIN' : 'STUDENT'
        })
      });

      const data = await res.json();

      if (res.status === 403 && data.requiresEmailVerification) {
        showToast({
          title: 'Email Verification Required',
          description: 'A 6-digit OTP code has been dispatched to your email.',
          type: 'info'
        });
        router.push(`/verify-email?email=${encodeURIComponent(data.email || email)}&platform=lms`);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Invalid LMS email or password.');
      }

      showToast({
        title: 'Sign In Successful',
        description: `Welcome back to AADHYARA Learning, ${data.user.name}!`,
        type: 'success'
      });

      // Strict redirect into Learning ecosystem
      window.location.href = data.redirectUrl || '/lms/dashboard';
    } catch (err: any) {
      showToast({
        title: 'Sign In Failed',
        description: err.message || 'Please verify your LMS credentials and try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#060814] text-white flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-teal-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-[#0c1024] border border-white/15 rounded-3xl sm:rounded-[32px] shadow-2xl shadow-black/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] relative z-10 backdrop-blur-xl">
        {/* Left Column: Learning Showcase */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="space-y-6 relative z-10">
            {/* Brand Header */}
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-105 transition-transform border border-white/20">
                🎓
              </div>
              <div>
                <span className="font-black text-xl text-white tracking-tight block">
                  AADHYARA
                </span>
                <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider">
                  Learning Platform
                </span>
              </div>
            </Link>

            {/* Value Statement */}
            <div className="space-y-2 pt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 font-mono uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Student &amp; Faculty Portal</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Learn. Master. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-100 to-white">
                  Achieve More.
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Access your masterclasses, video lessons, interactive quizzes, assignments, and verifiable certificates.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-2.5 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>Curated Video Lessons &amp; Resources</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>Accredited Completion Certificates</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>24/7 AI Learning Tutor Copilot</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10">
            <p className="text-xs text-slate-400 italic">
              &ldquo;Transforming knowledge into mastery through interactive education.&rdquo;
            </p>
          </div>
        </div>

        {/* Right Column: LMS Sign In Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-[#0b0e20]">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Welcome to AADHYARA Learning
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in to your learning account.
                </p>
              </div>

              <Link
                href="/login"
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10"
              >
                <Icon name="swap_horiz" size={14} />
                <span>Switch</span>
              </Link>
            </div>

            {/* Unauthorized Notice Banner */}
            {unauthNotice && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <Icon name="info" size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{unauthNotice}</p>
              </div>
            )}

            {/* Role Switcher */}
            <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-1 mb-5">
              {[
                { id: 'STUDENT', label: '🎓 Student' },
                { id: 'INSTRUCTOR', label: '👨‍🏫 Instructor' },
                { id: 'ADMIN', label: '⚙️ LMS Admin' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleType(tab.id as any)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    roleType === tab.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                  Email Address
                </label>
                <div className="relative">
                  <Icon
                    name="mail"
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                    Password
                  </label>
                  <Link
                    href="/lms/forgot-password"
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Icon
                    name="lock"
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium font-mono placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 text-emerald-600 focus:ring-emerald-500 h-4 w-4 bg-white/10 cursor-pointer"
                  />
                  <span>Remember me on this browser</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2 border border-white/20"
              >
                <Icon
                  name={isLoading ? 'sync' : 'login'}
                  size={18}
                  className={isLoading ? 'animate-spin' : ''}
                />
                <span>{isLoading ? 'Authenticating...' : 'Sign In to AADHYARA Learning'}</span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="pt-6 mt-6 border-t border-white/10 text-center text-xs text-slate-400 space-y-2">
            <div>
              <span>New to AADHYARA Learning? </span>
              <Link href="/lms/register" className="text-emerald-400 font-bold hover:underline ml-1">
                Create LMS Student Account &rarr;
              </Link>
            </div>
            <div>
              <span>Looking for business / sales management? </span>
              <Link href="/sales/login" className="text-indigo-400 font-bold hover:underline ml-1">
                Go to AADHYARA Sales &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LmsLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060814] flex items-center justify-center text-white text-xs font-mono">
          Loading AADHYARA Learning Login...
        </div>
      }
    >
      <LmsLoginContent />
    </Suspense>
  );
}
