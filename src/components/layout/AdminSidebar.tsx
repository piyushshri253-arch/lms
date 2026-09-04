'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';
import { useApp } from '@/context/AppContext';

interface AdminSidebarProps {
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onClose }) => {
  const pathname = usePathname();
  const [currentTab, setCurrentTab] = useState('overview');
  const { currentUser, logout } = useApp();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setCurrentTab(params.get('tab') || 'overview');
    }
  }, [pathname]);

  const companyName = currentUser?.organizationName || 'Company Portal';
  const companyInitial = companyName.charAt(0).toUpperCase();

  const navSections = [
    {
      title: 'Command Center',
      items: [
        { label: 'Overview & Analytics', href: '/admin?tab=overview', tabKey: 'overview', icon: 'dashboard' },
        { label: 'AI Platform & Copilot', href: '/admin/ai', icon: 'sparkles' },
        { label: 'Audit Activity Log', href: '/admin?tab=audit', tabKey: 'audit', icon: 'history' }
      ]
    },
    {
      title: 'Website & Digital Store',
      items: [
        { label: 'Website Builder', href: '/admin/website/builder', icon: 'web' },
        { label: 'Storefront Pages', href: '/admin/website/pages', icon: 'auto_stories' },
        { label: 'Navigation & Footer', href: '/admin/website/navigation', icon: 'menu_book' },
        { label: 'Storefront Analytics', href: '/admin/website/analytics', icon: 'query_stats' }
      ]
    },
    {
      title: 'Education & Catalog',
      items: [
        { label: 'All Courses', href: '/admin?tab=courses', tabKey: 'courses', icon: 'school' },
        { label: 'Curriculum Studio', href: '/admin/courses/builder', icon: 'auto_stories' },
        { label: 'Categories Taxonomy', href: '/admin?tab=categories', tabKey: 'categories', icon: 'category' }
      ]
    },
    {
      title: 'Users & Learning',
      items: [
        { label: 'Students & CRM', href: '/admin?tab=students', tabKey: 'students', icon: 'people' },
        { label: 'Instructors', href: '/admin?tab=instructors', tabKey: 'instructors', icon: 'supervisor_account' },
        { label: 'Reviews & Ratings', href: '/admin?tab=reviews', tabKey: 'reviews', icon: 'star' },
        { label: 'Certificates Hub', href: '/admin?tab=certificates', tabKey: 'certificates', icon: 'workspace_premium' }
      ]
    },
    {
      title: 'Commerce & Digital Store',
      items: [
        { label: 'Products & Software', href: '/admin/products', icon: 'shopping_bag' },
        { label: 'Software Licenses', href: '/admin/licenses', icon: 'key' },
        { label: 'Services & Bookings', href: '/admin/services', icon: 'work' },
        { label: 'Seller Wallet & Payouts', href: '/admin/wallet', icon: 'account_balance_wallet' },
        { label: 'Orders & Revenue', href: '/admin?tab=orders', tabKey: 'orders', icon: 'payments' },
        { label: 'Coupons & Discounts', href: '/admin/marketing', icon: 'sell' },
        { label: 'Announcements Hub', href: '/admin?tab=announcements', tabKey: 'announcements', icon: 'campaign' }
      ]
    },
    {
      title: 'Organization Settings',
      items: [
        { label: 'Administrator Profile', href: '/admin/profile', icon: 'badge' },
        { label: 'Company Profile', href: '/admin/settings?tab=profile', icon: 'business' },
        { label: 'Branding & Theme', href: '/admin/settings?tab=branding', icon: 'palette' },
        { label: 'Payment Gateway', href: '/admin/settings?tab=payments', icon: 'credit_card' },
        { label: 'Email & SMTP', href: '/admin/settings?tab=email', icon: 'mail' },
        { label: 'Student Registration', href: '/admin/settings?tab=registration', icon: 'how_to_reg' },
        { label: 'All Settings', href: '/admin/settings', icon: 'settings' }
      ]
    }
  ];

  return (
    <aside className="w-[280px] h-screen sticky top-0 left-0 bg-surface-container-lowest border-r border-outline-variant/80 flex flex-col py-5 z-40 shrink-0 select-none shadow-xs">
      {/* Brand Header */}
      <div className="px-5 mb-5 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3 group min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-105 transition-transform shrink-0">
            {companyInitial}
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm text-on-surface leading-tight truncate flex items-center gap-1.5">
              <span>{companyName}</span>
            </h1>
            <p className="text-[11px] text-primary font-bold font-mono uppercase tracking-wider mt-0.5">
              {currentUser?.plan || 'PRO'} • ADMIN
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
              if (item.tabKey) {
                isActive = pathname === '/admin' && currentTab === item.tabKey;
              } else {
                isActive = pathname === item.href || (item.href.includes('?') && pathname + (typeof window !== 'undefined' ? window.location.search : '') === item.href);
              }

              return (
                <Link
                  key={`${sec.title}-${item.label}-${item.href}`}
                  href={item.href}
                  onClick={() => {
                    if (item.tabKey) setCurrentTab(item.tabKey);
                    if (onClose) onClose();
                  }}
                  className={`flex items-center gap-3 py-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
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

      {/* User Profile Footer & Switcher */}
      <div className="px-3.5 mt-auto pt-3 border-t border-outline-variant/50 space-y-2">
        <Link
          href="/admin/profile"
          className="p-2.5 bg-surface-container-low/70 hover:bg-surface-container rounded-2xl border border-outline-variant/40 flex items-center justify-between transition-colors block"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              avatar={currentUser?.avatar}
              name={currentUser?.name || 'Admin'}
              size="sm"
              className="w-8 h-8"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{currentUser?.name || 'Admin'}</p>
              <p className="text-[10px] text-primary font-bold uppercase">{currentUser?.role || 'ADMIN'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              logout();
            }}
            title="Sign Out"
            className="text-outline hover:text-error p-1 rounded-lg hover:bg-error-container/20 transition-colors cursor-pointer"
          >
            <Icon name="logout" size={16} />
          </button>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href={`/org/${currentUser?.organizationSlug || 'academy'}`}
            target="_blank"
            className="flex-1 text-center py-1.5 px-2 bg-surface text-on-surface border border-outline-variant/60 hover:border-primary rounded-xl text-[11px] font-bold transition-all truncate"
          >
            Live Storefront ↗
          </Link>
          <Link
            href="/admin/settings"
            className="flex-1 text-center py-1.5 px-2 bg-surface text-on-surface border border-outline-variant/60 hover:border-primary rounded-xl text-[11px] font-bold transition-all truncate"
          >
            Settings
          </Link>
        </div>
      </div>
    </aside>
  );
};
