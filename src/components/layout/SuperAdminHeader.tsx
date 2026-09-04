'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export const SuperAdminHeader: React.FC = () => {
  const router = useRouter();
  const { currentUser, logout } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
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
          const res = await fetch(`/api/super-admin/search?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.results || []);
            setShowResults(true);
          }
        } catch {
        } finally {
          setIsSearching(false);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-20 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/80 px-6 py-3.5 flex items-center justify-between gap-4 h-16">
      {/* Global Cross-Entity Search */}
      <div ref={searchRef} className="relative flex-1 max-w-lg">
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
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Global search across students, admins, courses, orders, certificates, tickets..."
            className="w-full bg-surface border border-outline-variant/80 rounded-2xl pl-10 pr-10 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
          />
          {isSearching && (
            <Icon
              name="sync"
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin"
            />
          )}
        </div>

        {/* Live Search Modal Results */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden divide-y divide-outline-variant/40 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-2 bg-surface-container-low text-[10px] font-mono font-extrabold uppercase text-outline flex justify-between">
              <span>{searchResults.length} Match(es) Found</span>
              <span>ESC to close</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/20">
              {searchResults.map((r, i) => (
                <Link
                  key={i}
                  href={r.url}
                  onClick={() => setShowResults(false)}
                  className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors block group"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-primary px-1.5 py-0.5 rounded bg-primary/10 mr-2">
                      {r.type}
                    </span>
                    <span className="font-extrabold text-xs text-on-surface group-hover:text-primary transition-colors">
                      {r.title}
                    </span>
                    <p className="text-[11px] text-on-surface-variant font-mono mt-0.5 ml-1">
                      {r.subtitle}
                    </p>
                  </div>
                  <Icon name="arrow_forward" size={14} className="text-outline group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Health Badge & Admin Profile */}
      <div className="flex items-center gap-3">
        <Link
          href="/super-admin/health"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-[11px] font-mono font-extrabold hover:bg-emerald-500/20 transition-colors"
          title="All Platform Services Operational"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse" />
          <span className="hidden sm:inline">HEALTHY</span>
        </Link>

        <div className="h-6 w-[1px] bg-outline-variant/60" />

        <Link
          href="/super-admin/settings"
          className="p-2 border border-outline-variant rounded-xl text-outline hover:text-primary hover:bg-surface-container transition-colors"
          title="Platform Settings"
        >
          <Icon name="settings" size={18} />
        </Link>

        <Link
          href="/super-admin/profile"
          className="flex items-center gap-2 pl-2 border-l border-outline-variant/60 hover:opacity-80 transition-opacity"
          title="Open Master Profile"
        >
          <UserAvatar
            avatar={currentUser?.avatar}
            name={currentUser?.name || 'Super Admin'}
            size="sm"
            shape="rounded"
            className="w-8 h-8"
          />
          <div className="hidden md:block text-left">
            <p className="text-xs font-black text-on-surface leading-tight">
              {currentUser?.name || 'Super Admin'}
            </p>
            <span className="text-[10px] font-mono font-extrabold text-primary uppercase">
              SUPER_ADMIN
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};
