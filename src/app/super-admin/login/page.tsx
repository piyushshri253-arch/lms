'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { login, showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        showToast({
          title: 'Super Admin Access Granted',
          description: `Welcome back, ${user.name}.`,
          type: 'success'
        });
        router.push('/super-admin');
      } else {
        showToast({
          title: 'Access Forbidden',
          description: 'This portal requires Super Administrator credentials.',
          type: 'error'
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Authentication Failed',
        description: err.message || 'Invalid Super Admin credentials.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[460px] mx-auto relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 text-primary rounded-3xl border-2 border-primary/40 shadow-2xl mb-2">
            <Icon name="shield" fill size={36} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
            Super Admin Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
            High-privilege system authentication for MORENA TEACH platform operations
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-300">
                Super Admin Email
              </label>
              <div className="relative">
                <Icon
                  name="mail"
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supermorena@morenateach.com"
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-300">
                Master Password
              </label>
              <div className="relative">
                <Icon
                  name="lock"
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 mt-2"
            >
              <Icon
                name={isLoading ? 'sync' : 'lock_open'}
                size={18}
                className={isLoading ? 'animate-spin' : ''}
              />
              <span>{isLoading ? 'Authenticating High-Privilege Session...' : 'Authenticate Super Admin'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center text-xs text-slate-400">
            <Link href="/login" className="hover:text-white text-[11px] font-mono flex items-center justify-center gap-1">
              <Icon name="arrow_back" size={14} />
              <span>Return to Standard LMS Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

