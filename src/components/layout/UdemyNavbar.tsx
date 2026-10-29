'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

export const UdemyNavbar: React.FC = () => {
  const router = useRouter();
  const { currentUser, logout, wishlistCourseIds, cartItems, searchQuery, setSearchQuery } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [showPromoBanner, setShowPromoBanner] = useState(true);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch categories for dropdown
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          if (data.categories) {
            setCategories(
              data.categories.map((c: any) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                count: c._count?.courses || 0
              }))
            );
          }
        }
      } catch {
        // Fallback categories
        setCategories([
          { id: '1', name: 'Early Childhood Education', slug: 'early-childhood-education' },
          { id: '2', name: 'Pedagogy & Teaching Methods', slug: 'pedagogy-teaching-methods' },
          { id: '3', name: 'Engineering', slug: 'engineering' }
        ]);
      }
    }
    loadCategories();
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchQuery(localSearch.trim());
      router.push(`/courses?search=${encodeURIComponent(localSearch.trim())}`);
    } else {
      router.push('/courses');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#d1d7dc]">
      {/* 1. Top Announcement Bar (Udemy Style) */}
      {showPromoBanner && (
        <div className="bg-[#4e8d98] text-white text-xs sm:text-sm py-2 px-4 font-semibold flex items-center justify-between">
          <div className="flex-1 text-center flex items-center justify-center gap-2">
            <span>
              <strong>Teacher Excellence Month</strong> | Upskill your classroom with certified educator courses up to 80% off.
            </span>
            <span className="hidden md:inline-block bg-white/20 px-2 py-0.5 rounded text-[11px] font-mono tracking-wide">
              ENDS SOON
            </span>
          </div>
          <button
            onClick={() => setShowPromoBanner(false)}
            aria-label="Dismiss banner"
            className="text-white/80 hover:text-white transition-colors ml-2 p-1"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* 2. Main Navigation Bar */}
      <div className="max-w-[1340px] mx-auto px-3 sm:px-6 h-[72px] sm:h-[84px] lg:h-[92px] flex items-center justify-between gap-2 sm:gap-3 lg:gap-4">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-1.5 sm:p-2 text-[#2d2f31] hover:bg-[#f7f9fa] rounded transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size={24} />
        </button>

        {/* Brand Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3.5 shrink-0 group">
          <img
            src="/logo.png"
            alt="Morena Teach"
            className="h-10 sm:h-14 lg:h-[66px] w-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col justify-center select-none">
            <span
              className="text-[17px] sm:text-[22px] lg:text-[26px] font-black tracking-[-0.01em] leading-none text-[#183257]"
              style={{ color: '#183257' }}
            >
              Morena Teach
            </span>
            <span
              className="text-[11px] sm:text-[13px] lg:text-[16px] font-bold tracking-[0.01em] leading-tight mt-0.5 sm:mt-1"
              style={{ color: '#9190b3' }}
            >
              Teacher Excellence Hub
            </span>
          </div>
        </Link>

        {/* Navigation Links: Home, About, Courses (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 shrink-0">
          <Link
            href="/"
            className="px-3 py-2 text-sm font-semibold text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded transition-colors whitespace-nowrap"
          >
            Home
          </Link>
          <a
            href="https://morenateach.com/about-us/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-sm font-semibold text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded transition-colors whitespace-nowrap"
          >
            About
          </a>
          <Link
            href="/courses"
            className="px-3 py-2 text-sm font-semibold text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded transition-colors whitespace-nowrap"
          >
            Courses
          </Link>
        </nav>

        {/* Wide Search Bar (Exact Udemy Pill Design) */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-xl xl:max-w-2xl relative hidden md:block min-w-[180px]"
        >
          <div className="relative flex items-center">
            <div className="absolute left-4 text-[#6a6f73] pointer-events-none flex items-center justify-center">
              <Icon name="search" size={18} />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search for anything (Montessori, ECCD, Pedagogy, Phonics...)"
              className="w-full pl-11 pr-10 py-2.5 bg-[#f7f9fa] border border-[#2d2f31] rounded-full text-sm text-[#2d2f31] placeholder-[#6a6f73] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#2d2f31] transition-all font-normal"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  setSearchQuery('');
                }}
                className="absolute right-3.5 text-[#6a6f73] hover:text-[#2d2f31]"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        </form>

        {/* Right Navigation Links & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile Search Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded-full transition-colors"
            title="Search"
            aria-label="Search"
          >
            <Icon name="search" size={20} />
          </button>

          {/* Auth State: Storefront is strictly for Students. Non-students (Admin / Super Admin) see Log in / Sign up buttons */}
          {(!currentUser || currentUser.role !== 'STUDENT') ? (
            <div className="flex items-center gap-1.5 sm:gap-2 ml-1">
              {currentUser && currentUser.role === 'INSTRUCTOR' && (
                <Link
                  href="/instructor"
                  className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3 text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-none sm:rounded-[4px] transition-colors shadow-xs"
                  title="Open Instructor Studio"
                >
                  <Icon name="cast_for_education" size={16} />
                  <span>Instructor Studio</span>
                </Link>
              )}
              {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
                <Link
                  href={currentUser.role === 'SUPER_ADMIN' ? '/super-admin' : '/admin'}
                  className="hidden xl:inline-flex items-center gap-1.5 h-10 px-3 text-xs font-bold text-[#5022c3] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-none sm:rounded-[4px] transition-colors"
                  title="Open Admin Console"
                >
                  <Icon name="admin_panel_settings" size={16} />
                  <span>Admin Console</span>
                </Link>
              )}
              <Link
                href="/login"
                className="h-9 sm:h-10 px-2.5 sm:px-4 text-xs sm:text-sm font-bold text-[#2d2f31] border border-[#2d2f31] bg-white hover:bg-[#f7f9fa] rounded-none sm:rounded-[4px] transition-colors flex items-center justify-center whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="h-9 sm:h-10 px-2.5 sm:px-4 text-xs sm:text-sm font-bold text-white bg-[#2d2f31] border border-[#2d2f31] hover:bg-[#1c1d1f] rounded-none sm:rounded-[4px] transition-colors flex items-center justify-center whitespace-nowrap"
              >
                Sign up
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/student/learning"
                className="hidden md:inline-flex px-3 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded transition-colors font-medium"
              >
                My learning
              </Link>
              {currentUser.hasOnboardedInstructorAccount && (
                <Link
                  href={
                    currentUser.instructorLoginUrl ||
                    `/instructor/login?email=${encodeURIComponent(currentUser.email)}`
                  }
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-[#5022c3] hover:bg-[#3f1b99] rounded-full transition-colors shadow-xs"
                >
                  <Icon name="cast_for_education" size={16} />
                  <span>Instructor Login</span>
                </Link>
              )}
              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-10 h-10 rounded-full bg-[#1c1d1f] text-white font-bold text-sm flex items-center justify-center hover:opacity-95 transition-opacity tracking-wider cursor-pointer"
                  title={currentUser.name}
                >
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    currentUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'ST'
                  )}
                </button>

                {/* User Dropdown Menu (Exact 1:1 replica of Udemy reference image media_1789384091152.png) */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded shadow-2xl border border-[#d1d7dc] z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[calc(100vh-130px)] overflow-y-auto overscroll-contain dropdown-scrollbar">
                    {/* Header: Circle Avatar with Initials, Name, Email + Quick Logout */}
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-[#f7f9fa] transition-colors border-b border-[#d1d7dc] sticky top-0 bg-white z-10">
                      <Link
                        href="/user/edit-account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <div className="w-11 h-11 rounded-full bg-[#1c1d1f] text-white font-bold text-sm flex items-center justify-center shrink-0 tracking-wider">
                          {currentUser.avatar ? (
                            <img
                              src={currentUser.avatar}
                              alt={currentUser.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            currentUser.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase() || 'ST'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#1c1d1f] truncate leading-tight">
                            {currentUser.name}
                          </p>
                          <p className="text-[12px] text-[#6a6f73] truncate leading-tight mt-0.5">
                            {currentUser.email}
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="p-1.5 text-[#6a6f73] hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="Sign out"
                      >
                        <Icon name="logout" size={18} />
                      </button>
                    </div>

                    {/* Section 1: Learning */}
                    <div className="py-1.5 border-b border-[#d1d7dc]">
                      <Link
                        href="/student/learning"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        <span>My learning</span>
                        <Icon name="school" size={16} className="text-[#6a6f73]" />
                      </Link>
                      <Link
                        href="/student/cart"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        <span>My cart</span>
                        {cartItems.length > 0 && (
                          <span className="bg-[#a435f0] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                            {cartItems.length}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/student/wishlist"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        <span>Wishlist</span>
                        {wishlistCourseIds.length > 0 && (
                          <span className="bg-[#6a6f73] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                            {wishlistCourseIds.length}
                          </span>
                        )}
                      </Link>
                    </div>

                    {/* Section 2: Account Settings (Exact matches from screenshot) */}
                    <div className="py-1.5 border-b border-[#d1d7dc]">
                      <Link
                        href="/user/edit-notification-preferences"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        Notifications
                      </Link>
                      <Link
                        href="/user/edit-account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        Account settings
                      </Link>
                      <Link
                        href="/user/edit-payment-methods"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        Payment methods
                      </Link>
                      <Link
                        href="/student/orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        Purchase history
                      </Link>
                    </div>

                    {/* Section 3: Profile */}
                    <div className="py-1.5 border-b border-[#d1d7dc]">
                      <Link
                        href="/user/public"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        Public profile
                      </Link>
                      <Link
                        href="/user/edit-profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        Edit profile
                      </Link>
                    </div>

                    {/* Section 4: Help, Language & Logout */}
                    <div className="py-1.5 border-b border-[#d1d7dc]">
                      <Link
                        href="/courses"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-[14px] text-[#1c1d1f] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                      >
                        Help and support
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-[14px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Log out
                      </button>
                    </div>

                    {/* Section 5: Business Banner */}
                    <div className="p-4 bg-[#f7f9fa]">
                      <Link
                        href="/courses"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="group block"
                      >
                        <div className="flex items-center justify-between text-[14px] font-bold text-[#1c1d1f] group-hover:text-[#5022c3] transition-colors">
                          <span>Morena Teach Academy</span>
                          <Icon name="open_in_new" size={16} className="text-[#6a6f73] group-hover:text-[#5022c3]" />
                        </div>
                        <p className="text-[12px] text-[#6a6f73] mt-0.5 leading-tight">
                          Empowering educators worldwide
                        </p>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cart Icon & Interactive Mini-Cart Popover (Now at the far right!) */}
          <div
            className="relative"
            onMouseEnter={() => setIsCartHovered(true)}
            onMouseLeave={() => setIsCartHovered(false)}
          >
            <Link
              href="/student/cart"
              className="relative p-2 sm:p-2.5 text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded-full transition-colors block border border-transparent hover:border-[#d1d7dc]"
              title="Shopping Cart"
            >
              <Icon name="shopping_cart" size={20} />
              {cartItems.length > 0 && (
                <span className="absolute top-1 right-1 bg-[#a435f0] text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Link>

            {/* Udemy-style Mini-Cart Dropdown */}
            {isCartHovered && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded shadow-2xl border border-[#d1d7dc] p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                {cartItems.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-[#6a6f73] font-semibold mb-3">
                      Your cart is empty.
                    </p>
                    <Link
                      href="/courses"
                      onClick={() => setIsCartHovered(false)}
                      className="text-xs font-bold text-[#5022c3] hover:underline"
                    >
                      Keep shopping
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 mb-3 pr-1">
                      {cartItems.slice(0, 4).map((item) => (
                        <div key={item.id} className="py-2.5 flex items-start gap-3">
                          <div className="w-14 h-10 bg-gray-100 rounded overflow-hidden shrink-0 border border-gray-200">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Icon name="school" size={16} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#1c1d1f] truncate leading-snug">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-[#6a6f73] truncate mt-0.5">
                              {item.instructorName}
                            </p>
                            <p className="text-xs font-bold text-[#1c1d1f] mt-1">
                              {item.price === 0 ? 'Free' : `₹${Number(item.price).toLocaleString('en-IN')}`}
                            </p>
                          </div>
                        </div>
                      ))}
                      {cartItems.length > 4 && (
                        <p className="text-[11px] text-center text-[#6a6f73] py-1.5">
                          + {cartItems.length - 4} more course(s)
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#d1d7dc]">
                      <div className="flex items-center justify-between mb-3 text-sm font-bold text-[#1c1d1f]">
                        <span>Total:</span>
                        <span>
                          ₹{cartItems.reduce((acc, item) => acc + Number(item.price || 0), 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <Link
                        href="/student/cart"
                        onClick={() => setIsCartHovered(false)}
                        className="w-full h-10 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-xs rounded transition-colors flex items-center justify-center shadow-xs"
                      >
                        Go to cart
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-[#d1d7dc] bg-white px-4 pt-3 pb-6 space-y-4">
          {/* Mobile Auth State */}
          {(!currentUser || currentUser.role !== 'STUDENT') ? (
            <div className="flex flex-col gap-2 pb-3 border-b border-gray-100">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-sm font-bold text-[#2d2f31] border border-[#2d2f31] rounded-[4px] hover:bg-gray-50 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-sm font-bold text-white bg-[#2d2f31] rounded-[4px] hover:bg-[#1c1d1f] transition-colors"
              >
                Sign up
              </Link>
            </div>
          ) : (
            <div className="pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#1c1d1f] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'ST'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1c1d1f] truncate">{currentUser.name}</p>
                  <p className="text-xs text-[#6a6f73] truncate">{currentUser.email}</p>
                </div>
              </div>
              <div className="space-y-1">
                <Link
                  href="/student/learning"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-1.5 text-sm font-medium text-[#2d2f31] hover:text-[#5022c3]"
                >
                  My learning
                </Link>
                {currentUser.hasOnboardedInstructorAccount && (
                  <Link
                    href={
                      currentUser.instructorLoginUrl ||
                      `/instructor/login?email=${encodeURIComponent(currentUser.email)}`
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between py-2 px-3 my-1 rounded-lg bg-purple-50 text-sm font-bold text-[#5022c3]"
                  >
                    <span className="flex items-center gap-2">
                      <Icon name="cast_for_education" size={16} />
                      <span>Instructor Login</span>
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      Onboarded
                    </span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left py-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Log out
                </button>
              </div>
            </div>
          )}

          {/* Primary Mobile Navigation Links: Home, About, Courses, Cart */}
          <div className="space-y-1 pb-3 border-b border-gray-100">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-[#2d2f31] hover:bg-[#f7f9fa] hover:text-[#5022c3] rounded transition-colors"
            >
              <Icon name="home" size={18} />
              <span>Home</span>
            </Link>
            <a
              href="https://morenateach.com/about-us/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-[#2d2f31] hover:bg-[#f7f9fa] hover:text-[#5022c3] rounded transition-colors"
            >
              <Icon name="info" size={18} />
              <span>About</span>
            </a>
            <Link
              href="/courses"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-[#2d2f31] hover:bg-[#f7f9fa] hover:text-[#5022c3] rounded transition-colors"
            >
              <Icon name="school" size={18} />
              <span>Courses</span>
            </Link>
            <Link
              href="/student/cart"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#2d2f31] hover:bg-[#f7f9fa] hover:text-[#5022c3] rounded transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Icon name="shopping_cart" size={18} />
                <span>Cart</span>
              </span>
              {cartItems.length > 0 && (
                <span className="bg-[#a435f0] text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search for courses..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#f7f9fa] border border-[#2d2f31] rounded-full text-sm text-[#2d2f31]"
            />
            <div className="absolute left-3.5 top-3 text-[#6a6f73]">
              <Icon name="search" size={18} />
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-1">
            <div className="text-xs font-bold text-[#6a6f73] uppercase tracking-wider py-1">
              Top Disciplines
            </div>
            <Link
              href="/courses"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-[#5022c3]"
            >
              Explore All Courses
            </Link>
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/courses?category=${encodeURIComponent(cat.name)}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-1.5 text-sm text-[#2d2f31] hover:text-[#5022c3]"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
