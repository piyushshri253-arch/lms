'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface ProductSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProduct: 'LEARNING' | 'SALES';
}

export const ProductSwitcherModal: React.FC<ProductSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentProduct
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-xl bg-[#090d24] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              A
            </div>
            <div>
              <h2 className="text-base font-black text-white">MORENA TEACH Products</h2>
              <p className="text-[11px] text-slate-400">Switch between isolated product ecosystems</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* 2 Dedicated Product Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product 1: MORENA TEACH Learning */}
          <Link
            href="/lms/dashboard"
            onClick={onClose}
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 group cursor-pointer ${
              currentProduct === 'LEARNING'
                ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-950/30'
                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10 hover:border-emerald-500/40'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🎓
                </div>
                {currentProduct === 'LEARNING' && (
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Current
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                  MORENA TEACH Learning
                </h3>
                <p className="text-[11px] text-emerald-400 font-mono font-semibold">
                  Learn &amp; Teach
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  LMS platform for courses, student progress, video masterclasses, quizzes, and accredited certificates.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-bold text-emerald-400">
              <span>Open Learning</span>
              <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Product 2: MORENA TEACH Sales */}
          <Link
            href="/sales/dashboard"
            onClick={onClose}
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 group cursor-pointer ${
              currentProduct === 'SALES'
                ? 'bg-indigo-950/30 border-indigo-500 shadow-lg shadow-indigo-950/30'
                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10 hover:border-indigo-500/40'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🚀
                </div>
                {currentProduct === 'SALES' && (
                  <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    Current
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">
                  MORENA TEACH Sales
                </h3>
                <p className="text-[11px] text-indigo-400 font-mono font-semibold">
                  Build. Sell. Grow.
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Business operating platform for websites, digital products, checkout orders, marketing, leads, and AI.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-bold text-indigo-400">
              <span>Open Sales</span>
              <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Footer Note */}
        <div className="text-[11px] text-slate-500 text-center font-mono">
          Each product operates in its own isolated workspace and security context.
        </div>
      </div>
    </div>
  );
};
