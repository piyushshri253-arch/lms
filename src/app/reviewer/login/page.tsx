'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

function ReviewerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, refreshUser, showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // OTP Verification State (if account was just created by Admin/SuperAdmin and requires OTP verification)
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/reviewer';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password, 'REVIEWER');

      if (user.role !== 'REVIEWER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        showToast({
          title: 'Audit Studio Restricted',
          description: 'This portal requires Course Auditor or Administrative permissions.',
          type: 'error'
        });
        return;
      }

      showToast({
        title: 'Welcome to Course Auditor Studio!',
        description: `Logged in as ${user.name}.`,
        type: 'success'
      });

      router.push(callbackUrl);
    } catch (err: any) {
      if (err.requiresEmailVerification) {
        setRequiresOtp(true);
        showToast({
          title: 'Email Verification Required',
          description: `A 6-digit verification OTP has been sent to ${email.trim().toLowerCase()}.`,
          type: 'info'
        });
        return;
      }

      showToast({
        title: 'Sign In Failed',
        description: err.message || 'Invalid auditor credentials.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      showToast({
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit OTP code sent to your email.',
        type: 'error'
      });
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      showToast({
        title: 'Email Verified! 🎉',
        description: 'Welcome to the Course Auditor Studio.',
        type: 'success'
      });

      await refreshUser();
      router.push(callbackUrl);
    } catch (err: any) {
      showToast({
        title: 'Verification Failed',
        description: err.message || 'Invalid or expired OTP code.',
        type: 'error'
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResendingOtp(true);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resend OTP');

      showToast({
        title: 'OTP Sent!',
        description: data.message || `A fresh 6-digit OTP has been sent to ${email}.`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err.message || 'Failed to resend OTP.',
        type: 'error'
      });
    } finally {
      setIsResendingOtp(false);
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
          Course Auditor Studio
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Sign in to audit curriculum, approve quality courses, and publish constructive feedback.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl border border-slate-800 rounded-3xl sm:px-10 space-y-6">
          {requiresOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                  <Icon name="mark_email_read" size={24} />
                </div>
                <h3 className="text-lg font-bold text-white">Verify Your Auditor Email</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We sent a 6-digit verification OTP to{' '}
                  <span className="font-mono font-bold text-indigo-400">{email}</span>. Enter it below to activate your Course Auditor account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                  6-Digit Verification OTP
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-2xl font-black tracking-[0.5em] text-indigo-400 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifyingOtp ? (
                  <>
                    <Icon name="sync" size={16} className="animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <Icon name="verified" size={16} />
                    <span>Verify OTP &amp; Enter Audit Studio</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRequiresOtp(false);
                    setOtpCode('');
                  }}
                  className="text-slate-400 hover:text-white font-medium cursor-pointer"
                >
                  ← Back to Login
                </button>
                <button
                  type="button"
                  disabled={isResendingOtp}
                  onClick={handleResendOtp}
                  className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer disabled:opacity-50"
                >
                  {isResendingOtp ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Quick Fill Button */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-200">Demo Auditor Login</p>
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
                    Auditor Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="auditor@morenateach.com"
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
                      <span>Enter Audit Studio</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2.5">
            <Link
              href="/auditor/signup?role=REVIEWER"
              className="block w-full py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-bold text-xs transition-all"
            >
              ✨ New Course Auditor or Instructor? Create Account (/auditor/signup) →
            </Link>
            <div className="flex items-center justify-center gap-4 text-xs font-medium">
              <Link href="/login" className="text-indigo-400 hover:text-white transition-colors">
                Unified Login (/login) →
              </Link>
              <Link href="/admin/login" className="text-slate-400 hover:text-white transition-colors">
                Admin Portal →
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
          Loading Course Auditor Studio...
        </div>
      }
    >
      <ReviewerLoginContent />
    </Suspense>
  );
}
