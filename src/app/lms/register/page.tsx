'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

export default function LmsRegisterPage() {
  const router = useRouter();
  const { showToast } = useApp();

  const [role, setRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>('STUDENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast({
        title: 'Name Required',
        description: 'Please enter your full name.',
        type: 'error'
      });
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      showToast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        type: 'error'
      });
      return;
    }

    if (password !== confirmPassword) {
      showToast({
        title: 'Passwords Mismatch',
        description: 'Your passwords do not match. Please re-enter them.',
        type: 'error'
      });
      return;
    }

    if (password.length < 8) {
      showToast({
        title: 'Password Too Short',
        description: 'Password must be at least 8 characters long.',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/lms/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          role,
          phone: phone.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create LMS account.');
      }

      showToast({
        title: 'Account Created',
        description: 'Verification code sent to your email.',
        type: 'success'
      });

      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&platform=lms`);
    } catch (err: any) {
      showToast({
        title: 'Registration Error',
        description: err.message || 'Could not complete registration. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#060814] text-white flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Ambient Glows */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-teal-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-[#0c1024] border border-white/15 rounded-3xl sm:rounded-[32px] shadow-2xl shadow-black/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] relative z-10 backdrop-blur-xl">
        {/* Left Column: Brand Info */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="space-y-6 relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-105 transition-transform border border-white/20">
                🎓
              </div>
              <div>
                <span className="font-black text-xl text-white tracking-tight block">
                  AADHYARA
                </span>
                <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider">
                  Learning Platform
                </span>
              </div>
            </Link>

            <div className="space-y-2 pt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 font-mono uppercase">
                <span>Free Registration</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Create Learning Account.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Join thousands of students and faculty members learning and teaching online.
              </p>
            </div>

            <div className="space-y-2.5 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>Free Student Enrollment in Open Courses</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>Self-Paced Progress Tracking &amp; Streak Metrics</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Icon name="check" size={14} />
                </div>
                <span>Zero Sales/Business Overlap</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10">
            <p className="text-xs text-slate-400 italic">
              &ldquo;Independent student credentials for distraction-free education.&rdquo;
            </p>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-[#0b0e20]">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Create LMS Account
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign up for student or instructor access.
                </p>
              </div>

              <Link
                href="/login"
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10"
              >
                <Icon name="swap_horiz" size={14} />
                <span>Switch</span>
              </Link>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-1 mb-5">
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === 'STUDENT'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setRole('INSTRUCTOR')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === 'INSTRUCTOR'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👨‍🏫 Instructor
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === 'ADMIN'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚙️ LMS Admin
              </button>
            </div>

            {role === 'ADMIN' && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>🏛️</span> Academy / School Administrator
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Creates an LMS Admin with course builder, student roster & certificate controls.
                  </p>
                </div>
                <Link
                  href="/company-signup"
                  className="shrink-0 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 transition-all text-center"
                >
                  Create Academy Workspace →
                </Link>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-200">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono transition-all placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-200">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-3 border border-white/20"
              >
                <Icon
                  name={isLoading ? 'sync' : 'arrow_forward'}
                  size={16}
                  className={isLoading ? 'animate-spin' : ''}
                />
                <span>{isLoading ? 'Creating Account...' : 'Create Learning Account'}</span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="pt-4 mt-4 border-t border-white/10 text-center text-xs text-slate-400 space-y-1.5">
            <div>
              <span>Already have an LMS account? </span>
              <Link href="/lms/login" className="text-emerald-400 font-bold hover:underline ml-1">
                Sign In to Learning &rarr;
              </Link>
            </div>
            <div>
              <span>Want to build a business or sell products? </span>
              <Link href="/sales/register" className="text-indigo-400 font-bold hover:underline ml-1">
                Create Sales Account &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
