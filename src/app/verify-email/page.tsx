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
  const previewOtpParam = searchParams.get('previewOtp') || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(previewOtpParam ? previewOtpParam.slice(0, 6) : '');
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
        if (data.previewOtp) {
          setOtp(String(data.previewOtp).slice(0, 6));
        }
        setSuccessMsg('A new 6-digit verification code has been sent to your email address.');
      }
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span>MORENA TEACH</span>
          </Link>
          <div className="mt-5 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-400">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-white">Verify Your Email Address</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Enter the 6-digit OTP code sent to{' '}
            <span className="text-white font-semibold">{email || 'your email'}</span> to activate your{' '}
            {initialRole === 'REVIEWER' ? 'Reviewer / Auditor' : 'Instructor'} account.
          </p>
        </div>

        <div className="bg-[#0f131d] border border-slate-800/80 rounded-2xl shadow-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-center text-2xl font-mono font-extrabold tracking-[0.5em] text-violet-300 placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Upon verification, your account will be activated and your official Welcome Email will be sent.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2"
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

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Didn&apos;t receive the code?</span>
            <button
              type="button"
              disabled={countdown > 0 || resending}
              onClick={handleResendOtp}
              className="inline-flex items-center gap-1.5 font-bold text-violet-400 hover:text-violet-300 disabled:text-slate-500"
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
        <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
