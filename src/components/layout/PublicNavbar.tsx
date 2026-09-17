'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';
import { LoginChoiceModal } from '../landing/LoginChoiceModal';

export const PublicNavbar: React.FC = () => {
  const router = useRouter();
  const { currentUser, logout } = useApp();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSalesMegaMenuOpen, setIsSalesMegaMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const megaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnterSales = () => {
    if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
    setIsSalesMegaMenuOpen(true);
  };

  const handleMouseLeaveSales = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setIsSalesMegaMenuOpen(false);
    }, 200);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'py-3 bg-[#060814]/90 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/60'
            : 'py-4 bg-[#060814]/40 backdrop-blur-md border-b border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 group-hover:shadow-indigo-500/50 transition-all duration-300 border border-white/20">
              <span className="font-black text-lg">A</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                  MORENA TEACH
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 -mt-0.5">
                Build. Learn. Grow.
              </span>
            </div>
          </Link>

          {/* Center: Main Navigation */}
          <nav className="hidden lg:flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md text-xs font-semibold text-slate-300">
            <a
              href="/#platform"
              className="px-3 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-all"
            >
              Platform
            </a>

            <a
              href="/#learning-overview"
              className="px-3 py-1.5 rounded-full hover:text-emerald-300 hover:bg-white/[0.08] transition-all flex items-center gap-1"
            >
              <span>Learning</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </a>

            {/* Sales with Mega Menu */}
            <div
              className="relative"
              onMouseEnter={handleMouseEnterSales}
              onMouseLeave={handleMouseLeaveSales}
            >
              <a
                href="/#sales-overview"
                className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  isSalesMegaMenuOpen
                    ? 'text-white bg-indigo-500/20 text-indigo-200'
                    : 'text-indigo-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span className="font-bold">Sales</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-[9px] text-indigo-300 font-mono">
                  HOT
                </span>
                <Icon
                  name="expand_more"
                  size={14}
                  className={`transition-transform duration-200 ${
                    isSalesMegaMenuOpen ? 'rotate-180 text-indigo-400' : ''
                  }`}
                />
              </a>

              {/* Mega Menu Dropdown */}
              {isSalesMegaMenuOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[620px] bg-[#0a0e24] border border-white/15 rounded-3xl p-6 shadow-2xl shadow-black/90 backdrop-blur-2xl z-50 text-white animate-fadeIn">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white">MORENA TEACH Sales</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
                          BUSINESS OS
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Build, sell and grow your online business.
                      </p>
                    </div>

                    <Link
                      href="/company-signup"
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1"
                    >
                      <span>Start Free</span>
                      <Icon name="arrow_forward" size={12} />
                    </Link>
                  </div>

                  {/* 4 Feature Cards Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <Link
                      href="/#custom-domain"
                      className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xl">🌐</span>
                        <h4 className="text-xs font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                          Build
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Create your branded website and connect your custom domain without code.
                      </p>
                    </Link>

                    <Link
                      href="/#sales-products"
                      className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xl">🛍️</span>
                        <h4 className="text-xs font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                          Sell
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Create products, checkout pages and accept payments via Razorpay &amp; Stripe.
                      </p>
                    </Link>

                    <Link
                      href="/#sales-customers"
                      className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xl">👥</span>
                        <h4 className="text-xs font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                          Customers
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Manage customers, leads, active orders, and multi-tenant licenses seamlessly.
                      </p>
                    </Link>

                    <Link
                      href="/#sales-analytics"
                      className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xl">📈</span>
                        <h4 className="text-xs font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                          Grow
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Marketing, revenue analytics, automations, and AI-powered business growth.
                      </p>
                    </Link>
                  </div>

                  {/* Mega Menu Footer CTAs */}
                  <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between">
                    <Link
                      href="/#sales-overview"
                      className="text-xs text-slate-400 hover:text-white font-medium flex items-center gap-1"
                    >
                      <span>Explore Sales Features</span>
                      <Icon name="chevron_right" size={14} />
                    </Link>
                    <Link
                      href="/company-signup"
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                    >
                      <span>🚀 Start Your Sales Account</span>
                      <Icon name="arrow_forward" size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <a
              href="/#ai-builder"
              className="px-3 py-1.5 rounded-full hover:text-purple-300 hover:bg-white/[0.08] transition-all flex items-center gap-1"
            >
              <span>AI</span>
            </a>

            <a
              href="/#business-types"
              className="px-3 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-all"
            >
              Solutions
            </a>

            <a
              href="/#pricing"
              className="px-3 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-all"
            >
              Pricing
            </a>

            <a
              href="/#faq"
              className="px-3 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-all"
            >
              Resources
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* 1. 🎓 Learning Button */}
            <Link
              href="/courses"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
            >
              <span>🎓</span>
              <span>Learning</span>
            </Link>

            {/* 2. 🚀 Sales Standout CTA Button with Tooltip */}
            <div className="relative group/salesBtn">
              <Link
                href="/company-signup"
                className="relative inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/60 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 border border-white/25 cursor-pointer"
              >
                <span>🚀</span>
                <span>Sales</span>
                <span className="hidden md:inline text-[10px] font-mono font-normal opacity-80">
                  | Launch
                </span>
                <Icon name="arrow_forward" size={14} className="group-hover/salesBtn:translate-x-0.5 transition-transform" />
              </Link>

              {/* Tooltip Micro-interaction */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-slate-900 text-[11px] font-semibold text-indigo-300 rounded-lg border border-indigo-500/30 shadow-xl opacity-0 translate-y-1 group-hover/salesBtn:opacity-100 group-hover/salesBtn:translate-y-0 transition-all pointer-events-none whitespace-nowrap z-50">
                Create your online business ✨
              </div>
            </div>

            {/* 3. Log in with Choice Modal / Authenticated User Dropdown */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <Link
                  href={
                    currentUser.role === 'SUPER_ADMIN'
                      ? '/super-admin'
                      : (currentUser.role as string) === 'ADMIN' || (currentUser.role as string) === 'SALES_ADMIN'
                      ? '/sales/dashboard'
                      : '/lms/dashboard'
                  }
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-all cursor-pointer"
                >
                  <UserAvatar
                    avatar={currentUser.avatar}
                    name={currentUser.name}
                    size="sm"
                    className="w-7 h-7"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">
                      {currentUser.name.split(' ')[0]}
                    </p>
                    <span className="text-[9px] font-mono text-indigo-400 font-extrabold uppercase">
                      {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : currentUser.role}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="text-slate-400 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Icon name="logout" size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer"
              >
                Log in
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-white/5 border border-white/10"
              aria-label="Toggle menu"
            >
              <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-full bg-[#070a1a] border-b border-white/15 p-6 shadow-2xl space-y-6 text-white max-h-[85vh] overflow-y-auto animate-fadeIn">
            {/* Dedicated Product Cards for Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Learning Card */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🎓</span>
                  <span className="font-extrabold text-sm text-white">MORENA TEACH Learning</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Courses, video lessons &amp; certifications.</p>
                <div className="flex gap-2">
                  <Link
                    href="/courses"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 py-2 text-center text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                  >
                    Courses
                  </Link>
                  <Link
                    href="/login?portal=student"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl"
                  >
                    Login
                  </Link>
                </div>
              </div>

              {/* Sales Card */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🚀</span>
                  <span className="font-extrabold text-sm text-white">MORENA TEACH Sales</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Build website, sell products &amp; accept payments.</p>
                <div className="flex gap-2">
                  <Link
                    href="/company-signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 py-2 text-center text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                  >
                    Start Sales
                  </Link>
                  <Link
                    href="/login?portal=admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl"
                  >
                    Login
                  </Link>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-2 border-t border-white/10 pt-4">
              <a
                href="/#platform"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-300 hover:text-white"
              >
                Platform Architecture
              </a>
              <a
                href="/#custom-domain"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-300 hover:text-white"
              >
                Custom Domain Feature
              </a>
              <a
                href="/#ai-builder"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-300 hover:text-white"
              >
                AI Business Builder
              </a>
              <a
                href="/#business-types"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-300 hover:text-white"
              >
                Solutions &amp; Business Types
              </a>
              <a
                href="/#pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-300 hover:text-white"
              >
                SaaS Pricing
              </a>
              <a
                href="/#faq"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-slate-300 hover:text-white"
              >
                Frequently Asked Questions
              </a>
            </div>

            {/* Primary Action in Mobile Drawer */}
            <div className="border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLoginModalOpen(true);
                }}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-center text-white"
              >
                Choose Login Portal
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Product Authentication Choice Modal */}
      <LoginChoiceModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
};
