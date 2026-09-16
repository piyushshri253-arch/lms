'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, showToast } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/student/learning';

  // Dynamic Password Strength Calculations
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const isPasswordValid = hasMinLength && (hasUppercase || hasLowercase) && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast({ title: 'Name Required', description: 'Please enter your full name.', type: 'error' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast({ title: 'Invalid Email', description: 'Please enter a valid email address.', type: 'error' });
      return;
    }
    if (password.length < 8) {
      showToast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters long and include numbers.',
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
          password,
          confirmPassword: password,
          role: 'STUDENT'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      // Automatically sign in the student
      try {
        await login(email.trim().toLowerCase(), password);
      } catch {}

      showToast({
        title: 'Welcome to Morena Teach! 🎉',
        description: `Your student account has been created.`,
        type: 'success'
      });

      router.push(callbackUrl);
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
    <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col font-sans antialiased">
      <UdemyNavbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 py-12">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1c1d1f] tracking-tight">
              Sign up and start learning
            </h1>
            <p className="text-xs text-[#6a6f73]">
              Join over 12,000 educators and teachers advancing their professional skills.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 px-3 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters with numbers"
                  className="w-full h-11 pl-3 pr-10 border border-[#2d2f31] text-sm focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>

              {/* Password strength checklist */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1 text-[11px] text-[#6a6f73]">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      name={hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                      size={14}
                      className={hasMinLength ? 'text-emerald-600' : 'text-gray-400'}
                    />
                    <span>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon
                      name={hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                      size={14}
                      className={hasNumber ? 'text-emerald-600' : 'text-gray-400'}
                    />
                    <span>Includes at least 1 number</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-sm rounded-[2px] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Free Account</span>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="pt-4 border-t border-[#d1d7dc] text-center text-xs text-[#6a6f73] space-y-2">
            <p>
              Already have an account?{' '}
              <Link
                href={`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                className="text-[#5022c3] font-bold hover:underline ml-1"
              >
                Log in
              </Link>
            </p>
            <p className="text-[11px] text-gray-400 leading-normal">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>

      <UdemyFooter />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
