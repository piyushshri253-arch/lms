'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password, 'STUDENT');

      // Strictly reject any non-student account from student storefront login
      if (user.role !== 'STUDENT') {
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          showToast({
            title: 'Admin Account Detected',
            description: 'Please sign in through the dedicated Admin Backend Portal at /admin/login.',
            type: 'error'
          });
          router.push('/admin/login');
          return;
        }

        if (user.role === 'INSTRUCTOR' || user.role === 'TEACHER') {
          showToast({
            title: 'Instructor Account Detected',
            description: 'Please sign in through the dedicated Instructor Portal at /instructor/login.',
            type: 'error'
          });
          router.push('/instructor/login');
          return;
        }

        showToast({
          title: 'Access Restricted',
          description: 'This portal is strictly reserved for Student learners.',
          type: 'error'
        });
        return;
      }

      showToast({
        title: 'Welcome Back!',
        description: `Logged in as ${user.name}.`,
        type: 'success'
      });

      // Redirect student to requested callback (e.g. /checkout) or learning dashboard
      if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
        router.push(callbackUrl);
      } else {
        router.push('/student/learning');
      }
    } catch (err: any) {
      if (err.requiresEmailVerification) {
        showToast({
          title: 'Email Verification Required 📩',
          description: 'A 6-digit code has been sent to your inbox. Please verify to continue.',
          type: 'info'
        });
        router.push(
          `/register?verifyEmail=${encodeURIComponent(email.trim().toLowerCase())}${
            callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ''
          }`
        );
        return;
      }
      showToast({
        title: 'Sign In Failed',
        description: err.message || 'Incorrect email or password.',
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
        <div className="w-full max-w-[400px] space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1c1d1f] tracking-tight">
              Log in to continue your learning journey
            </h1>
            <p className="text-xs text-[#6a6f73]">
              Access your enrolled courses, certifications, and learning progress.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-[#1c1d1f]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#5022c3] hover:underline font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
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
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-sm rounded-[2px] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Log in</span>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="pt-4 border-t border-[#d1d7dc] text-center text-xs text-[#6a6f73] space-y-2">
            <p>
              Don&apos;t have an account?{' '}
              <Link
                href={`/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                className="text-[#5022c3] font-bold hover:underline ml-1"
              >
                Sign up
              </Link>
            </p>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-[#6a6f73]">
              <Icon name="admin_panel_settings" size={15} className="text-[#5022c3]" />
              <span>Platform Staff or Super Admin?</span>
              <Link
                href="/admin/login"
                className="text-[#5022c3] font-bold hover:underline ml-0.5"
              >
                Admin Portal &rarr;
              </Link>
            </div>

            <p className="text-[11px] text-gray-400 pt-1">
              By logging in, you agree to our Terms of Use and Privacy Policy.
            </p>
          </div>
        </div>
      </main>

      <UdemyFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
