'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export const SuperAdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();

  const isFinanceRoute = pathname.startsWith('/super-admin/finance');
  const isSupportRoute = pathname.includes('/support');
  const [financeExpanded, setFinanceExpanded] = useState(true);
  const [supportExpanded, setSupportExpanded] = useState(true);

  // Keep expanded if user is in finance or support section
  useEffect(() => {
    if (isFinanceRoute) {
      setFinanceExpanded(true);
    }
    if (isSupportRoute) {
      setSupportExpanded(true);
    }
  }, [isFinanceRoute, isSupportRoute]);

  const supportSubmodules = [
    { label: 'All Inquiries', href: '/super-admin/support', icon: 'all_inclusive' },
    { label: 'Payment & Payouts', href: '/super-admin/support?category=PAYMENT_ISSUE', icon: 'payments' },
    { label: 'Course Approval QA', href: '/super-admin/support?category=COURSE_APPROVAL_ISSUE', icon: 'verified' },
    { label: 'Bank & KYC Verification', href: '/super-admin/support?category=BANK_VERIFICATION_ISSUE', icon: 'account_balance' },
    { label: 'Technical & Bug Desk', href: '/super-admin/support?category=TECHNICAL_ISSUE', icon: 'build' },
    { label: 'Faculty Inquiries', href: '/super-admin/support?role=INSTRUCTOR', icon: 'groups' },
    { label: 'Student Helpdesk', href: '/super-admin/support?role=STUDENT', icon: 'school' }
  ];

  const financeSubmodules = [
    { label: 'Financial Overview', href: '/super-admin/finance', icon: 'analytics' },
    { label: 'All Instructors', href: '/super-admin/finance/instructors', icon: 'badge' },
    { label: 'All Courses', href: '/super-admin/finance/courses', icon: 'auto_stories' },
    { label: 'Courses Sold', href: '/super-admin/finance/sales', icon: 'shopping_bag' },
    { label: 'Courses Refunded', href: '/super-admin/finance/refunds', icon: 'replay' },
    { label: 'Instructor Payments', href: '/super-admin/finance/payouts', icon: 'payments' },
    { label: 'Instructor Bank Details', href: '/super-admin/finance/bank-details', icon: 'account_balance' },
    { label: 'TDS Management', href: '/super-admin/finance/tds', icon: 'receipt' },
    { label: 'GST Management', href: '/super-admin/finance/gst', icon: 'percent' },
    { label: 'Payment Gateway Fees', href: '/super-admin/finance/gateway-fees', icon: 'credit_card' },
    { label: 'Transaction History', href: '/super-admin/finance/transactions', icon: 'receipt_long' },
    { label: 'Failed Transactions', href: '/super-admin/finance/failed-transactions', icon: 'error_outline' },
    { label: 'Financial Reports', href: '/super-admin/finance/reports', icon: 'description' },
    { label: 'Communication Center', href: '/super-admin/finance/communications', icon: 'forward_to_inbox' }
  ];

  const navGroups = [
    {
      group: 'Core Platform',
      items: [
        { label: 'Platform Overview', href: '/super-admin', icon: 'dashboard' },
        { label: 'Tenant Organizations', href: '/super-admin/admins', icon: 'domain' },
        { label: 'Student Directory', href: '/super-admin/students', icon: 'school' },
        { label: 'Faculty & Auditors', href: '/super-admin/instructors', icon: 'groups' },
        { label: 'Bank & Payout Approvals', href: '/super-admin/users', icon: 'account_balance' },
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
      group: 'Broadcasts & Outreach',
      items: [
        { label: 'Platform Announcements', href: '/super-admin/announcements', icon: 'campaign' },
        { label: 'Broadcast Notifications', href: '/super-admin/notifications', icon: 'notifications' }
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
        {/* Core Platform */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-mono font-extrabold uppercase tracking-wider text-outline">
            {navGroups[0].group}
          </p>
          <div className="space-y-0.5 pt-0.5">
            {navGroups[0].items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={`${item.label}-${item.href}`}
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

        {/* EXPANDABLE ACCOUNTS & FINANCE MODULE */}
        <div className="space-y-1 rounded-2xl bg-surface-container-low/60 p-1.5 border border-outline-variant/60">
          <div className="flex items-center justify-between px-2 pt-1 pb-1">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              FINANCIAL CORE
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
              14 MODULES
            </span>
          </div>

          <button
            type="button"
            onClick={() => setFinanceExpanded(!financeExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              isFinanceRoute
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-on-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Icon name="payments" size={17} />
              </div>
              <span className="truncate tracking-tight font-black text-xs">Accounts &amp; Finance</span>
            </div>
            <Icon
              name={financeExpanded ? 'expand_less' : 'expand_more'}
              size={18}
              className="text-outline transition-transform"
            />
          </button>

          {financeExpanded && (
            <div className="space-y-0.5 pt-1 pb-1 pl-1">
              {financeSubmodules.map((sub) => {
                const isSubActive = pathname === sub.href;
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      isSubActive
                        ? 'bg-primary text-on-primary shadow-xs font-extrabold'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <Icon name={sub.icon} size={15} fill={isSubActive} />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* EXPANDABLE SUPPORT & HELPDESK MODULE */}
        <div className="space-y-1 rounded-2xl bg-surface-container-low/60 p-1.5 border border-outline-variant/60">
          <div className="flex items-center justify-between px-2 pt-1 pb-1">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              INCIDENT &amp; TECH DESK
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
              7 QUEUES
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSupportExpanded(!supportExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              isSupportRoute
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-on-surface hover:bg-surface-container'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Icon name="support_agent" size={17} />
              </div>
              <span className="truncate tracking-tight font-black text-xs">Support &amp; Helpdesk</span>
            </div>
            <Icon
              name={supportExpanded ? 'expand_less' : 'expand_more'}
              size={18}
              className="text-outline transition-transform"
            />
          </button>

          {supportExpanded && (
            <div className="space-y-0.5 pt-1 pb-1 pl-1">
              {supportSubmodules.map((sub) => {
                const isSubActive = pathname === sub.href;
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      isSubActive
                        ? 'bg-primary text-on-primary shadow-xs font-extrabold'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <Icon name={sub.icon} size={15} fill={isSubActive} />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Other Nav Groups */}
        {navGroups.slice(1).map((g, idx) => (
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
