'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function SeoLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reason') === 'inactivity') {
        setError('You have been logged out due to inactivity. Please log in again.');
      }
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          requestedPortal: 'SEO'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      router.push(data.redirectUrl || '/seo');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = () => {
    setEmail('seo@morenateach.com');
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 mx-auto flex items-center justify-center text-white shadow-lg font-black text-xl">
            S
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SEO Portal Sign In</h1>
          <p className="text-xs text-slate-400">
            Sign in to manage course meta tags, search keywords, and indexing readiness.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seo@morenateach.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In to SEO Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Test Login */}
        <div className="pt-4 border-t border-slate-700/60 space-y-2.5 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Test Credentials
          </p>
          <button
            type="button"
            onClick={handleQuickLogin}
            className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-700 border border-slate-700 text-left transition-colors cursor-pointer flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-bold text-blue-400">seo@morenateach.com</div>
              <div className="text-[10px] text-slate-400">Password: password123</div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600/30 text-blue-300 border border-blue-500/30">
              Auto Fill
            </span>
          </button>
        </div>

        {/* Storefront Link */}
        <div className="text-center pt-2">
          <Link href="/login" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Back to Main Login
          </Link>
        </div>
      </div>
    </div>
  );
}
