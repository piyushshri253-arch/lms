'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import confetti from 'canvas-confetti';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, refreshUser } = useApp();

  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [isResending, setIsResending] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const qEmail = searchParams.get('email');
    const qCode = searchParams.get('code');
    if (qEmail) {
      setEmail(qEmail);
    }
    if (qCode && qCode.length === 6) {
      setDemoCode(qCode);
      const digits = qCode.split('');
      setOtpDigits(digits);
    }
  }, [searchParams]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto-focus first input on load
  useEffect(() => {
    if (!demoCode) {
      inputRefs.current[0]?.focus();
    }
  }, [demoCode]);

  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned && val !== '') return;

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned ? cleaned[cleaned.length - 1] : '';
    setOtpDigits(newDigits);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otp = otpDigits.join('');

    if (otp.length < 6) {
      showToast({
        title: 'Incomplete Code',
        description: 'Please enter all 6 digits of the verification code.',
        type: 'error'
      });
      return;
    }

    if (!email) {
      showToast({
        title: 'Missing Email',
        description: 'Please provide the email address associated with your registration.',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      // Trigger Confetti Celebration
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });

      showToast({
        title: 'Email Verified Successfully! 🎉',
        description: 'Welcome to AADHYARA! Redirecting to your workspace...',
        type: 'success'
      });

      await refreshUser();
      setTimeout(() => {
        router.push(data.redirectUrl || '/lms/dashboard');
      }, 600);
    } catch (err: any) {
      showToast({
        title: 'Verification Failed',
        description: err.message || 'Invalid verification code. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);

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

      if (data.previewOtp) {
        setDemoCode(data.previewOtp);
        const digits = data.previewOtp.split('');
        setOtpDigits(digits);
      }

      showToast({
        title: 'New Code Dispatched',
        description: 'A new 6-digit OTP code has been dispatched to your email.',
        type: 'success'
      });

      setResendCooldown(30);
    } catch (err: any) {
      showToast({
        title: 'Resend Failed',
        description: err.message || 'Could not resend OTP.',
        type: 'error'
      });
    } finally {
      setIsResending(false);
    }
  };

  const autofillCode = (code: string) => {
    const digits = code.split('');
    setOtpDigits(digits);
    showToast({
      title: 'Code Filled',
      description: 'Verification code autofilled! Click verify to proceed.',
      type: 'info'
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#060814] text-white flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden antialiased">
      {/* Background Lighting */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-xl mx-auto relative z-10 space-y-6">
        {/* Main Card */}
        <div className="bg-[#0b0f24] border border-white/15 rounded-3xl sm:rounded-[32px] p-6 sm:p-10 shadow-2xl space-y-6 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-3xl border border-indigo-500/30 shadow-md mb-1">
              <Icon name="mark_email_read" fill size={32} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Verify Your Email Address
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Please enter the 6-digit verification code sent to your email address:
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/10 rounded-full text-xs font-mono font-bold text-indigo-300 shadow-xs">
              <Icon name="mail" size={14} />
              <span>{email || 'your-email@domain.com'}</span>
              <button
                type="button"
                onClick={() => setIsEditingEmail(!isEditingEmail)}
                className="text-slate-400 hover:text-white ml-1 p-0.5 rounded cursor-pointer"
                title="Edit Target Email"
              >
                <Icon name="edit" size={12} />
              </button>
            </div>
          </div>

          {/* Edit Email Popover */}
          {isEditingEmail && (
            <div className="p-3.5 bg-white/[0.04] rounded-2xl space-y-2 border border-white/10 animate-in fade-in duration-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Change Destination Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="flex-1 bg-[#060814] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-indigo-500"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Demo / Live OTP Helper Box */}
          {demoCode && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                  <Icon name="vpn_key" size={16} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                    Verification Code
                  </span>
                  <span className="font-mono text-base font-black text-emerald-300 tracking-widest">
                    {demoCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => autofillCode(demoCode)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Autofill
              </button>
            </div>
          )}

          {/* OTP Input Form */}
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-black font-mono bg-[#070a1a] border-2 border-white/15 rounded-2xl text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-xs"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || otpDigits.join('').length < 6}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Icon
                name={isLoading ? 'sync' : 'verified_user'}
                size={18}
                className={isLoading ? 'animate-spin' : ''}
              />
              <span>{isLoading ? 'Verifying Code...' : 'Verify Email & Enter Workspace'}</span>
            </button>
          </form>

          {/* Resend OTP Bar */}
          <div className="p-4 bg-white/[0.03] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border border-white/10">
            <span className="text-slate-400">Didn&apos;t receive the code?</span>
            {resendCooldown > 0 ? (
              <span className="font-mono font-bold text-slate-500">
                Resend in <strong className="text-indigo-400">{resendCooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className="font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Icon name="refresh" size={14} className={isResending ? 'animate-spin' : ''} />
                <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-white/10 text-center text-xs text-slate-400">
            <Link href="/login" className="text-indigo-400 font-bold hover:underline">
              Return to Login Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#060814] text-white">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </React.Suspense>
  );
}
