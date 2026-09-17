'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface PlanDetail {
  id: string;
  name: string;
  badge?: string;
  priceMonthly: string;
  students: string;
  courses: string;
  storage: string;
  description: string;
  features: string[];
}

const PLANS: Record<string, PlanDetail> = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter Workspace',
    priceMonthly: '$49/mo',
    students: '100 Active Students',
    courses: '10 Masterclasses',
    storage: '10 GB Storage',
    description: 'Perfect for new academies and specialized corporate training teams.',
    features: ['Isolated Tenant Database', 'Custom Subdomain', 'Standard Video Streaming', 'Stripe & UPI Checkout']
  },
  PRO: {
    id: 'PRO',
    name: 'Professional LMS',
    badge: 'MOST POPULAR',
    priceMonthly: '$149/mo',
    students: '1,000 Active Students',
    courses: '50 Masterclasses',
    storage: '100 GB High-Speed CDN',
    description: 'For scaling companies, universities, and fast-growing online institutes.',
    features: ['Custom Brand Domain', 'Multi-Instructor Roles', 'Marketing Flash Coupons', '24/7 Priority Support']
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise Cloud',
    badge: 'CUSTOM SCALE',
    priceMonthly: '$399/mo',
    students: '10,000+ Students',
    courses: '500+ Masterclasses',
    storage: '1,000 GB 4K Video CDN',
    description: 'Mission-critical learning architecture with dedicated cloud isolation and SAML/SSO.',
    features: ['Single Sign-On (SSO / SAML)', 'Custom REST API & Webhooks', '99.99% Guaranteed SLA', 'Dedicated Account Architect']
  }
};

const INDUSTRIES = [
  'Academy & Masterclasses',
  'Software & SaaS Development',
  'Graphic Design & Creative Agency',
  'Digital Products & UI Templates',
  'Coaching & Consulting Practice',
  'Personal Brand & Creator Studio',
  'Marketing & Growth Firm',
  'Corporate Training & L&D',
  'Fitness & Wellness Business',
  'Professional Certification Body'
];

function CompanySignupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlanParam = searchParams.get('plan')?.toUpperCase() || 'PRO';
  const validInitialPlan = PLANS[initialPlanParam] ? initialPlanParam : 'PRO';

  const platformParam = searchParams.get('platform')?.toLowerCase() || searchParams.get('type')?.toLowerCase();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [plan, setPlan] = useState<string>(validInitialPlan);
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  const isLms = platformParam === 'lms' || (!platformParam && (industry.includes('Academy') || industry.includes('Masterclasses') || industry.includes('Training') || industry.includes('Certification')));

  // OTP State (6 individual digit boxes)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Loading & error handling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrgData, setCreatedOrgData] = useState<any>(null);

  // Password strength calculation
  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };
  const pwScore = getPasswordStrength();

  // Handle company name input & automatic slug formatting
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setCompanyName(name);
    setSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    );
  };

  // Timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 3 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, resendTimer]);

  // Step 1 Validation & Proceed
  const handleStep1Proceed = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyName.trim()) {
      setError('Please provide your organization or company name.');
      return;
    }
    if (!slug.trim() || slug.length < 2) {
      setError('Please provide a valid workspace URL slug (at least 2 characters).');
      return;
    }
    setCurrentStep(2);
  };

  // Step 2: Submit to /api/company/signup (Sends OTP)
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminName.trim()) {
      setError('Administrator full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid corporate work email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the MORENA TEACH Terms of Service and Free Trial Agreement.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/company/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          slug: slug.trim(),
          adminName: adminName.trim(),
          email: email.trim().toLowerCase(),
          password,
          plan,
          platform: isLms ? 'LMS' : 'SALES',
          businessType: industry
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate company signup.');
      }

      setResendTimer(60);
      setCanResend(false);
      setCurrentStep(3);
      // Auto focus first OTP input
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle 6-Digit OTP inputs
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits entered, auto-verify
    if (clean && index === 5 && newDigits.every((d) => d !== '')) {
      triggerOtpVerification(newDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    if (pasted.length === 6) {
      triggerOtpVerification(pasted);
    } else {
      otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  // Step 3: Verify OTP & Provision Tenant
  const triggerOtpVerification = async (codeToVerify?: string) => {
    const finalOtp = codeToVerify || otpDigits.join('');
    if (finalOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/company/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          slug: slug.trim(),
          adminName: adminName.trim(),
          email: email.trim().toLowerCase(),
          password,
          plan,
          platform: isLms ? 'LMS' : 'SALES',
          businessType: industry,
          otp: finalOtp
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please check the code.');
      }

      setCreatedOrgData(data.data);
      setCurrentStep(4); // Success State
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/company/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          slug: slug.trim(),
          adminName: adminName.trim(),
          email: email.trim().toLowerCase(),
          password,
          plan,
          platform: isLms ? 'LMS' : 'SALES',
          businessType: industry
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resend code.');

      setResendTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanInfo = PLANS[plan] || PLANS.PRO;

  return (
    <div className="min-h-screen bg-[#060814] text-white flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 antialiased relative overflow-hidden">
      {/* Background Decorative Ambient Gradients & Perspective Grids */}
      <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-600/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 -left-20 w-[400px] h-[400px] bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="relative z-30 border-b border-white/[0.08] bg-[#060814]/80 backdrop-blur-xl px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center font-black text-lg text-white shadow-xl shadow-indigo-500/30 group-hover:scale-105 transition-transform border border-white/20">
              A
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  MORENA TEACH
                </span>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/30 uppercase">
                  B2B SaaS
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 -mt-0.5">Learning. Built Better.</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <Icon name="arrow_back" size={16} />
              <span>Back to Overview</span>
            </Link>
            <div className="h-4 w-px bg-white/10 hidden md:block" />
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
            >
              <span>Existing Company Login</span>
              <Icon name="login" size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Dual-Column Onboarding Canvas */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Enterprise Value Props, Live Simulator & Selected Plan Breakdown */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* Header Badge & Hero Title */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span>14-DAY FULL ENTERPRISE TRIAL • NO CREDIT CARD</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Launch your company&apos;s dedicated LMS in seconds.
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Zero-knowledge database isolation, custom branding, unlimited video streaming CDN, and full admin command center.
              </p>
            </div>

            {/* Live Interactive Workspace Simulator Card */}
            <div className="rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/15 p-5 shadow-2xl space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-1 text-[11px] font-mono text-slate-400">Workspace Live Simulation</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  TENANT ISOLATED
                </span>
              </div>

              {/* Dynamic URL Bar */}
              <div className="p-3 rounded-2xl bg-[#090d1f] border border-white/10 font-mono text-xs text-slate-300 flex items-center gap-2">
                <Icon name="lock" size={14} className="text-emerald-400 shrink-0" />
                <span className="text-slate-500">https://</span>
                <span className="text-indigo-300 font-black truncate max-w-[180px]">
                  {slug || 'your-company'}
                </span>
                <span className="text-slate-400">.morenateach.com</span>
              </div>

              {/* Dynamic Workspace Snapshot */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Organization</span>
                  <span className="font-extrabold text-white truncate max-w-[200px]">
                    {companyName || 'Your Organization'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Subscription Tier</span>
                  <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {selectedPlanInfo.name} ({selectedPlanInfo.priceMonthly})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Seat Allowance</span>
                  <span className="font-mono text-slate-200">{selectedPlanInfo.students}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Course Capacity</span>
                  <span className="font-mono text-slate-200">{selectedPlanInfo.courses}</span>
                </div>
              </div>
            </div>

            {/* Trust Features Checklist */}
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <Icon name="verified_user" size={16} className="text-emerald-400 shrink-0" />
                <span className="font-semibold">0% Platform Fee</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <Icon name="database" size={16} className="text-indigo-400 shrink-0" />
                <span className="font-semibold">Isolated Schemas</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <Icon name="workspace_premium" size={16} className="text-purple-400 shrink-0" />
                <span className="font-semibold">Custom Branding</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <Icon name="bolt" size={16} className="text-amber-400 shrink-0" />
                <span className="font-semibold">Instant Setup</span>
              </div>
            </div>

            {/* Testimonial Quote */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 italic space-y-2">
              <p>
                &ldquo;MORENA TEACH gave our global engineering teams an ultra-fast, branded academy with complete data privacy in under five minutes.&rdquo;
              </p>
              <div className="flex items-center gap-2 not-italic font-bold text-slate-300">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white">
                  SK
                </div>
                <span>Saurabh K. • VP of Engineering at ScaleCloud</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Interactive Multi-Step Form Container */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-10 rounded-3xl bg-[#0b0f22] border border-white/15 shadow-2xl shadow-black/80 space-y-7 relative">
              {/* Stepper Progress Bar (Steps 1 to 3) */}
              {currentStep <= 3 && (
                <div className="space-y-3 pb-6 border-b border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold font-mono">
                    <span className={currentStep >= 1 ? 'text-indigo-400' : 'text-slate-500'}>
                      01 • Workspace
                    </span>
                    <span className="text-slate-600">┈┈┈</span>
                    <span className={currentStep >= 2 ? 'text-indigo-400' : 'text-slate-500'}>
                      02 • Admin Account
                    </span>
                    <span className="text-slate-600">┈┈┈</span>
                    <span className={currentStep >= 3 ? 'text-indigo-400' : 'text-slate-500'}>
                      03 • Verification
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                      style={{
                        width: currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Error Alert Display */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in duration-200">
                  <Icon name="error" size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Signup notice</p>
                    <p className="text-rose-300/90 leading-relaxed mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* STEP 1: Plan Selection & Organization Setup */}
              {/* ----------------------------------------------------------------- */}
              {currentStep === 1 && (
                <form onSubmit={handleStep1Proceed} className="space-y-6 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Step 1: Choose Plan &amp; Workspace
                    </h2>
                    <p className="text-xs text-slate-400">
                      Select your target tier and customize your dedicated LMS subdomain.
                    </p>
                  </div>

                  {/* Plan Cards Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold block">
                      Select SaaS Plan Tier
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.values(PLANS).map((p) => {
                        const isSelected = plan === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setPlan(p.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500/50 shadow-xl shadow-indigo-600/20'
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                          >
                            {p.badge && (
                              <span className="absolute -top-2.5 right-3 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md">
                                {p.badge}
                              </span>
                            )}
                            <div className="space-y-1">
                              <p className="text-xs font-black text-white">{p.name}</p>
                              <p className="text-base font-extrabold text-indigo-300 font-mono">
                                {p.priceMonthly}
                              </p>
                              <p className="text-[11px] text-slate-400 leading-tight pt-1">
                                {p.students}
                              </p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-slate-300">
                              <span>14-Day Trial</span>
                              <span className={isSelected ? 'text-indigo-300 font-extrabold' : 'text-slate-500'}>
                                {isSelected ? '✓ Selected' : 'Select'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Company / Institute Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 block">
                      Company / Organization Name <span className="text-indigo-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nexus Institute of Technology"
                      value={companyName}
                      onChange={handleCompanyNameChange}
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/15 text-white text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  {/* Dedicated Workspace URL Subdomain */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 block">
                      Dedicated Workspace Subdomain <span className="text-indigo-400">*</span>
                    </label>
                    <div className="flex items-center rounded-2xl bg-white/[0.04] border border-white/15 px-4 py-3 text-xs font-mono text-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                      <span className="text-slate-500 select-none">https://</span>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) =>
                          setSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/(^-|-$)/g, '')
                          )
                        }
                        placeholder="nexus-institute"
                        className="bg-transparent text-indigo-300 font-bold focus:outline-none px-1 flex-1 min-w-0"
                      />
                      <span className="text-slate-400 select-none">.morenateach.com</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      You can bind your own custom domain (e.g. <code>academy.yourbrand.com</code>) anytime from the Admin settings.
                    </p>
                  </div>

                  {/* Organization Industry Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 block">Organization Primary Field</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-[#0d1228] border border-white/15 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind} className="bg-[#0d1228] text-white">
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20"
                    >
                      <span>Continue to Administrator Credentials</span>
                      <Icon name="arrow_forward" size={18} />
                    </button>
                  </div>
                </form>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* STEP 2: Administrator Credentials & Security Setup */}
              {/* ----------------------------------------------------------------- */}
              {currentStep === 2 && (
                <form onSubmit={handleStep2Submit} className="space-y-6 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Step 2: Create Administrator Account
                    </h2>
                    <p className="text-xs text-slate-400">
                      This will be the root owner account for your organization with full governance rights.
                    </p>
                  </div>

                  {/* Admin Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 block">
                      Owner / Administrator Full Name <span className="text-indigo-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Alex Mercer"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/15 text-white text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  {/* Corporate Work Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 block">
                      Corporate Work Email <span className="text-indigo-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alex.mercer@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/15 text-white text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <p className="text-[11px] text-slate-500">
                      A 6-digit cryptographic verification code will be sent to this email address.
                    </p>
                  </div>

                  {/* Secure Password with Strength Indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 block">
                        Master Password <span className="text-indigo-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                      >
                        {showPassword ? 'Hide Password' : 'Show Password'}
                      </button>
                    </div>

                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 8 characters with numbers & symbols"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/15 text-white text-xs font-semibold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />

                    {/* Strength meter bar */}
                    {password && (
                      <div className="space-y-1 pt-1">
                        <div className="grid grid-cols-4 gap-1.5 h-1.5">
                          <div className={`rounded-full ${pwScore >= 1 ? 'bg-rose-500' : 'bg-white/10'}`} />
                          <div className={`rounded-full ${pwScore >= 2 ? 'bg-amber-500' : 'bg-white/10'}`} />
                          <div className={`rounded-full ${pwScore >= 3 ? 'bg-indigo-400' : 'bg-white/10'}`} />
                          <div className={`rounded-full ${pwScore >= 4 ? 'bg-emerald-400' : 'bg-white/10'}`} />
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                          <span>Security Grade</span>
                          <span
                            className={
                              pwScore >= 4
                                ? 'text-emerald-400 font-bold'
                                : pwScore >= 3
                                ? 'text-indigo-400 font-bold'
                                : pwScore >= 2
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }
                          >
                            {pwScore >= 4
                              ? 'Enterprise Grade ✓'
                              : pwScore >= 3
                              ? 'Strong ✓'
                              : pwScore >= 2
                              ? 'Fair (Add symbols/uppercase)'
                              : 'Weak'}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Terms & SLA Agreement */}
                  <div className="pt-1">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-white/10 border-white/20"
                      />
                      <span className="text-xs text-slate-400 leading-relaxed">
                        I agree to the{' '}
                        <span className="text-slate-200 underline">MORENA TEACH Terms of Service</span>,{' '}
                        <span className="text-slate-200 underline">Privacy Policy</span>, and acknowledge the 14-Day Free Enterprise Trial.
                      </span>
                    </label>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="w-1/3 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-bold text-xs transition-all cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 disabled:opacity-50"
                    >
                      {loading ? (
                        <span>Generating Security Token...</span>
                      ) : (
                        <>
                          <span>Verify &amp; Provision Workspace</span>
                          <Icon name="arrow_forward" size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* STEP 3: OTP Verification Form */}
              {/* ----------------------------------------------------------------- */}
              {currentStep === 3 && (
                <div className="space-y-6 text-center animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/30 shadow-lg">
                      <Icon name="mail_lock" size={28} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Verify Your Corporate Email
                    </h2>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      We sent a 6-digit cryptographic verification code to:
                    </p>
                    <p className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 inline-block">
                      {email}
                    </p>
                  </div>

                  {/* 6 Individual Digit Boxes */}
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2 sm:gap-3">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-mono font-black rounded-2xl bg-white/[0.05] border border-white/20 text-white focus:border-indigo-500 focus:bg-indigo-600/10 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all shadow-inner"
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Tip: You can paste the complete 6-digit code directly into the first box.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      disabled={loading || otpDigits.join('').length < 6}
                      onClick={() => triggerOtpVerification()}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block" />
                          <span>Provisioning Isolated Database &amp; Deploying LMS...</span>
                        </div>
                      ) : (
                        <>
                          <span>Verify &amp; Launch Organization LMS</span>
                          <Icon name="rocket_launch" size={18} />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 px-1">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="hover:text-white font-medium transition-colors"
                      >
                        ← Edit details
                      </button>

                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading}
                          className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                        >
                          Resend Code
                        </button>
                      ) : (
                        <span className="text-slate-500 font-mono">
                          Resend code in {resendTimer}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* STEP 4: Celebratory Workspace Launch Success State */}
              {/* ----------------------------------------------------------------- */}
              {currentStep === 4 && (
                <div className="space-y-6 text-center animate-in zoom-in-95 duration-300 py-4">
                  <div className="w-18 h-18 rounded-3xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30 shadow-2xl shadow-emerald-500/30">
                    <Icon name="verified" size={40} />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      ORGANIZATION PROVISIONED SUCCESSFULLY
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Welcome to {createdOrgData?.organization?.name || companyName}!
                    </h2>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      Your isolated multi-tenant LMS workspace has been provisioned on the MORENA TEACH cloud with full 14-day trial entitlements.
                    </p>
                  </div>

                  {/* Provisioning Details Card */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Workspace URL:</span>
                      <span className="font-mono font-bold text-indigo-300">
                        https://{createdOrgData?.organization?.slug || slug}.morenateach.com
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tenant Administrator:</span>
                      <span className="font-bold text-white">
                        {createdOrgData?.user?.name || adminName} ({createdOrgData?.user?.email || email})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Plan Tier:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {createdOrgData?.organization?.plan || plan} (14-Day Free Trial)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(createdOrgData?.redirectUrl || (isLms ? '/lms/admin' : '/sales/onboarding'))}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20"
                  >
                    <span>{isLms ? 'Launch LMS Academy Dashboard →' : 'Configure Sales Workspace ("What Are You Building?") →'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modern Footer Strip */}
      <footer className="relative z-20 border-t border-white/[0.08] bg-[#04060e] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} MORENA TEACH SaaS Inc. All rights reserved.</p>
          <div className="flex items-center gap-5 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Icon name="lock" size={14} className="text-emerald-400" />
              <span>SOC2 Compliant Isolation</span>
            </span>
            <span className="flex items-center gap-1">
              <Icon name="shield" size={14} className="text-indigo-400" />
              <span>TLS 1.3 Encryption</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function CompanySignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060814] flex items-center justify-center text-white text-xs font-mono">
          Loading MORENA TEACH Workspace Provisioning...
        </div>
      }
    >
      <CompanySignupWizard />
    </Suspense>
  );
}
