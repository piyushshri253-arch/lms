'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

export default function ForgotPasswordPage() {
  const { showToast } = useApp();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email');

      setIsSubmitted(true);
      showToast({
        title: 'Reset Link Dispatched',
        description: 'Please check your email inbox.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err.message || 'Something went wrong.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-surface via-surface to-surface-container-low flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[460px] mx-auto relative z-10 space-y-6">
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
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-sm mx-auto">
            Enter your account email to receive a secure password reset link.
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest p-6 sm:p-8 shadow-2xl border border-outline-variant/80 rounded-3xl space-y-5 backdrop-blur-xl">
          {isSubmitted ? (
            <div className="text-center space-y-4 py-3 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto border-2 border-emerald-500/30">
                <Icon name="mark_email_read" fill size={36} />
              </div>
              <h3 className="font-extrabold text-lg text-on-surface">Check Your Inbox</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                If an account exists for <strong className="text-primary">{email}</strong>, you will
                receive an email with instructions to reset your password.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 hover:bg-primary-container transition-all"
                >
                  <Icon name="arrow_back" size={16} />
                  <span>Return to Login</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                  Account Email Address
                </label>
                <div className="relative">
                  <Icon
                    name="mail"
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-primary text-on-primary font-bold text-sm rounded-xl hover:bg-primary-container shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                <Icon
                  name={isLoading ? 'sync' : 'send'}
                  size={18}
                  className={isLoading ? 'animate-spin' : ''}
                />
                <span>{isLoading ? 'Sending Link...' : 'Send Password Reset Link'}</span>
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-outline-variant/40 text-center text-xs text-on-surface-variant">
            <Link href="/login" className="text-primary font-bold hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

