'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const { showToast } = useApp();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Password Strength Calculations
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  let passedCount = 0;
  if (hasMinLength) passedCount++;
  if (hasUppercase) passedCount++;
  if (hasLowercase) passedCount++;
  if (hasNumber) passedCount++;
  if (hasSpecial) passedCount++;

  let strengthLabel = 'Weak';
  let strengthColor = 'bg-rose-500 text-rose-700';
  let strengthPercent = 20;

  if (passedCount >= 5) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500 text-emerald-700';
    strengthPercent = 100;
  } else if (passedCount >= 4) {
    strengthLabel = 'Good';
    strengthColor = 'bg-blue-500 text-blue-700';
    strengthPercent = 80;
  } else if (passedCount >= 3) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-amber-500 text-amber-700';
    strengthPercent = 60;
  } else if (passedCount >= 2) {
    strengthLabel = 'Weak';
    strengthColor = 'bg-rose-500 text-rose-700';
    strengthPercent = 40;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      showToast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters with uppercase, lowercase, and numeric digits.',
        type: 'error'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast({
        title: 'Password Mismatch',
        description: 'Your passwords do not match.',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      showToast({
        title: 'Password Updated Successfully! 🎉',
        description: 'You can now sign in with your new password.',
        type: 'success'
      });

      router.push('/login');
    } catch (err: any) {
      showToast({
        title: 'Reset Failed',
        description: err.message || 'Could not reset password.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-surface via-surface to-surface-container-low flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[480px] mx-auto relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center gap-2.5 group mb-2">
            <div className="w-12 h-12 bg-primary text-on-primary rounded-2xl flex items-center justify-center font-black shadow-lg group-hover:scale-105 transition-transform">
              <Icon name="school" fill size={28} />
            </div>
            <span className="font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
              MORENA TEACH
            </span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Create New Password
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-sm mx-auto">
            Set a new secure password for your MORENA TEACH account.
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest p-6 sm:p-8 shadow-2xl border border-outline-variant/80 rounded-3xl space-y-5 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                New Password
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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div className="pt-2 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-outline">Password Strength:</span>
                    <span className="font-bold uppercase tracking-wider">{strengthLabel}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColor.split(' ')[0]}`}
                      style={{ width: `${strengthPercent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-outline font-mono pt-1">
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
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Confirm New Password
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              <Icon
                name={isLoading ? 'sync' : 'check_circle'}
                size={18}
                className={isLoading ? 'animate-spin' : ''}
              />
              <span>{isLoading ? 'Updating Password...' : 'Save New Password & Log In'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-outline-variant/40 text-center text-xs text-on-surface-variant">
            <Link href="/login" className="text-primary font-bold hover:underline">
              Return to Login Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
