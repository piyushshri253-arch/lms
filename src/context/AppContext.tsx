'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Course, CourseCategory, MarketingCampaign, PlatformSettings } from '@/types';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN';
  organizationId?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  plan?: string;
  avatar?: string | null;
  bio?: string | null;
  phone?: string | null;
  customRole?: string | null;
  permissions?: string[];
  createdAt?: string | Date;
  impersonatedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  enrollmentsCount?: number;
  wishlistCount?: number;
  coursesAuthoredCount?: number;
}

export interface CartItem {
  id: string;
  slug?: string;
  title: string;
  price: number;
  discountPrice?: number;
  thumbnail?: string | null;
  instructorName?: string;
  rating?: number;
  totalHours?: number;
  totalLessons?: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  currentUser: UserSession | null;
  isLoadingUser: boolean;
  login: (email: string, pass: string, requestedPortal?: string) => Promise<UserSession>;
  register: (name: string, email: string, pass: string, role?: 'STUDENT' | 'INSTRUCTOR') => Promise<UserSession>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  activeRole: 'public' | 'student' | 'admin';
  setActiveRole: (role: 'public' | 'student' | 'admin') => void;
  role: 'public' | 'student' | 'admin';
  setRole: (role: 'public' | 'student' | 'admin') => void;

  courses: Course[];
  isLoadingCourses: boolean;
  refreshCourses: (filters?: { search?: string; category?: string; level?: string; sort?: string }) => Promise<void>;
  createCourse: (newCourse: Partial<Course>) => Promise<Course>;
  updateCourse: (slugOrId: string, updates: Partial<Course>) => Promise<Course>;
  deleteCourse: (slugOrId: string) => Promise<void>;

  wishlistCourseIds: string[];
  toggleWishlist: (courseId: string) => Promise<void>;

  cartItems: CartItem[];
  addToCart: (course: any) => void;
  removeFromCart: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;

  enrolledCourseIds: string[];
  completedLessonIds: string[];
  processCheckout: (courseId: string, couponCode?: string, provider?: string) => Promise<any>;
  markLessonComplete: (lessonId: string) => Promise<any>;

  campaigns: MarketingCampaign[];
  addCampaign: (campaign: Partial<MarketingCampaign>) => Promise<void>;
  toggleCampaignStatus: (id: string) => void;
  activeBanner: MarketingCampaign | null;
  dismissBanner: (id: string) => void;

