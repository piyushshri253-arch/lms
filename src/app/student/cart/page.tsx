'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function StudentCartPage() {
  const router = useRouter();
  const {
    currentUser,
    cartItems,
    removeFromCart,
    clearCart,
    toggleWishlist,
    processCheckout,
    login,
    register,
    showToast
  } = useApp();

  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Guest Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Calculate totals
  const subtotal = cartItems.reduce((acc, item) => acc + Number(item.price || 0), 0);
  const discountAmount = Number(((subtotal * discountPercent) / 100).toFixed(2));
  const finalTotal = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid coupon code');
      }
      setDiscountPercent(data.discountPercent || 0);
      showToast({
        title: 'Coupon Applied!',
        description: data.message || `${data.discountPercent}% discount activated.`,
        type: 'success'
      });
    } catch (err: any) {
      setDiscountPercent(0);
      showToast({
        title: 'Coupon Failed',
        description: err.message || 'Invalid or expired coupon code.',
        type: 'error'
      });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleInitiateCheckout = () => {
    if (cartItems.length === 0) return;

    // If guest, route to student login with return callback
    if (!currentUser) {
      router.push('/login?callbackUrl=/checkout');
      return;
    }

    router.push('/checkout');
  };

  const handleGuestAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);

    try {
      if (authMode === 'signup') {
        if (!authName.trim() || !authEmail.trim() || !authPassword) {
          throw new Error('Please fill in all required registration fields.');
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authName.trim(),
            email: authEmail.trim().toLowerCase(),
            password: authPassword,
            confirmPassword: authPassword,
            role: 'STUDENT'
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed.');
        }

        // Auto login with the newly created student account
        await login(authEmail.trim().toLowerCase(), authPassword, 'STUDENT');
      } else {
        if (!authEmail.trim() || !authPassword) {
          throw new Error('Please enter your email and password.');
        }
        await login(authEmail.trim().toLowerCase(), authPassword, 'STUDENT');
      }

      showToast({
        title: authMode === 'signup' ? 'Account Created!' : 'Signed In!',
        description: 'Redirecting to secure checkout...',
        type: 'success'
      });

      setIsAuthModalOpen(false);
      router.push('/checkout');
    } catch (err: any) {
      showToast({
        title: 'Authentication Error',
        description: err.message || 'Could not verify your credentials.',
        type: 'error'
      });
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col font-sans antialiased">
      <UdemyNavbar />

      <main className="flex-1 max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-extrabold text-[#1c1d1f] tracking-tight mb-2">
          Shopping Cart
        </h1>
        <p className="text-sm font-semibold text-[#2d2f31] mb-6">
          {cartItems.length} {cartItems.length === 1 ? 'Course' : 'Courses'} in Cart
        </p>

        {cartItems.length === 0 ? (
          <div className="border border-[#d1d7dc] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-4 my-8 bg-[#f7f9fa]/50">
            <div className="w-20 h-20 rounded-full bg-white shadow-xs flex items-center justify-center text-[#6a6f73] border border-[#d1d7dc]">
              <Icon name="remove_shopping_cart" size={40} />
            </div>
            <h2 className="text-xl font-bold text-[#1c1d1f]">
              Your cart is empty. Keep shopping to find a course!
            </h2>
            <p className="text-sm text-[#6a6f73] max-w-md">
              Explore thousands of accredited teacher training and early childhood education masterclasses taught by renowned faculty.
            </p>
            <Link
              href="/courses"
              className="mt-2 px-6 py-3 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-sm rounded transition-colors shadow-xs"
            >
              Explore All Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              <div className="divide-y divide-[#d1d7dc] border-t border-b border-[#d1d7dc]">
                {cartItems.map((item) => (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row gap-4 justify-between items-start">
                    {/* Thumbnail */}
                    <Link
                      href={`/courses/${item.slug || item.id}`}
                      className="shrink-0 w-full sm:w-32 aspect-video bg-gray-100 rounded overflow-hidden border border-[#d1d7dc]"
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                          <Icon name="school" size={28} />
                        </div>
                      )}
                    </Link>

                    {/* Course Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/courses/${item.slug || item.id}`}
                        className="font-bold text-[15px] text-[#1c1d1f] hover:text-[#5022c3] transition-colors line-clamp-2 leading-snug"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-[#6a6f73] mt-1">
                        By {item.instructorName || 'Lead Academic Faculty'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-[#6a6f73]">
                        <span className="font-extrabold text-[#b4690e] flex items-center gap-0.5">
                          {item.rating || '4.8'} <Icon name="star" fill size={14} className="text-[#b4690e]" />
                        </span>
                        <span>•</span>
                        <span>{item.totalHours || 24} total hours</span>
                        <span>•</span>
                        <span>{item.totalLessons || 20} lectures</span>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-[#5022c3]">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="hover:underline text-[#a435f0] cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Price Column */}
                    <div className="sm:text-right shrink-0">
                      <p className="text-lg font-extrabold text-[#1c1d1f]">
                        {item.price === 0 ? 'Free' : `₹${Number(item.price || 0).toLocaleString('en-IN')}`}
                      </p>
                      {item.discountPrice && (
                        <p className="text-xs text-[#6a6f73] line-through">
                          ₹{Number(item.discountPrice).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Checkout & Coupon Summary */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="border border-[#d1d7dc] rounded-lg p-6 bg-white shadow-xs space-y-5">
                <div>
                  <p className="text-sm font-bold text-[#6a6f73] uppercase tracking-wider">
                    Total:
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black text-[#1c1d1f]">
                      {finalTotal === 0 ? 'Free' : `₹${finalTotal.toLocaleString('en-IN')}`}
                    </span>
                    {subtotal > finalTotal && (
                      <span className="text-base text-[#6a6f73] line-through">
                        ₹{subtotal.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  {discountPercent > 0 && (
                    <p className="text-xs font-bold text-emerald-700 mt-1">
                      {discountPercent}% savings applied!
                    </p>
                  )}
                </div>

                {/* Checkout CTA Button */}
                <button
                  onClick={handleInitiateCheckout}
                  disabled={isProcessingCheckout}
                  className="w-full h-12 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-base rounded transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessingCheckout ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Confirming Enrollment...</span>
                    </>
                  ) : finalTotal === 0 ? (
                    <>
                      <Icon name="check_circle" size={20} />
                      <span>Enroll Now (Free)</span>
                    </>
                  ) : (
                    <>
                      <Icon name="lock" size={18} />
                      <span>Proceed to Checkout</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-[#6a6f73]">
                  30-Day Money-Back Guarantee • Lifetime Access
                </p>

                {/* Promotions / Coupons Accordion */}
                <div className="pt-4 border-t border-[#d1d7dc]">
                  <p className="text-xs font-bold text-[#2d2f31] mb-2">Promotions &amp; Coupons</p>
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter Coupon Code"
                      className="flex-1 h-10 px-3 border border-[#2d2f31] text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded-[2px]"
                    />
                    <button
                      type="submit"
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="h-10 px-4 bg-[#2d2f31] hover:bg-[#1c1d1f] text-white text-xs font-bold rounded-[2px] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isValidatingCoupon ? '...' : 'Apply'}
                    </button>
                  </form>
                  {couponCode && discountPercent > 0 && (
                    <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded mt-2 border border-emerald-200">
                      <span><strong>{couponCode}</strong> is applied</span>
                      <button
                        onClick={() => {
                          setCouponCode('');
                          setDiscountPercent(0);
                        }}
                        className="text-gray-500 hover:text-black font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Guest Authentication Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-[#d1d7dc] p-6 sm:p-8">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <Icon name="close" size={20} />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/logo.png" alt="Morena Teach" className="h-8 w-auto" />
                <span className="font-extrabold text-lg text-[#1c1d1f]">Morena Teach</span>
              </div>
              <h3 className="text-xl font-bold text-[#1c1d1f]">
                {authMode === 'signup' ? 'Sign up & complete your enrollment' : 'Log in to your account'}
              </h3>
              <p className="text-xs text-[#6a6f73] mt-1">
                {authMode === 'signup'
                  ? 'Sign up for free in seconds to access your purchased curricula & certificates.'
                  : 'Welcome back! Enter your login credentials to continue.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`py-2 text-xs font-bold rounded-md transition-colors ${
                  authMode === 'signup' ? 'bg-white text-[#1c1d1f] shadow-xs' : 'text-gray-600 hover:text-black'
                }`}
              >
                Sign up (Free)
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2 text-xs font-bold rounded-md transition-colors ${
                  authMode === 'login' ? 'bg-white text-[#1c1d1f] shadow-xs' : 'text-gray-600 hover:text-black'
                }`}
              >
                Log in
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleGuestAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full h-10 px-3 border border-[#2d2f31] text-xs focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-10 px-3 border border-[#2d2f31] text-xs focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1c1d1f] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full h-10 px-3 border border-[#2d2f31] text-xs focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full h-11 bg-[#a435f0] hover:bg-[#8710d8] text-white text-sm font-bold rounded transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isSubmittingAuth ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : authMode === 'signup' ? (
                  <span>Create Free Account &amp; Enroll</span>
                ) : (
                  <span>Log in &amp; Enroll</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <UdemyFooter />
    </div>
  );
}
