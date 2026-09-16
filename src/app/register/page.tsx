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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // OTP State
  const [otp, setOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  const callbackUrl = searchParams.get('callbackUrl') || '/student/learning';

  // Check if verifyEmail parameter was provided in query string
  useEffect(() => {
    const qEmail = searchParams.get('verifyEmail');
    if (qEmail) {
      setEmail(qEmail);
      setStep('otp');
      setResendCooldown(60);
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
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

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
    if (password.length < 8) {
      showToast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters long and include numbers.',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword: password,
          role: 'STUDENT'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setStep('otp');
      setResendCooldown(60);
      showToast({
        title: 'Verification Code Sent! 📩',
        description: `We've sent a 6-digit code to ${email.trim().toLowerCase()}. Check your inbox.`,
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

      setResendCooldown(60);
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
                      placeholder="Min. 8 characters with numbers"
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

                  {/* Password strength checklist */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1 text-[11px] text-[#6a6f73]">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          name={hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                          size={14}
                          className={hasMinLength ? 'text-emerald-600' : 'text-gray-400'}
                        />
                        <span>At least 8 characters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Icon
                          name={hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                          size={14}
                          className={hasNumber ? 'text-emerald-600' : 'text-gray-400'}
                        />
                        <span>Includes at least 1 number</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-sm rounded-[2px] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
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
                <p className="text-[11px] text-gray-400 leading-normal">
                  By signing up, you agree to our Terms of Service and Privacy Policy.
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
