'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Globe,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ChevronDown,
  Bell,
  BarChart3,
  FileText,
  Sliders,
  Headphones,
  GraduationCap,
  User,
  Camera,
  Upload,
  Users,
  HelpCircle,
  TrendingUp,
  CheckSquare,
  Megaphone,
  BookOpen
} from 'lucide-react';

interface SeoPortalShellProps {
  children: React.ReactNode;
  activeNav?: string;
  onNavClick?: (nav: string) => void;
  pendingCount?: number;
  userName?: string;
  userRole?: string;
  onRoleChange?: (role: string, memberName?: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isTeamMember?: boolean;
  memberTaskCount?: number;
  timeRange?: '7D' | '30D' | '90D' | '1Y';
  onTimeRangeChange?: (range: '7D' | '30D' | '90D' | '1Y') => void;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80'
];

export function SeoPortalShell({
  children,
  activeNav = 'Overview',
  onNavClick,
  pendingCount = 12,
  userName = 'Rohit Sharma',
  userRole = 'SEO Manager',
  onRoleChange,
  searchQuery = '',
  onSearchChange,
  isTeamMember = false,
  memberTaskCount,
  timeRange = '90D',
  onTimeRangeChange
}: SeoPortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  // Synced Date Label
  const currentRangeLabel =
    timeRange === '7D'
      ? 'Last 7 Days'
      : timeRange === '30D'
      ? 'Last 30 Days'
      : timeRange === '1Y'
      ? 'Last 1 Year'
      : 'Last 90 Days';

  // Profile Customization State
  const [profileName, setProfileName] = useState(userName || 'Rohit Sharma');
  const [profileAvatar, setProfileAvatar] = useState('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80');
  const [profileRole, setProfileRole] = useState(userRole || 'SEO Manager');
  const [profileEmail, setProfileEmail] = useState('rohit@morenateach.com');
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);

  // Form inputs for Profile Modal
  const [inputName, setInputName] = useState(userName || 'Rohit Sharma');
  const [inputAvatar, setInputAvatar] = useState('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80');
  const [inputRole, setInputRole] = useState(userRole || 'SEO Manager');
  const [inputEmail, setInputEmail] = useState('rohit@morenateach.com');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileToast, setProfileToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with incoming parent props
  useEffect(() => {
    if (userName) {
      setProfileName(userName);
      setInputName(userName);
    }
    if (userRole) {
      setProfileRole(userRole);
      setInputRole(userRole);
    }
  }, [userName, userRole]);

