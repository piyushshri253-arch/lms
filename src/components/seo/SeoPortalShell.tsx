'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Bell,
  BarChart3,
  KeyRound,
  FileText,
  Sliders,
  Headphones,
  Rocket,
  Flame,
  Check,
  GraduationCap,
  User,
  Camera,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

interface SeoPortalShellProps {
  children: React.ReactNode;
  activeNav?: string;
  onNavClick?: (nav: string) => void;
  pendingCount?: number;
  userName?: string;
  userRole?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80'
];

export function SeoPortalShell({
  children,
  activeNav = 'Dashboard',
  onNavClick,
  pendingCount = 12,
  userName = 'Piyush AI',
  userRole = 'SEO Admin',
  searchQuery = '',
  onSearchChange
}: SeoPortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [seoManagementOpen, setSeoManagementOpen] = useState(false);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);

  // Profile Customization State
  const [profileName, setProfileName] = useState(userName);
  const [profileAvatar, setProfileAvatar] = useState(DEFAULT_AVATARS[0]);
  const [profileRole, setProfileRole] = useState(userRole);
  const [profileEmail, setProfileEmail] = useState('seo@morenateach.com');
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);

  // Form inputs for Profile Modal
  const [inputName, setInputName] = useState(userName);
  const [inputAvatar, setInputAvatar] = useState(DEFAULT_AVATARS[0]);
  const [inputRole, setInputRole] = useState(userRole);
  const [inputEmail, setInputEmail] = useState('seo@morenateach.com');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileToast, setProfileToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setProfileAvatar(data.profile.avatar);
          setInputAvatar(data.profile.avatar);
          setProfileRole(data.profile.roleTitle);
          setInputRole(data.profile.roleTitle);
          setProfileEmail(data.profile.email);
          setInputEmail(data.profile.email);
          try {
            localStorage.setItem('morena_seo_profile', JSON.stringify(data.profile));
          } catch {}
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
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('File size exceeds 4MB. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setInputAvatar(String(event.target.result));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await fetch('/api/seo/profile', {
        method: 'PUT',
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

  // Notifications List
  const notifications = [
    {
      id: '1',
      title: 'New Course Ready for SEO',
      desc: 'Digital Campus & ERP Management was approved by Auditor.',
      time: '12m ago',
      unread: true
    },
    {
      id: '2',
      title: 'Google Search Index Updated',
      desc: '248 URLs verified and crawled on Google Search Console.',
      time: '1h ago',
      unread: true
    },
    {
      id: '3',
      title: 'Keyword Rank Alert',
      desc: '"montessori teacher training" rose +48% to position #3.',
      time: '3h ago',
      unread: true
    }
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout?portal=SEO', { method: 'POST' });
    } catch {}
    router.push('/seo/login');
  };

  const navItems = [
    {
      id: 'Dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'SEO Management',
      label: 'SEO Management',
      icon: Layers,
      badge: '33',
      badgeColor: 'bg-blue-600 text-white'
    },
    {
      id: 'Course SEO Queue',
      label: 'Course SEO Queue',
      icon: CheckCircle2,
      badge: pendingCount > 0 ? String(pendingCount) : null,
      badgeColor: 'bg-purple-600 text-white'
    },
    {
      id: 'SEO Analytics',
      label: 'SEO Analytics',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'Keyword Research',
      label: 'Keyword Research',
      icon: Search,
      badge: null
    },
    {
      id: 'Technical SEO',
      label: 'Technical SEO',
      icon: Sliders,
      badge: null
    },
    {
      id: 'SEO Reports',
      label: 'SEO Reports',
      icon: FileText,
      badge: null
    }
  ];

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f8fafc] text-slate-900 flex font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* ======================================================== */}
      {/* 1. LEFT DARK SIDEBAR (Fixed & Pinned - Never Scrolls Up) */}
      {/* ======================================================== */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-40 w-64 h-screen bg-[#0B1120] text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 shrink-0 border-r border-slate-800 select-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          {/* Logo Header */}
          <div className="p-5 pb-6 flex items-center justify-between border-b border-slate-800/80">
            <Link href="/seo" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <GraduationCap size={22} className="text-white" />
              </div>
              <div className="leading-tight">
                <div className="font-black text-base text-white tracking-tight flex items-center gap-1.5">
                  <span>Morena Teach</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Learn • Teach • Grow
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1">
            {/* Dashboard link */}
            <button
              type="button"
              onClick={() => {
                onNavClick ? onNavClick('Dashboard') : null;
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'Dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </div>
            </button>

            {/* SEO Management (Direct Navigation to Image 1 Course Cards View) */}
            <button
              type="button"
              onClick={() => {
                onNavClick ? onNavClick('SEO Management') : null;
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'SEO Management'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Globe size={16} />
                <span>SEO Management</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeNav === 'SEO Management' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                33
              </span>
            </button>

            {/* Remaining Nav Items */}
            {navItems.slice(1).map((item) => {
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-600 text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 pb-2 border-t border-slate-800/70" />

            {/* Settings (Opens Profile/Settings Modal) */}
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                editProfileModalOpen
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings size={15} />
              <span>Settings &amp; Profile</span>
            </button>

            {/* Help & Support */}
            <button
              type="button"
              onClick={() => {
                onNavClick ? onNavClick('Help & Support') : null;
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeNav === 'Help & Support'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Headphones size={15} />
              <span>Help &amp; Support</span>
            </button>
          </nav>

          {/* Bottom Promo Card: "Grow Your Platform with SEO" */}
          <div className="p-4 pt-1">
            <div className="bg-gradient-to-br from-blue-900/40 via-indigo-950/60 to-purple-950/40 border border-blue-500/20 rounded-2xl p-4 text-center space-y-2 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                <Rocket size={20} className="animate-bounce" />
              </div>
              <div className="font-black text-xs text-white leading-tight">
                Grow Your Platform with SEO
              </div>
              <p className="text-[10px] text-slate-400">
                Boost course enrollments and organic rank on Google.
              </p>
              <button
                type="button"
                onClick={() => setInsightsModalOpen(true)}
                className="w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View Insights →</span>
              </button>
            </div>
            <div className="text-center text-[10px] text-slate-500 pt-3 font-medium">
              © 2026 Morena Teach
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
        <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu size={20} />
            </button>

            {/* Global Search Bar (with Ctrl + K) */}
            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder="Search courses, keywords, or reports..."
                className="w-full pl-10 pr-20 py-2 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all font-medium"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-400 font-semibold shadow-2xs">
                Ctrl + K
              </span>
            </div>
          </div>

          {/* Top Bar Right: Notifications & User Profile */}
          <div className="flex items-center gap-3">
            {/* Notification Bell with Badge 3 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 relative cursor-pointer transition-colors shadow-2xs"
                title="Notifications"
              >
                <Bell size={16} />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
                  3
                </span>
              </button>

              {/* Notification Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-black text-xs text-slate-900">SEO Notifications</span>
                    <span className="text-[10px] font-bold text-blue-600">Mark all read</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-2.5 px-1 hover:bg-slate-50 rounded-lg space-y-0.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill (Avatar + Name + Role Designation) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1 sm:pr-3 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group"
                title="Click to view options or edit profile"
              >
                <div className="w-9 h-9 rounded-full bg-slate-900 overflow-hidden border-2 border-blue-500/40 flex items-center justify-center text-white font-black text-xs shrink-0 relative shadow-2xs">
                  {profileAvatar ? (
                    <img
                      src={profileAvatar}
                      alt={profileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span>{profileName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="font-black text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                    {profileName}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">{profileRole}</div>
                </div>
                <ChevronDown size={14} className="hidden sm:block text-slate-400" />
              </button>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-900">{profileName}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">{profileEmail}</p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {/* The requested Edit Name & Picture button */}
                    <button
                      type="button"
                      onClick={handleOpenEditProfile}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-blue-600" />
                        <span>Edit Name &amp; Photo</span>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md">
                        Edit
                      </span>
                    </button>

                    <Link
                      href="/reviewer/inspect"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>Auditor Studio</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
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

        {/* Middle Content Children: ONLY this container scrolls */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. EDIT PROFILE & AVATAR MODAL (User Request)            */}
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
                  placeholder="e.g. Anurag Sharma, Piyush, Rahul..."
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
                  placeholder="e.g. SEO Admin, SEO Lead, Marketing Manager"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-hidden focus:border-blue-500 text-slate-900"
                />
              </div>

              {/* Image URL Input (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Direct Image URL (Optional)</label>
                <input
                  type="url"
                  value={inputAvatar.startsWith('data:') ? '' : inputAvatar}
                  onChange={(e) => setInputAvatar(e.target.value)}
                  placeholder="https://example.com/my-photo.jpg"
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-mono text-[11px]"
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

      {/* Insights Modal */}
      {insightsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket size={18} className="text-blue-600" />
                <h3 className="font-black text-sm text-slate-900">SEO Platform Growth Insights</h3>
              </div>
              <button
                type="button"
                onClick={() => setInsightsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Courses with fully configured meta titles (30–60 characters) and meta descriptions (100–160 characters) experience <strong>+3.2x higher click-through rates</strong> and index <strong>4x faster</strong> on Google Search.
            </p>
            <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-900 font-semibold space-y-1">
              <div>🎯 248 Total Indexed URLs</div>
              <div>📈 24.8K Organic Clicks this month</div>
              <div>⚡ Average Google Rank: #18.6</div>
            </div>
            <button
              type="button"
              onClick={() => setInsightsModalOpen(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeoPortalShell;
