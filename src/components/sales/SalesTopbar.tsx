'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface SalesTopbarProps {
  organization: any;
  user: any;
  onOpenMobileSidebar: () => void;
  onOpenAiAssistant: () => void;
  onOpenGlobalCreate: () => void;
}

export const SalesTopbar: React.FC<SalesTopbarProps> = ({
  organization,
  user,
  onOpenMobileSidebar,
  onOpenAiAssistant,
  onOpenGlobalCreate
}) => {
  const router = useRouter();
  const { logout } = useApp();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, title: 'New Paid Order #1024', desc: 'Aarav purchased Graphic Design Masterclass (₹4,999)', time: '5m ago', icon: 'shopping_bag', color: 'text-emerald-400' },
    { id: 2, title: 'New Customer Lead', desc: 'Rohan submitted the website contact form', time: '28m ago', icon: 'person_add', color: 'text-indigo-400' },
    { id: 3, title: 'Payment Settlement', desc: 'Razorpay payout of ₹3,599 settled to bank', time: '2h ago', icon: 'payments', color: 'text-purple-400' },
    { id: 4, title: 'Custom Domain Connected', desc: 'graphicproacademy.com is active with SSL', time: '1d ago', icon: 'language', color: 'text-blue-400' }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/admin/orders?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#060814]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 lg:hidden cursor-pointer"
        >
          <Icon name="menu" size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 font-bold">{organization?.name || 'Workspace'}</span>
          <span className="text-slate-600">/</span>
          <span className="text-white font-bold">Sales Command Center</span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, orders, customers..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] focus:bg-black/60 border border-white/10 focus:border-indigo-500 text-white text-xs placeholder:text-slate-500 focus:outline-none transition-all"
          />
        </div>
      </form>

      {/* Right Cluster: AI Button, Notifications, Help & Profile */}
      <div className="flex items-center gap-2.5">
        {/* Ask AI Button */}
        <button
          type="button"
          onClick={onOpenAiAssistant}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/25 flex items-center gap-1.5 transition-all cursor-pointer border border-white/15"
        >
          <span>✨</span>
          <span className="hidden sm:inline">Ask AI</span>
        </button>

        {/* Global + Create Button */}
        <button
          type="button"
          onClick={onOpenGlobalCreate}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-1 transition-all cursor-pointer"
        >
          <Icon name="add" size={16} />
          <span className="hidden sm:inline">Create</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors relative cursor-pointer"
          >
            <Icon name="notifications" size={18} />
            <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-2 right-2 ring-2 ring-[#060814]" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#090d24] border border-white/15 shadow-2xl p-4 space-y-3 z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-black text-white uppercase font-mono tracking-wider">Notifications</span>
                <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">4 Unread</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-start gap-3 transition-colors cursor-pointer"
                  >
                    <div className={`p-1.5 rounded-lg bg-white/5 ${n.color} shrink-0 mt-0.5`}>
                      <Icon name={n.icon} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white leading-snug">{n.title}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{n.desc}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/10 text-center">
                <Link
                  href="/admin/notifications"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Help Link */}
        <Link
          href="/admin/support"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
        >
          <Icon name="help_outline" size={18} />
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md border border-white/20">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <Icon name="expand_more" size={14} className="text-slate-400 hidden sm:inline" />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#090d24] border border-white/15 shadow-2xl p-2 z-50 animate-fadeIn text-xs space-y-1">
              <div className="px-3 py-2 border-b border-white/10">
                <div className="font-bold text-white truncate">{user?.name || 'Administrator'}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@business.com'}</div>
              </div>

              <Link
                href="/admin/profile"
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
              >
                <Icon name="person" size={16} />
                <span>My Profile</span>
              </Link>

              <Link
                href="/admin/settings"
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
              >
                <Icon name="business" size={16} />
                <span>Business Profile</span>
              </Link>

              <Link
                href="/admin/settings?tab=security"
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
              >
                <Icon name="shield" size={16} />
                <span>Security</span>
              </Link>

              <Link
                href="/admin/wallet"
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
              >
                <Icon name="receipt_long" size={16} />
                <span>Billing &amp; Wallet</span>
              </Link>

              <Link
                href="/admin/settings"
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
              >
                <Icon name="settings" size={16} />
                <span>Settings</span>
              </Link>

              <div className="pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileMenuOpen(false);
                    if (logout) await logout();
                    router.push('/login?portal=admin');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Icon name="logout" size={16} />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
