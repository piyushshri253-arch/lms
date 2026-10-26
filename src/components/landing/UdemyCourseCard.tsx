'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Course } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface UdemyCourseCardProps {
  course: Course;
  cardIndex?: number;
  totalCards?: number;
}

export const UdemyCourseCard: React.FC<UdemyCourseCardProps> = ({
  course,
  cardIndex = 0,
  totalCards = 4
}) => {
  const router = useRouter();
  const { addToCart, isInCart, currentUser, showToast } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const inCart = isInCart(course.id) || (course.slug ? isInCart(course.slug) : false);
  const discountPrice = course.originalPrice || (course as any).discountPrice;

  // Format Updated Date (e.g. "Updated 14 Oct 2026")
  const formattedUpdateDate = React.useMemo(() => {
    const rawDate = (course as any).updatedAt || course.createdAt;
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, [(course as any).updatedAt, course.createdAt]);

  // Format Version Label (e.g. "v1.0", "v2.0")
  const versionLabel = React.useMemo(() => {
    if (course.versionLabel && course.versionLabel.trim()) {
      return course.versionLabel.trim();
    }
    if ((course as any).versionNumber) {
      return `v${(course as any).versionNumber}.0`;
    }
    const titleMatch = course.title?.match(/\((v\d+(\.\d+)?)\)/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1];
    }
    return 'v1.0';
  }, [course.versionLabel, (course as any).versionNumber, course.title]);

  const isRecentlyAdded = React.useMemo(() => {
    if (!course.createdAt) return false;
    const diff = Date.now() - new Date(course.createdAt).getTime();
    return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }, [course.createdAt]);

  let whatYouWillLearn: string[] = [];
  if (Array.isArray(course.whatYouWillLearn)) {
    whatYouWillLearn = course.whatYouWillLearn;
  } else if (typeof course.whatYouWillLearn === 'string') {
    try {
      whatYouWillLearn = JSON.parse(course.whatYouWillLearn);
    } catch {
      whatYouWillLearn = [];
    }
  }

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 250);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (course.price === 0) {
      if (!currentUser) {
        showToast({
          title: 'Sign In Required',
          description: 'Please sign in or create an account to enroll for free.',
          type: 'info'
        });
        router.push(`/login?callbackUrl=${encodeURIComponent(`/courses/${course.slug || course.id}?autoEnroll=true`)}`);
        return;
      }
      router.push(`/courses/${course.slug || course.id}?autoEnroll=true`);
      return;
    }
    if (inCart) {
      router.push('/student/cart');
    } else {
      addToCart(course);
    }
  };

  // Determine popover position based on card index in grid:
  // If fewer than 3 total cards, prefer opening to the right. Otherwise columns 3 & 4 open to the left.
  const isRightSide = totalCards <= 2 ? false : cardIndex % 4 >= 2;

  return (
    <div
      className={`relative flex flex-col h-full bg-white ${isHovered ? 'z-40' : 'z-10'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. Main Course Card */}
      <Link
        href={`/courses/${course.slug || course.id}`}
        className="flex flex-col h-full bg-white cursor-pointer group"
      >
        {/* Thumbnail (Crisp 16:9 with Udemy 1px border) */}
        <div className="relative aspect-[16/9] w-full overflow-hidden border border-[#d1d7dc] bg-neutral-950 mb-2 flex items-center justify-center">
          {course.thumbnail ? (
            <>
              <img
                src={course.thumbnail}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none"
              />
              <img
                src={course.thumbnail}
                alt={course.title}
                className="relative z-10 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#6a6f73] p-4 text-center bg-[#f7f9fa]">
              <Icon name="school" size={32} />
              <span className="text-[11px] mt-1 font-medium">
                {typeof (course.category as any) === 'object' && (course.category as any) !== null ? ((course.category as any).name || 'General') : (course.category || 'General')}
              </span>
            </div>
          )}
          {/* Version Badge (Top-Left) */}
          <div className="absolute top-2 left-2 z-20 bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-wider flex items-center gap-1 border border-white/20">
            <Icon name="layers" size={11} className="text-violet-400" />
            <span>{versionLabel}</span>
          </div>
          {course.price === 0 && (
            <div className="absolute top-2 right-2 z-20 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider uppercase">
              Free
            </div>
          )}
        </div>

        {/* Details Content */}
        <div className="flex flex-col flex-1">
          {/* Title */}
          <h3 className="font-bold text-[#2d2f31] text-[15px] leading-[1.25] line-clamp-2 mb-1 group-hover:text-[#2d2f31]">
            {course.title}
          </h3>

          {/* Instructor */}
          <p className="text-xs text-[#6a6f73] truncate mb-1">
            {course.instructor?.name || 'Faculty of Teacher Excellence'}
          </p>

          {/* Version & Updated Date */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-violet-50 text-[#5022c3] border border-violet-200/80">
              <Icon name="layers" size={11} className="text-[#5022c3]" />
              <span>{versionLabel}</span>
            </span>
            {formattedUpdateDate && (
              <div className="flex items-center gap-1 text-[11px] text-[#5022c3] font-medium bg-purple-50/80 px-1.5 py-0.5 rounded">
                <Icon name="update" size={12} className="text-[#5022c3] shrink-0" />
                <span>Updated {formattedUpdateDate}</span>
              </div>
            )}
          </div>

          {/* Ratings Row (Clickable -> direct jump to Reviews) */}
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/courses/${course.slug || course.id}#reviews`);
            }}
            className="flex items-center gap-1 mb-1 text-xs cursor-pointer group/rating hover:opacity-90 w-fit transition-all"
            title="Click to view student reviews & feedback"
          >
            <span className="font-extrabold text-[#b4690e] group-hover/rating:underline">
              {(Number(course.rating) || 4.8).toFixed(1)}
            </span>
            <div className="flex items-center text-[#b4690e]">
              {[...Array(5)].map((_, i) => (
                <Icon
                  key={i}
                  name="star"
                  size={13}
                  fill={i < Math.floor(Number(course.rating) || 5)}
                  className={i < Math.floor(Number(course.rating) || 5) ? 'text-[#b4690e]' : 'text-gray-300'}
                />
              ))}
            </div>
            <span className="text-[#6a6f73] font-normal group-hover/rating:text-[#5022c3] group-hover/rating:underline">
              ({Number(course.reviewsCount) >= 1000 ? `${(Number(course.reviewsCount) / 1000).toFixed(1)}k` : Number(course.reviewsCount) || 0})
            </span>
          </div>

          {/* Metadata */}
          <div className="text-xs text-[#6a6f73] mb-1">
            <span>{course.durationHours || 12} total hours</span>
            <span className="mx-1.5">·</span>
            <span>{course.level || 'All Levels'}</span>
          </div>

          {/* Price Row */}
          <div className="mt-auto flex items-baseline gap-2 pt-1">
            <span className={`text-base font-extrabold ${Number(course.price || 0) === 0 ? 'text-emerald-700' : 'text-[#2d2f31]'}`}>
              {Number(course.price || 0) === 0 ? 'Free' : `₹${Number(course.price || 0).toLocaleString('en-IN')}`}
            </span>
            {discountPrice && Number(discountPrice) > Number(course.price || 0) && (
              <span className="text-xs text-[#6a6f73] line-through">
                ₹{Number(discountPrice).toLocaleString('en-IN')}
              </span>
            )}
          </div>

            {/* Badges */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {Number(course.price || 0) === 0 && (
                <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wide">
                  Free Course
                </span>
              )}
              {course.versionNumber && course.versionNumber > 1 && (
                <span className="bg-violet-700 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-none uppercase tracking-wide flex items-center gap-1 shadow-xs">
                  <Icon name="layers" size={11} className="text-violet-200" />
                  <span>{versionLabel}</span>
                </span>
              )}
              {isRecentlyAdded && (
                <span className="bg-emerald-100 text-emerald-900 text-[11px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Just Added
                </span>
              )}
              {course.bestseller && (
                <span className="bg-[#eceb98] text-[#3d3c0a] text-[11px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wide">
                  Bestseller
                </span>
              )}
              {course.isNew && !isRecentlyAdded && (
                <span className="bg-teal-100 text-teal-900 text-[11px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wide">
                  New
                </span>
              )}
              {!course.bestseller && !course.isNew && (Number(course.rating) || 0) >= 4.8 && (
                <span className="bg-purple-100 text-[#5022c3] text-[11px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wide">
                  Highest Rated
                </span>
              )}
            </div>

          {/* Direct Card Action Button (Mobile & Quick Add) */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
            {Number(course.price || 0) === 0 ? (
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-1.5 px-3 text-xs font-bold rounded-[2px] transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Icon name="school" size={14} />
                <span>Enroll Free</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-[2px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  inCart
                    ? 'bg-purple-100 text-[#5022c3] hover:bg-purple-200 border border-purple-200'
                    : 'bg-[#a435f0] hover:bg-[#8710d8] text-white shadow-xs'
                }`}
              >
                <Icon name={inCart ? 'check' : 'shopping_cart'} size={14} />
                <span>{inCart ? 'In Cart ✓' : 'Add to cart'}</span>
              </button>
            )}
          </div>
        </div>
      </Link>

      {/* 2. Udemy-Style Desktop Hover Popover */}
      {isHovered && (
        <div
          className={`hidden lg:block absolute z-[80] top-0 w-80 p-5 bg-white shadow-2xl border border-[#d1d7dc] pointer-events-auto rounded-[4px] ring-1 ring-black/5 animate-in fade-in duration-150 ${
            isRightSide ? 'right-full mr-3' : 'left-full ml-3'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-bold text-[#2d2f31] text-base leading-snug">
              {course.title}
            </h4>
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black rounded bg-violet-100 text-[#5022c3] border border-violet-200">
              <Icon name="layers" size={12} className="text-[#5022c3]" />
              <span>{versionLabel}</span>
            </span>
          </div>
          <p className="text-xs text-emerald-800 font-semibold mb-2 flex items-center gap-1">
            <Icon name="update" size={13} />
            <span>Updated {formattedUpdateDate || 'Recently'}</span>
          </p>
          <p className="text-xs text-[#6a6f73] mb-3">
            {course.durationHours || 24} total hours · {course.level || 'All Levels'} · English
          </p>

          {/* Short description */}
          <p className="text-xs text-[#2d2f31] leading-relaxed mb-4 line-clamp-3 font-normal">
            {(course as any).shortDescription || course.subtitle || course.description}
          </p>

          {/* What you'll learn */}
          {whatYouWillLearn.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-[#2d2f31] uppercase tracking-wider mb-2">
                What you&apos;ll learn:
              </p>
              <ul className="space-y-1.5 text-xs text-[#2d2f31]">
                {whatYouWillLearn.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Icon name="check" size={14} className="text-[#2d2f31] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 border-t border-gray-100">
            {course.price === 0 ? (
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-2.5 font-bold text-xs rounded-none sm:rounded-[4px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Icon name="school" size={15} />
                <span>Enroll Now — Free</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className={`w-full py-2.5 font-bold text-xs rounded-none sm:rounded-[4px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  inCart
                    ? 'bg-purple-100 text-[#5022c3] hover:bg-purple-200 border border-purple-300'
                    : 'bg-[#a435f0] hover:bg-[#8710d8] text-white'
                }`}
              >
                <Icon name={inCart ? 'check' : 'shopping_cart'} size={15} />
                <span>{inCart ? 'Go to cart' : 'Add to cart'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