  // Load persisted profile on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('morena_seo_profile');
      if (cached) {
        const p = JSON.parse(cached);
        if (p.name) {
          setProfileName(p.name);
          setInputName(p.name);
        }
        if (p.avatar) {
          setProfileAvatar(p.avatar);
          setInputAvatar(p.avatar);
        }
        if (p.roleTitle) {
          setProfileRole(p.roleTitle);
          setInputRole(p.roleTitle);
        }
        if (p.email) {
          setProfileEmail(p.email);
          setInputEmail(p.email);
        }
      }
    } catch {}

    // Fetch from backend API
    fetch('/api/seo/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.profile) {
          setProfileName(data.profile.name);
          setInputName(data.profile.name);
          if (data.profile.avatar) {
            setProfileAvatar(data.profile.avatar);
            setInputAvatar(data.profile.avatar);
          }
          if (data.profile.roleTitle) {
            setProfileRole(data.profile.roleTitle);
            setInputRole(data.profile.roleTitle);
          }
          if (data.profile.email) {
            setProfileEmail(data.profile.email);
            setInputEmail(data.profile.email);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenEditProfile = () => {
    setInputName(profileName);
    setInputAvatar(profileAvatar);
    setInputRole(profileRole);
    setInputEmail(profileEmail);
    setUserDropdownOpen(false);
    setEditProfileModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setInputAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch('/api/seo/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inputName,
          avatar: inputAvatar,
          roleTitle: inputRole,
          email: inputEmail
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      setProfileName(inputName);
      setProfileAvatar(inputAvatar);
      setProfileRole(inputRole);
      setProfileEmail(inputEmail);

      try {
        localStorage.setItem(
          'morena_seo_profile',
          JSON.stringify({
            name: inputName,
            avatar: inputAvatar,
            roleTitle: inputRole,
            email: inputEmail
          })
        );
      } catch {}

      setProfileToast('Profile & Photo updated successfully! ✓');
      setTimeout(() => setProfileToast(null), 3500);
      setEditProfileModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error updating profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Real-Time Notifications State
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Fetch real-time notifications from API
  const fetchLiveNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch('/api/seo/notifications', { cache: 'no-store' });
      const data = await res.json();
      if (data?.notifications) {
        const readIds: string[] = JSON.parse(localStorage.getItem('morena_seo_read_notifs') || '[]');
        const mapped = data.notifications.map((n: any) => ({
          ...n,
          unread: readIds.includes(n.id) ? false : n.unread
        }));
        setNotificationsList(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch live notifications:', e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchLiveNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return notificationsList.filter((n) => n.unread).length;
  }, [notificationsList]);

  const handleMarkAllRead = async () => {
    try {
      const allIds = notificationsList.map((n) => n.id);
      localStorage.setItem('morena_seo_read_notifs', JSON.stringify(allIds));
      setNotificationsList((prev) => prev.map((n) => ({ ...n, unread: false })));
      await fetch('/api/seo/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_ALL_READ' })
      });
    } catch {}
  };

  const handleNotificationClick = (item: any) => {
    const readIds: string[] = JSON.parse(localStorage.getItem('morena_seo_read_notifs') || '[]');
    if (!readIds.includes(item.id)) {
      readIds.push(item.id);
      localStorage.setItem('morena_seo_read_notifs', JSON.stringify(readIds));
    }
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    );

    if (item.targetNav && onNavClick) {
      onNavClick(item.targetNav);
    }
    setNotificationsOpen(false);
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('morena_seo_is_specialist');
        localStorage.removeItem('morena_seo_user_id');
        localStorage.removeItem('morena_seo_user_name');
        localStorage.removeItem('morena_seo_user_email');
        localStorage.removeItem('morena_seo_user_role');
      }
      await fetch('/api/auth/logout?portal=SEO', { method: 'POST' });
    } catch {}
    router.push('/seo/login');
  };

  // 12 Sidebar Navigation Items matching User prompt & Uploaded Screenshot!
  const navItems = isTeamMember
    ? [
        {
          id: 'Overview',
          label: 'Overview',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'Course SEO',
          label: 'Course SEO',
          icon: GraduationCap,
          badge: memberTaskCount !== undefined && memberTaskCount > 0 ? String(memberTaskCount) : null,
          badgeColor: 'bg-blue-600 text-white'
        },
        {
          id: 'Task Management',
          label: 'Task Management',
          icon: CheckSquare,
          badge: memberTaskCount !== undefined && memberTaskCount > 0 ? String(memberTaskCount) : '2',
          badgeColor: 'bg-blue-600 text-white'
        },
        {
          id: 'Reports',
          label: 'Reports',
          icon: FileText,
          badge: null
        },
        {
          id: 'Notifications',
          label: 'Notifications',
          icon: Bell,
          badge: unreadCount > 0 ? String(unreadCount) : null,
          badgeColor: 'bg-rose-500 text-white'
        },
        {
          id: 'Talk to Manager',
          label: 'Talk to Manager',
          icon: HelpCircle,
          badge: null
        },
        {
          id: 'Settings',
          label: 'Settings',
          icon: Settings,
          badge: null
        }
      ]
    : [
        {
          id: 'Overview',
          label: 'Overview',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'Course SEO',
          label: 'Course SEO',
          icon: GraduationCap,
          badge: '33',
          badgeColor: 'bg-blue-600 text-white'
        },
        {
          id: 'Website Pages SEO',
          label: 'Website Pages SEO',
          icon: Globe,
          badge: null
        },
        {
          id: 'My Team',
          label: 'My Team',
          icon: Users,
          badge: null
        },
        {
          id: 'Task Management',
          label: 'Task Management',
          icon: CheckSquare,
          badge: null
        },
        {
          id: 'Google Search Console',
          label: 'Google Search Console',
          icon: Search,
          badge: null
        },
        {
          id: 'Google Analytics',
          label: 'Google Analytics',
          icon: BarChart3,
          badge: null
        },
        {
          id: 'Meta Ads',
          label: 'Meta Ads',
          icon: Megaphone,
          badge: null
        },
        {
          id: 'Reports',
          label: 'Reports',
          icon: FileText,
          badge: null
        },
        {
          id: 'Notifications',
          label: 'Notifications',
          icon: Bell,
          badge: unreadCount > 0 ? String(unreadCount) : null,
          badgeColor: 'bg-rose-500 text-white'
        },
        {
          id: 'Integrations',
          label: 'Integrations',
          icon: Sliders,
          badge: null
        },
        {
          id: 'Settings',
          label: 'Settings',
          icon: Settings,
          badge: null
        }
      ];

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f8fafc] text-slate-900 flex font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* ======================================================== */}
      {/* 1. LEFT DARK NAVY SIDEBAR (Exact Match to Uploaded Image) */}
      {/* ======================================================== */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-40 w-64 h-screen bg-white text-slate-700 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 shrink-0 border-r border-slate-200/90 shadow-xs select-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          {/* Logo Header: Morena Teach Official Logo with Homepage Navigation */}
          <div className="p-4 sm:p-5 pb-5 flex items-center justify-between border-b border-slate-100">
            <Link
              href="/"
              className="flex items-center gap-3 group cursor-pointer transition-all"
              title="Go to Morena Teach Homepage"
            >
              <img
                src="/logo.png"
                alt="Morena Teach"
                className="w-10 h-10 object-contain transition-transform duration-200 group-hover:scale-105 shrink-0"
              />
              <div className="leading-tight select-none">
                <div className="font-black text-base text-[#183257] tracking-tight group-hover:text-blue-600 transition-colors">
                  Morena Teach
                </div>
                <div className="text-[10px] text-[#9190b3] font-bold tracking-wide">
                  Teacher Excellence Hub
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavClick ? onNavClick(item.id) : null;
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold transition-colors ${
                        item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200/80')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom User Profile Card with Direct Logout (Role Switcher Removed) */}
          <div className="p-3.5 border-t border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-slate-50 border border-slate-200/80">
              <button
                type="button"
                onClick={handleOpenEditProfile}
                className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition-opacity cursor-pointer flex-1"
                title="Click to edit profile & photo"
              >
                <img
                  src={profileAvatar}
                  alt={profileName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0"
                  onError={(e) => {
                    (e.target as any).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="min-w-0 leading-tight">
                  <div className="font-bold text-xs text-slate-900 truncate">{profileName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{profileRole}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                title="Logout of SEO Portal"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-2xs"
        />
      )}

      {/* ======================================================== */}
      {/* 2. RIGHT CONTENT AREA (Top Bar Fixed + Scrollable Body)  */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TOP NAVIGATION BAR (Fixed at top) */}
        <header className="h-16 bg-white border-b border-slate-200/90 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu size={20} />
            </button>

            {/* Global Search Bar (with placeholder matching image) */}
            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder="Search courses, tasks, or reports..."
                className="w-full pl-10 pr-20 py-2 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all font-medium"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-400 font-semibold shadow-2xs">
                Ctrl + K
              </span>
            </div>
          </div>

          {/* Top Bar Right: Date Dropdown, Bell, RBAC Switcher, Avatar */}
          <div className="flex items-center gap-3">
            {/* Date Selector Dropdown (Synced with Live GSC & Analytics) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>{currentRangeLabel}</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {dateDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-40 text-xs font-semibold">
                  {[
                    { label: 'Last 7 Days', val: '7D' },
                    { label: 'Last 30 Days', val: '30D' },
                    { label: 'Last 90 Days (3 Months)', val: '90D' },
                    { label: 'Last 1 Year (12 Months)', val: '1Y' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        onTimeRangeChange?.(opt.val as any);
                        setDateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        timeRange === opt.val
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {timeRange === opt.val && <span className="text-blue-600 font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell with Dynamic Unread Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 relative cursor-pointer transition-colors shadow-2xs"
                title={`Notifications (${unreadCount} unread)`}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white animate-in zoom-in-75">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Real-Time Notification Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-slate-900">SEO Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">All caught up</span>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {notificationsList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications right now.
                      </div>
                    ) : (
                      notificationsList.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`py-2.5 px-2 rounded-xl space-y-1 transition-colors cursor-pointer ${
                            n.unread ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                              <span className={`truncate font-bold ${n.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                                {n.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{n.desc}</p>
                          {n.targetNav && (
                            <span className="inline-block text-[10px] font-bold text-blue-600 hover:underline">
                              Open {n.targetNav} →
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 mt-1 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        onNavClick?.('Notifications');
                        setNotificationsOpen(false);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      View all in Notifications Desk →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown Pill: Settings, Notifications, Logout */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 transition-all cursor-pointer shadow-2xs select-none"
                title="Account Menu"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500/30 shrink-0">
                  <img
                    src={profileAvatar}
                    alt={profileName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[110px]">{profileName}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[110px]">{profileRole}</span>
                </div>
                <ChevronDown size={13} className="text-slate-400 shrink-0" />
              </button>

              {/* User Account Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-slate-900 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-900">{profileName}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{profileEmail}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[9px] font-bold">
                      {profileRole}
                    </span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {/* Settings Item */}
                    <button
                      type="button"
                      onClick={() => {
                        onNavClick?.('Settings');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <Settings size={14} className="text-slate-400" />
                      <span>Settings</span>
                    </button>

                    {/* Notifications Item */}
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(true);
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell size={14} className="text-slate-400" />
                        <span>Notifications</span>
                      </div>
                      {unreadCount > 0 ? (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                          {unreadCount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">0</span>
                      )}
                    </button>

                    {/* Edit Profile Item */}
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenEditProfile();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
                    >
                      <User size={14} className="text-slate-400" />
                      <span>Edit Profile &amp; Photo</span>
                    </button>
                  </div>

                  {/* Logout Item */}
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <LogOut size={14} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Toast confirmation */}
        {profileToast && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} />
            <span>{profileToast}</span>
          </div>
        )}

        {/* Middle Content Children: Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. EDIT PROFILE & AVATAR MODAL                           */}
      {/* ======================================================== */}
      {editProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Edit Profile &amp; Photo</h3>
                  <p className="text-[11px] text-slate-500">Change your display name and profile picture</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditProfileModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Photo Live Preview & Upload */}
              <div className="flex flex-col items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-blue-600 shadow-md bg-slate-900 flex items-center justify-center text-white text-xl font-bold">
                    {inputAvatar ? (
                      <img src={inputAvatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span>{inputName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 cursor-pointer"
                    title="Upload local image"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Upload size={13} />
                    <span>Upload Photo</span>
                  </button>
                </div>

                {/* Preset Avatars 1-Click Picker */}
                <div className="w-full pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5 text-center">
                    Or Pick A Preset Avatar
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    {DEFAULT_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInputAvatar(url)}
                        className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-transform cursor-pointer ${
                          inputAvatar === url
                            ? 'border-blue-600 scale-110 shadow-sm'
                            : 'border-transparent hover:scale-105 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Name Input Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  required
                  placeholder="e.g. Rohit Sharma, Priya Sharma..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-hidden focus:border-blue-500 text-slate-900"
                />
              </div>

              {/* Role / Designation Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Role / Designation</label>
                <input
                  type="text"
                  value={inputRole}
                  onChange={(e) => setInputRole(e.target.value)}
                  placeholder="e.g. SEO Manager, SEO Specialist"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-hidden focus:border-blue-500 text-slate-900"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditProfileModalOpen(false)}
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeoPortalShell;
