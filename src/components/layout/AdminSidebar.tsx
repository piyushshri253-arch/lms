'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';

interface AdminSidebarProps {
  onClose?: () => void;
}

interface NavSubItem {
  label: string;
  href: string;
  requiredPermission?: string;
}

interface NavSection {
  title: string;
  icon: string;
  href?: string;
  requiredPermission?: string;
  requiredAnyPermissions?: string[];
  superAdminOnly?: boolean;
  subItems?: NavSubItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onClose }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, logout } = useApp();
  const { hasPermission, hasAnyPermission, isSuperAdmin } = useAdmin();

  // Track expanded accordion sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Students: true,
    Courses: true,
    Instructors: false,
    Enrollments: false,
    'Payments & Transactions': false,
    Certificates: false,
    'Reports & Analytics': false
  });

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const navSections: NavSection[] = [
    {
      title: 'Dashboard',
      icon: 'dashboard',
      href: '/admin'
    },
    {
      title: 'Manage Admins',
      icon: 'admin_panel_settings',
      href: '/admin/admins',
      superAdminOnly: true
    },
    {
      title: 'Students',
      icon: 'school',
      requiredPermission: 'student.view',
      subItems: [
        { label: 'All Students', href: '/admin/students' },
        { label: 'Add Student', href: '/admin/students?action=create', requiredPermission: 'student.create' },
        { label: 'Import Students', href: '/admin/students?action=import', requiredPermission: 'student.import' },
        { label: 'Student Groups', href: '/admin/students?tab=groups' }
      ]
    },
    {
      title: 'Instructors',
      icon: 'groups',
      requiredPermission: 'instructor.view',
      subItems: [
        { label: 'All Instructors', href: '/admin/instructors' },
        { label: 'Add Instructor', href: '/admin/instructors?action=create', requiredPermission: 'instructor.create' }
      ]
    },
    {
      title: 'Courses',
      icon: 'menu_book',
      requiredPermission: 'course.view',
      subItems: [
        { label: 'All Courses', href: '/admin/courses' },
        { label: 'Review & Approvals', href: '/admin/courses?tab=review', requiredPermission: 'course.publish' },
        { label: 'Create Course', href: '/admin/courses/create', requiredPermission: 'course.create' },
        { label: 'Course Categories', href: '/admin/courses?tab=categories' },
        { label: 'Course Reviews', href: '/admin/courses?tab=reviews' }
      ]
    },
    {
      title: 'Enrollments',
      icon: 'how_to_reg',
      requiredPermission: 'enrollment.view',
      subItems: [
        { label: 'Active Enrollments', href: '/admin/enrollments?status=active' },
        { label: 'Completed Enrollments', href: '/admin/enrollments?status=completed' },
        { label: 'Pending Requests', href: '/admin/enrollments?status=pending' }
      ]
    },
    {
      title: 'Payments & Transactions',
      icon: 'payments',
      requiredPermission: 'payment.view',
      subItems: [
        { label: 'All Transactions', href: '/admin/payments' },
        { label: 'Revenue Reports', href: '/admin/payments?tab=revenue' },
        { label: 'Invoices', href: '/admin/payments?tab=invoices' },
        { label: 'Refund Requests', href: '/admin/payments?tab=refunds', requiredPermission: 'payment.refund' }
      ]
    },
    {
      title: 'Certificates',
      icon: 'workspace_premium',
      requiredPermission: 'certificate.view',
      subItems: [
        { label: 'Issued Certificates', href: '/admin/certificates' },
        { label: 'Pending Certificates', href: '/admin/certificates?status=pending' },
        { label: 'Certificate Templates', href: '/admin/certificates?tab=templates' },
        { label: 'Verify Certificate', href: '/admin/certificates?tab=verify' }
      ]
    },
    {
      title: 'Announcements',
      icon: 'campaign',
      requiredPermission: 'notification.view',
      subItems: [
        { label: 'All Notices', href: '/admin/announcements' },
        { label: 'Student Notices', href: '/admin/announcements?tab=STUDENTS' },
        { label: 'Faculty Notices', href: '/admin/announcements?tab=INSTRUCTORS' },
        { label: 'Scheduled Queue', href: '/admin/announcements?tab=SCHEDULED' }
      ]
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      href: '/admin/notifications',
      requiredPermission: 'notification.view'
    },
    {
      title: 'Reports & Analytics',
      icon: 'bar_chart',
      requiredAnyPermissions: ['report.student', 'report.course', 'report.payment', 'report.learning'],
      subItems: [
        { label: 'Student Reports', href: '/admin/reports?type=students', requiredPermission: 'report.student' },
        { label: 'Course Performance', href: '/admin/reports?type=courses', requiredPermission: 'report.course' },
        { label: 'Revenue Analytics', href: '/admin/reports?type=revenue', requiredPermission: 'report.payment' }
      ]
    },
    {
      title: 'Coupons & Discounts',
      icon: 'sell',
      href: '/admin/coupons',
      requiredPermission: 'coupon.view'
    },
    {
      title: 'Admin Profile',
      icon: 'badge',
      href: '/admin/profile'
    },
    {
      title: 'Settings',
      icon: 'settings',
      href: '/admin/settings',
      requiredPermission: 'setting.view'
    }
  ];

  // Helper to test if a route is currently active
  const isRouteActive = (href?: string) => {
    if (!href) return false;
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    if (href === '/admin') {
      return pathname === '/admin' && (!searchParams.get('tab') || searchParams.get('tab') === 'overview');
    }
    return currentUrl === href || pathname === href.split('?')[0];
  };

  return (
    <aside className="w-[280px] h-screen sticky top-0 left-0 bg-surface-container-lowest border-r border-outline-variant/80 flex flex-col py-4 z-40 shrink-0 select-none shadow-xs">
      {/* Brand & Facility Header */}
      <div className="px-5 mb-4 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3 group min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-105 transition-transform shrink-0">
            A
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm text-on-surface leading-tight truncate">
              AADHYARA LMS
            </h1>
            <p className="text-[11px] text-emerald-600 font-bold truncate flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isSuperAdmin ? 'Super Admin' : (currentUser?.customRole || 'Admin Console')}</span>
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
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto sidebar-scroll">
        {navSections.map((sec) => {
          // Super Admin Only Guard
          if (sec.superAdminOnly && !isSuperAdmin) {
            return null;
          }

          // RBAC Guard for parent item
          if (sec.requiredPermission && !hasPermission(sec.requiredPermission)) {
            return null; // Auto-hide if lacking required permission!
          }
          if (sec.requiredAnyPermissions && !hasAnyPermission(sec.requiredAnyPermissions)) {
            return null; // Auto-hide if lacking all required permissions!
          }

          // Render direct link item (e.g. Dashboard, Coupons, Notifications, Profile, Settings)
          if (!sec.subItems || sec.subItems.length === 0) {
            const active = isRouteActive(sec.href);
            return (
              <Link
                key={sec.title}
                href={sec.href || '/admin'}
                onClick={() => onClose && onClose()}
                className={`flex items-center gap-3 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <Icon
                  name={sec.icon}
                  fill={active}
                  size={18}
                  className={active ? 'text-on-primary' : 'text-primary/70'}
                />
                <span>{sec.title}</span>
              </Link>
            );
          }

          // Filter sub-items based on granular permissions
          const visibleSubItems = sec.subItems.filter((sub) => {
            if (!sub.requiredPermission) return true;
            return hasPermission(sub.requiredPermission);
          });

          if (visibleSubItems.length === 0) {
            return null; // Auto-hide if no sub-items are permitted!
          }

          const isExpanded = expandedSections[sec.title];
          const hasActiveChild = visibleSubItems.some((sub) => isRouteActive(sub.href));

          return (
            <div key={sec.title} className="space-y-1">
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => toggleSection(sec.title)}
                className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  hasActiveChild
                    ? 'text-primary bg-primary/5 font-extrabold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    name={sec.icon}
                    size={18}
                    className={hasActiveChild ? 'text-primary' : 'text-primary/70'}
                  />
                  <span>{sec.title}</span>
                </div>
                <Icon
                  name="expand_more"
                  size={16}
                  className={`text-outline transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                />
              </button>

              {/* Accordion Sub-items */}
              {isExpanded && (
                <div className="pl-7 pr-1 space-y-1 pt-0.5">
                  {visibleSubItems.map((sub) => {
                    const active = isRouteActive(sub.href);
                    return (
                      <Link
                        key={`${sec.title}-${sub.label}`}
                        href={sub.href}
                        onClick={() => onClose && onClose()}
                        className={`block py-1.5 px-3 rounded-lg text-[12px] font-semibold transition-all ${
                          active
                            ? 'bg-primary text-on-primary font-bold shadow-2xs'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="px-3.5 mt-auto pt-3 border-t border-outline-variant/50 space-y-2">
        <Link
          href="/admin/profile"
          className="p-2.5 bg-surface-container-low/70 hover:bg-surface-container rounded-2xl border border-outline-variant/40 flex items-center justify-between transition-colors block"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              avatar={currentUser?.avatar}
              name={currentUser?.name || 'Administrator'}
              size="sm"
              className="w-8 h-8"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{currentUser?.name || 'Administrator'}</p>
              <p className="text-[10px] text-primary font-bold uppercase truncate">
                {currentUser?.role || 'ADMIN'} • AADHYARA
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
            title="Sign Out"
            className="text-outline hover:text-error p-1 rounded-lg hover:bg-error-container/20 transition-colors cursor-pointer"
          >
            <Icon name="logout" size={16} />
          </button>
        </Link>
      </div>
    </aside>
  );
};
