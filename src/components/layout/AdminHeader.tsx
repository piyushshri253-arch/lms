'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuToggle }) => {
  const router = useRouter();
  const { currentUser, logout } = useApp();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Profile Dropdown State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Notifications State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Help & Support Modal State
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    // Fetch notifications for the admin
    fetch('/api/notifications')
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/courses?search=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.courses || []);
            setShowSearchResults(true);
          }
        } catch {
        } finally {
          setIsSearching(false);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const companySlug = currentUser?.organizationSlug || 'aadhyara';

  return (
    <header className="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 h-16 shadow-xs select-none">
      {/* Left: Mobile Menu Toggle, AADHYARA Brand & Facility Switcher */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Toggle Sidebar"
          >
            <Icon name="menu" size={20} />
          </button>
        )}

        {/* Brand Logo & Name */}
        <Link href="/admin" className="flex items-center gap-2 mr-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center font-black text-sm shadow-sm tracking-tighter">
            M
          </div>
          <span className="font-black text-sm text-on-surface tracking-tight hidden sm:inline-block">
            MORENA TEACH <span className="text-primary font-bold">LMS</span>
          </span>
        </Link>

        {/* Platform Role Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-xs font-semibold text-on-surface">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-on-surface-variant">
            {currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin Portal' : 'Admin Console'}
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            placeholder="Search students, courses, enrollments, reports..."
            className="w-full bg-surface-container-low border border-outline-variant/80 rounded-2xl pl-10 pr-10 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
          />
          {isSearching && (
            <Icon
              name="sync"
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin"
            />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden divide-y divide-outline-variant/40 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-2.5 bg-surface-container-low text-[10px] font-mono font-extrabold uppercase text-outline flex justify-between">
              <span>{searchResults.length} Result(s)</span>
              <span>Click to view</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/20">
              {searchResults.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/courses?search=${encodeURIComponent(c.title)}`}
                  onClick={() => setShowSearchResults(false)}
                  className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors block group"
                >
                  <div>
                    <span className="font-extrabold text-xs text-on-surface group-hover:text-primary transition-colors">
                      {c.title}
                    </span>
                    <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                      {c.category?.name || 'Curriculum'} • {c.level || 'All Levels'}
                    </p>
                  </div>
                  <Icon name="arrow_forward" size={14} className="text-outline group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Storefront, Help/Support, Notifications & Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Storefront Link */}
        <Link
          href={`/org/${companySlug}`}
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/80 hover:border-primary text-xs font-bold text-on-surface hover:text-primary bg-surface-container-lowest hover:bg-surface-container-low transition-all"
          title="View your public institution course catalog"
        >
          <Icon name="visibility" size={15} />
          <span>Live Storefront</span>
          <Icon name="north_east" size={12} className="text-outline" />
        </Link>

        {/* Help & Support Button */}
        <button
          type="button"
          onClick={() => setIsHelpOpen(true)}
          className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          title="Help & Support"
        >
          <Icon name="help_outline" size={20} />
        </button>

        {/* Notifications Bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Icon name="notifications" size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-surface-container-lowest" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2.5 bg-surface-container-low rounded-xl flex items-center justify-between mb-1">
                <span className="font-extrabold text-xs text-on-surface">Notifications</span>
                <Link
                  href="/admin/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-[10px] font-mono text-primary font-bold hover:underline"
                >
                  View All ({notifications.length})
                </Link>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/20">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-xs text-outline">No new notifications</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="p-2.5 hover:bg-surface-container-low transition-colors rounded-lg">
                      <p className="text-xs font-bold text-on-surface">{n.title}</p>
                      <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-outline-variant/60 mx-1" />

        {/* Admin Profile Dropdown Button */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-surface-container transition-all cursor-pointer group border border-transparent hover:border-outline-variant"
            title="Administrator Account"
          >
            <UserAvatar
              avatar={currentUser?.avatar}
              name={currentUser?.name || 'Administrator'}
              size="sm"
              className="w-9 h-9 border border-outline-variant"
            />
            <div className="hidden lg:block text-left pr-1">
              <p className="text-xs font-black text-on-surface leading-tight truncate max-w-[120px]">
                {currentUser?.name || 'Administrator'}
              </p>
              <p className="text-[10px] font-mono font-extrabold text-primary uppercase">
                ADMIN
              </p>
            </div>
            <Icon name="expand_more" size={16} className="text-outline group-hover:text-on-surface transition-colors" />
          </button>

          {/* Admin Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-64 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header Box */}
              <div className="p-3 bg-surface-container-low rounded-xl space-y-1 mb-1">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-xs text-on-surface truncate">
                    {currentUser?.name || 'Administrator'}
                  </p>
                  <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700">
                    ADMIN
                  </span>
                </div>
                <p className="text-[10px] text-outline font-mono truncate">
                  {currentUser?.email || 'admin@morenateach.com'}
                </p>
                <p className="text-[10px] font-semibold text-primary truncate pt-0.5 flex items-center gap-1">
                  <Icon name="verified" size={12} />
                  <span>MORENA TEACH LMS</span>
                </p>
              </div>

              {/* Explicit Admin Profile Link */}
              <Link
                href="/admin/profile"
                onClick={() => setIsProfileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors group"
              >
                <Icon name="badge" size={17} className="text-primary group-hover:scale-110 transition-transform" />
                <span>My Profile & Permissions</span>
              </Link>

              {/* Platform Settings */}
              <Link
                href="/admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors group"
              >
                <Icon name="settings" size={17} className="text-primary group-hover:scale-110 transition-transform" />
                <span>Platform Settings</span>
              </Link>

              {/* Sign Out */}
              <div className="pt-1 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await logout();
                    window.location.href = '/admin/login';
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-error hover:bg-error-container/20 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Icon name="logout" size={17} className="text-error" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help & Support Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Icon name="help_outline" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">MORENA TEACH Help & Support</h3>
                  <p className="text-[11px] text-outline font-mono">Documentation & LMS Assistance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-on-surface-variant">
              <div className="p-3 bg-surface-container-low rounded-xl space-y-1">
                <p className="font-bold text-on-surface">MORENA TEACH LMS Operations</p>
                <p className="text-[11px]">
                  MORENA TEACH LMS operates as a single unified educational ecosystem. All approved courses automatically connect to the main landing page.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl space-y-1">
                <p className="font-bold text-on-surface">Role-Based Access (RBAC)</p>
                <p className="text-[11px]">
                  Your actions are strictly governed by your assigned permissions. Check your accessible roles and granted permissions in <Link href="/admin/profile" onClick={() => setIsHelpOpen(false)} className="text-primary underline font-bold">My Profile</Link>.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl space-y-1">
                <p className="font-bold text-on-surface">Contact Platform Support</p>
                <p className="text-[11px]">
                  Direct Support Desk: <strong className="font-mono text-on-surface">support@morenateach.com</strong><br />
                  Emergency Hotline: <strong className="font-mono text-on-surface">+91 1800-MORENA</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Close Support
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
