'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Password Strength Calculations
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let passedCount = 0;
  if (hasMinLength) passedCount++;
  if (hasUppercase) passedCount++;
  if (hasLowercase) passedCount++;
  if (hasNumber) passedCount++;
  if (hasSpecial) passedCount++;

  let strengthLabel = 'Weak';
  let strengthColor = 'bg-rose-500';
  let strengthPercent = 20;

  if (passedCount >= 5) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
    strengthPercent = 100;
  } else if (passedCount >= 4) {
    strengthLabel = 'Good';
    strengthColor = 'bg-blue-500';
    strengthPercent = 80;
  } else if (passedCount >= 3) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-amber-500';
    strengthPercent = 60;
  } else if (passedCount >= 2) {
    strengthLabel = 'Weak';
    strengthColor = 'bg-rose-500';
    strengthPercent = 40;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      showToast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers.',
        type: 'error'
      });
      return;
    }

    if (password !== confirmPassword) {
      showToast({
        title: 'Password Mismatch',
        description: 'Your password and confirmation password do not match.',
        type: 'error'
      });
      return;
    }

    if (!agreedToTerms) {
      showToast({
        title: 'Terms Required',
        description: 'Please accept the Terms of Service to create your account.',
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
          phone: phone.trim() || undefined,
          password,
          confirmPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      showToast({
        title: 'Account Initialized! 🎉',
        description: 'A 6-digit verification code has been dispatched to your email.',
        type: 'success'
      });

      // Pass previewOtp if available to verify-email
      const targetUrl = `/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}${
        data.previewOtp ? `&code=${encodeURIComponent(data.previewOtp)}` : ''
      }`;
      router.push(targetUrl);
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

  return (
    <div className="min-h-screen w-full bg-surface flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden antialiased selection:bg-primary/20 selection:text-primary">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      {/* Main Luxury Register Split-Screen Container */}
      <div className="w-full max-w-5xl bg-surface-container-lowest border-2 border-outline-variant/80 rounded-3xl sm:rounded-[32px] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        {/* Left Column: Visual Showcase & Benefits (Span 5 on Desktop) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 space-y-6">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                <Icon name="school" fill size={26} />
              </div>
              <div>
                <span className="font-black text-xl text-white tracking-tight block">
                  AADHYARA
                </span>
                <span className="text-[10px] text-indigo-300 font-mono uppercase font-bold tracking-wider">
                  Deep-Tech LMS Platform
                </span>
              </div>
            </Link>

            {/* Headline & Value Proposition */}
            <div className="space-y-3 pt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-indigo-200 font-mono uppercase">
                <Icon name="stars" size={14} className="text-amber-400" />
                <span>Join 12,000+ Engineers</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                Start Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-indigo-100 to-white">
                  Mastery Journey.
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Join ambitious engineers and designers building production-grade software architectures, UI token design systems, and cloud systems.
              </p>
            </div>

            {/* Feature Highlights List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>Direct Access to Production-Ready Capstones</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>Cryptographically Verifiable Diplomas for Resumes</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>Unlimited Lifetime Access with Future Updates</span>
              </div>
            </div>
          </div>

          {/* Bottom Student Outcome Social Proof */}
          <div className="relative z-10 pt-8 mt-8 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                name="Julian Hayes"
                size="sm"
                className="w-9 h-9 border-2 border-primary/50 text-white bg-indigo-900"
              />
              <div>
                <p className="text-xs font-bold text-white leading-tight">Julian Hayes</p>
                <span className="text-[10px] text-indigo-300 font-medium">Principal Systems Engineer @ Datadog</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              &ldquo;The engineering depth and verified diplomas helped me land my principal role. Truly world-class instruction.&rdquo;
            </p>
          </div>
        </div>

        {/* Right Column: Register Form (Span 7 on Desktop) */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-surface-container-lowest">
          <div>
            {/* Top Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/60">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                  Create Student Account 🚀
                </h1>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
                  Enter your details below to initialize your workspace.
                </p>
              </div>

              <Link
                href="/"
                className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/60"
              >
                <Icon name="arrow_back" size={14} />
                <span>Home</span>
              </Link>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                    Full Name
                  </label>
                  <div className="relative">
                    <Icon
                      name="person"
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
                    />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                    Phone (Optional)
                  </label>
                  <div className="relative">
                    <Icon
                      name="phone"
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                  Email Address
                </label>
                <div className="relative">
                  <Icon
                    name="mail"
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                    Password
                  </label>
                  <div className="relative">
                    <Icon
                      name="lock"
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-10 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1 transition-colors cursor-pointer"
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Icon
                      name="lock"
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Real-Time Password Strength Meter */}
              {password.length > 0 && (
                <div className="p-3 bg-surface-container-low rounded-xl space-y-1.5 border border-outline-variant/60 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-outline">Strength:</span>
                    <span className="font-bold uppercase tracking-wider">{strengthLabel}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${strengthPercent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-outline font-mono pt-0.5">
                    <span className={hasMinLength ? 'text-emerald-700 font-bold' : ''}>
                      ✓ 8+ Characters
                    </span>
                    <span className={hasUppercase ? 'text-emerald-700 font-bold' : ''}>
                      ✓ Uppercase Letter
                    </span>
                    <span className={hasLowercase ? 'text-emerald-700 font-bold' : ''}>
                      ✓ Lowercase Letter
                    </span>
                    <span className={hasNumber ? 'text-emerald-700 font-bold' : ''}>
                      ✓ Number Digit
                    </span>
                  </div>
                </div>
              )}

              {/* Terms Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <label htmlFor="terms" className="text-xs text-on-surface-variant cursor-pointer select-none">
                  I agree to the <span className="text-primary font-bold">Terms of Service</span> and{' '}
                  <span className="text-primary font-bold">Privacy Policy</span>.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                <Icon
                  name={isLoading ? 'sync' : 'how_to_reg'}
                  size={18}
                  className={isLoading ? 'animate-spin' : ''}
                />
                <span>{isLoading ? 'Creating Account...' : 'Continue to Email Verification'}</span>
              </button>
            </form>
          </div>

          {/* Footer Link */}
          <div className="pt-6 mt-6 border-t border-outline-variant/60 text-center text-xs text-on-surface-variant">
            <span>Already have an account? </span>
            <Link href="/login" className="text-primary font-bold hover:underline ml-1">
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

