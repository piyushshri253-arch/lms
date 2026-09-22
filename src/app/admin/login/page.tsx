'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';

// Bullet-proof inline SVGs to guarantee zero font dependency, crisp rendering, and no missing glyphs
function SvgShield({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function SvgArrowLeft({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function SvgArrowRight({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function SvgMail({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function SvgLock({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function SvgEye({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function SvgEyeOff({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
      />
    </svg>
  );
}

function SvgBolt({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SvgCheck({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fastLoadingRole, setFastLoadingRole] = useState<string | null>(null);

  const errorParam = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  const handleLoginSubmit = async (loginEmail?: string, loginPassword?: string, roleLabel?: string) => {
    const targetEmail = (loginEmail || email).trim().toLowerCase();
    const targetPassword = loginPassword || password;

    if (!targetEmail || !targetPassword) {
      showToast({
        title: 'Credentials Required',
        description: 'Please enter both administrator email and password.',
        type: 'error'
      });
      return;
    }

    if (roleLabel) {
      setFastLoadingRole(roleLabel);
    } else {
      setIsLoading(true);
    }

    try {
      // Call authentication with requestedPortal: 'ADMIN'
      const user = await login(targetEmail, targetPassword, 'ADMIN');

      // If instructor logs in through admin portal, route them straight to their Instructor Studio
      if (user.role === 'INSTRUCTOR') {
        showToast({
          title: 'Welcome to Instructor Studio! 🎓',
          description: `Logged in as ${user.name}. Redirecting to your dashboard...`,
          type: 'success'
        });
        router.push('/instructor');
        return;
      }

      // Verify that the logged-in user actually possesses an admin role
      const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'];
      if (!adminRoles.includes(user.role)) {
        throw new Error(
          'Access Denied: This account does not possess administrative or faculty permissions.'
        );
      }

      showToast({
        title: 'Authentication Successful',
        description: `Welcome back, ${user.name} (${user.role.replace('_', ' ')}).`,
        type: 'success'
      });

      // Redirect to target admin route or base dashboard
      const target = callbackUrl && callbackUrl.startsWith('/admin') ? callbackUrl : '/admin';
      router.push(target);
      router.refresh();
    } catch (err: any) {
      showToast({
        title: 'Admin Sign-In Failed',
        description: err.message || 'Invalid administrative credentials.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setFastLoadingRole(null);
    }
  };

  const handleQuickFill = (presetEmail: string, presetPass: string, label: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    handleLoginSubmit(presetEmail, presetPass, label);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between selection:bg-[#5022c3] selection:text-white font-sans antialiased">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5022c3] via-[#6366f1] to-[#818cf8] flex items-center justify-center font-black text-xl text-white shadow-md shadow-indigo-500/20">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-slate-900">MORENA TEACH</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-[#5022c3] border border-indigo-200/80">
                Admin Console
              </span>
            </div>
            <p className="text-xs text-slate-500">Enterprise Academic Operations & Management Portal</p>
          </div>
        </div>

        <Link
          href="/"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-2xs"
        >
          <SvgArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Student Storefront</span>
        </Link>
      </header>

      {/* Main Login Shell */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 py-10 relative">
        {/* Subtle Ambient Background Decorative Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-indigo-100/60 via-purple-100/50 to-pink-100/40 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="w-full max-w-[500px] space-y-5">
          {/* Status Alert for Direct Access Denials */}
          {errorParam && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs shadow-xs">
              <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                !
              </div>
              <div>
                <p className="font-bold text-rose-900">Access Restricted</p>
                <p className="mt-0.5 text-rose-700">{errorParam}</p>
              </div>
            </div>
          )}

          {/* Main Card Container */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-200/50 relative">
            {/* Header Title */}
            <div className="space-y-2 mb-6 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#5022c3] text-xs font-bold">
                <SvgShield className="w-3.5 h-3.5 text-[#5022c3]" />
                <span>Authorized Administrative Access</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Sign In to Admin Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Manage academic curriculum, instructors, student rosters, branch facilities, and financial transactions.
              </p>
            </div>

            {/* Quick-Access 1-Click Demo Logins */}
            <div className="mb-6 bg-slate-50 border border-indigo-100/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5022c3] flex items-center gap-1.5">
                  <span className="text-amber-500">
                    <SvgBolt className="w-4 h-4" />
                  </span>
                  Instant 1-Click Demo Login
                </span>
                <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                  Pre-configured
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Dean Admin Button */}
                <button
                  type="button"
                  disabled={isLoading || !!fastLoadingRole}
                  onClick={() => handleQuickFill('admin@morenateach.com', 'admin123', 'admin')}
                  className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 text-left transition-all shadow-2xs group cursor-pointer disabled:opacity-50"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-[#5022c3] flex items-center gap-1">
                      <span>🏛️</span>
                      <span>Dean Admin</span>
                    </p>
                    <p className="text-[11px] text-slate-500">ABC Institute Scope</p>
                  </div>
                  {fastLoadingRole === 'admin' ? (
                    <div className="w-4 h-4 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-slate-400 group-hover:text-[#5022c3] transition-transform group-hover:translate-x-0.5">
                      <SvgArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>

                {/* Super Admin Button */}
                <button
                  type="button"
                  disabled={isLoading || !!fastLoadingRole}
                  onClick={() =>
                    handleQuickFill('superadmin@morenateach.com', 'superadmin123', 'superadmin')
                  }
                  className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 text-left transition-all shadow-2xs group cursor-pointer disabled:opacity-50"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 flex items-center gap-1">
                      <span>👑</span>
                      <span>Super Admin</span>
                    </p>
                    <p className="text-[11px] text-slate-500">Global Full Control</p>
                  </div>
                  {fastLoadingRole === 'superadmin' ? (
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-slate-400 group-hover:text-purple-700 transition-transform group-hover:translate-x-0.5">
                      <SvgArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Form Divider */}
            <div className="relative flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold bg-white px-2">
                Or enter credentials
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Standard Login Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLoginSubmit();
              }}
              className="space-y-4"
            >
              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Administrator Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <SvgMail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@morenateach.com"
                    className="w-full h-12 pl-10 pr-3.5 bg-slate-50/60 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#5022c3] focus:border-[#5022c3] transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <span className="text-[11px] text-indigo-600 bg-indigo-50 font-semibold px-2 py-0.5 rounded border border-indigo-100">
                    Default: admin123
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <SvgLock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-11 bg-slate-50/60 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#5022c3] focus:border-[#5022c3] transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <SvgEyeOff className="w-4 h-4" /> : <SvgEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login Action Button */}
              <button
                type="submit"
                disabled={isLoading || !!fastLoadingRole}
                className="w-full h-12 mt-2 rounded-xl bg-[#5022c3] hover:bg-[#431bb0] text-white font-bold text-sm shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating Privileges...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Admin Console</span>
                    <SvgArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Security Assurance Badges */}
            <div className="pt-5 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                <SvgCheck className="w-3.5 h-3.5 text-emerald-600" />
                256-Bit SSL Encrypted
              </span>
              <span className="text-slate-400">MORENA TEACH v2.6 LMS</span>
            </div>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <p>
          &copy; {new Date().getFullYear()} MORENA TEACH Educational Technologies &bull; Multi-Tenant Academic
          Operations &bull; Strictly Confidential
        </p>
      </footer>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-600">
          <div className="w-8 h-8 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
