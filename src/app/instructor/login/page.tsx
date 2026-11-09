'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

function InstructorLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, refreshUser, showToast } = useApp();

  const initialEmail = searchParams.get('email') || '';
  const initialMode = searchParams.get('mode') === 'signup' ? true : false;
  const [isSignUp, setIsSignUp] = useState(initialMode);

  // Sign In State
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

  // Sign Up State
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: ''
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

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
          message: 'This email is not registered as an Instructor. Please sign up first.'
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
        (err.message?.toLowerCase().includes('auditor')
          ? 'PENDING_AUDITOR_ONBOARDING'
          : err.message?.toLowerCase().includes('not registered')
          ? 'USER_NOT_FOUND'
          : 'INVALID_CREDENTIALS');
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

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    const cleanFirst = signupForm.firstName.trim();
    const cleanLast = signupForm.lastName.trim();
    const cleanEmail = signupForm.email.trim().toLowerCase();
    const cleanPhone = signupForm.phone.trim();

    if (!cleanFirst || !cleanLast) {
      setSignupError('Please provide your First Name and Last Name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setSignupError('Please provide a valid email address.');
      return;
    }
    if (!cleanPhone) {
      setSignupError('Please provide your mobile number.');
      return;
    }
    if (signupForm.password.length < 8) {
      setSignupError('Password must be at least 8 characters long.');
      return;
    }

    setSignupLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'INSTRUCTOR',
          firstName: cleanFirst,
          lastName: cleanLast,
          name: `${cleanFirst} ${cleanLast}`,
          email: cleanEmail,
          phone: cleanPhone,
          password: signupForm.password,
          acceptedTerms: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Instructor registration failed.');
      }

      showToast({
        title: 'Registration Successful! 📩',
        description: `Verification OTP has been sent to ${cleanEmail}.`,
        type: 'success'
      });

      setEmail(cleanEmail);
      setRequiresOtp(true);
      setIsSignUp(false);
    } catch (err: any) {
      setSignupError(err.message || 'Registration failed.');
      showToast({ title: 'Registration Failed', description: err.message, type: 'error' });
    } finally {
      setSignupLoading(false);
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
    <div className="w-full max-w-4xl mx-auto font-sans px-2 sm:px-4 py-4">
      {/* Mobile Brand Badge */}
      <div className="flex md:hidden flex-col items-center justify-center mb-3">
        <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-md border border-slate-200/80 flex items-center justify-center">
          <img src="/logo.png" alt="Morena Teach" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Mobile Mode Switcher (< md screens) */}
      <div className="flex md:hidden p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm mb-4 max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(false);
            setAuthError(null);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            !isSignUp
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(true);
            setAuthError(null);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isSignUp
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Main Double-Panel Sliding Card (Matches the Instagram Reel UI Design) */}
      <div className="relative w-full min-h-[560px] md:min-h-[580px] bg-white rounded-3xl sm:rounded-[32px] shadow-2xl shadow-indigo-950/10 border border-slate-200/80 overflow-hidden flex flex-col md:block">
        
        {/* ================= PANEL 1: SIGN IN FORM (LEFT HALF) ================= */}
        <div
          className={`w-full md:w-1/2 h-full md:absolute md:top-0 md:left-0 flex flex-col justify-center px-6 sm:px-12 py-8 z-10 transition-all duration-700 ease-in-out ${
            isSignUp
              ? 'hidden md:flex md:opacity-0 md:pointer-events-none md:z-1'
              : 'flex md:opacity-100 md:pointer-events-auto md:z-20'
          }`}
        >
          {requiresOtp ? (
            /* OTP Verification Flow */
            <form onSubmit={handleVerifyOtp} className="space-y-4 max-w-sm mx-auto w-full text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 text-violet-600 mx-auto flex items-center justify-center shadow-xs">
                <Icon name="mark_email_read" size={24} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Verify Your Email</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter the 6-digit OTP code sent to{' '}
                <span className="font-mono font-bold text-violet-700">{email}</span>.
              </p>

              <div>
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
                className="w-full py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-violet-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifyingOtp ? (
                  <span>Verifying OTP...</span>
                ) : (
                  <>
                    <Icon name="verified" size={16} />
                    <span>Verify &amp; Enter Studio</span>
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
            /* Standard Sign In Form */
            <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full text-center">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  Sign In
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Access your Instructor Studio &amp; Courses
                </p>
              </div>

              {/* Social Icons (matches Instagram reel) */}
              <div className="flex items-center justify-center gap-3 py-1">
                <button
                  type="button"
                  className="w-10 h-10 rounded-full border border-slate-300/80 flex items-center justify-center text-slate-700 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer shadow-2xs"
                  title="Sign in with Facebook"
                >
                  <span className="font-bold text-sm">f</span>
                </button>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full border border-slate-300/80 flex items-center justify-center text-slate-700 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer shadow-2xs"
                  title="Sign in with Google"
                >
                  <span className="font-bold text-sm">G</span>
                </button>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full border border-slate-300/80 flex items-center justify-center text-slate-700 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer shadow-2xs"
                  title="Sign in with LinkedIn"
                >
                  <span className="font-bold text-sm">in</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 block -mt-1">
                or use your instructor email account
              </span>

              {authError && (
                <div
                  className={`p-3 rounded-xl border text-xs text-left animate-in fade-in duration-150 ${
                    authError.code === 'USER_NOT_FOUND'
                      ? 'bg-purple-50 border-purple-200 text-purple-950'
                      : authError.code === 'PENDING_AUDITOR_ONBOARDING'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <p className="font-bold leading-relaxed">{authError.message}</p>
                </div>
              )}

              <div className="space-y-3 text-left">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full px-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-slate-500 hover:text-violet-600 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-10 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {isLoading ? <span>Signing In...</span> : <span>SIGN IN</span>}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-center gap-4 text-xs font-semibold text-slate-500">
                <Link href="/reviewer/login" className="text-indigo-600 hover:underline">
                  Auditor Login →
                </Link>
                <span>•</span>
                <Link href="/admin/login" className="text-slate-600 hover:text-slate-900">
                  Admin Portal →
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* ================= PANEL 2: SIGN UP FORM (RIGHT HALF) ================= */}
        <div
          className={`w-full md:w-1/2 h-full md:absolute md:top-0 md:right-0 flex flex-col justify-center px-6 sm:px-12 py-8 z-10 transition-all duration-700 ease-in-out ${
            isSignUp
              ? 'flex md:opacity-100 md:pointer-events-auto md:z-20'
              : 'hidden md:flex md:opacity-0 md:pointer-events-none md:z-1'
          }`}
        >
          <form onSubmit={handleSignupSubmit} className="space-y-3 max-w-sm mx-auto w-full text-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Create Account
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Join Morena Teach as an Instructor
              </p>
            </div>

            {/* Social Icons (matches Instagram reel) */}
            <div className="flex items-center justify-center gap-3 py-1">
              <button
                type="button"
                className="w-10 h-10 rounded-full border border-slate-300/80 flex items-center justify-center text-slate-700 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer shadow-2xs"
                title="Sign up with Facebook"
              >
                <span className="font-bold text-sm">f</span>
              </button>
              <button
                type="button"
                className="w-10 h-10 rounded-full border border-slate-300/80 flex items-center justify-center text-slate-700 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer shadow-2xs"
                title="Sign up with Google"
              >
                <span className="font-bold text-sm">G</span>
              </button>
              <button
                type="button"
                className="w-10 h-10 rounded-full border border-slate-300/80 flex items-center justify-center text-slate-700 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer shadow-2xs"
                title="Sign up with LinkedIn"
              >
                <span className="font-bold text-sm">in</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 block -mt-1">
              or use your email for educator registration
            </span>

            {signupError && (
              <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs text-left">
                <p className="font-bold leading-relaxed">{signupError}</p>
              </div>
            )}

            <div className="space-y-2.5 text-left">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={signupForm.firstName}
                  onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                  placeholder="First Name"
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                />
                <input
                  type="text"
                  required
                  value={signupForm.lastName}
                  onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                  placeholder="Last Name"
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                />
              </div>

              <input
                type="email"
                required
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                placeholder="Email Address"
                className="w-full px-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
              />

              <input
                type="tel"
                required
                value={signupForm.phone}
                onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                placeholder="Mobile Number (+91)"
                className="w-full px-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
              />

              <div className="relative">
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  placeholder="Password (min 8 characters)"
                  className="w-full px-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <Icon name={showSignupPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={signupLoading}
                className="px-10 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {signupLoading ? <span>Creating Account...</span> : <span>SIGN UP</span>}
              </button>
            </div>

            <div className="pt-1">
              <Link
                href="/signup?role=INSTRUCTOR"
                className="text-[11px] text-violet-600 hover:underline font-bold"
              >
                Complete Full 4-Step Application with Resume →
              </Link>
            </div>
          </form>
        </div>

        {/* ================= OVERLAY SLIDING CONTAINER (DESKTOP ONLY) ================= */}
        <div
          className={`hidden md:block absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-30 ${
            isSignUp ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <div
            className={`relative -left-full h-full w-[200%] bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white flex transition-transform duration-700 ease-in-out ${
              isSignUp ? 'translate-x-1/2' : 'translate-x-0'
            }`}
          >
            {/* Left Half of Overlay: Shown when Overlay slides Left (SignUp Mode) */}
            <div className="w-1/2 h-full flex flex-col items-center justify-center px-8 sm:px-12 text-center select-none">
              <div className="w-14 h-14 rounded-2xl bg-white p-2 mb-4 shadow-xl border border-white/40 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Morena Teach Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                Welcome Back!
              </h2>
              <p className="text-xs sm:text-sm text-purple-100 max-w-xs leading-relaxed mb-6">
                To keep connected with your students, please login with your instructor personal info
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setAuthError(null);
                }}
                className="px-10 py-2.5 rounded-full border-2 border-white text-white font-extrabold text-xs uppercase tracking-wider hover:bg-white hover:text-violet-700 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                SIGN IN
              </button>
            </div>

            {/* Right Half of Overlay: Shown when Overlay is on Right (SignIn Mode) */}
            <div className="w-1/2 h-full flex flex-col items-center justify-center px-8 sm:px-12 text-center select-none">
              <div className="w-14 h-14 rounded-2xl bg-white p-2 mb-4 shadow-xl border border-white/40 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Morena Teach Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                Hello, Educator!
              </h2>
              <p className="text-xs sm:text-sm text-purple-100 max-w-xs leading-relaxed mb-6">
                Enter your personal details and start your teaching journey with Morena Teach today
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setAuthError(null);
                }}
                className="px-10 py-2.5 rounded-full border-2 border-white text-white font-extrabold text-xs uppercase tracking-wider hover:bg-white hover:text-violet-700 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                SIGN UP
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function InstructorLoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <UdemyNavbar />
      <main className="flex-1 flex flex-col justify-center py-8 sm:py-14 px-4 sm:px-6 lg:px-8 font-sans">
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center text-slate-600 text-xs font-semibold">
              Loading Instructor Studio...
            </div>
          }
        >
          <InstructorLoginContent />
        </Suspense>
      </main>
      <UdemyFooter />
    </div>
  );
}
