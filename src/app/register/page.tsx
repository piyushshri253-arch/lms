'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, showToast } = useApp();

  // Step state: 'form' -> 'otp'
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form State
  const queryEmail = searchParams.get('email') || searchParams.get('verifyEmail') || '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState(queryEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState<{ message: string; code?: string } | null>(null);

  // OTP State
  const [otp, setOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(15);
  const [fallbackOtp, setFallbackOtp] = useState<string | null>(null);
  const [showOtpHelper, setShowOtpHelper] = useState(false);

  const isStrictMailProvider = /@(yahoo|ymail|rocketmail|aol|outlook|hotmail|live)\./i.test(email);

  const callbackUrl = searchParams.get('callbackUrl') || '/student/learning';

  // Check if verifyEmail parameter was provided in query string
  useEffect(() => {
    const qEmail = searchParams.get('verifyEmail');
    if (qEmail) {
      setEmail(qEmail);
      setStep('otp');
      setResendCooldown(15);
    }
  }, [searchParams]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer: any;
    if (step === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // Dynamic Password Strength Calculations
  const hasMinLength = password.length >= 8;
  const hasCaps = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const passwordRules = [
    {
      id: 'length',
      label: 'At least 8 characters',
      passed: hasMinLength
    },
    {
      id: 'caps',
      label: 'At least 1 uppercase letter (A-Z)',
      passed: hasCaps
    },
    {
      id: 'number',
      label: 'At least 1 number (0-9)',
      passed: hasNumber
    },
    {
      id: 'symbol',
      label: 'At least 1 symbol or special character (@, $, #, %, etc.)',
      passed: hasSymbol
    }
  ];

  const passedChecksCount = passwordRules.filter((r) => r.passed).length;

  // Handle Step 1: Initial Registration & OTP Generation
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast({ title: 'Name Required', description: 'Please enter your full name.', type: 'error' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast({ title: 'Invalid Email', description: 'Please enter a valid email address.', type: 'error' });
      return;
    }
    if (!hasMinLength || !hasCaps || !hasNumber || !hasSymbol) {
      showToast({
        title: 'Password Incomplete',
        description: 'Password must be at least 8 characters long and include at least 1 Caps, 1 number and 1 symbol.',
        type: 'error'
      });
      return;
    }
    if (!acceptedTerms) {
      showToast({
        title: 'Terms & Privacy Acceptance Required',
        description: 'Please accept the Terms & Conditions and Privacy & Data Protection Policy to sign up.',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    setRegisterError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword: password,
          role: 'STUDENT',
          acceptedTerms: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'ALREADY_REGISTERED' || data.error?.includes('already')) {
          setRegisterError({
            code: 'ALREADY_REGISTERED',
            message: 'This email is already registered. Please log in instead.'
          });
        }
        throw new Error(data.error || 'Registration failed.');
      }

      if (data.fallbackOtp) {
        setFallbackOtp(String(data.fallbackOtp));
      }
      setStep('otp');
      setResendCooldown(15);
      showToast({
        title: 'Verification Code Sent! 📩',
        description: `We've sent a 6-digit code to ${email.trim().toLowerCase()}. Check your inbox (and Spam folder).`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Registration Failed',
        description: err.message || 'An error occurred during registration.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: OTP Verification & Auto-login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, '');

    if (cleanOtp.length !== 6) {
      showToast({
        title: 'Invalid Code',
        description: 'Please enter the complete 6-digit verification code.',
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
          otp: cleanOtp
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please check your code.');
      }

      // Refresh authentication state in app context
      await refreshUser();

      showToast({
        title: 'Email Verified! 🎉',
        description: 'Welcome to Morena Teach! Your account is active.',
        type: 'success'
      });

      router.push(callbackUrl);
    } catch (err: any) {
      showToast({
        title: 'Verification Failed',
        description: err.message || 'Invalid or expired code. Please try again.',
        type: 'error'
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResendingOtp) return;
    setIsResendingOtp(true);

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      if (data.fallbackOtp) {
        setFallbackOtp(String(data.fallbackOtp));
        setShowOtpHelper(true);
      }
      setResendCooldown(15);
      setOtp('');
      showToast({
        title: 'Code Resent! 📩',
        description: 'A new 6-digit verification code has been sent to your inbox.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Resend Failed',
        description: err.message || 'Could not resend code. Please wait a moment.',
        type: 'error'
      });
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col font-sans antialiased">
      <UdemyNavbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 py-12">
        <div className="w-full max-w-[420px] space-y-6">
          {step === 'form' ? (
            <>
              {/* Step 1: Form Header */}
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#1c1d1f] tracking-tight">
                  Sign up and start learning
                </h1>
                <p className="text-xs text-[#6a6f73]">
                  Join thousands of teachers and learners advancing their professional skills.
                </p>
              </div>

              {/* Inline Already Registered Alert */}
              {registerError && (
                <div className="p-4 rounded-md border border-purple-200 bg-purple-50 text-purple-950 text-sm animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <Icon name="info" size={20} className="mt-0.5 shrink-0 text-[#5624d0]" />
                    <div className="flex-1 space-y-2">
                      <p className="font-semibold text-xs leading-relaxed">{registerError.message}</p>
                      <div>
                        <Link
                          href={`/login?email=${encodeURIComponent(email.trim().toLowerCase())}${
                            callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ''
                          }`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5624d0] hover:bg-[#401b9c] text-white text-xs font-bold rounded shadow-xs transition-colors"
                        >
                          <span>Log in to Morena Teach</span>
                          <Icon name="arrow_forward" size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters, 1 Caps, 1 number & 1 symbol (e.g. Pass@123)"
                      className="w-full h-11 pl-3 pr-10 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>

                  {/* Password strength checklist with dynamic tick marks */}
                  <div className="mt-2.5 p-3 bg-[#f7f9fa] border border-[#d1d7dc] rounded-[4px] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-[#2d2f31]">Password Requirements:</span>
                      <span className={passedChecksCount === passwordRules.length ? 'text-emerald-600 font-extrabold' : 'text-[#6a6f73]'}>
                        {passedChecksCount} of {passwordRules.length} completed
                      </span>
                    </div>

                    {/* Visual progress indicator */}
                    <div className="flex gap-1.5 h-1.5 w-full rounded-full overflow-hidden bg-gray-200">
                      <div
                        className={`flex-1 transition-all duration-300 ${
                          passedChecksCount >= 1 ? 'bg-amber-500' : 'bg-gray-200'
                        }`}
                      />
                      <div
                        className={`flex-1 transition-all duration-300 ${
                          passedChecksCount >= 2 ? 'bg-amber-400' : 'bg-gray-200'
                        }`}
                      />
                      <div
                        className={`flex-1 transition-all duration-300 ${
                          passedChecksCount >= 3 ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                      />
                      <div
                        className={`flex-1 transition-all duration-300 ${
                          passedChecksCount >= 4 ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}
                      />
                    </div>

                    {/* Real-time Checklist with tick tick animation */}
                    <div className="space-y-1.5 pt-0.5">
                      {passwordRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`flex items-center gap-2 text-xs transition-all duration-200 ${
                            rule.passed
                              ? 'text-emerald-700 font-bold'
                              : 'text-[#6a6f73] font-normal'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                              rule.passed
                                ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                : 'border border-gray-300 bg-white text-transparent'
                            }`}
                          >
                            <Icon name="check" size={12} className="stroke-[3]" />
                          </span>
                          <span>{rule.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Mandatory Terms & Privacy Policy Acceptance Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-md bg-slate-50 border border-[#d1d7dc] hover:border-[#a435f0]/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#a435f0] focus:ring-[#a435f0] cursor-pointer shrink-0 accent-[#a435f0]"
                        required
                      />
                      <span className="text-xs text-[#2d2f31] leading-relaxed">
                        I have read and agree to the Morena Teach{' '}
                        <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-[#5022c3] hover:underline"
                        >
                          Terms &amp; Conditions
                        </Link>{' '}
                        and{' '}
                        <Link
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-[#5022c3] hover:underline"
                        >
                          Privacy &amp; Data Protection Policy
                        </Link>
                        . <span className="text-red-500 font-bold">*</span>
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !acceptedTerms}
                  className="w-full h-12 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-sm rounded-[2px] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <span>Create Account &amp; Send OTP</span>
                  )}
                </button>
              </form>

              {/* Footer Note */}
              <div className="pt-4 border-t border-[#d1d7dc] text-center text-xs text-[#6a6f73] space-y-2">
                <p>
                  Already have an account?{' '}
                  <Link
                    href={`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                    className="text-[#5022c3] font-bold hover:underline ml-1"
                  >
                    Log in
                  </Link>
                </p>
                <p className="text-[11px] text-gray-500 leading-normal">
                  View our{' '}
                  <Link href="/terms" target="_blank" className="text-[#5022c3] font-semibold hover:underline">
                    Terms &amp; Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-[#5022c3] font-semibold hover:underline">
                    Privacy &amp; Data Protection Policy
                  </Link>
                  .
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: OTP Verification Screen */}
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-purple-50 text-[#a435f0] rounded-full flex items-center justify-center mx-auto border border-purple-100 shadow-xs">
                  <Icon name="mail" size={28} />
                </div>
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#1c1d1f] tracking-tight">
                    Verify Your Email
                  </h1>
                  <p className="text-xs text-[#6a6f73] leading-relaxed">
                    We have sent a 6-digit verification code to:
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-[#1c1d1f] mt-1 border border-gray-200">
                    <Icon name="email" size={14} className="text-[#a435f0]" />
                    <span>{email}</span>
                  </div>
                </div>
              </div>

              {fallbackOtp && (isStrictMailProvider || showOtpHelper) && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                  <div className="font-bold flex items-center justify-between">
                    <span>📧 Yahoo / Strict Mail Delivery Helper</span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase">
                      Instant OTP
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Yahoo Mail may route custom-domain verification emails into your <strong>Spam / Bulk</strong> folder or delay them by 2–5 minutes. Use your instant code below:
                  </p>
                  <div className="flex items-center justify-between p-2 rounded bg-white border border-amber-300">
                    <span className="font-mono text-base font-black tracking-[0.25em] text-[#5022c3] pl-2">
                      {fallbackOtp}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtp(fallbackOtp)}
                      className="px-3 py-1 rounded bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-[11px] cursor-pointer"
                    >
                      Auto-Fill OTP
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-2 text-center uppercase tracking-wider">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    className="w-full h-14 text-center font-mono text-2xl tracking-[0.5em] font-black border-2 border-[#2d2f31] rounded-lg focus:outline-none focus:border-[#a435f0] focus:ring-2 focus:ring-purple-100 bg-white"
                  />
                  <p className="text-[11px] text-center text-[#6a6f73] mt-2">
                    Code expires in 10 minutes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otp.length !== 6}
                  className="w-full h-12 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifyingOtp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="verified" size={18} />
                      <span>Verify Email &amp; Start Learning</span>
                    </>
                  )}
                </button>

                {/* Resend & Back controls */}
                <div className="flex flex-col items-center gap-3 pt-2 text-xs">
                  <div className="text-[#6a6f73]">
                    Didn't receive the email?{' '}
                    {resendCooldown > 0 ? (
                      <span className="font-semibold text-gray-500">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResendingOtp}
                        className="text-[#a435f0] font-bold hover:underline cursor-pointer ml-1"
                      >
                        {isResendingOtp ? 'Sending...' : 'Resend Code'}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('form');
                      setOtp('');
                    }}
                    className="text-xs text-gray-500 hover:text-[#1c1d1f] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="arrow_back" size={14} />
                    <span>Change email address</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <UdemyFooter />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
