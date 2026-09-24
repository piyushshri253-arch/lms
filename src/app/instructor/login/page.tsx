'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

function InstructorLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, refreshUser, showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // OTP Verification State (if account was created by Admin/SuperAdmin and requires OTP verification)
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/instructor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password, 'INSTRUCTOR');

      if (user.role !== 'INSTRUCTOR') {
        showToast({
          title: 'Instructor Portal Restricted',
          description: 'Only registered instructors can access this portal.',
          type: 'error'
        });
        return;
      }

      showToast({
        title: 'Welcome to Instructor Studio!',
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
        title: 'Authentication Failed',
        description: err.message || 'Invalid instructor credentials.',
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
        title: 'Email Verified! 🎓',
        description: 'Welcome to the Instructor Studio.',
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

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col justify-between font-sans selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-800">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-md">
            M
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-purple-400 transition-colors">
            Morena Teach <span className="text-purple-400 font-semibold text-sm ml-1">Instructor Studio</span>
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Icon name="arrow_back" size={16} />
          <span>Back to Storefront</span>
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
          {requiresOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
                  <Icon name="mark_email_read" size={24} />
                </div>
                <h2 className="text-xl font-black text-white">Verify Your Instructor Email</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We sent a 6-digit verification OTP to{' '}
                  <span className="font-mono font-bold text-purple-400">{email}</span>. Enter it below to verify your email and access the Instructor Studio.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-center">
                  6-Digit Verification OTP
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-center font-mono text-2xl font-black tracking-[0.5em] text-purple-400 placeholder-slate-700 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-lg shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifyingOtp ? (
                  <>
                    <Icon name="sync" size={16} className="animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <Icon name="verified" size={16} />
                    <span>Verify OTP &amp; Enter Studio</span>
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
                  className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer disabled:opacity-50"
                >
                  {isResendingOtp ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-3">
                  <Icon name="cast_for_education" size={26} />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Instructor Studio Login
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Sign in to manage your curriculum, lessons, and students.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Instructor Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="instructor@morenateach.com"
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-lg shadow-lg shadow-purple-900/30 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <span>Sign In to Studio</span>
                      <Icon name="arrow_forward" size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Portal Switcher Footer */}
          <div className="mt-6 pt-6 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Course Auditor?{' '}
              <Link href="/reviewer/login" className="text-emerald-400 hover:underline font-bold">
                Auditor Studio →
              </Link>
            </p>
            <p className="text-xs text-slate-400">
              Are you a Student?{' '}
              <Link href="/login" className="text-purple-400 hover:underline font-bold">
                Student Sign In →
              </Link>
            </p>
            <p className="text-xs text-slate-400">
              Platform Admin?{' '}
              <Link href="/admin/login" className="text-indigo-400 hover:underline font-bold">
                Admin Console →
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-800">
        &copy; {new Date().getFullYear()} Morena Teach LMS. Authorized educator access only.
      </footer>
    </div>
  );
}

export default function InstructorLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">Loading Instructor Portal...</div>}>
      <InstructorLoginContent />
    </Suspense>
  );
}
