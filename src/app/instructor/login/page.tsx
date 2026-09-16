'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

function InstructorLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/instructor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password, 'INSTRUCTOR');

      if (user.role !== 'INSTRUCTOR') {
        showToast({
          title: 'Instructor Portal Restricted',
          description: 'Only registered instructors can access this portal.',
          type: 'error'
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
      showToast({
        title: 'Authentication Failed',
        description: err.message || 'Invalid instructor credentials.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col justify-between font-sans selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-800">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-md">
            M
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-purple-400 transition-colors">
            Morena Teach <span className="text-purple-400 font-semibold text-sm ml-1">Instructor Studio</span>
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Icon name="arrow_back" size={16} />
          <span>Back to Storefront</span>
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-3">
              <Icon name="cast_for_education" size={26} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Instructor Studio Login
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Sign in to manage your curriculum, lessons, and students.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Instructor Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="instructor@morenateach.com"
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-lg shadow-lg shadow-purple-900/30 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Studio</span>
                  <Icon name="arrow_forward" size={16} />
                </>
              )}
            </button>
          </form>

          {/* Portal Switcher Footer */}
          <div className="mt-6 pt-6 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Are you a Student?{' '}
              <Link href="/login" className="text-purple-400 hover:underline font-bold">
                Student Sign In →
              </Link>
            </p>
            <p className="text-xs text-slate-400">
              Platform Admin?{' '}
              <Link href="/admin/login" className="text-indigo-400 hover:underline font-bold">
                Admin Console →
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-800">
        &copy; {new Date().getFullYear()} Morena Teach LMS. Authorized educator access only.
      </footer>
    </div>
  );
}

export default function InstructorLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">Loading Instructor Portal...</div>}>
      <InstructorLoginContent />
    </Suspense>
  );
}