  platformSettings: PlatformSettings;
  updatePlatformSettings: (settings: Partial<PlatformSettings>) => Promise<void>;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  toasts: ToastMessage[];
  showToast: (toastOrTitle: string | Omit<ToastMessage, 'id'>, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'MORENA TEACH',
  supportEmail: 'support@morenateach.com',
  defaultLanguage: 'English (US)',
  twoFactorAuth: true,
  sessionTimeoutMinutes: 60,
  stripeActive: true,
  stripePublishableKey: 'pk_live_51M89x91...',
  paypalActive: true,
  maintenanceMode: false
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [activeRoleState, setActiveRoleState] = useState<'public' | 'student' | 'admin'>('public');

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [wishlistCourseIds, setWishlistCourseIds] = useState<string[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [dismissedBannerIds, setDismissedBannerIds] = useState<string[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 1. Fetch current logged-in user from /api/auth/me
  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          setActiveRoleState(data.user.role === 'ADMIN' ? 'admin' : 'student');
        } else {
          setCurrentUser(null);
          setActiveRoleState('public');
        }
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // 2. Fetch courses from /api/courses
  const refreshCourses = async (filters?: {
    search?: string;
    category?: string;
    level?: string;
    sort?: string;
  }) => {
    setIsLoadingCourses(true);
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.level) params.set('level', filters.level);
      if (filters?.sort) params.set('sort', filters.sort);

      const res = await fetch(`/api/courses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.courses) setCourses(data.courses);
      }
    } catch {
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // 3. Fetch wishlist
  const refreshWishlist = async () => {
    try {
      const res = await fetch('/api/wishlist');
      if (res.ok) {
        const data = await res.json();
        if (data.wishlist) {
          setWishlistCourseIds(data.wishlist.map((w: any) => w.courseId));
        }
      }
    } catch {}
  };

  useEffect(() => {
    refreshUser();
    refreshCourses();
    refreshWishlist();
  }, []);

  const setActiveRole = (role: 'public' | 'student' | 'admin') => {
    setActiveRoleState(role);
  };

  const login = async (email: string, pass: string, requestedPortal?: string): Promise<UserSession> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, requestedPortal })
    });

    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.error || 'Authentication failed');
      err.requiresEmailVerification = data.requiresEmailVerification;
      err.email = data.email;
      throw err;
    }

    setCurrentUser(data.user);
    setActiveRoleState(data.user.role === 'ADMIN' ? 'admin' : 'student');
    
    // Restore or merge user's personal cart
    try {
      const guestSaved = localStorage.getItem('teach_cart_items_guest');
      const userKey = `teach_cart_items_${data.user.id}`;
      const userSaved = localStorage.getItem(userKey);
      let userItems: CartItem[] = userSaved ? JSON.parse(userSaved) : [];
      if (guestSaved) {
        const guestItems: CartItem[] = JSON.parse(guestSaved);
        if (Array.isArray(guestItems) && guestItems.length > 0) {
          guestItems.forEach((gItem) => {
            if (!userItems.some((uItem) => uItem.id === gItem.id || (gItem.slug && uItem.slug === gItem.slug))) {
              userItems.push(gItem);
            }
          });
          localStorage.setItem(userKey, JSON.stringify(userItems));
          localStorage.removeItem('teach_cart_items_guest');
        }
      }
      setCartItems(userItems);
    } catch {
      setCartItems([]);
    }

    await refreshCourses();
    await refreshWishlist();

    showToast({
      title: 'Welcome Back!',
      description: `Signed in as ${data.user.name} (${data.user.role}).`,
      type: 'success'
    });

    return data.user;
  };

  const register = async (
    name: string,
    email: string,
    pass: string,
    role: 'STUDENT' | 'INSTRUCTOR' = 'STUDENT'
  ): Promise<UserSession> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass, role })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    setCurrentUser(data.user);
    setActiveRoleState(data.user.role === 'ADMIN' ? 'admin' : 'student');
    
    // Associate any guest cart items with new student account
    try {
      const guestSaved = localStorage.getItem('teach_cart_items_guest');
      const userKey = `teach_cart_items_${data.user.id}`;
      if (guestSaved) {
        localStorage.setItem(userKey, guestSaved);
        localStorage.removeItem('teach_cart_items_guest');
        setCartItems(JSON.parse(guestSaved));
      } else {
        setCartItems([]);
      }
    } catch {
      setCartItems([]);
    }

    await refreshCourses();

    showToast({
      title: 'Account Created!',
      description: `Welcome to MORENA TEACH, ${data.user.name}.`,
      type: 'success'
    });

    return data.user;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
    setActiveRoleState('public');
    setWishlistCourseIds([]);
    // Clear cart on logout so website opens fresh for guest / logged-out user
    setCartItems([]);
    try {
      localStorage.removeItem('teach_cart_items_guest');
      localStorage.removeItem('teach_cart_items');
    } catch {}
    showToast({
      title: 'Signed Out',
      description: 'You have been safely signed out.',
      type: 'info'
    });
  };

  const toggleWishlist = async (courseId: string) => {
    if (!currentUser) {
      showToast({
        title: 'Sign In Required',
        description: 'Please sign in to save courses to your wishlist.',
        type: 'info'
      });
      return;
    }

    const isWishlisted = wishlistCourseIds.includes(courseId);
    if (isWishlisted) {
      setWishlistCourseIds((prev) => prev.filter((id) => id !== courseId));
      await fetch(`/api/wishlist?courseId=${courseId}`, { method: 'DELETE' });
      showToast({ title: 'Removed from Wishlist', type: 'info' });
    } else {
      setWishlistCourseIds((prev) => [...prev, courseId]);
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });
      showToast({ title: 'Added to Wishlist!', type: 'success' });
    }
  };

  const processCheckout = async (courseId: string, couponCode?: string, provider = 'STRIPE') => {
    if (!currentUser) {
      throw new Error('Please sign in before completing enrollment.');
    }

    const orderRes = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, couponCode, provider })
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(orderData.error || 'Payment order creation failed');
    }

    const verifyRes = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.orderId,
        transactionId: orderData.transactionId
      })
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) {
      throw new Error(verifyData.error || 'Payment verification failed');
    }

    if (!enrolledCourseIds.includes(courseId)) {
      setEnrolledCourseIds([...enrolledCourseIds, courseId]);
    }

    await refreshCourses();
    await refreshUser();

    showToast({
      title: 'Enrollment Confirmed!',
      description: orderData.discountPercent
        ? `Applied coupon (${orderData.discountPercent}% off). Course unlocked!`
        : 'Payment verified. You now have full lifetime access!',
      type: 'success'
    });

    return verifyData;
  };

  const markLessonComplete = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true })
      });
      const data = await res.json();
      if (res.ok) {
        if (!completedLessonIds.includes(lessonId)) {
          setCompletedLessonIds([...completedLessonIds, lessonId]);
        }
        showToast({
          title: data.progressPercent === 100 ? '🎉 Course Completed!' : 'Lesson Completed!',
          description:
            data.progressPercent === 100
              ? 'Congratulations! Your accredited certificate has been issued.'
              : `Progress updated: ${data.progressPercent}%`,
          type: 'success'
        });
        return data;
      }
    } catch {}
  };

  const createCourse = async (newCourseData: Partial<Course>): Promise<Course> => {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCourseData)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Course creation failed');

    await refreshCourses();
    showToast({
      title: 'Course Published!',
      description: `"${result.course.title}" is now live in the catalog.`,
      type: 'success'
    });
    return result.course;
  };

  const updateCourse = async (slugOrId: string, updates: Partial<Course>): Promise<Course> => {
    const res = await fetch(`/api/courses/${slugOrId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Update failed');

    await refreshCourses();
    showToast({
      title: 'Course Updated',
      description: 'Changes saved to database.',
      type: 'success'
    });
    return result.course;
  };

  const deleteCourse = async (slugOrId: string) => {
    const res = await fetch(`/api/courses/${slugOrId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    await refreshCourses();
    showToast({
      title: 'Course Deleted',
      description: 'Course removed from database catalog.',
      type: 'info'
    });
  };

  const addCampaign = async (campaignData: Partial<MarketingCampaign>) => {
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });
      const result = await res.json();
      if (res.ok && result.campaign) {
        setCampaigns([result.campaign, ...campaigns]);
      }
      showToast({
        title: 'Coupon Created',
        description: `Coupon "${campaignData.code}" is active.`,
        type: 'success'
      });
    } catch {
      showToast({ title: 'Campaign created', type: 'success' });
    }
  };

  const toggleCampaignStatus = (id: string) => {
    setCampaigns(
      campaigns.map((c) =>
        c.id === id ? { ...c, status: c.status === 'active' ? 'draft' : 'active' } : c
      )
    );
  };

  const activeBanner =
    campaigns.find(
      (c) =>
        c.status === 'active' &&
        (c.type === 'banner' || c.type === 'discount' || c.type === 'announcement') &&
        !dismissedBannerIds.includes(c.id)
    ) || null;

  const dismissBanner = (id: string) => {
    setDismissedBannerIds((prev) => [...prev, id]);
  };

  const updatePlatformSettings = async (newSettings: Partial<PlatformSettings>) => {
    const merged = { ...platformSettings, ...newSettings };
    setPlatformSettings(merged);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });
    } catch {}
    showToast({
      title: 'Settings Saved',
      description: 'Platform configuration updated.',
      type: 'success'
    });
  };

  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Get active storage key based on authentication state
  const getActiveCartKey = (user: UserSession | null = currentUser) => {
    return user?.id ? `teach_cart_items_${user.id}` : 'teach_cart_items_guest';
  };

  // Load cart on mount or whenever active user changes
  useEffect(() => {
    try {
      // Clean legacy anonymous cart if present
      const legacy = localStorage.getItem('teach_cart_items');
      if (legacy) {
        if (currentUser?.id) {
          localStorage.setItem(`teach_cart_items_${currentUser.id}`, legacy);
        }
        localStorage.removeItem('teach_cart_items');
      }

      const activeKey = getActiveCartKey(currentUser);
      const saved = localStorage.getItem(activeKey);
      setCartItems(saved ? JSON.parse(saved) : []);
    } catch {
      setCartItems([]);
    }

    const handleStorageChange = (e: StorageEvent) => {
      const activeKey = getActiveCartKey(currentUser);
      if (e.key === activeKey && e.newValue) {
        try {
          setCartItems(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser?.id]);

  const addToCart = (course: any) => {
    if (!course) return;
    const courseId = course.id;
    const courseSlug = course.slug;
    
    // Check if already in cart by ID or slug
    if (cartItems.some((item) => item.id === courseId || (courseSlug && item.slug === courseSlug))) {
      showToast({
        title: 'Already in cart',
        description: `"${course.title}" is already in your cart.`,
        type: 'info'
      });
      return;
    }

    // Safely parse price
    let parsedPrice = 0;
    if (typeof course.price === 'number') {
      parsedPrice = course.price;
    } else if (course.price) {
      parsedPrice = parseFloat(String(course.price).replace(/[^0-9.]/g, '')) || 0;
    }

    let parsedDiscount: number | undefined = undefined;
    if (typeof course.discountPrice === 'number') {
      parsedDiscount = course.discountPrice;
    } else if (course.discountPrice) {
      parsedDiscount = parseFloat(String(course.discountPrice).replace(/[^0-9.]/g, '')) || undefined;
    }

    const newItem: CartItem = {
      id: course.id || course.slug || `course-${Date.now()}`,
      slug: course.slug || course.id,
      title: course.title || 'Curriculum Program',
      price: parsedPrice,
      discountPrice: parsedDiscount,
      thumbnail: course.thumbnail || course.imageUrl || null,
      instructorName: course.instructor?.name || course.instructorName || 'Faculty of Teacher Excellence',
      rating: typeof course.rating === 'number' ? course.rating : 4.8,
      totalHours: course.durationHours || 24,
      totalLessons: course.totalLessons || (course.sections ? course.sections.flatMap((s: any) => s.lessons || []).length : 20)
    };

    const updated = [...cartItems, newItem];
    setCartItems(updated);
    try {
      const activeKey = getActiveCartKey(currentUser);
      localStorage.setItem(activeKey, JSON.stringify(updated));
    } catch {}
    showToast({
      title: 'Added to cart! 🛒',
      description: `"${course.title}" added to your cart.`,
      type: 'success'
    });
  };

  const removeFromCart = (courseId: string) => {
    const updated = cartItems.filter((item) => item.id !== courseId && item.slug !== courseId);
    setCartItems(updated);
    try {
      const activeKey = getActiveCartKey(currentUser);
      localStorage.setItem(activeKey, JSON.stringify(updated));
    } catch {}
    showToast({
      title: 'Item removed',
      description: 'Course removed from your cart.',
      type: 'info'
    });
  };

  const clearCart = () => {
    setCartItems([]);
    try {
      const activeKey = getActiveCartKey(currentUser);
      localStorage.removeItem(activeKey);
    } catch {}
  };

  const isInCart = (courseIdOrSlug: string) => {
    if (!courseIdOrSlug) return false;
    return cartItems.some((item) => item.id === courseIdOrSlug || item.slug === courseIdOrSlug);
  };

  const showToast = (toastOrTitle: string | Omit<ToastMessage, 'id'>, type?: 'success' | 'error' | 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let toastObj: ToastMessage;
    if (typeof toastOrTitle === 'string') {
      toastObj = { id, title: toastOrTitle, type: type || 'info' };
    } else {
      toastObj = { ...toastOrTitle, id };
    }
    setToasts((prev) => [...prev, toastObj]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoadingUser,
        login,
        register,
        logout,
        refreshUser,
        activeRole: activeRoleState,
        setActiveRole,
        role: activeRoleState,
        setRole: setActiveRole,
        courses,
        isLoadingCourses,
        refreshCourses,
        createCourse,
        updateCourse,
        deleteCourse,
        wishlistCourseIds,
        toggleWishlist,
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        enrolledCourseIds,
        completedLessonIds,
        processCheckout,
        markLessonComplete,
        campaigns,
        addCampaign,
        toggleCampaignStatus,
        activeBanner,
        dismissBanner,
        platformSettings,
        updatePlatformSettings,
        searchQuery,
        setSearchQuery,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
