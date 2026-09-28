'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles
} from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEmail = searchParams.get('email') || '';
  const initialRole = searchParams.get('role') || 'INSTRUCTOR';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [pendingAuditorScreen, setPendingAuditorScreen] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim()
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid or expired verification code.');
        setLoading(false);
        return;
      }

      if (data.pendingAuditorApproval) {
        setPendingAuditorScreen(true);
        setSuccessMsg(
          data.message ||
            'Email verified! Your Instructor profile, qualifications, experience, and resume have been sent to the Auditor for Interview & Onboarding.'
        );
        setLoading(false);
        return;
      }

      setSuccessMsg(
        'Email verified! Your account is now active and a Welcome Email has been sent to your inbox. Redirecting to your dashboard...'
      );
      setTimeout(() => {
        router.push(data.redirectUrl || '/instructor/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setError('');
    setSuccessMsg('');
    setResending(true);

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not resend verification code.');
      } else {
        setCountdown(60);
        setOtp('');
        setSuccessMsg('A new 6-digit verification code has been sent to your email address.');
      }
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (pendingAuditorScreen) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-white border border-emerald-200 rounded-2xl shadow-xl p-6 sm:p-8 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 mb-2.5">
                ⏳ Submitted for Review
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Submitted for Review
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Your application has been successfully submitted for review.
              </p>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Our team will review your profile, qualifications, experience, and resume and will contact you within{' '}
                <strong className="text-violet-700">24–48 hours</strong> with the next steps.
              </p>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                You will be guided through the verification and instructor onboarding process once your application has been reviewed.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-950 font-semibold">
              📧 We have also sent an official confirmation email to your registered email address{' '}
              {email ? <span className="font-mono font-bold underline">({email})</span> : null}.
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 text-left text-xs text-slate-700 space-y-3">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">
                  What Happens in the Next:
                </div>
                <p className="text-slate-600 mt-1">
                  Thank you for submitting your instructor profile and documents. Here’s what happens next:
                </p>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900">1. Profile &amp; Resume Review</div>
                <p className="text-slate-600 leading-relaxed">
                  Our team will review your profile, educational qualifications, experience, and resume.
                </p>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900">2. Review &amp; Interview Decision</div>
                <p className="text-slate-600 leading-relaxed">
                  Based on the information provided, our team may either:
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                  <li>Approve your profile for direct onboarding, or</li>
                  <li>Invite you for a short interview to learn more about your experience and expertise.</li>
                </ul>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900">3. Instructor Onboarding</div>
                <p className="text-slate-600 leading-relaxed">
                  Once your profile is approved, you will receive an onboarding email with a{' '}
                  <strong className="text-violet-700">Log In to Instructor Portal →</strong> button.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  You can then access the Instructor Portal and start creating and managing your courses.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="w-full py-3.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-violet-600/20 transition-all"
              >
                <span>Back to Home</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-600/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span>MORENA TEACH</span>
          </Link>
          <div className="mt-5 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 border border-violet-200 text-violet-600">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Verify Your Email Address</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Enter the 6-digit OTP code sent to{' '}
            <span className="text-slate-900 font-bold">{email || 'your email'}</span> to verify your{' '}
            {initialRole === 'REVIEWER' ? 'Reviewer / Auditor' : 'Instructor'} application.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-700 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                6-Digit Verification OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-300 text-center text-2xl font-mono font-extrabold tracking-[0.5em] text-violet-700 placeholder-slate-300 focus:outline-none focus:bg-white focus:border-violet-600"
              />
              <p className="text-[11px] text-slate-500 text-center mt-2">
                Upon verification, your account will be activated and your official Welcome Email will be sent.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying &amp; Activating Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Email &amp; Activate Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Didn&apos;t receive the code?</span>
            <button
              type="button"
              disabled={countdown > 0 || resending}
              onClick={handleResendOtp}
              className="inline-flex items-center gap-1.5 font-bold text-violet-600 hover:text-violet-700 disabled:text-slate-400 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
