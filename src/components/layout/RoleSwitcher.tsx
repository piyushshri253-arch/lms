'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '../ui/Icon';

export const RoleSwitcher: React.FC = () => {
  const { role, setRole } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // If in learning player full-focus mode, minimize switcher
  const isLearnPlayer = pathname.startsWith('/learn');
  const isOrgAuth = pathname.startsWith('/org/') && (pathname.includes('/login') || pathname.includes('/register'));

  if (isOrgAuth) return null;

  const switchRole = (newRole: 'public' | 'student' | 'admin', targetPath: string) => {
    setRole(newRole);
    setIsOpen(false);
    router.push(targetPath);
  };

  return (
    <div className={`fixed bottom-5 left-5 z-40 ${isLearnPlayer ? 'opacity-40 hover:opacity-100 transition-opacity' : ''}`}>
      {isOpen && (
        <div className="mb-2 bg-surface-container-lowest border border-outline-variant rounded-2xl p-3 shadow-2xl w-64 animate-in slide-in-from-bottom-3 duration-200">
          <div className="text-xs font-semibold text-on-surface-variant px-2 py-1 uppercase tracking-wider mb-2 border-b border-outline-variant/40 flex items-center justify-between">
            <span>Switch Experience</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-outline hover:text-on-surface"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => switchRole('public', '/')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl text-left transition-all ${
                pathname === '/' || pathname.startsWith('/courses')
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <Icon name="storefront" size={18} fill={pathname === '/' || pathname.startsWith('/courses')} />
              <div>
                <p className="font-medium leading-none">Public / Marketplace</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Explore catalog & course details</p>
              </div>
            </button>

            <button
              onClick={() => switchRole('student', '/student')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl text-left transition-all ${
                pathname.startsWith('/student') || pathname.startsWith('/learn')
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <Icon name="school" size={18} fill={pathname.startsWith('/student')} />
              <div>
                <p className="font-medium leading-none">Student Portal</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">My progress, player & streak</p>
              </div>
            </button>

            <button
              onClick={() => switchRole('admin', '/admin')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl text-left transition-all ${
                pathname.startsWith('/admin') && !pathname.startsWith('/super-admin')
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <Icon name="admin_panel_settings" size={18} fill={pathname.startsWith('/admin') && !pathname.startsWith('/super-admin')} />
              <div>
                <p className="font-medium leading-none">Admin &amp; Creator</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Analytics, content &amp; marketing</p>
              </div>
            </button>

            <button
              onClick={() => switchRole('admin', '/super-admin')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl text-left transition-all ${
                pathname.startsWith('/super-admin')
                  ? 'bg-amber-500/20 text-amber-700 font-bold border border-amber-500/40'
                  : 'text-on-surface hover:bg-amber-500/10'
              }`}
            >
              <Icon name="shield" size={18} fill={pathname.startsWith('/super-admin')} className="text-amber-600" />
              <div>
                <p className="font-bold leading-none text-amber-900">Super Admin</p>
                <p className="text-[11px] text-amber-700/80 mt-0.5">Full control center &amp; support</p>
              </div>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all text-xs font-semibold border border-outline-variant/40"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="capitalize font-extrabold">
          {pathname.startsWith('/super-admin')
            ? 'Super Admin Mode'
            : pathname.startsWith('/admin')
            ? 'Admin Mode'
            : pathname.startsWith('/student') || pathname.startsWith('/learn')
            ? 'Student Mode'
            : 'Public Store'}
        </span>
        <Icon name={isOpen ? 'expand_more' : 'unfold_more'} size={16} />
      </button>
    </div>
  );
};
