'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { CurriculumAccordion } from '@/components/courses/CurriculumAccordion';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, wishlistCourseIds, toggleWishlist, processCheckout, showToast, addToCart, isInCart, enrolledCourseIds } = useApp();

  const [courseData, setCourseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Review submission state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const courseSlug = (params?.id as string) || '';

  const fetchCourse = async () => {
    if (!courseSlug) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseSlug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.course) {
          setCourseData(data.course);
          return;
        }
      }

      // If course was not found, check if it's a category slug (e.g., /courses/marketing or /courses/early-childhood-education)
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        const matchedCat = catData.categories?.find((c: any) =>
          c.slug.toLowerCase() === courseSlug.toLowerCase() ||
          c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === courseSlug.toLowerCase() ||
          c.name.toLowerCase() === courseSlug.toLowerCase()
        );
        if (matchedCat) {
          router.replace(`/courses?category=${encodeURIComponent(matchedCat.name)}`);
          return;
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseSlug]);

  useEffect(() => {
    if (courseData && typeof window !== 'undefined' && window.location.hash === '#reviews') {
      setTimeout(() => {
        document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
  }, [courseData]);

  const course = courseData;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);

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

      setAppliedDiscount(data.discountPercent || 0);
      showToast({
        title: 'Coupon Applied!',
        description: data.message || `${data.discountPercent}% discount applied.`,
        type: 'success'
      });
    } catch (err: any) {
      setAppliedDiscount(0);
      showToast({
        title: 'Coupon Error',
        description: err.message || 'Could not apply coupon.',
        type: 'error'
      });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!currentUser) {
      showToast({
        title: 'Sign In Required',
        description: 'Please sign in or create an account to enroll.',
        type: 'info'
      });
      router.push('/login');
      return;
    }

    if (!course) return;

    setIsCheckingOut(true);
    try {
      await processCheckout(course.id, couponCode);
      setIsCheckoutOpen(false);
      showToast({
        title: 'Enrollment Confirmed!',
        description: `Welcome to ${course.title}!`,
        type: 'success'
      });
      router.push(`/learn/${course.slug || course.id}`);
    } catch (err: any) {
      showToast({ title: 'Checkout Failed', description: err.message, type: 'error' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !course) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          rating: newRating,
          comment: newComment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      showToast({ title: 'Review Published!', description: 'Thank you for your feedback.', type: 'success' });
      setNewComment('');
      await fetchCourse();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col antialiased">
        <UdemyNavbar />
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
        </div>
        <UdemyFooter />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col antialiased">
        <UdemyNavbar />
        <div className="flex-1 flex flex-col items-center justify-center py-24 px-4 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-[#6a6f73]">
            <Icon name="search_off" size={36} />
          </div>
          <h1 className="text-2xl font-bold text-[#2d2f31]">Course Not Found</h1>
          <p className="text-sm text-[#6a6f73] leading-relaxed">
            The requested course could not be located in our curriculum catalog or has been moved.
          </p>
          <Link
            href="/courses"
            className="px-6 py-2.5 bg-[#2d2f31] text-white font-bold text-sm rounded hover:bg-[#1c1d1f] transition-all"
          >
            Browse All Available Courses
          </Link>
        </div>
        <UdemyFooter />
      </div>
    );
  }

  const isEnrolled = !!course.isEnrolled || (enrolledCourseIds && enrolledCourseIds.includes(course.id));
  const isWishlisted = wishlistCourseIds.includes(course.id) || !!course.isWishlisted;

  const subtotal = course.price;
  const discountAmount = Number(((subtotal * appliedDiscount) / 100).toFixed(2));
  const finalTotal = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  const modules = (course.sections || []).map((sec: any, idx: number) => ({
    id: sec.id,
    moduleNumber: idx + 1,
    title: sec.title,
    lessons: (sec.lessons || []).map((l: any, lIdx: number) => ({
      id: l.id,
      title: l.title,
      duration: l.duration || '10:00',
      completed: false,
      locked: !isEnrolled && !l.isFree
    }))
  }));

  return (
    <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col antialiased">
      <UdemyNavbar />

      <main className="w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative pb-24 md:pb-16">
        {/* Left Column: Course Details */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          {/* Breadcrumbs & Hero */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-on-surface-variant text-xs sm:text-sm font-semibold">
              <Link href="/courses" className="hover:text-primary transition-colors">
                Browse
              </Link>
              <Icon name="chevron_right" size={16} />
              <Link href="/courses" className="hover:text-primary transition-colors">
                {course.category?.name || course.category || 'Computer Science'}
              </Link>
              <Icon name="chevron_right" size={16} />
              <span className="text-on-surface truncate">{course.title}</span>
            </div>

            <h1 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-on-surface leading-tight tracking-tight">
              {course.title}
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
              {course.description}
            </p>

            {/* Badges & Meta Metrics */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('reviews');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant hover:bg-surface-container-high transition-colors cursor-pointer group/rate"
                title="Click to jump to student reviews"
              >
                <span className="text-sm font-bold text-on-surface group-hover/rate:text-primary">
                  {typeof course.rating === 'number' ? course.rating.toFixed(1) : '5.0'}
                </span>
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Icon key={i} name="star" fill size={16} />
                  ))}
                </div>
                <span className="text-xs text-on-surface-variant ml-1 group-hover/rate:underline">
                  ({course.reviews?.length || course.reviewsCount || 0} reviews)
                </span>
              </button>

              <div className="flex items-center gap-1.5 text-on-surface-variant text-xs sm:text-sm">
                <Icon name="group" size={20} />
                <span>{course.studentsCount?.toLocaleString() || course.enrollmentsCount || 0} students</span>
              </div>

              <div className="flex items-center gap-1.5 text-on-surface-variant text-xs sm:text-sm">
                <Icon name="schedule" size={20} />
                <span>{course.durationHours || 30} hours total</span>
              </div>
            </div>

            {/* Instructor Bio Card */}
            {course.instructor && (
              <div className="flex items-center gap-3.5 mt-4 p-3 bg-surface-container-low/60 rounded-xl border border-outline-variant/50 w-fit">
                <UserAvatar
                  avatar={course.instructor.avatar}
                  name={course.instructor.name}
                  size="lg"
                  className="w-12 h-12 shrink-0"
                />
                <div>
                  <p className="text-sm font-bold text-on-surface">Created by {course.instructor.name}</p>
                  <p className="text-xs text-on-surface-variant">{course.instructor.bio || 'Distinguished Faculty Lead'}</p>
                </div>
              </div>
            )}
          </section>

          {/* What You'll Learn Card */}
          {course.whatYouWillLearn && (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-6 pb-3 border-b border-outline-variant">
                What you&apos;ll learn
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {(typeof course.whatYouWillLearn === 'string'
                  ? JSON.parse(course.whatYouWillLearn)
                  : course.whatYouWillLearn
                ).map((item: string, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <Icon
                      name="check_circle"
                      fill
                      size={20}
                      className="text-primary mt-0.5 shrink-0"
                    />
                    <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Curriculum Section */}
          <CurriculumAccordion
            modules={modules}
            courseSlug={course.slug || course.id}
          />

          {/* Student Reviews & Ratings Section */}
          <section id="reviews" className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24">
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
              <div>
                <h3 className="text-xl font-bold text-on-surface">Student Reviews &amp; Feedback</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Real verified ratings from enrolled students</p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-200">
                <Icon name="star" fill size={18} className="text-amber-500" />
                <span className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                  {typeof course.rating === 'number' ? course.rating.toFixed(1) : '5.0'} / 5.0
                </span>
              </div>
            </div>

            {/* Leave Review Form (If enrolled) */}
            {isEnrolled && (
              <form onSubmit={handleReviewSubmit} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/60 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-on-surface">Leave Your Rating</span>
                  <div className="flex gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Icon name="star" fill={star <= newRating} size={20} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your learning experience with this masterclass..."
                  className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !newComment.trim()}
                    className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary-container shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReview ? 'Posting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-4 divide-y divide-outline-variant/40">
              {(!course.reviews || course.reviews.length === 0) ? (
                <p className="text-xs text-on-surface-variant text-center py-4">
                  No reviews yet. Be the first enrolled student to review!
                </p>
              ) : (
                course.reviews.map((r: any) => (
                  <div key={r.id} className="pt-4 first:pt-0 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          avatar={r.user?.avatar}
                          name={r.user?.name || 'Verified Student'}
                          size="xs"
                          className="w-7 h-7"
                        />
                        <span className="font-bold text-xs text-on-surface">{r.user?.name || 'Verified Student'}</span>
                      </div>
                      <div className="flex text-amber-500">
                        {[...Array(r.rating || 5)].map((_, i) => (
                          <Icon key={i} name="star" fill size={14} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed pl-9">{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Floating Purchase Card */}
        <div className="lg:col-span-4 relative">
          <div className="sticky top-[96px] bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:border-primary/40">
            {/* Video Preview Hero */}
            <div className="w-full aspect-video bg-surface-container relative group cursor-pointer border-b border-outline-variant">
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 via-surface-container to-surface-container-high flex items-center justify-center text-primary/60">
                  <Icon name="school" size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Link
                  href={`/learn/${course.slug || course.id}`}
                  className="w-16 h-16 bg-surface-container-lowest/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:text-primary transition-all duration-300"
                >
                  <Icon name="play_arrow" fill size={32} className="ml-1 text-primary" />
                </Link>
              </div>
              <div className="absolute bottom-3 left-0 w-full px-3 flex justify-center">
                <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-md">
                  Preview this course
                </span>
              </div>
            </div>

            {/* Pricing & Checkout CTAs */}
            <div className="p-6 sm:p-8 flex flex-col gap-5">
              <div className="flex items-end gap-3">
                <span className={`text-3xl sm:text-4xl font-extrabold leading-none font-mono ${course.price === 0 ? 'text-emerald-700' : 'text-on-surface'}`}>
                  {course.price === 0 ? 'Free' : `₹${Number(course.price).toLocaleString('en-IN')}`}
                </span>
                {course.discountPrice && course.discountPrice > course.price && (
                  <span className="text-base text-outline line-through mb-1 font-mono">
                    ₹{Number(course.discountPrice).toLocaleString('en-IN')}
                  </span>
                )}
                {course.price === 0 && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                    100% Free
                  </span>
                )}
              </div>

              {isEnrolled ? (
                <Link
                  href={`/learn/${course.slug || course.id}`}
                  className="w-full bg-[#a435f0] text-white font-bold text-center py-3.5 rounded hover:bg-[#8710d8] transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Icon name="play_circle" fill size={20} />
                  <span>Go to course</span>
                </Link>
              ) : course.price === 0 ? (
                <div className="space-y-2.5">
                  <button
                    onClick={async () => {
                      if (!currentUser) {
                        showToast({
                          title: 'Sign In Required',
                          description: 'Please sign in or create an account to enroll for free.',
                          type: 'info'
                        });
                        router.push(`/login?callbackUrl=/courses/${course.slug || course.id}`);
                        return;
                      }
                      setIsCheckingOut(true);
                      try {
                        await processCheckout(course.id);
                        showToast({
                          title: '🎉 Enrolled for Free!',
                          description: `Welcome to ${course.title}! Your lifetime access is active.`,
                          type: 'success'
                        });
                        router.push(`/learn/${course.slug || course.id}`);
                      } catch (err: any) {
                        showToast({
                          title: 'Enrollment Notice',
                          description: err.message || 'Could not complete free enrollment.',
                          type: 'error'
                        });
                      } finally {
                        setIsCheckingOut(false);
                      }
                    }}
                    disabled={isCheckingOut}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-base disabled:opacity-60"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enrolling for Free...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="school" size={20} />
                        <span>Enroll Now (100% Free)</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-emerald-700 font-semibold">
                    Instant lifetime access · No credit card required
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {isInCart(course.id) ? (
                    <Link
                      href="/student/cart"
                      className="w-full bg-[#a435f0] text-white font-bold py-3.5 rounded hover:bg-[#8710d8] transition-all flex items-center justify-center gap-2 text-center"
                    >
                      <Icon name="shopping_cart" size={18} />
                      <span>Go to cart</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => addToCart(course)}
                      className="w-full bg-[#a435f0] text-white font-bold py-3.5 rounded hover:bg-[#8710d8] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Icon name="shopping_cart" size={18} />
                      <span>Add to cart</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!isInCart(course.id)) {
                        addToCart(course);
                      }
                      router.push('/checkout');
                    }}
                    className="w-full bg-white text-[#2d2f31] border border-[#2d2f31] font-bold py-3.5 rounded hover:bg-[#f7f9fa] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Buy now</span>
                  </button>
                </div>
              )}

              <p className="text-center text-xs text-on-surface-variant font-medium">
                30-Day Money-Back Guarantee
              </p>

              <div className="pt-4 border-t border-outline-variant">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">
                  This course includes:
                </h4>
                <ul className="space-y-2.5 text-xs text-on-surface-variant">
                  <li className="flex items-center gap-2.5">
                    <Icon name="ondemand_video" size={18} className="text-primary" />
                    <span>{course.durationHours || 30} hours on-demand video</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Icon name="all_inclusive" size={18} className="text-primary" />
                    <span>Full lifetime access</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Icon name="military_tech" size={18} className="text-primary" />
                    <span>Certificate of completion</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-center items-center pt-4 border-t border-outline-variant">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard?.writeText(window.location.href);
                      showToast({ title: 'Copied', description: 'Course link copied.', type: 'success' });
                    }
                  }}
                  className="text-on-surface-variant text-xs font-semibold hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-lg hover:bg-surface-container-low"
                >
                  <Icon name="share" size={18} />
                  <span>Share this course</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Checkout Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Complete Your Order"
        subtitle={`Instant enrollment in "${course.title}"`}
      >
        <div className="space-y-5">
          {/* Item Breakdown */}
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm text-on-surface">{course.title}</p>
                <p className="text-xs text-on-surface-variant">Lifetime license with verified diploma</p>
              </div>
              <span className="font-bold text-sm text-on-surface font-mono">${subtotal}</span>
            </div>

            {appliedDiscount > 0 && (
              <div className="flex justify-between items-center text-xs text-emerald-700 font-semibold pt-2 border-t border-outline-variant/40">
                <span>Discount ({appliedDiscount}% Off):</span>
                <span className="font-mono">-${discountAmount}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-base font-extrabold text-on-surface pt-2 border-t border-outline-variant/60">
              <span>Total:</span>
              <span className="text-xl text-primary font-mono">${finalTotal}</span>
            </div>
          </div>

          {/* Coupon Input Form */}
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon code"
              className="flex-1 bg-surface border border-outline-variant rounded-xl px-3.5 py-2 text-xs font-mono uppercase focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isApplyingCoupon || !couponCode.trim()}
              className="px-4 py-2 bg-surface-container text-on-surface border border-outline-variant rounded-xl text-xs font-bold hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50 cursor-pointer"
            >
              {isApplyingCoupon ? 'Validating...' : 'Apply'}
            </button>
          </form>

          {/* Payment Method */}
          <div className="p-3.5 bg-surface rounded-xl border border-outline-variant space-y-2">
            <span className="text-xs font-bold text-on-surface block">Payment Gateway</span>
            <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/40">
              <Icon name="credit_card" size={18} className="text-primary" />
              <span>Razorpay &amp; Stripe Secure Checkout</span>
              <span className="ml-auto text-[10px] text-emerald-600 font-bold">✓ Server Verified</span>
            </div>
          </div>

          {/* Checkout CTAs */}
          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompleteOrder}
              disabled={isCheckingOut}
              className="px-6 py-2.5 text-sm font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Icon name={isCheckingOut ? 'sync' : 'lock'} size={16} className={isCheckingOut ? 'animate-spin' : ''} />
              <span>{isCheckingOut ? 'Processing Order...' : `Pay $${finalTotal} & Enroll`}</span>
            </button>
          </div>
        </div>
      </Modal>

      <UdemyFooter />
    </div>
  );
}
