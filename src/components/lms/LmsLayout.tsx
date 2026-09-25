'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { ProductSwitcherModal } from '@/components/common/ProductSwitcherModal';

interface LmsLayoutProps {
  children: React.ReactNode;
  activePath?: string;
  pageTitle?: string;
}

export function LmsLayout({ children, activePath, pageTitle }: LmsLayoutProps) {
  const pathname = usePathname();
  const currentPath = activePath || pathname;
  const { currentUser } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductSwitcherOpen, setIsProductSwitcherOpen] = useState(false);
  const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
  const [tutorPrompt, setTutorPrompt] = useState('');
  const [tutorResponse, setTutorResponse] = useState<string | null>(null);
  const [isTutorThinking, setIsTutorThinking] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/lms/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = LMS_ROUTES.LOGIN;
  };

  const handleAskTutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorPrompt.trim()) return;

    setIsTutorThinking(true);
    setTutorResponse(null);

    setTimeout(() => {
      setIsTutorThinking(false);
      setTutorResponse(
        `Great question regarding "${tutorPrompt}"! In Next.js App Router, Server Components render on the server without sending JavaScript to the client. When you need interactive hooks like useState or useEffect, declare 'use client' at the top of your file.`
      );
    }, 600);
  };

  const navSections = [
    {
      section: 'LEARNING',
      items: [
        { label: 'Dashboard', icon: 'dashboard', href: LMS_ROUTES.DASHBOARD },
        { label: 'My Courses', icon: 'auto_stories', href: LMS_ROUTES.MY_COURSES },
        { label: 'Explore Courses', icon: 'explore', href: LMS_ROUTES.COURSES },
        { label: 'Learning Progress', icon: 'trending_up', href: LMS_ROUTES.PROGRESS },
        { label: 'Certificates', icon: 'military_tech', href: LMS_ROUTES.CERTIFICATES },
        { label: 'Assignments', icon: 'assignment', href: LMS_ROUTES.ASSIGNMENTS },
        { label: 'Quizzes', icon: 'quiz', href: LMS_ROUTES.QUIZZES },
        { label: 'Ask Instructor (Q&A)', icon: 'forum', href: LMS_ROUTES.LMS_QUESTIONS }
      ]
    },
    {
      section: 'ACCOUNT & SETTINGS',
      items: [
        { label: 'My Profile', icon: 'person', href: LMS_ROUTES.PROFILE },
        { label: 'Notifications', icon: 'notifications', href: LMS_ROUTES.NOTIFICATIONS },
        { label: 'Orders & Receipts', icon: 'receipt_long', href: LMS_ROUTES.ORDERS },
        { label: 'Wishlist', icon: 'favorite', href: LMS_ROUTES.WISHLIST },
        { label: 'Settings', icon: 'settings', href: LMS_ROUTES.SETTINGS }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#060814] text-white flex select-none antialiased">
      {/* 1. Left Persistent LMS Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#060a1a] border-r border-emerald-500/15 flex flex-col justify-between transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-emerald-500/15 space-y-3">
          <div className="flex items-center justify-between">
            <Link href={LMS_ROUTES.DASHBOARD} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center font-black text-sm text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-all">
                🎓
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm text-white tracking-tight">MORENA TEACH</span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider -mt-1">
                  Learning Platform
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsProductSwitcherOpen(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
              title="Switch Product"
            >
              <Icon name="swap_horiz" size={16} />
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="truncate">
                <div className="font-bold text-white truncate">
                  {currentUser?.name ? `${currentUser.name.split(' ')[0]}'s Learning Portal` : 'Student Workspace'}
                </div>
                <div className="text-[10px] font-mono text-emerald-300/80 truncate">
                  Status: Active Learner
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
              LMS
            </span>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {navSections.map((sec) => (
            <div key={sec.section} className="space-y-1">
              <div className="px-3 text-[10px] font-mono font-bold text-emerald-400/70 tracking-wider uppercase">
                {sec.section}
              </div>
              <div className="space-y-0.5 pt-1">
                {sec.items.map((item) => {
                  const isActive = currentPath === item.href || (item.href !== LMS_ROUTES.DASHBOARD && currentPath.startsWith(item.href));

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          name={item.icon}
                          size={18}
                          className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}
                        />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Sidebar */}
        <div className="p-3 border-t border-emerald-500/15 space-y-2 bg-[#040712]">
          <button
            type="button"
            onClick={() => setIsProductSwitcherOpen(true)}
            className="w-full px-3 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-500/30 text-xs font-bold text-indigo-300 flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span>🚀</span>
              <span>Switch to MORENA TEACH Sales</span>
            </div>
            <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Icon name="logout" size={16} />
            <span>Sign Out of LMS</span>
          </button>
        </div>
      </aside>

      {/* Main LMS View */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Topbar */}
        <header className="h-16 px-4 sm:px-8 border-b border-emerald-500/15 bg-[#060a1a]/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white"
            >
              <Icon name="menu" size={20} />
            </button>
            <span className="text-xs font-mono font-bold text-slate-400">
              MORENA TEACH Learning &gt; {pageTitle || 'Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsTutorModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <span>✨</span>
              <span>Ask AI Tutor</span>
            </button>

            <Link
              href={LMS_ROUTES.COURSES}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
            >
              Explore Courses
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </main>
      </div>

      {/* AI Tutor Modal */}
      {isTutorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-[#090e22] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="text-base font-black text-white">MORENA TEACH AI Learning Tutor</h3>
              </div>
              <button
                onClick={() => setIsTutorModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleAskTutor} className="space-y-3">
              <textarea
                rows={3}
                value={tutorPrompt}
                onChange={(e) => setTutorPrompt(e.target.value)}
                placeholder="Ask any question about your lessons, concepts, or homework assignments..."
                className="w-full bg-white/[0.04] border border-white/15 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all resize-none"
              />
              <button
                type="submit"
                disabled={isTutorThinking || !tutorPrompt.trim()}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Icon name={isTutorThinking ? 'sync' : 'psychology'} size={16} className={isTutorThinking ? 'animate-spin' : ''} />
                <span>{isTutorThinking ? 'Consulting Knowledge Base...' : 'Ask Tutor'}</span>
              </button>
            </form>

            {tutorResponse && (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-2 leading-relaxed">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>💡 Tutor Answer:</span>
                </div>
                <p>{tutorResponse}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Switcher Modal */}
      <ProductSwitcherModal
        isOpen={isProductSwitcherOpen}
        onClose={() => setIsProductSwitcherOpen(false)}
        currentProduct="LEARNING"
      />
    </div>
  );
}
