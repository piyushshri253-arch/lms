'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
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

interface QualificationItem {
  degree: string;
  courseName: string;
  university: string;
  passingYear: string;
}

  // Dynamic Qualifications List (Qualification #1 is fixed Graduation, #2+ can be added/removed)
  const [qualificationsList, setQualificationsList] = useState<QualificationItem[]>([
    {
      degree: 'Graduation',
      courseName: '',
      university: '',
      passingYear: '2021'
    },
    {
      degree: 'Post-Graduation',
      courseName: '',
      university: '',
      passingYear: '2023'
    }
  ]);

  // Sign Up Multi-Step State
  const [signupStep, setSignupStep] = useState<1 | 2 | 3 | 4>(1);
  const signupPanelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll signup panel to top on step change or view toggle
  const resetSignupScroll = () => {
    if (signupPanelRef.current) {
      signupPanelRef.current.scrollTop = 0;
    }
  };

  const goToStep = (targetStep: 1 | 2 | 3 | 4) => {
    (document.activeElement as HTMLElement)?.blur();
    setSignupStep(targetStep);
    resetSignupScroll();
    requestAnimationFrame(resetSignupScroll);
    setTimeout(resetSignupScroll, 30);
    setTimeout(resetSignupScroll, 120);
  };

  useEffect(() => {
    resetSignupScroll();
    const raf = requestAnimationFrame(resetSignupScroll);
    const t1 = setTimeout(resetSignupScroll, 30);
    const t2 = setTimeout(resetSignupScroll, 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [signupStep, isSignUp]);
  const [signupForm, setSignupForm] = useState({
    // Step 1: Personal Details
    firstName: '',
    lastName: '',
    email: initialEmail,
    phone: '',
    // Step 2: Experience & Resume
    linkedinUrl: '',
    experienceYears: '3-5 Years',
    experience: '',
    resumeDataUrl: '',
    resumeFileName: '',
    resumeMimeType: '',
    resumeSize: 0,
    // Step 3: Address Details
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    // Step 4: Password & Security
    password: '',
    confirmPassword: '',
    acceptedTerms: false
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  const passingYears = Array.from({ length: 35 }, (_, i) => String(2026 - i));

  // Qualification Row Helpers
  const addQualificationRow = () => {
    setQualificationsList((prev) => [
      ...prev,
      {
        degree: 'Post-Graduation',
        courseName: '',
        university: '',
        passingYear: '2023'
      }
    ]);
  };

  const removeQualificationRow = (index: number) => {
    if (index === 0) return; // Graduation (index 0) is mandatory and cannot be removed
    setQualificationsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateQualificationRow = (
    index: number,
    field: keyof QualificationItem,
    value: string
  ) => {
    setQualificationsList((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, [field]: idx === 0 && field === 'degree' ? 'Graduation' : value }
          : item
      )
    );
  };

  // Word count helper for 350-word summary limit
  const countWords = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  };
  const experienceWordCount = countWords(signupForm.experience);

  const handleExperienceChange = (val: string) => {
    const newWordsList = val.trim() ? val.trim().split(/\s+/).filter(Boolean) : [];
    if (newWordsList.length > 350) {
      const matchedChunks = val.trimStart().match(/\S+\s*/g);
      const cappedText = matchedChunks
        ? matchedChunks.slice(0, 350).join('').trimEnd()
        : newWordsList.slice(0, 350).join(' ');
      setSignupForm((prev) => ({ ...prev, experience: cappedText }));
      return;
    }
    setSignupForm((prev) => ({ ...prev, experience: val }));
  };

  // Password validation checks for Step 4
  const pwChecks = {
    length: signupForm.password.length >= 8,
    uppercase: /[A-Z]/.test(signupForm.password),
    lowercase: /[a-z]/.test(signupForm.password),
    number: /[0-9]/.test(signupForm.password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(signupForm.password)
  };
  const passedChecksCount = Object.values(pwChecks).filter(Boolean).length;
  const isPasswordValid = passedChecksCount === 5;
  const passwordsMatch =
    signupForm.password.length > 0 && signupForm.password === signupForm.confirmPassword;

  const strengthLabel =
    passedChecksCount <= 2
      ? { text: 'Weak', color: 'bg-red-500', textColor: 'text-red-600' }
      : passedChecksCount <= 4
      ? { text: 'Good', color: 'bg-amber-500', textColor: 'text-amber-600' }
      : { text: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' };

  // Step 1 Validation
  const validateStep1 = () => {
    setSignupError('');
    if (!signupForm.firstName.trim()) {
      setSignupError('Please enter your First Name.');
      return false;
    }
    if (!signupForm.lastName.trim()) {
      setSignupError('Please enter your Last Name.');
      return false;
    }
    if (!signupForm.email.trim() || !signupForm.email.includes('@')) {
      setSignupError('Please enter a valid Email Address.');
      return false;
    }
    const digits = signupForm.phone.replace(/\D/g, '');
    if (!signupForm.phone.trim() || digits.length < 10) {
      setSignupError('Please enter a valid 10-digit mobile number.');
      return false;
    }
    return true;
  };

  // Step 2 Validation (Validates all qualification rows + experience + resume)
  const validateStep2 = () => {
    setSignupError('');
    if (qualificationsList.length === 0) {
      setSignupError('Please add at least one Qualification entry.');
      return false;
    }
    for (let i = 0; i < qualificationsList.length; i++) {
      const q = qualificationsList[i];
      if (!q.courseName.trim()) {
        setSignupError(
          `Please enter the Course Name for Qualification #${i + 1} (e.g. B.Tech CS, B.Sc).`
        );
        return false;
      }
      if (!q.university.trim()) {
        setSignupError(`Please enter the University Name for Qualification #${i + 1}.`);
        return false;
      }
      if (!q.passingYear.trim()) {
        setSignupError(`Please select the Passing Year for Qualification #${i + 1}.`);
        return false;
      }
    }
    if (!signupForm.experience.trim()) {
      setSignupError('Please enter your Summary Experience.');
      return false;
    }
    if (countWords(signupForm.experience) > 350) {
      setSignupError('Summary Experience cannot exceed 350 words.');
      return false;
    }
    if (!signupForm.resumeDataUrl) {
      setSignupError('Please upload your Resume / CV (PDF, DOC, or DOCX) for auditor verification.');
      return false;
    }
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    setSignupError('');
    if (!signupForm.address.trim()) {
      setSignupError('Please enter your complete street address.');
      return false;
    }
    if (!signupForm.city.trim()) {
      setSignupError('Please enter your city.');
      return false;
    }
    if (!signupForm.state.trim()) {
      setSignupError('Please enter your state.');
      return false;
    }
    if (!signupForm.pincode.trim() || signupForm.pincode.replace(/\D/g, '').length < 6) {
      setSignupError('Please enter a valid 6-digit postal pincode.');
      return false;
    }
    return true;
  };

  // Resume Upload Handler
  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setSignupError('Resume file size must be under 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSignupForm((prev) => ({
        ...prev,
        resumeDataUrl: dataUrl,
        resumeFileName: file.name,
        resumeMimeType: file.type || 'application/pdf',
        resumeSize: file.size
      }));
      setSignupError('');
    };
    reader.onerror = () => {
      setSignupError('Failed to read resume file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  // Final Registration Submission (Step 4)
  const handleFinalSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    if (!isPasswordValid) {
      setSignupError('Please fulfill all 5 password security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setSignupError('Password and Confirm Password do not match.');
      return;
    }
    if (!signupForm.acceptedTerms) {
      setSignupError('Please accept the Educator Terms of Service & Privacy Policy.');
      return;
    }

    const cleanFirst = signupForm.firstName.trim();
    const cleanLast = signupForm.lastName.trim();
    const fullName = `${cleanFirst} ${cleanLast}`.trim();
    const cleanEmail = signupForm.email.trim().toLowerCase();
    const cleanPhone = signupForm.phone.trim();

    const formattedQualificationsSummary = qualificationsList
      .map(
        (q) =>
          `${q.degree}: ${q.courseName.trim()}${q.university ? ` - ${q.university.trim()}` : ''} (${q.passingYear})`
      )
      .join(' | ');

    const primaryQual = qualificationsList[0]
      ? `${qualificationsList[0].courseName || qualificationsList[0].degree} - ${qualificationsList[0].university} (${qualificationsList[0].passingYear})`
      : 'Graduate';

    const extraQuals = qualificationsList
      .slice(1)
      .map((q) => `${q.courseName || q.degree} - ${q.university} (${q.passingYear})`)
      .filter(Boolean)
      .join(', ');

    const combinedExperience = signupForm.experienceYears
      ? `${signupForm.experienceYears} — ${signupForm.experience.trim()}`
      : signupForm.experience.trim();

    setSignupLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'INSTRUCTOR',
          firstName: cleanFirst,
          lastName: cleanLast,
          name: fullName,
          email: cleanEmail,
          phone: cleanPhone,
          linkedinUrl: signupForm.linkedinUrl?.trim() || '',
          qualification: formattedQualificationsSummary || primaryQual,
          additionalQualifications: extraQuals,
          qualificationsList: qualificationsList.map((q) => ({
            ...q,
            specialization: `${q.courseName.trim()} (${q.university.trim()})`
          })),
          experience: combinedExperience,
          experienceYears: signupForm.experienceYears,
          resumeDataUrl: signupForm.resumeDataUrl,
          resumeFileName: signupForm.resumeFileName,
          resumeMimeType: signupForm.resumeMimeType,
          resumeSize: signupForm.resumeSize,
          address: signupForm.address.trim(),
          city: signupForm.city.trim(),
          state: signupForm.state.trim(),
          country: signupForm.country.trim() || 'India',
          pincode: signupForm.pincode.trim(),
          password: signupForm.password,
          confirmPassword: signupForm.confirmPassword,
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
      setIsSignUp(false); // smoothly slides overlay back to left, showing OTP verification on the left panel!
    } catch (err: any) {
      setSignupError(err.message || 'Registration failed.');
      showToast({ title: 'Registration Failed', description: err.message, type: 'error' });
    } finally {
      setSignupLoading(false);
    }
  };

  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl =
    !rawCallback ? '/instructor/dashboard' : rawCallback;

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
    <div className="w-full max-w-5xl lg:max-w-6xl mx-auto font-sans px-2 sm:px-4 py-4">
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
      <div className="relative w-full min-h-[660px] md:min-h-[760px] md:h-[780px] lg:h-[820px] bg-white rounded-3xl sm:rounded-[32px] shadow-2xl shadow-indigo-950/10 border border-slate-200/80 overflow-hidden flex flex-col md:block">
        
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

        {/* ================= PANEL 2: SIGN UP FORM (RIGHT HALF - 4-STEP WIZARD) ================= */}
        <div
          ref={signupPanelRef}
          style={{ overflowAnchor: 'none' }}
          className={`w-full md:w-1/2 h-full md:absolute md:top-0 md:right-0 flex flex-col justify-start px-4 sm:px-8 py-4 sm:py-6 z-10 transition-all duration-700 ease-in-out overflow-y-auto ${
            isSignUp
              ? 'flex md:opacity-100 md:pointer-events-auto md:z-20'
              : 'hidden md:flex md:opacity-0 md:pointer-events-none md:z-1'
          }`}
        >
          <div className="w-full max-w-md lg:max-w-lg mx-auto text-center pb-6">
            {/* Header & Stepper - Sticky so it is ALWAYS visible and never clipped */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-xs pt-2 pb-2.5 z-20 border-b border-slate-100 mb-3 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
              <div className="mb-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Create Account
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dedicated 4-Step Registration for Instructors
                </p>
              </div>

              {/* Step Progress Indicators */}
              <div className="flex items-center justify-between px-1">
                {[
                  { num: 1, label: 'Personal' },
                  { num: 2, label: 'CV & Qual.' },
                  { num: 3, label: 'Address' },
                  { num: 4, label: 'Security' }
                ].map((s) => (
                  <div key={s.num} className="flex items-center gap-1">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        signupStep === s.num
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30 ring-2 ring-violet-200'
                          : signupStep > s.num
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {signupStep > s.num ? '✓' : s.num}
                    </div>
                    <span
                      className={`text-[10px] font-semibold hidden sm:inline ${
                        signupStep === s.num ? 'text-violet-700' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                    {s.num < 4 && <div className="hidden sm:block w-3 h-0.5 bg-slate-200" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {signupError && (
              <div className="mb-2.5 p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs text-left">
                <p className="font-bold leading-relaxed">{signupError}</p>
              </div>
            )}

            {/* STEP 1: PERSONAL DETAILS */}
            {signupStep === 1 && (
              <div className="space-y-2 text-left animate-in fade-in duration-200">
                {/* Social Icons (matches Instagram reel) */}
                <div className="flex items-center justify-center gap-3 py-0.5">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full border border-slate-300/80 flex items-center justify-center text-slate-700 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer shadow-2xs"
                    title="Sign up with Facebook"
                  >
                    <span className="font-bold text-xs">f</span>
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full border border-slate-300/80 flex items-center justify-center text-slate-700 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer shadow-2xs"
                    title="Sign up with Google"
                  >
                    <span className="font-bold text-xs">G</span>
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full border border-slate-300/80 flex items-center justify-center text-slate-700 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer shadow-2xs"
                    title="Sign up with LinkedIn"
                  >
                    <span className="font-bold text-xs">in</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 text-center block -mt-1">
                  or enter your instructor personal details
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5 block">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.firstName}
                      onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                      placeholder="e.g. Aarav"
                      className="w-full h-9 px-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5 block">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.lastName}
                      onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                      placeholder="e.g. Sharma"
                      className="w-full h-9 px-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5 block">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="instructor@example.com"
                    className="w-full h-9 px-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5 block">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full h-9 px-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) goToStep(2);
                    }}
                    className="w-full py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-violet-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Continue to Step 2: Qualifications &amp; CV</span>
                    <Icon name="arrow_forward" size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: QUALIFICATIONS, EXPERIENCE & RESUME (Clean 2x2 Grid with Perfect Alignment) */}
            {signupStep === 2 && (
              <div className="space-y-3 text-left animate-in fade-in duration-200">
                {/* Academic Qualifications Box */}
                <div className="p-3 sm:p-4 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-violet-200/60">
                    <div className="flex items-center gap-1.5">
                      <Icon name="school" size={17} className="text-violet-600 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider text-violet-950">
                        Academic Qualifications &amp; Passing Year
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={addQualificationRow}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold shadow-xs cursor-pointer shrink-0 active:scale-95 transition-all self-start sm:self-auto"
                    >
                      <Icon name="add" size={14} />
                      <span>+ Add Qualification</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug">
                    Graduation is mandatory. Click <strong>+ Add Qualification</strong> to add Post-Graduation or other degrees.
                  </p>

                  <div className="space-y-3">
                    {qualificationsList.map((qItem, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span>Qualification #{idx + 1}</span>
                          </span>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => removeQualificationRow(idx)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer transition-colors"
                            >
                              <Icon name="delete" size={14} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        {/* 2x2 Balanced Input Grid - Row 1: Level & Year, Row 2: Course & University */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Row 1 - Col 1: Level */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Qualification Level <span className="text-red-500">*</span>
                            </label>
                            {idx === 0 ? (
                              <div className="w-full h-9 px-3 rounded-xl bg-violet-50 border border-violet-200 text-xs font-bold text-violet-900 flex items-center select-none">
                                Graduation (Mandatory)
                              </div>
                            ) : (
                              <select
                                value={qItem.degree === 'Graduation' ? 'Post-Graduation' : qItem.degree}
                                onChange={(e) => updateQualificationRow(idx, 'degree', e.target.value)}
                                className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600 cursor-pointer"
                              >
                                <option value="Post-Graduation">Post-Graduation</option>
                                <option value="Ph.D.">Ph.D. / Doctorate</option>
                                <option value="Professional Certification">Professional Certification</option>
                                <option value="Diploma">Diploma</option>
                              </select>
                            )}
                          </div>

                          {/* Row 1 - Col 2: Passing Year */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Passing Year <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={qItem.passingYear}
                              onChange={(e) => updateQualificationRow(idx, 'passingYear', e.target.value)}
                              className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600 cursor-pointer"
                            >
                              {passingYears.map((yr) => (
                                <option key={yr} value={yr}>
                                  {yr}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Row 2 - Col 1: Course Name */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Course Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={qItem.courseName}
                              onChange={(e) => updateQualificationRow(idx, 'courseName', e.target.value)}
                              placeholder={idx === 0 ? 'e.g. B.Tech CS, B.Sc, BCA' : 'e.g. M.Tech, MBA, M.Sc'}
                              className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600"
                            />
                          </div>

                          {/* Row 2 - Col 2: University Name */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              University Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={qItem.university}
                              onChange={(e) => updateQualificationRow(idx, 'university', e.target.value)}
                              placeholder="e.g. Delhi University, RGPV"
                              className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      LinkedIn Profile Link
                    </label>
                    <input
                      type="text"
                      value={signupForm.linkedinUrl}
                      onChange={(e) => setSignupForm({ ...signupForm, linkedinUrl: e.target.value })}
                      placeholder="https://www.linkedin.com/in/your-profile"
                      className="w-full h-9 px-3.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600"
                    />
                  </div>
                </div>

                {/* Total Experience, Summary Experience & Resume Box */}
                <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/80">
                    <Icon name="work" size={17} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Total Experience, Summary &amp; Resume
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Total Experience <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={signupForm.experienceYears}
                      onChange={(e) => setSignupForm({ ...signupForm, experienceYears: e.target.value })}
                      className="w-full sm:w-1/2 h-9 px-3 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-violet-600 cursor-pointer"
                    >
                      <option value="0-1 Years">0–1 Years</option>
                      <option value="1-3 Years">1–3 Years</option>
                      <option value="3-5 Years">3–5 Years</option>
                      <option value="5-10 Years">5–10 Years</option>
                      <option value="10+ Years">10+ Years</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Summary Experience <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] font-bold text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded-full">
                        {experienceWordCount} / 350 Words Max
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={signupForm.experience}
                      onChange={(e) => handleExperienceChange(e.target.value)}
                      placeholder="Detail your teaching background, subject expertise, and methodologies..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 resize-none"
                    />
                  </div>

                  {/* Resume Upload Box */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Resume / CV (PDF, DOC, DOCX under 8 MB) <span className="text-red-500">*</span>
                    </label>
                    {signupForm.resumeFileName ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-950">
                        <div className="flex items-center gap-1.5 truncate">
                          <Icon name="description" size={16} className="text-violet-600 shrink-0" />
                          <span className="font-semibold truncate">{signupForm.resumeFileName}</span>
                          <span className="text-[10px] text-violet-600 shrink-0">
                            ({(signupForm.resumeSize / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <label className="text-[11px] text-violet-700 font-bold hover:underline cursor-pointer shrink-0 ml-2">
                          Change
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleResumeUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-violet-300 hover:border-violet-500 bg-violet-50/50 hover:bg-violet-50 cursor-pointer transition-all text-xs font-semibold text-violet-700">
                        <Icon name="upload_file" size={18} />
                        <span>Upload Resume / CV (Under 8 MB) *</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleResumeUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupError('');
                      goToStep(1);
                    }}
                    className="px-4 py-2.5 rounded-full border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase cursor-pointer transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep2()) goToStep(3);
                    }}
                    className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-violet-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Continue to Step 3: Address</span>
                    <Icon name="arrow_forward" size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: ADDRESS DETAILS */}
            {signupStep === 3 && (
              <div className="space-y-2 text-left animate-in fade-in duration-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5 block">
                    Complete Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={signupForm.address}
                    onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                    placeholder="House/Flat No., Building, Street Name"
                    className="w-full px-3 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5 block">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.city}
                      onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                      placeholder="e.g. New Delhi"
                      className="w-full px-3 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5 block">
                      State / Province *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupForm.state}
                      onChange={(e) => setSignupForm({ ...signupForm, state: e.target.value })}
                      placeholder="e.g. Delhi"
                      className="w-full px-3 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5 block">
                      Country *
                    </label>
                    <input
                      type="text"
                      value={signupForm.country}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5 block">
                      Pincode / Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={signupForm.pincode}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          pincode: e.target.value.replace(/\D/g, '')
                        })
                      }
                      placeholder="110001"
                      className="w-full px-3 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/70 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupError('');
                      goToStep(2);
                    }}
                    className="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase cursor-pointer transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep3()) goToStep(4);
                    }}
                    className="flex-1 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-violet-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Continue to Step 4: Security</span>
                    <Icon name="arrow_forward" size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: STRONG PASSWORD & SUBMISSION */}
            {signupStep === 4 && (
              <form onSubmit={handleFinalSignupSubmit} className="space-y-2.5 text-left animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, password: e.target.value })
                      }
                      placeholder="e.g. Abc@12345"
                      className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-300 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <Icon
                        name={showSignupPassword ? 'visibility_off' : 'visibility'}
                        size={16}
                      />
                    </button>
                  </div>

                  {/* Password Strength Meter & Live 5-Rule Checklist */}
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-slate-600 font-medium">Password Strength</span>
                      <span className={`font-bold ${strengthLabel.textColor}`}>
                        {signupForm.password ? strengthLabel.text : 'Enter Password'} ({passedChecksCount}/5)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full transition-all duration-300 ${strengthLabel.color}`}
                        style={{ width: `${(passedChecksCount / 5) * 100}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      {[
                        { key: 'length', label: 'At least 8 characters' },
                        { key: 'uppercase', label: 'At least 1 uppercase (A-Z)' },
                        { key: 'lowercase', label: 'At least 1 lowercase (a-z)' },
                        { key: 'number', label: 'At least 1 number (0-9)' },
                        { key: 'special', label: 'At least 1 special (@$!%*?&#)' }
                      ].map((rule) => {
                        const ok = pwChecks[rule.key as keyof typeof pwChecks];
                        return (
                          <div
                            key={rule.key}
                            className={`flex items-center gap-1.5 font-medium ${
                              ok ? 'text-emerald-600 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            <Icon
                              name={ok ? 'check_circle' : 'cancel'}
                              size={14}
                              className={ok ? 'text-emerald-600' : 'text-slate-300'}
                            />
                            <span>{rule.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupConfirmPassword ? 'text' : 'password'}
                      required
                      value={signupForm.confirmPassword}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, confirmPassword: e.target.value })
                      }
                      placeholder="Re-enter your password"
                      className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-300 focus:border-violet-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowSignupConfirmPassword(!showSignupConfirmPassword)
                      }
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <Icon
                        name={showSignupConfirmPassword ? 'visibility_off' : 'visibility'}
                        size={16}
                      />
                    </button>
                  </div>
                  {signupForm.confirmPassword && (
                    <div className="mt-1 flex items-center gap-1 text-[11px]">
                      {passwordsMatch ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Icon name="check_circle" size={13} />
                          Passwords match
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <Icon name="cancel" size={13} />
                          Passwords do not match
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Mandatory Terms & Privacy Policy Checkbox */}
                <div className="pt-0.5">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-violet-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={signupForm.acceptedTerms}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, acceptedTerms: e.target.checked })
                      }
                      className="mt-0.5 rounded text-violet-600 focus:ring-violet-500 cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] text-slate-700 leading-tight">
                      I have read and agree to the Morena Teach{' '}
                      <Link
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-violet-700 hover:underline"
                      >
                        Terms &amp; Conditions
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-violet-700 hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      . <span className="text-red-500 font-bold">*</span>
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupError('');
                      goToStep(3);
                    }}
                    className="px-4 py-2.5 rounded-full border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase cursor-pointer transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {signupLoading ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <span>Submit &amp; Send OTP</span>
                        <Icon name="send" size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Quick Switch to Sign In */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setAuthError(null);
                  setSignupError('');
                }}
                className="text-[11px] text-slate-500 hover:text-violet-600 font-semibold cursor-pointer transition-colors"
              >
                Already have an instructor account? <span className="underline">Sign In</span>
              </button>
            </div>
          </div>
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
