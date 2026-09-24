'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export const SuperAdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();

  const navGroups = [
    {
      group: 'Core Platform',
      items: [
        { label: 'Platform Overview', href: '/super-admin', icon: 'dashboard' },
        { label: 'Tenant Organizations', href: '/super-admin/admins', icon: 'domain' },
        { label: 'Student Directory', href: '/super-admin/students', icon: 'school' },
        { label: 'Faculty & Auditors', href: '/super-admin/instructors', icon: 'groups' },
        { label: 'Audit Studio (QA)', href: '/reviewer', icon: 'verified' }
      ]
    },
    {
      group: 'Learning Architecture',
      items: [
        { label: 'Master Courses', href: '/super-admin/courses', icon: 'menu_book' },
        { label: 'Accredited Certificates', href: '/super-admin/certificates', icon: 'workspace_premium' },
        { label: 'Category Taxonomy', href: '/super-admin/categories', icon: 'category' }
      ]
    },
    {
      group: 'Commerce & Subscriptions',
      items: [
        { label: 'Orders & Payments', href: '/super-admin/orders', icon: 'receipt_long' },
        { label: 'Refunds Center', href: '/super-admin/refunds', icon: 'currency_exchange' },
        { label: 'Promo Coupons', href: '/super-admin/coupons', icon: 'confirmation_number' }
      ]
    },
    {
      group: 'Broadcasts & Support',
      items: [
        { label: 'Platform Announcements', href: '/super-admin/announcements', icon: 'campaign' },
        { label: 'Broadcast Notifications', href: '/super-admin/notifications', icon: 'notifications' },
        { label: 'Support Desk', href: '/super-admin/support', icon: 'support_agent' }
      ]
    },
    {
      group: 'System & Security',
      items: [
        { label: 'Master Profile', href: '/super-admin/profile', icon: 'person' },
        { label: 'Email / SMTP Config', href: '/super-admin/settings/email', icon: 'mail' },
        { label: 'System Health', href: '/super-admin/health', icon: 'health_and_safety' },
        { label: 'Audit Trail', href: '/super-admin/audit', icon: 'history' },
        { label: 'Platform Settings', href: '/super-admin/settings', icon: 'settings' }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant flex flex-col h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between">
        <Link href="/super-admin" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-primary text-on-primary rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform">
            A
          </div>
          <div>
            <span className="font-extrabold text-sm text-on-surface tracking-tight block leading-tight">
              MORENA TEACH
            </span>
            <span className="text-[10px] font-mono text-outline font-bold">
              SUPER ADMINISTRATOR
            </span>
          </div>
        </Link>
      </div>

      {/* Nav Hierarchy */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((g, idx) => (
          <div key={`${g.group}-${idx}`} className="space-y-1">
            <p className="px-3 text-[10px] font-mono font-extrabold uppercase tracking-wider text-outline">
              {g.group}
            </p>
            <div className="space-y-0.5 pt-0.5">
              {g.items.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={`${g.group}-${item.label}-${item.href}`}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-xs font-extrabold'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <Icon name={item.icon} size={18} fill={isActive} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-outline-variant/60 bg-surface-container-low/40">
        <Link
          href="/super-admin/profile"
          className="flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 transition-colors block"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              avatar={currentUser?.avatar}
              name={currentUser?.name || 'Super Admin'}
              size="sm"
              shape="rounded"
              className="w-8 h-8"
            />
            <div className="min-w-0">
              <p className="font-extrabold text-xs text-on-surface truncate">
                {currentUser?.name || 'Super Admin'}
              </p>
              <p className="text-[10px] font-mono text-primary truncate font-bold">
                SUPER_ADMIN
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              logout();
            }}
            className="p-1.5 text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-colors cursor-pointer"
            title="Sign Out"
          >
            <Icon name="logout" size={16} />
          </button>
        </Link>
      </div>
    </aside>
  );
};
