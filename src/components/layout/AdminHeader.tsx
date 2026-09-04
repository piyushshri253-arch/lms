'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuToggle }) => {
  const router = useRouter();
  const { currentUser, logout, showToast } = useApp();

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

  const companySlug = currentUser?.organizationSlug || 'academy';
  const companyName = currentUser?.organizationName || 'Company Admin Portal';

  return (
    <header className="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 h-16 shadow-xs select-none">
      {/* Left: Mobile Menu Toggle & Tenant Title */}
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

        {/* Dynamic Tenant Title Badge */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black text-on-surface tracking-tight truncate max-w-[200px]">
            {companyName}
          </span>
          <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700">
            {currentUser?.plan || 'PRO'} ADMIN
          </span>
        </div>
      </div>

      {/* Center: Search Bar */}
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
            placeholder="Search courses, curriculum, students..."
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
                  href={`/admin?tab=courses&search=${encodeURIComponent(c.title)}`}
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

      {/* Right Controls: Storefront Link, Create Course, Notifications & Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Storefront Link */}
        <Link
          href={`/org/${companySlug}`}
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/80 hover:border-primary text-xs font-bold text-on-surface hover:text-primary bg-surface-container-lowest hover:bg-surface-container-low transition-all"
          title="View your public company website & course catalog"
        >
          <Icon name="visibility" size={15} />
          <span>Live Storefront</span>
          <Icon name="north_east" size={12} className="text-outline" />
        </Link>

        {/* Website Builder Shortcut */}
        <Link
          href="/admin/website/builder"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all"
        >
          <Icon name="palette" size={15} />
          <span>Website Builder</span>
        </Link>

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
                <span className="text-[10px] font-mono text-outline">{notifications.length} Total</span>
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
                  {currentUser?.email || 'admin@company.com'}
                </p>
                <p className="text-[10px] font-semibold text-primary truncate pt-0.5">
                  {companyName}
                </p>
              </div>

              {/* Explicit Admin Profile Link */}
              <Link
                href="/admin/profile"
                onClick={() => setIsProfileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors group"
              >
                <Icon name="badge" size={17} className="text-primary group-hover:scale-110 transition-transform" />
                <span>My Profile</span>
              </Link>

              {/* Company Profile & Branding */}
              <Link
                href="/admin/settings?tab=profile"
                onClick={() => setIsProfileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors group"
              >
                <Icon name="business" size={17} className="text-primary group-hover:scale-110 transition-transform" />
                <span>Company Profile</span>
              </Link>

              {/* Website Builder */}
              <Link
                href="/admin/website/builder"
                onClick={() => setIsProfileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors group"
              >
                <Icon name="palette" size={17} className="text-primary group-hover:scale-110 transition-transform" />
                <span>Website Builder</span>
              </Link>

              {/* Settings */}
              <Link
                href="/admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors group"
              >
                <Icon name="settings" size={17} className="text-primary group-hover:scale-110 transition-transform" />
                <span>Company Settings</span>
              </Link>

              {/* Sign Out */}
              <div className="pt-1 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
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
    </header>
  );
};
