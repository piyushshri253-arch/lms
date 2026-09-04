'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

export default function OrgStudentRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const { showToast } = useApp();

  const [org, setOrg] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchOrgDetails(slug);
    }
  }, [slug]);

  const fetchOrgDetails = async (s: string) => {
    try {
      const settingsRes = await fetch(`/api/settings`);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setOrg(data.organization || { name: `${s.toUpperCase()} Academy` });
      } else {
        setOrg({ name: `${s.toUpperCase()} Academy` });
      }
    } catch {
      setOrg({ name: `${s.toUpperCase()} Academy` });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the Terms of Service to continue.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/org/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.trim().toLowerCase(), password, phone })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      showToast({
        title: 'Account Created',
        description: 'Verification code dispatched to your email.',
        type: 'success'
      });

      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      setError(err.message);
      showToast({ title: 'Registration Error', description: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = org?.primaryColor || '#4f46e5';
  const academyName = org?.name || (slug ? `${slug.charAt(0).toUpperCase() + slug.slice(1)} Academy` : 'Academy Portal');

  // Password strength logic
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return (
    <div className="w-full min-h-screen bg-[#060814] text-white flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
      {/* Subtle Ambient Gradients & Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
      <div
        style={{ background: `radial-gradient(circle, ${primaryColor}30 0%, transparent 70%)` }}
        className="absolute -top-32 -left-32 w-[600px] h-[600px] blur-[150px] rounded-full pointer-events-none"
      />
      <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-purple-600/15 blur-[150px] rounded-full pointer-events-none" />

      {/* Main Dual-Column Split Screen Container */}
      <div className="w-full max-w-5xl bg-[#0c1126]/90 border border-white/15 rounded-3xl sm:rounded-[32px] shadow-2xl shadow-black/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px] relative z-10 backdrop-blur-2xl">
        
        {/* Left Column: Visual Showcase & Brand Value Props */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
          {/* Subtle Ambient Shapes */}
          <div
            style={{ backgroundColor: primaryColor }}
            className="absolute top-0 right-0 w-64 h-64 opacity-20 blur-[90px] pointer-events-none rounded-full"
          />

          <div className="space-y-8 relative z-10">
            {/* Academy Brand Logo */}
            <Link href={`/org/${slug}`} className="inline-flex items-center gap-3 group">
              {org?.logo ? (
                <img src={org.logo} alt={academyName} className="h-11 w-auto object-contain rounded-2xl shadow-lg border border-white/20" />
              ) : (
                <div
                  style={{ backgroundColor: primaryColor }}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-105 transition-transform border border-white/20"
                >
                  {academyName.charAt(0)}
                </div>
              )}
              <div>
                <span className="font-black text-xl text-white tracking-tight block leading-tight">{academyName}</span>
                <span className="text-[11px] text-indigo-300 font-mono">Student Enrollment</span>
              </div>
            </Link>

            {/* Motivational Heading */}
            <div className="space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-indigo-200 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Instant Account Activation</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                Unlock world-class masterclasses and career credentials.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Join thousands of driven students mastering industry skills through structured curriculum and personal mentorship.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
                <div style={{ backgroundColor: `${primaryColor}30` }} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                  <Icon name="auto_stories" size={18} style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Step-by-Step Roadmaps</p>
                  <p className="text-[11px] text-slate-400">Structured lessons with downloadable resources</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
                <div style={{ backgroundColor: `${primaryColor}30` }} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                  <Icon name="verified" size={18} style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Accredited Certificates</p>
                  <p className="text-[11px] text-slate-400">Shareable certificates with unique verification IDs</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
                <div style={{ backgroundColor: `${primaryColor}30` }} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                  <Icon name="forum" size={18} style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Active Peer Community</p>
                  <p className="text-[11px] text-slate-400">Collaborate and solve assignments with peers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof Footer */}
          <div className="pt-8 border-t border-white/10 relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-amber-400 text-xs">
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                <span className="text-white font-bold ml-1 text-xs">4.9/5</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Over 10,000+ graduates</p>
            </div>
            <Link
              href={`/org/${slug}`}
              className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <span>Catalog</span>
              <Icon name="arrow_forward" size={14} />
            </Link>
          </div>
        </div>

        {/* Right Column: Modern Registration Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between relative bg-[#0c1126]/60">
          <div className="space-y-6">
            
            {/* Top Bar Switcher */}
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Create Account</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Fill in your details to start learning with <strong className="text-slate-200">{academyName}</strong>
                </p>
              </div>
              <Link
                href={`/org/${slug}/login`}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
              >
                <span>Sign In</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <Icon name="error" size={16} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Social Sign Up */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => showToast({ title: 'Google Sign-Up', description: 'Redirecting to Google secure sign-up...', type: 'info' })}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all text-xs font-bold text-white cursor-pointer group"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => showToast({ title: 'Apple Sign-Up', description: 'Redirecting to Apple ID registration...', type: 'info' })}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all text-xs font-bold text-white cursor-pointer group"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.65-.79 1.1-1.89.98-2.99-1 .04-2.18.67-2.85 1.46-.59.69-1.11 1.82-.97 2.9 1.11.09 2.19-.58 2.84-1.37z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-white/10" />
              <span className="bg-[#0c1126] px-3 text-[11px] text-slate-400 uppercase tracking-widest font-mono shrink-0">
                or register with email
              </span>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <Icon name="person" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Phone (Optional)
                  </label>
                  <div className="relative">
                    <Icon name="call" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Email Address
                </label>
                <div className="relative">
                  <Icon name="mail" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="learner@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Password
                </label>
                <div className="relative">
                  <Icon name="lock" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={16} />
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          hasMinLength && (hasNumber || hasSpecial) ? 'w-full bg-emerald-500' : hasMinLength ? 'w-2/3 bg-amber-500' : 'w-1/3 bg-rose-500'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {hasMinLength && (hasNumber || hasSpecial) ? 'Strong' : hasMinLength ? 'Moderate' : 'Too Short'}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <label className="inline-flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 rounded-md bg-white/10 border-white/20 text-indigo-600 focus:ring-0 focus:ring-offset-0 mt-0.5"
                  />
                  <span>I agree to the Terms of Service, Honor Code &amp; Privacy Policy.</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: primaryColor }}
                className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-xl hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <Icon name={loading ? 'sync' : 'how_to_reg'} size={18} className={loading ? 'animate-spin' : ''} />
                <span>{loading ? 'Registering Account...' : 'Create Account & Verify Email'}</span>
                {!loading && <Icon name="arrow_forward" size={16} />}
              </button>
            </form>
          </div>

          {/* Footer Callout */}
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <p>
              Already enrolled?{' '}
              <Link href={`/org/${slug}/login`} className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline">
                Sign In to Student Portal
              </Link>
            </p>
            <Link href={`/org/${slug}`} className="text-[11px] font-mono text-slate-500 hover:text-slate-400">
              ← Return to Academy Home
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
