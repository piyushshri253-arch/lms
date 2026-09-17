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

  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [showPromoBanner, setShowPromoBanner] = useState(true);

  const categoriesRef = useRef<HTMLDivElement>(null);
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

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node)) {
        setIsCategoriesOpen(false);
      }
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
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-3 lg:gap-4">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 text-[#2d2f31] hover:bg-[#f7f9fa] rounded transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size={24} />
        </button>

        {/* Brand Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <img
            src="/logo.png"
            alt="Morena Teach LMS"
            className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="text-[20px] font-extrabold tracking-tight text-[#2d2f31] leading-none">
              MORENA TEACH
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#6a6f73] leading-none mt-1 hidden sm:block">
              Learning Management System
            </span>
          </div>
        </Link>

        {/* Categories Dropdown (Desktop) */}
        <div className="relative hidden lg:block" ref={categoriesRef}>
          <button
            onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
            className={`px-3 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded transition-colors flex items-center gap-1.5 ${
              isCategoriesOpen ? 'text-[#5022c3] bg-[#f7f9fa] font-semibold' : 'font-normal'
            }`}
          >
            <span>Categories</span>
            <Icon
              name={isCategoriesOpen ? 'expand_less' : 'expand_more'}
              size={18}
              className="text-[#6a6f73]"
            />
          </button>

          {/* Categories Popover Menu */}
          {isCategoriesOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded shadow-xl border border-[#d1d7dc] py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100 text-xs font-bold text-[#6a6f73] uppercase tracking-wider">
                Explore Teaching Disciplines
              </div>
              <Link
                href="/courses"
                onClick={() => setIsCategoriesOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 text-sm text-[#2d2f31] font-semibold hover:bg-[#f7f9fa] hover:text-[#5022c3] transition-colors"
              >
                <span>All Courses</span>
                <Icon name="chevron_right" size={16} />
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/courses?category=${encodeURIComponent(cat.name)}`}
                  onClick={() => setIsCategoriesOpen(false)}
                  className="flex items-center justify-between px-4 py-2 text-sm text-[#2d2f31] hover:bg-[#f7f9fa] hover:text-[#5022c3] transition-colors"
                >
                  <span className="truncate">{cat.name}</span>
                  {cat.count !== undefined && cat.count > 0 && (
                    <span className="text-xs text-[#6a6f73] ml-2 font-mono">({cat.count})</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Wide Search Bar (Exact Udemy Pill Design) */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-2xl relative hidden md:block"
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
          {/* TEACH Business Link */}
          <Link
            href="/courses"
            className="hidden xl:inline-flex px-3 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded transition-colors font-normal"
          >
            TEACH Business
          </Link>

          {/* Teach on TEACH Link */}
          <Link
            href={currentUser?.role === 'INSTRUCTOR' ? '/instructor/courses' : '/instructor'}
            className="hidden lg:inline-flex px-3 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded transition-colors font-normal"
          >
            Teach on TEACH
          </Link>

          {/* My learning Link for Logged In Students */}
          {currentUser && currentUser.role === 'STUDENT' && (
            <Link
              href="/student/learning"
              className="hidden md:inline-flex px-3 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded transition-colors font-medium"
            >
              My learning
            </Link>
          )}

          {/* Cart Icon & Interactive Mini-Cart Popover */}
          <div
            className="relative"
            onMouseEnter={() => setIsCartHovered(true)}
            onMouseLeave={() => setIsCartHovered(false)}
          >
            <Link
              href="/student/cart"
              className="relative p-2.5 text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] rounded-full transition-colors block"
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

          {/* Auth State: Storefront is strictly for Students. Non-students (Admin / Super Admin) see Log in / Sign up buttons */}
          {(!currentUser || currentUser.role !== 'STUDENT') ? (
            <div className="flex items-center gap-2 ml-1">
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
                className="h-10 px-4 text-sm font-bold text-[#2d2f31] border border-[#2d2f31] bg-white hover:bg-[#f7f9fa] rounded-none sm:rounded-[4px] transition-colors flex items-center justify-center"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="h-10 px-4 text-sm font-bold text-white bg-[#2d2f31] border border-[#2d2f31] hover:bg-[#1c1d1f] rounded-none sm:rounded-[4px] transition-colors flex items-center justify-center"
              >
                Sign up
              </Link>
              <button
                type="button"
                className="h-10 w-10 border border-[#2d2f31] text-[#2d2f31] hover:bg-[#f7f9fa] rounded-none sm:rounded-[4px] transition-colors hidden sm:flex items-center justify-center"
                title="Select language"
              >
                <Icon name="language" size={18} />
              </button>
            </div>
          ) : (
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
                        {currentUser.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'ST'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-[#1c1d1f] truncate leading-tight">
                          {currentUser.name}
                        </p>
                        <p className="text-[11px] text-[#6a6f73] truncate leading-tight mt-0.5">
                          {currentUser.email}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      title="Log out"
                      className="p-1.5 ml-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer shrink-0"
                    >
                      <Icon name="logout" size={18} />
                    </button>
                  </div>

                  {/* Section 1: My learning, My cart, Wishlist, Teach on T.E.A.C.H */}
                  <div className="py-1.5 border-b border-[#d1d7dc]">
                    <Link
                      href="/student/learning"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      My learning
                    </Link>
                    <Link
                      href="/student/cart"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      <span>My cart</span>
                      {cartItems.length > 0 && (
                        <span className="bg-[#a435f0] text-white text-[11px] font-bold px-2 py-0.2 rounded-full">
                          {cartItems.length}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/instructor"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Teach on Morena Teach
                    </Link>
                  </div>

                  {/* Section 2: Notifications, Messages */}
                  <div className="py-1.5 border-b border-[#d1d7dc]">
                    <Link
                      href="/student/learning?tab=notifications"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Notifications
                    </Link>
                    <Link
                      href="/student/learning?tab=messages"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#5022c3] bg-[#f7f9fa] hover:bg-purple-50 transition-colors font-medium"
                    >
                      Messages
                    </Link>
                  </div>

                  {/* Section 3: Account settings, Payment methods, Subscriptions, Credits, Purchase history */}
                  <div className="py-1.5 border-b border-[#d1d7dc]">
                    <Link
                      href="/user/edit-account"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Account settings
                    </Link>
                    <Link
                      href="/user/edit-payment-methods"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Payment methods
                    </Link>
                    <Link
                      href="/user/manage-subscriptions"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Subscriptions
                    </Link>
                    <Link
                      href="/student/learning?tab=credits"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Morena Teach credits
                    </Link>
                    <Link
                      href="/student/orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Purchase history
                    </Link>
                  </div>

                  {/* Section 4: Language */}
                  <div className="py-1.5 border-b border-[#d1d7dc]">
                    <div className="flex items-center justify-between px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors cursor-pointer">
                      <span>Language</span>
                      <span className="flex items-center gap-1.5 text-xs text-[#2d2f31] font-medium">
                        English <Icon name="language" size={16} />
                      </span>
                    </div>
                  </div>

                  {/* Section 5: Public profile, Edit profile */}
                  <div className="py-1.5 border-b border-[#d1d7dc]">
                    <Link
                      href="/user/public"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Public profile
                    </Link>
                    <Link
                      href="/user/edit-profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Edit profile
                    </Link>
                  </div>

                  {/* Section 6: Help and Support, Log out */}
                  <div className="py-1.5 border-b border-[#d1d7dc]">
                    <Link
                      href="/help"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-[#2d2f31] hover:text-[#5022c3] hover:bg-[#f7f9fa] transition-colors"
                    >
                      Help and Support
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <span>Log out</span>
                      <Icon name="logout" size={17} className="text-red-600" />
                    </button>
                  </div>

                  {/* Section 7: Morena Teach Business footer */}
                  <div className="px-4 py-3 bg-[#f7f9fa]/60">
                    <Link
                      href="/business"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="group block"
                    >
                      <div className="flex items-center justify-between text-[14px] font-bold text-[#1c1d1f] group-hover:text-[#5022c3] transition-colors">
                        <span>Morena Teach Business</span>
                        <Icon name="open_in_new" size={16} className="text-[#6a6f73] group-hover:text-[#5022c3]" />
                      </div>
                      <p className="text-[12px] text-[#6a6f73] mt-0.5 leading-tight">
                        Bring learning to your company
                      </p>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
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

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <Link
              href="/courses"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm text-[#2d2f31] py-1"
            >
              TEACH Business
            </Link>
            <Link
              href="/instructor"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm text-[#2d2f31] py-1"
            >
              Teach on TEACH
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
