'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

interface LoginChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginChoiceModal: React.FC<LoginChoiceModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-[#090d1f] border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/90 z-10 overflow-hidden text-white">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <Icon name="close" size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-mono font-semibold text-indigo-300 uppercase tracking-wider mb-3">
            <span>AADHYARA Ecosystem</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            What do you want to access?
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Choose your product portal. AADHYARA keeps learning and sales experiences distinct and secure.
          </p>
        </div>

        {/* Product Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
          {/* Card 1: AADHYARA Learning */}
          <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:from-white/[0.1] hover:to-white/[0.04] border border-white/10 hover:border-emerald-500/40 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group shadow-lg">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">
                🎓
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-lg font-extrabold text-white">AADHYARA Learning</h3>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md">
                  LMS
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Access courses, video lessons, quizzes, certificates, and your student or instructor learning dashboard.
              </p>
            </div>

            <div>
              <Link
                href="/learning/login"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all cursor-pointer"
              >
                <span>Learning Login</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
              <div className="mt-3 text-center">
                <Link
                  href="/learning/register"
                  onClick={onClose}
                  className="text-[11px] font-semibold text-slate-400 hover:text-emerald-300 transition-colors"
                >
                  New learner? Create student account →
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: AADHYARA Sales */}
          <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.06] border border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group shadow-xl relative">
            <div className="absolute -top-3 right-5 px-2.5 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-extrabold uppercase rounded-full shadow-md">
              Business &amp; Sales
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">
                🚀
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-lg font-extrabold text-white">AADHYARA Sales</h3>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-md">
                  GROWTH OS
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Manage your business, branded website, products, custom domain, checkout, orders, wallet, and AI growth tools.
              </p>
            </div>

            <div>
              <Link
                href="/sales/login"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/40 hover:shadow-indigo-600/60 transition-all cursor-pointer"
              >
                <span>Sales Login</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
              <div className="mt-3 text-center">
                <Link
                  href="/sales/register"
                  onClick={onClose}
                  className="text-[11px] font-semibold text-indigo-300 hover:text-white transition-colors"
                >
                  Start your business? Register for Sales →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center relative z-10">
          <p className="text-xs text-slate-400">
            Need Super Admin platform access?{' '}
            <Link
              href="/super-admin/login"
              onClick={onClose}
              className="text-white hover:text-indigo-400 font-semibold underline underline-offset-4"
            >
              Super Admin Platform Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
