'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';
import { LMS_ROUTES } from '@/lib/lms-routes';

interface StudentSidebarProps {
  onClose?: () => void;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({ onClose }) => {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();
  const [currentTab, setCurrentTab] = useState('overview');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setCurrentTab(params.get('tab') || 'overview');
    }
  }, [pathname]);

  const navSections = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', href: LMS_ROUTES.DASHBOARD, tabKey: 'overview', icon: 'dashboard' },
        { label: 'My Courses', href: LMS_ROUTES.MY_COURSES, tabKey: 'courses', icon: 'school' },
        { label: 'Explore Courses', href: LMS_ROUTES.COURSES, icon: 'explore' },
        { label: 'Wishlist', href: LMS_ROUTES.WISHLIST, tabKey: 'wishlist', icon: 'favorite' }
      ]
    },
    {
      title: 'Learning',
      items: [
        { label: 'Continue Learning', href: `${LMS_ROUTES.MY_COURSES}?tab=IN_PROGRESS`, tabKey: 'continue', icon: 'play_circle' },
        { label: 'Certificates', href: LMS_ROUTES.CERTIFICATES, tabKey: 'certificates', icon: 'workspace_premium' },
        { label: 'My Reviews', href: LMS_ROUTES.REVIEWS, tabKey: 'reviews', icon: 'star' }
      ]
    },
    {
      title: 'Account',
      items: [
        { label: 'Orders & Receipts', href: LMS_ROUTES.ORDERS, tabKey: 'orders', icon: 'receipt_long' },
        { label: 'Notifications', href: LMS_ROUTES.NOTIFICATIONS, tabKey: 'notifications', icon: 'notifications' },
        { label: 'Profile', href: LMS_ROUTES.PROFILE, tabKey: 'profile', icon: 'person' },
        { label: 'Settings', href: LMS_ROUTES.SETTINGS, tabKey: 'settings', icon: 'settings' }
      ]
    }
  ];

  return (
    <>
      <aside className="w-[280px] h-screen sticky top-0 left-0 bg-surface-container-lowest border-r border-outline-variant/80 flex flex-col py-5 z-40 shrink-0 select-none shadow-xs">
        {/* Brand Header */}
        <div className="px-5 mb-5 flex items-center justify-between">
          <Link href={LMS_ROUTES.DASHBOARD} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-105 transition-transform">
              🎓
            </div>
            <div>
              <h1 className="font-extrabold text-base text-primary leading-tight flex items-center gap-1.5">
                <span>AADHYARA</span>
              </h1>
              <p className="text-[11px] text-on-surface-variant font-medium truncate max-w-[150px]">
                {currentUser?.organizationName || 'Learning Platform'}
              </p>
            </div>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container"
            >
              <Icon name="close" size={20} />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 space-y-4 overflow-y-auto sidebar-scroll">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              <h3 className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-outline mb-1.5">
                {sec.title}
              </h3>
              {sec.items.map((item) => {
                let isActive = false;
                if (pathname === item.href || (pathname.startsWith('/lms') && pathname === item.href)) {
                  isActive = true;
                } else if (pathname === '/student' && item.tabKey && currentTab === item.tabKey) {
                  isActive = true;
                } else if (item.href === LMS_ROUTES.DASHBOARD && (pathname === '/student' || pathname === LMS_ROUTES.DASHBOARD) && currentTab === 'overview') {
                  isActive = true;
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      if (item.tabKey) setCurrentTab(item.tabKey);
                      if (onClose) onClose();
                    }}
                    className={`flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-sm scale-[0.99]'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      fill={isActive}
                      size={18}
                      className={isActive ? 'text-on-primary' : 'text-primary/70'}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="px-3.5 mt-auto pt-3 border-t border-outline-variant/50 space-y-2">
          <div className="p-2.5 bg-surface-container-low/70 rounded-2xl border border-outline-variant/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                avatar={currentUser?.avatar}
                name={currentUser?.name || 'Learner'}
                size="sm"
                className="w-8 h-8"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-on-surface truncate">{currentUser?.name || 'Learner'}</p>
                <p className="text-[10px] text-primary font-bold uppercase">{currentUser?.role || 'STUDENT'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="text-outline hover:text-error p-1 rounded-lg hover:bg-error-container/20 transition-colors cursor-pointer"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
