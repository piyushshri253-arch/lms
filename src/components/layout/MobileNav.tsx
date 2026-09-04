'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '../ui/Icon';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  // Suppress on learning video player page
  if (pathname.startsWith('/learn')) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-surface-container-lowest border-t border-outline-variant/60 flex justify-around items-center py-2 px-2 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <Link
        href="/lms/dashboard"
        className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
          pathname.startsWith('/lms') || pathname.startsWith('/dashboard') || pathname.startsWith('/student') ? 'text-primary' : 'text-on-surface-variant'
        }`}
      >
        <div
          className={`px-3 py-1 rounded-full mb-0.5 ${
            pathname.startsWith('/lms') || pathname.startsWith('/dashboard') || pathname.startsWith('/student') ? 'bg-primary/10' : ''
          }`}
        >
          <Icon name="monitoring" fill={pathname.startsWith('/lms') || pathname.startsWith('/dashboard') || pathname.startsWith('/student')} size={20} />
        </div>
        <span className="text-[10px] font-semibold">Dashboard</span>
      </Link>

      <Link
        href="/lms/my-courses"
        className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
          pathname.startsWith('/lms/my-courses') || pathname.startsWith('/learn') ? 'text-primary' : 'text-on-surface-variant'
        }`}
      >
        <div className="px-3 py-1 mb-0.5">
          <Icon name="school" size={20} />
        </div>
        <span className="text-[10px] font-semibold">My Courses</span>
      </Link>

      <Link
        href="/courses"
        className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
          pathname === '/courses' || pathname === '/' ? 'text-primary' : 'text-on-surface-variant'
        }`}
      >
        <div
          className={`px-3 py-1 rounded-full mb-0.5 ${
            pathname === '/courses' || pathname === '/' ? 'bg-primary/10' : ''
          }`}
        >
          <Icon name="search" size={20} />
        </div>
        <span className="text-[10px] font-semibold">Browse</span>
      </Link>

      <Link
        href="/admin"
        className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
          pathname.startsWith('/admin') ? 'text-primary' : 'text-on-surface-variant'
        }`}
      >
        <div
          className={`px-3 py-1 rounded-full mb-0.5 ${
            pathname.startsWith('/admin') ? 'bg-primary/10' : ''
          }`}
        >
          <Icon name="admin_panel_settings" fill={pathname.startsWith('/admin')} size={20} />
        </div>
        <span className="text-[10px] font-semibold">Admin</span>
      </Link>
    </nav>
  );
};
