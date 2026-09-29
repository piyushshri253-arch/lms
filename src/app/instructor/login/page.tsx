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

  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<{ message: string; code?: string } | null>(null);

  // OTP Verification State
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl =
    !rawCallback || rawCallback === '/instructor' ? '/instructor/dashboard' : rawCallback;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    setAuthError(null);
    try {
      const user = await login(email.trim().toLowerCase(), password, 'INSTRUCTOR');

      if (user.role !== 'INSTRUCTOR') {
        setAuthError({
          code: 'USER_NOT_FOUND',
          message: 'This email is not registered. Please sign up first.'
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

      const code =
        err.code ||
        (err.message?.toLowerCase().includes('auditor') ? 'PENDING_AUDITOR_ONBOARDING' :
        err.message?.toLowerCase().includes('not registered') ? 'USER_NOT_FOUND' : 'INVALID_CREDENTIALS');
      const message =
        code === 'PENDING_AUDITOR_ONBOARDING'
          ? err.message ||
            'Your Instructor application, qualifications & resume are currently under Auditor Review & Interview. Once onboarded by the Auditor, you will receive an email with a Login button.'
          : code === 'USER_NOT_FOUND'
          ? 'This email is not registered as an Instructor. Please sign up for Instructor first.'
          : 'Your email ID or password is wrong. Please enter the correct email and password.';

      setAuthError({ message, code });

      showToast({
        title:
          code === 'PENDING_AUDITOR_ONBOARDING'
            ? 'Pending Auditor Onboarding'
            : code === 'USER_NOT_FOUND'
            ? 'Account Not Found'
            : 'Wrong Email or Password',
        description: message,
        type: code === 'PENDING_AUDITOR_ONBOARDING' ? 'info' : 'error'
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-violet-600 selection:text-white">
      {/* Header */}
      <header className="px-6 py-4 bg-white flex items-center justify-between border-b border-slate-200 shadow-2xs">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-violet-600/20">
            M
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-violet-600 transition-colors">
            Morena Teach <span className="text-violet-600 font-bold text-sm ml-1">Instructor Studio</span>
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
        >
          <Icon name="arrow_back" size={16} />
          <span>Back to Storefront</span>
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-xl">
          {requiresOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 text-violet-600 mx-auto flex items-center justify-center">
                  <Icon name="mark_email_read" size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-900">Verify Your Instructor Email</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We sent a 6-digit verification OTP to{' '}
                  <span className="font-mono font-bold text-violet-700">{email}</span>. Enter it below to verify your email and access the Instructor Studio.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 text-center">
                  6-Digit Verification OTP
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-center font-mono text-2xl font-black tracking-[0.5em] text-violet-700 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-violet-600 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md shadow-violet-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                  className="text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  ← Back to Login
                </button>
                <button
                  type="button"
                  disabled={isResendingOtp}
                  onClick={handleResendOtp}
                  className="text-violet-600 hover:text-violet-700 font-bold cursor-pointer disabled:opacity-50"
                >
                  {isResendingOtp ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-50 text-violet-600 border border-violet-200 mb-3">
                  <Icon name="cast_for_education" size={26} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Instructor Studio Login
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Sign in to manage your curriculum, courses, earnings, and payouts.
                </p>
              </div>

              {authError && (
                <div
                  className={`mb-5 p-4 rounded-xl border text-sm animate-in fade-in duration-200 ${
                    authError.code === 'USER_NOT_FOUND'
                      ? 'bg-purple-50 border-purple-200 text-purple-950'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon
                      name={authError.code === 'USER_NOT_FOUND' ? 'person_add' : 'error'}
                      size={20}
                      className={`mt-0.5 shrink-0 ${
                        authError.code === 'USER_NOT_FOUND' ? 'text-[#5624d0]' : 'text-rose-600'
                      }`}
                    />
                    <div className="flex-1 space-y-2.5">
                      <p className="font-bold text-xs leading-relaxed">{authError.message}</p>
                      {authError.code === 'USER_NOT_FOUND' && (
                        <div>
                          <Link
                            href={`/signup?role=INSTRUCTOR&email=${encodeURIComponent(
                              email.trim().toLowerCase()
                            )}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5624d0] hover:bg-[#401b9c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                          >
                            <span>Sign Up for Instructor</span>
                            <Icon name="arrow_forward" size={14} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Instructor Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="instructor@morenateach.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-bold text-violet-600 hover:text-violet-700"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md shadow-violet-600/20 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
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
          <div className="mt-6 pt-6 border-t border-slate-200 text-center space-y-2.5">
            <Link
              href="/signup?role=INSTRUCTOR"
              className="block w-full py-2.5 px-4 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 font-bold text-xs transition-all"
            >
              ✨ New Instructor? Create Instructor Account →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        &copy; {new Date().getFullYear()} Morena Teach LMS. Authorized educator access only.
      </footer>
    </div>
  );
}

export default function InstructorLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center text-xs font-semibold">
          Loading Instructor Portal...
        </div>
      }
    >
      <InstructorLoginContent />
    </Suspense>
  );
}
