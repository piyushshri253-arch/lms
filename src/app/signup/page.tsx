'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GraduationCap,
  ShieldCheck,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus
} from 'lucide-react';

function PartnerAuthContent({ defaultRole = 'INSTRUCTOR' }: { defaultRole?: 'INSTRUCTOR' | 'REVIEWER' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('mode') === 'login' ? 'LOGIN' : 'SIGNUP';
  const roleParam = searchParams.get('role')?.toUpperCase();

  const [authMode, setAuthMode] = useState<'SIGNUP' | 'LOGIN'>(initialTab);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<'INSTRUCTOR' | 'REVIEWER'>(
    roleParam === 'REVIEWER' || roleParam === 'AUDITOR' ? 'REVIEWER' : defaultRole
  );

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Live Password Strength & Requirement Checklist
  const pwChecks = {
    minLength: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(form.password)
  };
  const passedChecksCount = Object.values(pwChecks).filter(Boolean).length;
  const isPasswordValid = passedChecksCount === 5;
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;

  const strengthLabel =
    passedChecksCount <= 2
      ? { text: 'Weak', color: 'bg-red-500', textColor: 'text-red-400' }
      : passedChecksCount <= 4
      ? { text: 'Good', color: 'bg-amber-500', textColor: 'text-amber-400' }
      : { text: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400' };

  const validateStep1 = () => {
    setError('');
    if (!form.name.trim()) {
      setError('Please enter your Full Name.');
      return false;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setError('Please enter a valid Email Address.');
      return false;
    }
    const digits = form.phone.replace(/\D/g, '');
    if (!form.phone.trim() || digits.length < 10 || digits.length > 15) {
      setError('Please enter a valid 10–15 digit Mobile Number.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setError('');
    if (!form.address.trim()) {
      setError('Please enter your Complete Address.');
      return false;
    }
    if (!form.city.trim()) {
      setError('Please enter your City.');
      return false;
    }
    if (!form.state.trim()) {
      setError('Please enter your State.');
      return false;
    }
    if (!form.country.trim()) {
      setError('Please enter your Country.');
      return false;
    }
    if (!form.pincode.trim()) {
      setError('Please enter your Pincode / Postal Code.');
      return false;
    }
    return true;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please fulfill all 5 password security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          ...form
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please check your details.');
        setLoading(false);
        return;
      }

      const otpParam = data.previewOtp ? `&previewOtp=${encodeURIComponent(data.previewOtp)}` : '';
      router.push(
        `/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}&role=${role}${otpParam}`
      );
    } catch (err: any) {
      setError(err.message || 'Network error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handlePartnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter your Email Address and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
          requestedPortal: 'PARTNER'
        })
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresEmailVerification) {
          const otpParam = data.previewOtp ? `&previewOtp=${encodeURIComponent(data.previewOtp)}` : '';
          router.push(
            `/verify-email?email=${encodeURIComponent(loginEmail.trim().toLowerCase())}${otpParam}`
          );
          return;
        }
        setError(data.error || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      window.location.href =
        data.user?.role === 'REVIEWER' ? '/reviewer/dashboard' : '/instructor/dashboard';
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 text-2xl font-black tracking-tight text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span>MORENA TEACH</span>
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Instructor &amp; Course Auditor Portal
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Dedicated Registration &amp; Sign-In exclusively for Instructors and Course Auditors.
          </p>
        </div>

        {/* Mode Toggle Tabs: Sign Up vs Sign In */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#0f131d] border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('SIGNUP');
              setError('');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              authMode === 'SIGNUP'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Instructor / Auditor Account</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('LOGIN');
              setError('');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              authMode === 'LOGIN'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Instructor / Auditor Login</span>
          </button>
        </div>

        <div className="bg-[#0f131d] border border-slate-800/80 rounded-2xl shadow-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'LOGIN' ? (
            <form onSubmit={handlePartnerLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Instructor / Auditor Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="instructor@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <Link href="/forgot-password" className="text-xs font-bold text-violet-400 hover:text-violet-300">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Instructor / Auditor Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <>
              {/* Stepper */}
              <div className="flex items-center justify-between mb-6 px-2">
                {[
                  { num: 1, label: '1. Role & Personal' },
                  { num: 2, label: '2. Address Details' },
                  { num: 3, label: '3. Strong Password' }
                ].map((item) => (
                  <div key={item.num} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        step === item.num
                          ? 'bg-violet-600 text-white ring-4 ring-violet-600/25'
                          : step > item.num
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {step > item.num ? '✓' : item.num}
                    </div>
                    <span className={`text-xs font-semibold ${step >= item.num ? 'text-white' : 'text-slate-500'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSignupSubmit}>
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Create Account As
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRole('INSTRUCTOR')}
                          className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                            role === 'INSTRUCTOR'
                              ? 'bg-violet-600/15 border-violet-500 shadow-lg shadow-violet-600/10'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              role === 'INSTRUCTOR' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">Instructor</div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Create courses, teach students, track earnings &amp; payouts.
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRole('REVIEWER')}
                          className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                            role === 'REVIEWER'
                              ? 'bg-emerald-600/15 border-emerald-500 shadow-lg shadow-emerald-600/10'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              role === 'REVIEWER' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">Reviewer / Auditor</div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Audit course quality, review submissions &amp; curriculum.
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Dr. Aarav Sharma"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="instructor@example.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        A 6-digit verification OTP will be sent to this email address.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Mobile Number <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep1()) setStep(2);
                      }}
                      className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <span>Continue to Address Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Complete Street Address <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <textarea
                          rows={2}
                          required
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          placeholder="House/Flat No., Building Name, Street, Area"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          City <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="Mumbai"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          State / Province <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                          placeholder="Maharashtra"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Country <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          placeholder="India"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Pincode / Postal Code <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                          placeholder="400001"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (validateStep2()) setStep(3);
                        }}
                        className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <span>Continue to Security</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Password <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="e.g. Abc@12345"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="mt-3 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-slate-400 font-medium">Password Strength</span>
                          <span className={`font-bold ${strengthLabel.textColor}`}>
                            {form.password ? strengthLabel.text : 'Enter Password'} ({passedChecksCount}/5)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                          <div
                            className={`h-full transition-all duration-300 ${strengthLabel.color}`}
                            style={{ width: `${(passedChecksCount / 5) * 100}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {[
                            { key: 'minLength', label: 'At least 8 characters' },
                            { key: 'uppercase', label: 'At least 1 uppercase (A-Z)' },
                            { key: 'lowercase', label: 'At least 1 lowercase (a-z)' },
                            { key: 'number', label: 'At least 1 number (0-9)' },
                            { key: 'special', label: 'At least 1 special (@#$%&*)' }
                          ].map((rule) => {
                            const ok = pwChecks[rule.key as keyof typeof pwChecks];
                            return (
                              <div
                                key={rule.key}
                                className={`flex items-center gap-1.5 ${
                                  ok ? 'text-emerald-400' : 'text-slate-400'
                                }`}
                              >
                                {ok ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                )}
                                <span>{rule.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Confirm Password <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          placeholder="Re-enter your password"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !isPasswordValid || !passwordsMatch}
                        className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Creating Account &amp; Sending OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Create {role === 'REVIEWER' ? 'Auditor' : 'Instructor'} Account</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PartnerSignupAndLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <PartnerAuthContent defaultRole="INSTRUCTOR" />
    </Suspense>
  );
}
