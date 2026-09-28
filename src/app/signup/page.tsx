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
  UserPlus,
  Plus,
  Trash2,
  Briefcase,
  FileText
} from 'lucide-react';

export interface QualificationItem {
  degree: string;
  specialization: string;
  passingYear: string;
}

const PASSING_YEARS = [
  'Pursuing',
  ...Array.from({ length: 42 }, (_, idx) => String(new Date().getFullYear() - idx))
];

function PartnerAuthContent({ defaultRole = 'INSTRUCTOR' }: { defaultRole?: 'INSTRUCTOR' | 'REVIEWER' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('mode') === 'login' ? 'LOGIN' : 'SIGNUP';
  const roleParam = searchParams.get('role')?.toUpperCase();
  const initialEmail = searchParams.get('email') || '';

  const [authMode, setAuthMode] = useState<'SIGNUP' | 'LOGIN'>(initialTab);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [role, setRole] = useState<'INSTRUCTOR' | 'REVIEWER'>(
    roleParam === 'REVIEWER' || roleParam === 'AUDITOR' ? 'REVIEWER' : defaultRole
  );

  // Login State
  const [loginEmail, setLoginEmail] = useState(initialEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Dynamic Qualifications List (Graduation, Post-Graduation, Additional Qualifications with Passing Year)
  const [qualificationsList, setQualificationsList] = useState<QualificationItem[]>([
    {
      degree: 'Graduation (B.Tech / B.E. / B.Sc. / BCA / B.A.)',
      specialization: '',
      passingYear: '2021'
    }
  ]);

  // Signup State
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    name: '',
    email: initialEmail,
    phone: '',
    additionalQualifications: '',
    linkedinUrl: '',
    experienceYears: '3-5 Years',
    experience: '',
    resumeDataUrl: '',
    resumeFileName: '',
    resumeMimeType: '',
    resumeSize: 0,
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
  const [errorCode, setErrorCode] = useState<string>('');

  const addQualificationRow = () => {
    setQualificationsList((prev) => [
      ...prev,
      {
        degree: 'Post-Graduation (M.Tech / M.Sc. / MCA / MBA)',
        specialization: '',
        passingYear: '2023'
      }
    ]);
  };

  const removeQualificationRow = (index: number) => {
    if (qualificationsList.length <= 1) return;
    setQualificationsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateQualificationRow = (index: number, field: keyof QualificationItem, value: string) => {
    setQualificationsList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Resume file size must be under 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setForm((prev) => ({
        ...prev,
        resumeDataUrl: dataUrl,
        resumeFileName: file.name,
        resumeMimeType: file.type || 'application/pdf',
        resumeSize: file.size
      }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

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
      ? { text: 'Weak', color: 'bg-red-500', textColor: 'text-red-600' }
      : passedChecksCount <= 4
      ? { text: 'Good', color: 'bg-amber-500', textColor: 'text-amber-600' }
      : { text: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' };

  // Step 1 Validation: Role + First/Last Name + Email + Mobile
  const validateStep1 = () => {
    setError('');
    if (!form.firstName.trim()) {
      setError('Please enter your First Name.');
      return false;
    }
    if (!form.lastName.trim()) {
      setError('Please enter your Last Name.');
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

  // Step 2 Validation: Qualifications (with Degree, Stream & Passing Year) + Experience + Resume Upload
  const validateStep2 = () => {
    setError('');
    if (role === 'INSTRUCTOR') {
      if (qualificationsList.length === 0) {
        setError('Please add at least one Qualification / Graduation entry.');
        return false;
      }
      for (let i = 0; i < qualificationsList.length; i++) {
        const q = qualificationsList[i];
        if (!q.degree.trim()) {
          setError(`Please select or enter the Qualification / Degree for Entry #${i + 1}.`);
          return false;
        }
        if (!q.specialization.trim()) {
          setError(`Please enter your Stream / Course / University for Qualification #${i + 1} (e.g. B.Tech CS, M.Sc Maths).`);
          return false;
        }
        if (!q.passingYear.trim()) {
          setError(`Please select the Passing Year for Qualification #${i + 1}.`);
          return false;
        }
      }
      if (!form.experience.trim()) {
        setError('Please enter your Teaching / Industry Experience details.');
        return false;
      }
      if (!form.resumeDataUrl) {
        setError('Please upload your Resume / CV (PDF, DOC, or DOCX) for Auditor verification.');
        return false;
      }
    }
    return true;
  };

  // Step 3 Validation: Address Details
  const validateStep3 = () => {
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

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const formattedQualificationsSummary = qualificationsList
      .map(
        (q) =>
          `${q.degree}${q.specialization ? ` - ${q.specialization.trim()}` : ''} (${q.passingYear})`
      )
      .join(' | ');

    const primaryQual =
      qualificationsList[0]
        ? `${qualificationsList[0].specialization || qualificationsList[0].degree} (${qualificationsList[0].passingYear})`
        : 'Graduate';

    const extraQuals = [
      ...qualificationsList
        .slice(1)
        .map((q) => `${q.specialization || q.degree} (${q.passingYear})`),
      form.additionalQualifications.trim()
    ]
      .filter(Boolean)
      .join(', ');

    const combinedExperience = form.experienceYears
      ? `${form.experienceYears} — ${form.experience.trim()}`
      : form.experience.trim();

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          ...form,
          name: fullName,
          qualification: formattedQualificationsSummary || primaryQual,
          additionalQualifications: extraQuals,
          qualificationsList,
          experience: combinedExperience
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please check your details.');
        setLoading(false);
        return;
      }

      router.push(
        `/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}&role=${role}`
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
          router.push(
            `/verify-email?email=${encodeURIComponent(loginEmail.trim().toLowerCase())}`
          );
          return;
        }
        const code =
          data.code ||
          (data.error?.toLowerCase().includes('not registered') ? 'USER_NOT_FOUND' : 'INVALID_CREDENTIALS');
        setErrorCode(code);
        setError(
          code === 'PENDING_AUDITOR_ONBOARDING'
            ? data.error
            : code === 'USER_NOT_FOUND'
            ? 'This email is not registered as an Instructor. Please sign up for Instructor first.'
            : 'Your email ID or password is wrong. Please enter the correct email and password.'
        );
        setLoading(false);
        return;
      }

      window.location.href =
        data.user?.role === 'REVIEWER' ? '/reviewer/dashboard' : '/instructor/dashboard';
    } catch (err: any) {
      setErrorCode('INVALID_CREDENTIALS');
      setError(err.message || 'Your email ID or password is wrong. Please enter the correct email and password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-600/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span>MORENA TEACH</span>
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Instructor &amp; Course Auditor Portal
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Dedicated 4-Step Registration &amp; Sign-In exclusively for Instructors and Course Auditors.
          </p>
        </div>

        {/* Mode Toggle Tabs: Sign Up vs Sign In */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-2xs mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('SIGNUP');
              setError('');
              setErrorCode('');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              authMode === 'SIGNUP'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
              setErrorCode('');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              authMode === 'LOGIN'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Instructor / Auditor Login</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8">
          {error && (
            <div
              className={`mb-6 p-4 rounded-xl border text-sm animate-in fade-in duration-200 ${
                errorCode === 'USER_NOT_FOUND'
                  ? 'bg-purple-50 border-purple-200 text-purple-950'
                  : errorCode === 'PENDING_AUDITOR_ONBOARDING'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {errorCode === 'USER_NOT_FOUND' ? (
                  <UserPlus className="w-5 h-5 text-[#5624d0] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-2.5">
                  <p className="font-bold text-xs leading-relaxed">{error}</p>
                  {errorCode === 'USER_NOT_FOUND' && (
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setRole('INSTRUCTOR');
                          setForm((prev) => ({
                            ...prev,
                            email: loginEmail.trim().toLowerCase()
                          }));
                          setAuthMode('SIGNUP');
                          setError('');
                          setErrorCode('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5624d0] hover:bg-[#401b9c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Sign Up for Instructor</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {authMode === 'LOGIN' ? (
            <form onSubmit={handlePartnerLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Instructor / Auditor Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="instructor@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <Link href="/forgot-password" className="text-xs font-bold text-violet-600 hover:text-violet-700">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer"
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
              {/* 4-Step Wizard Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 pb-4 border-b border-slate-100">
                {[
                  { num: 1, label: '1. Role & Personal' },
                  { num: 2, label: '2. Qualifications & CV' },
                  { num: 3, label: '3. Address Details' },
                  { num: 4, label: '4. Strong Password' }
                ].map((item) => (
                  <div key={item.num} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step === item.num
                          ? 'bg-violet-600 text-white ring-4 ring-violet-100'
                          : step > item.num
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500 border border-slate-300'
                      }`}
                    >
                      {step > item.num ? '✓' : item.num}
                    </div>
                    <span
                      className={`text-[11px] font-bold leading-tight ${
                        step >= item.num ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSignupSubmit}>
                {/* STEP 1: Role & Personal Details (First Name, Last Name, Email, Mobile) */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                        Create Account As
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRole('INSTRUCTOR')}
                          className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                            role === 'INSTRUCTOR'
                              ? 'bg-violet-50 border-violet-500 shadow-sm'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              role === 'INSTRUCTOR'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-500'
                            }`}
                          >
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">Instructor</div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Create courses, teach students, track earnings &amp; payouts.
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRole('REVIEWER')}
                          className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                            role === 'REVIEWER'
                              ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              role === 'REVIEWER'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-500'
                            }`}
                          >
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">Reviewer / Auditor</div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Audit course quality, review submissions &amp; curriculum.
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={form.firstName}
                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                            placeholder="Aarav"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={form.lastName}
                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                            placeholder="Sharma"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="instructor@example.com"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep1()) {
                          setStep(role === 'INSTRUCTOR' ? 2 : 3);
                        }
                      }}
                      className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer"
                    >
                      <span>
                        {role === 'INSTRUCTOR'
                          ? 'Continue to Step 2: Qualifications, Experience & Resume'
                          : 'Continue to Address Details'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* STEP 2: Qualifications (Dynamic Add + Passing Year), Experience & Resume Upload */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-violet-950 flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-violet-600" />
                            <span>Academic Qualifications &amp; Graduation Year</span>
                          </h3>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Add your Graduation, Post-Graduation, Doctorate, or Diplomas along with the Passing Year. Click <strong>+ Add Qualification</strong> to add more.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={addQualificationRow}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-xs cursor-pointer shrink-0 self-start sm:self-center"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Qualification</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {qualificationsList.map((qItem, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-700">
                                Qualification #{idx + 1}
                              </span>
                              {qualificationsList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeQualificationRow(idx)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-5">
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Qualification / Level <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={qItem.degree}
                                  onChange={(e) =>
                                    updateQualificationRow(idx, 'degree', e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                                >
                                  <option value="Graduation (B.Tech / B.E. / B.Sc. / BCA / B.A.)">
                                    Graduation (B.Tech / B.E. / B.Sc. / BCA / B.A.)
                                  </option>
                                  <option value="Post-Graduation (M.Tech / M.Sc. / MCA / MBA)">
                                    Post-Graduation (M.Tech / M.Sc. / MCA / MBA)
                                  </option>
                                  <option value="Ph.D. / Doctorate">Ph.D. / Doctorate</option>
                                  <option value="B.Ed. / M.Ed. (Teaching Degree)">
                                    B.Ed. / M.Ed. (Teaching Degree)
                                  </option>
                                  <option value="Diploma / PG Diploma">Diploma / PG Diploma</option>
                                  <option value="Professional Certification / NET / GATE">
                                    Professional Certification / NET / GATE
                                  </option>
                                  <option value="Other Qualification">Other Qualification</option>
                                </select>
                              </div>

                              <div className="sm:col-span-4">
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Course / Stream / University <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={qItem.specialization}
                                  onChange={(e) =>
                                    updateQualificationRow(idx, 'specialization', e.target.value)
                                  }
                                  placeholder="e.g. B.Tech CS (RGPV)"
                                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Passing Year <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={qItem.passingYear}
                                  onChange={(e) =>
                                    updateQualificationRow(idx, 'passingYear', e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                                >
                                  {PASSING_YEARS.map((yr) => (
                                    <option key={yr} value={yr}>
                                      {yr}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Additional Certifications / Achievements (Optional)
                          </label>
                          <input
                            type="text"
                            value={form.additionalQualifications}
                            onChange={(e) =>
                              setForm({ ...form, additionalQualifications: e.target.value })
                            }
                            placeholder="e.g. AWS Solutions Architect, Gold Medalist"
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-violet-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            LinkedIn Profile Link{' '}
                            <span className="ml-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                              Optional
                            </span>
                          </label>
                          <input
                            type="text"
                            required={false}
                            value={form.linkedinUrl}
                            onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                            placeholder="https://www.linkedin.com/in/your-profile (Optional)"
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-violet-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Experience & Mandatory Resume Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-emerald-600" />
                        <span>Teaching / Industry Experience &amp; Mandatory Resume Upload</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Total Exp (Years) <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={form.experienceYears}
                            onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-violet-600"
                          >
                            <option value="Fresher / < 1 Year">Fresher / &lt; 1 Year</option>
                            <option value="1-2 Years">1-2 Years</option>
                            <option value="3-5 Years">3-5 Years</option>
                            <option value="5-10 Years">5-10 Years</option>
                            <option value="10+ Years">10+ Years</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Experience &amp; Domain Details <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={form.experience}
                            onChange={(e) => setForm({ ...form, experience: e.target.value })}
                            placeholder="e.g. 5 yrs Full-Stack Architect & Senior Educator"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-violet-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Upload Resume / CV (PDF, DOC, DOCX) <span className="text-red-500">*</span>{' '}
                          <span className="ml-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase">
                            Mandatory
                          </span>
                        </label>
                        <div
                          className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-white border border-dashed ${
                            form.resumeDataUrl ? 'border-emerald-400 bg-emerald-50/20' : 'border-rose-300'
                          }`}
                        >
                          <input
                            type="file"
                            required={!form.resumeDataUrl}
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleResumeUpload}
                            className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-violet-600 file:text-white hover:file:bg-violet-500 cursor-pointer"
                          />
                          {form.resumeFileName ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold truncate">
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{form.resumeFileName}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-rose-600">
                              * Resume / CV upload is required to continue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (validateStep2()) setStep(3);
                        }}
                        className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer"
                      >
                        <span>Continue to Step 3: Address Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Address Details */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Complete Street Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <textarea
                          rows={2}
                          required
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          placeholder="House/Flat No., Building Name, Street, Area"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="Mumbai"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          State / Province <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                          placeholder="Maharashtra"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          placeholder="India"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Pincode / Postal Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                          placeholder="400001"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setStep(role === 'INSTRUCTOR' ? 2 : 1)}
                        className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (validateStep3()) setStep(4);
                        }}
                        className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer"
                      >
                        <span>Continue to Step 4: Strong Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Strong Password */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="e.g. Abc@12345"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-slate-600 font-medium">Password Strength</span>
                          <span className={`font-bold ${strengthLabel.textColor}`}>
                            {form.password ? strengthLabel.text : 'Enter Password'} ({passedChecksCount}/5)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-3">
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
                                className={`flex items-center gap-1.5 font-medium ${
                                  ok ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              >
                                {ok ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span>{rule.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          placeholder="Re-enter your password"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !isPasswordValid || !passwordsMatch}
                        className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer"
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
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      }
    >
      <PartnerAuthContent defaultRole="INSTRUCTOR" />
    </Suspense>
  );
}
