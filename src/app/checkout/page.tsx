'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

type PaymentMethod = 'card' | 'upi' | 'netbanking';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, cartItems, clearCart, showToast } = useApp();

  // Selected Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Card Form State
  const [cardNumber, setCardNumber] = useState('4532 8921 7734 9012');
  const [cardName, setCardName] = useState(currentUser?.name || '');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('883');

  // UPI Form State
  const [upiId, setUpiId] = useState('student@okhdfcbank');
  const [selectedUpiApp, setSelectedUpiApp] = useState('Google Pay');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Net Banking State
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Trial Payment Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);

  // Calculate Totals
  const subtotal = cartItems.reduce((acc, item) => acc + Number(item.price || 0), 0);
  const discountAmount = Number(((subtotal * discountPercent) / 100).toFixed(2));
  const finalTotal = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  // Ensure card name syncs with user
  useEffect(() => {
    if (currentUser?.name && !cardName) {
      setCardName(currentUser.name);
    }
  }, [currentUser]);

  // Handle Coupon Validation
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
      if (!res.ok) throw new Error(data.error || 'Invalid coupon code');

      setDiscountPercent(data.discountPercent || 15);
      showToast({
        title: 'Coupon Applied! 🎉',
        description: data.message || `Special ${data.discountPercent || 15}% discount activated.`,
        type: 'success'
      });
    } catch (err: any) {
      // Fallback demo coupon
      if (couponCode.toUpperCase() === 'WELCOME10' || couponCode.toUpperCase() === 'MORENA10') {
        setDiscountPercent(10);
        showToast({
          title: 'Special Coupon Applied! 🎉',
          description: '10% discount activated for new learners.',
          type: 'success'
        });
      } else {
        setDiscountPercent(0);
        showToast({
          title: 'Invalid Coupon',
          description: err.message || 'Coupon could not be applied.',
          type: 'error'
        });
      }
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Format Card Number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Card Expiry
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Execute Trial Payment & Order Processing
  const handlePay = async () => {
    if (!currentUser) {
      showToast({
        title: 'Sign In Required',
        description: 'Please sign in to your student account to complete checkout.',
        type: 'error'
      });
      router.push('/login?callbackUrl=/checkout');
      return;
    }

    if (cartItems.length === 0) {
      showToast({
        title: 'Cart is Empty',
        description: 'Please add courses to your cart before checking out.',
        type: 'error'
      });
      router.push('/courses');
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);

    try {
      // Step 1 Simulation: Connecting to Payment Switch
      await new Promise((r) => setTimeout(r, 900));
      setProcessingStep(2);

      // Step 2 Simulation: Authorizing Trial Payment
      await new Promise((r) => setTimeout(r, 900));
      setProcessingStep(3);

      // 1. Initialize Order in Database
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item) => ({ courseId: item.id })),
          couponCode: discountPercent > 0 ? couponCode : undefined,
          provider: paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'netbanking' ? 'NETBANKING' : 'CARD'
        })
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || 'Failed to initialize order.');
      }

      const orderId = checkoutData.order?.id || checkoutData.orderId;
      const orderNumber = checkoutData.order?.orderNumber || checkoutData.orderNumber;

      if (checkoutData.isFree) {
        clearCart();
        router.push(`/checkout/success?orderId=${orderId}&orderNumber=${orderNumber}`);
        return;
      }

      // 2. Process Trial Payment Verification & Grant Entitlements
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderNumber,
          provider: 'TRIAL',
          paymentId: `trial_${paymentMethod}_${Date.now()}`
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Failed to verify payment.');
      }

      // 3. Clear cart & redirect to success
      clearCart();
      await new Promise((r) => setTimeout(r, 600));

      router.push(`/checkout/success?orderId=${orderId}&orderNumber=${orderNumber}`);
    } catch (err: any) {
      showToast({
        title: 'Payment Failed',
        description: err.message || 'An error occurred during trial payment processing.',
        type: 'error'
      });
      setIsProcessing(false);
    }
  };

  // Helper to verify if cart items exist in localStorage while state is syncing
  const [isHydratingCart, setIsHydratingCart] = useState(true);

  useEffect(() => {
    if (cartItems.length > 0) {
      setIsHydratingCart(false);
      return;
    }
    try {
      const userKey = currentUser?.id ? `teach_cart_items_${currentUser.id}` : null;
      const userSaved = userKey ? localStorage.getItem(userKey) : null;
      const guestSaved = localStorage.getItem('teach_cart_items_guest');
      const hasStoredItems =
        (userSaved && JSON.parse(userSaved).length > 0) ||
        (guestSaved && JSON.parse(guestSaved).length > 0);

      if (!hasStoredItems) {
        setIsHydratingCart(false);
      }
    } catch {
      setIsHydratingCart(false);
    }
  }, [cartItems, currentUser]);

  // If cart is empty and not processing, show clean empty state
  if (cartItems.length === 0 && !isProcessing) {
    if (isHydratingCart) {
      return (
        <div className="min-h-screen bg-[#f7f9fa] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#5624d0] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#6a6f73] font-medium">Loading your order...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f7f9fa] flex flex-col justify-between font-sans">
        <header className="bg-white border-b border-[#d1d7dc] px-6 py-4">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <Link href="/" className="font-extrabold text-xl text-[#1c1d1f]">
              Morena Teach
            </Link>
          </div>
        </header>

        <main className="max-w-[600px] mx-auto text-center py-20 px-4">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-[#5624d0] flex items-center justify-center mx-auto mb-4 border border-purple-100">
            <Icon name="shopping_cart" size={32} />
          </div>
          <h1 className="text-2xl font-black text-[#1c1d1f] mb-2">
            Your cart is empty
          </h1>
          <p className="text-sm text-[#6a6f73] mb-6">
            Explore thousands of accredited courses from master educators and build in-demand skills today.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#5624d0] hover:bg-[#401b9c] text-white font-bold text-sm rounded-md shadow-sm transition-all"
          >
            <span>Browse Courses</span>
            <Icon name="arrow_forward" size={16} />
          </Link>
        </main>

        <footer className="bg-white border-t border-[#d1d7dc] py-4 text-center text-xs text-[#6a6f73]">
          &copy; {new Date().getFullYear()} Morena Teach LMS. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fa] text-[#1c1d1f] flex flex-col justify-between font-sans antialiased">
      {/* 1. Minimal Distraction-Free Header */}
      <header className="bg-white border-b border-[#d1d7dc] px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded bg-[#5624d0] flex items-center justify-center text-white font-black text-base shadow-xs">
              M
            </div>
            <span className="font-extrabold text-lg text-[#1c1d1f] tracking-tight">
              Morena Teach
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full">
              <Icon name="lock" size={14} />
              <span>256-Bit SSL Encrypted Checkout</span>
            </div>

            <Link
              href="/cart"
              className="text-xs font-bold text-[#5624d0] hover:underline flex items-center gap-1"
            >
              <Icon name="arrow_back" size={14} />
              <span>Cancel & Return to Cart</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Checkout Two-Column Layout */}
      <main className="flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1c1d1f] tracking-tight mb-8">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT COLUMN: Payment Method & Details (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Student Auth Check Notice */}
            {!currentUser && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                <Icon name="info" size={20} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-amber-900">
                    You are not signed in as a student
                  </p>
                  <p className="text-amber-800 mt-0.5">
                    Please{' '}
                    <Link
                      href="/login?callbackUrl=/checkout"
                      className="font-bold underline text-amber-950 hover:text-black"
                    >
                      Sign In
                    </Link>{' '}
                    or{' '}
                    <Link
                      href="/register?callbackUrl=/checkout"
                      className="font-bold underline text-amber-950 hover:text-black"
                    >
                      Register
                    </Link>{' '}
                    to assign this enrollment to your profile.
                  </p>
                </div>
              </div>
            )}

            {/* Trial Mode Simulation Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 sm:p-5 rounded-xl flex items-start gap-3.5 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Icon name="verified_user" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-purple-950">
                  Trial Payment Mode Active
                </h3>
                <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                  This transaction is in <strong>Trial / Sandbox Mode</strong>. No real credit card or bank account will be charged. Clicking <strong>Pay</strong> will immediately simulate banking authorization, activate your course access, and generate a verified invoice!
                </p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white border border-[#d1d7dc] rounded-xl p-5 sm:p-6 shadow-xs">
              <h2 className="text-base font-extrabold text-[#1c1d1f] mb-4">
                Select Payment Method
              </h2>

              {/* Method Tabs */}
              <div className="grid grid-cols-3 gap-2.5 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-[#5624d0] bg-purple-50/50 text-[#5624d0] shadow-xs'
                      : 'border-[#d1d7dc] hover:bg-gray-50 text-[#2d2f31]'
                  }`}
                >
                  <Icon name="credit_card" size={22} className="mb-1" />
                  <span className="text-xs font-bold">Credit/Debit Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                    paymentMethod === 'upi'
                      ? 'border-[#5624d0] bg-purple-50/50 text-[#5624d0] shadow-xs'
                      : 'border-[#d1d7dc] hover:bg-gray-50 text-[#2d2f31]'
                  }`}
                >
                  <Icon name="qr_code_2" size={22} className="mb-1" />
                  <span className="text-xs font-bold">UPI (Instant)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('netbanking')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                    paymentMethod === 'netbanking'
                      ? 'border-[#5624d0] bg-purple-50/50 text-[#5624d0] shadow-xs'
                      : 'border-[#d1d7dc] hover:bg-gray-50 text-[#2d2f31]'
                  }`}
                >
                  <Icon name="account_balance" size={22} className="mb-1" />
                  <span className="text-xs font-bold">Net Banking</span>
                </button>
              </div>

              {/* METHOD 1: CARD FORM */}
              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2d2f31] mb-1">
                      Name on Card
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. Full Name on Card"
                      className="w-full px-3.5 py-2.5 border border-[#d1d7dc] rounded-md text-sm text-[#1c1d1f] focus:outline-none focus:border-[#5624d0] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2d2f31] mb-1">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4532 0000 0000 0000"
                        className="w-full px-3.5 py-2.5 border border-[#d1d7dc] rounded-md text-sm text-[#1c1d1f] font-mono tracking-wider focus:outline-none focus:border-[#5624d0] transition-colors"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-75">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">VISA</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">MC</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded">RUPAY</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#2d2f31] mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM / YY"
                        className="w-full px-3.5 py-2.5 border border-[#d1d7dc] rounded-md text-sm text-[#1c1d1f] font-mono focus:outline-none focus:border-[#5624d0] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#2d2f31] mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-3.5 py-2.5 border border-[#d1d7dc] rounded-md text-sm text-[#1c1d1f] font-mono focus:outline-none focus:border-[#5624d0] transition-colors"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6a6f73] italic">
                    💡 Note: In trial mode, test card details are pre-filled. You can edit them or leave as is.
                  </p>
                </div>
              )}

              {/* METHOD 2: UPI FORM */}
              {paymentMethod === 'upi' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2d2f31] mb-2">
                      Popular UPI Apps
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'].map((app) => (
                        <button
                          key={app}
                          type="button"
                          onClick={() => setSelectedUpiApp(app)}
                          className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            selectedUpiApp === app
                              ? 'border-[#5624d0] bg-purple-50 text-[#5624d0]'
                              : 'border-[#d1d7dc] hover:bg-gray-50 text-[#2d2f31]'
                          }`}
                        >
                          {app}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2d2f31] mb-1">
                      Virtual Payment Address (UPI ID)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@okhdfcbank"
                      className="w-full px-3.5 py-2.5 border border-[#d1d7dc] rounded-md text-sm text-[#1c1d1f] focus:outline-none focus:border-[#5624d0] transition-colors"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(!isQrModalOpen)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5624d0] hover:underline cursor-pointer"
                    >
                      <Icon name="qr_code" size={16} />
                      <span>{isQrModalOpen ? 'Hide QR Code' : 'Or Scan UPI QR Code directly'}</span>
                    </button>

                    {isQrModalOpen && (
                      <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center flex flex-col items-center">
                        <div className="w-36 h-36 bg-white p-2 rounded-lg border border-gray-300 shadow-xs flex items-center justify-center">
                          <Icon name="qr_code_2" size={120} className="text-[#1c1d1f]" />
                        </div>
                        <p className="text-xs font-bold text-[#1c1d1f] mt-2">
                          Scan with any UPI App
                        </p>
                        <p className="text-[11px] text-[#6a6f73]">
                          Amount: ₹{finalTotal} &bull; Trial Mock QR
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* METHOD 3: NET BANKING */}
              {paymentMethod === 'netbanking' && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-[#2d2f31] mb-2">
                    Select Your Bank
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      'HDFC Bank',
                      'State Bank of India',
                      'ICICI Bank',
                      'Axis Bank',
                      'Kotak Mahindra Bank',
                      'Punjab National Bank'
                    ].map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-3 text-left rounded-lg border transition-all cursor-pointer ${
                          selectedBank === bank
                            ? 'border-[#5624d0] bg-purple-50/60 text-[#5624d0] shadow-xs'
                            : 'border-[#d1d7dc] hover:bg-gray-50 text-[#2d2f31]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon
                            name={selectedBank === bank ? 'radio_button_checked' : 'radio_button_unchecked'}
                            size={16}
                            className={selectedBank === bank ? 'text-[#5624d0]' : 'text-gray-400'}
                          />
                          <span className="text-xs font-bold leading-tight">{bank}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Order Action Button */}
            <div>
              <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full py-4 bg-[#5624d0] hover:bg-[#401b9c] text-white font-extrabold text-base rounded-lg shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <span>Processing Trial Payment...</span>
                ) : (
                  <>
                    <Icon name="lock" size={18} />
                    <span>Pay ₹{finalTotal} (Trial Payment)</span>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-[#6a6f73] mt-2.5">
                By completing your trial purchase you agree to Morena Teach Terms of Service.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Review (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-[#d1d7dc] rounded-xl p-6 shadow-xs sticky top-24">
            <h2 className="text-lg font-extrabold text-[#1c1d1f] mb-4 pb-3 border-b border-[#e4e8eb]">
              Order Summary
            </h2>

            {/* Courses List */}
            <div className="space-y-4 mb-6 max-h-[320px] overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-3.5 pb-3.5 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-16 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                    <img
                      src={item.thumbnail || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=400'}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[#1c1d1f] line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#6a6f73] mt-0.5">
                      By {item.instructorName || 'Morena Teach Faculty'}
                    </p>
                    <div className="text-xs font-extrabold text-[#1c1d1f] mt-1">
                      ₹{item.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Input */}
            <form onSubmit={handleApplyCoupon} className="mb-6">
              <label className="block text-xs font-bold text-[#2d2f31] mb-1.5">
                Have a Coupon Code?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. WELCOME10"
                  className="flex-1 px-3 py-2 border border-[#d1d7dc] rounded-md text-xs uppercase font-bold focus:outline-none focus:border-[#5624d0]"
                />
                <button
                  type="submit"
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="px-4 py-2 bg-[#1c1d1f] hover:bg-[#2d2f31] text-white text-xs font-bold rounded-md disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isValidatingCoupon ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {discountPercent > 0 && (
                <p className="text-xs text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                  <Icon name="check_circle" size={14} />
                  <span>Coupon active: {discountPercent}% OFF</span>
                </p>
              )}
            </form>

            {/* Price Calculations */}
            <div className="space-y-2.5 pt-4 border-t border-[#e4e8eb] text-sm mb-6">
              <div className="flex justify-between text-[#2d2f31]">
                <span>Original Price:</span>
                <span className="font-semibold">₹{subtotal}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount ({discountPercent}%):</span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-[#6a6f73] text-xs">
                <span>GST (18% inclusive):</span>
                <span>Included</span>
              </div>

              <div className="flex justify-between text-[#1c1d1f] text-lg font-black pt-3 border-t border-gray-200">
                <span>Total Amount:</span>
                <span>₹{finalTotal}</span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-[#6a6f73]">
              <div className="flex items-center gap-2">
                <Icon name="verified" size={16} className="text-[#5624d0]" />
                <span>30-Day Full Refund Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="all_inclusive" size={16} className="text-[#5624d0]" />
                <span>Lifetime access with diploma certificate</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Simulated Payment Modal during processing */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Spinning Indicator */}
            <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-[#5624d0] animate-spin mx-auto" />

            <div>
              <h3 className="text-xl font-black text-[#1c1d1f]">
                Processing Trial Payment
              </h3>
              <p className="text-xs text-[#6a6f73] mt-1">
                Please do not close or refresh this window...
              </p>
            </div>

            {/* Stepper */}
            <div className="space-y-3 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <Icon
                  name={processingStep >= 1 ? 'check_circle' : 'radio_button_unchecked'}
                  size={18}
                  className={processingStep >= 1 ? 'text-emerald-600' : 'text-gray-400'}
                  fill={processingStep >= 1}
                />
                <span className={`text-xs ${processingStep === 1 ? 'font-bold text-[#1c1d1f]' : 'text-gray-600'}`}>
                  Connecting to banking gateway switch...
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Icon
                  name={processingStep >= 2 ? 'check_circle' : 'radio_button_unchecked'}
                  size={18}
                  className={processingStep >= 2 ? 'text-emerald-600' : 'text-gray-400'}
                  fill={processingStep >= 2}
                />
                <span className={`text-xs ${processingStep === 2 ? 'font-bold text-[#1c1d1f]' : 'text-gray-600'}`}>
                  Authorizing payment method ({paymentMethod.toUpperCase()})...
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Icon
                  name={processingStep >= 3 ? 'check_circle' : 'radio_button_unchecked'}
                  size={18}
                  className={processingStep >= 3 ? 'text-emerald-600' : 'text-gray-400'}
                  fill={processingStep >= 3}
                />
                <span className={`text-xs ${processingStep === 3 ? 'font-bold text-[#1c1d1f]' : 'text-gray-600'}`}>
                  Payment Approved! Activating course enrollments...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-[#d1d7dc] py-6 text-center text-xs text-[#6a6f73]">
        <div className="max-w-[1280px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} Morena Teach LMS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/support" className="hover:underline">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-[#1c1d1f]">Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
