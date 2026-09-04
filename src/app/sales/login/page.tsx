'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

function SalesLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useApp();

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
    } else if (unauthorized === 'lms_user') {
      setUnauthNotice('You are currently logged into an LMS account. Accessing Sales requires logging into or creating a separate Sales account.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setUnauthNotice(null);

    try {
      const res = await fetch('/api/sales/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await res.json();

      if (res.status === 403 && data.requiresEmailVerification) {
        showToast({
          title: 'Verification Required',
          description: 'OTP code has been sent to your work email.',
          type: 'info'
        });
        router.push(`/verify-email?email=${encodeURIComponent(data.email || email)}&platform=sales`);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Invalid Sales email or password.');
      }

      showToast({
        title: 'Welcome to AADHYARA Sales',
        description: `Logged into ${data.user.organizationName || 'Sales Command Center'}!`,
        type: 'success'
      });

      // Strict redirect into Sales ecosystem
      window.location.href = data.redirectUrl || '/sales/dashboard';
    } catch (err: any) {
      showToast({
        title: 'Sign In Failed',
        description: err.message || 'Please verify your business credentials and try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#060814] text-white flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-purple-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-[#0c1024] border border-white/15 rounded-3xl sm:rounded-[32px] shadow-2xl shadow-black/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] relative z-10 backdrop-blur-xl">
        {/* Left Column: Sales Brand Showcase */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="space-y-6 relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-105 transition-transform border border-white/20">
                🚀
              </div>
              <div>
                <span className="font-black text-xl text-white tracking-tight block">
                  AADHYARA
                </span>
                <span className="text-[10px] text-indigo-400 font-mono uppercase font-bold tracking-wider">
                  Sales OS
                </span>
              </div>
            </Link>

            <div className="space-y-2 pt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[11px] font-bold text-indigo-300 font-mono uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Business Operating System</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Build. Sell. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-100 to-white">
                  Grow Online.
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Manage your storefront website, digital products, checkout orders, customer leads, and automated marketing.
              </p>
            </div>

            <div className="space-y-2.5 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>Custom Domain &amp; Visual Website Builder</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>1-Click Razorpay &amp; Stripe Checkout</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>AADHYARA AI Business &amp; Marketing Copilot</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10">
            <p className="text-xs text-slate-400 italic">
              &ldquo;Everything required to run a scalable digital commerce and software business.&rdquo;
            </p>
          </div>
        </div>

        {/* Right Column: Sales Sign In Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-[#0b0e20]">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Welcome to AADHYARA Sales
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in to manage your business.
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                  Work Email Address
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
                    placeholder="owner@company.com"
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                    Password
                  </label>
                  <Link
                    href="/sales/forgot-password"
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
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
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium font-mono placeholder:text-slate-500"
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
                    className="rounded border-white/20 text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-white/10 cursor-pointer"
                  />
                  <span>Remember session on this device</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2 border border-white/20"
              >
                <Icon
                  name={isLoading ? 'sync' : 'login'}
                  size={18}
                  className={isLoading ? 'animate-spin' : ''}
                />
                <span>{isLoading ? 'Authenticating...' : 'Sign In to AADHYARA Sales'}</span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="pt-6 mt-6 border-t border-white/10 text-center text-xs text-slate-400 space-y-2">
            <div>
              <span>Don&apos;t have a business workspace? </span>
              <Link href="/sales/register" className="text-indigo-400 font-bold hover:underline ml-1">
                Create Sales Account &rarr;
              </Link>
            </div>
            <div>
              <span>Looking for student courses or learning? </span>
              <Link href="/lms/login" className="text-emerald-400 font-bold hover:underline ml-1">
                Go to AADHYARA Learning &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalesLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060814] flex items-center justify-center text-white text-xs font-mono">
          Loading AADHYARA Sales Login...
        </div>
      }
    >
      <SalesLoginContent />
    </Suspense>
  );
}
