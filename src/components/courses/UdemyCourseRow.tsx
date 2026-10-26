'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Course } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface UdemyCourseRowProps {
  course: Course;
}

export const UdemyCourseRow: React.FC<UdemyCourseRowProps> = ({ course }) => {
  const router = useRouter();
  const { addToCart, isInCart, currentUser, showToast } = useApp();
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

  return (
    <div className="border-b border-[#d1d7dc] py-4 flex flex-col sm:flex-row gap-4 items-start group">
      {/* 1. Left Thumbnail (16:9) */}
      <Link
        href={`/courses/${course.slug || course.id}`}
        className="w-full sm:w-[240px] md:w-[260px] shrink-0 aspect-[16/9] overflow-hidden border border-[#d1d7dc] bg-neutral-950 relative flex items-center justify-center cursor-pointer"
      >
        {/* Version Badge (Top-Left) */}
        <div className="absolute top-2 left-2 z-20 bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-wider flex items-center gap-1 border border-white/20">
          <Icon name="layers" size={11} className="text-violet-400" />
          <span>{versionLabel}</span>
        </div>
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
              className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#6a6f73] bg-[#f7f9fa]">
            <Icon name="school" size={32} />
            <span className="text-[11px] mt-1">
              {typeof (course.category as any) === 'object' && (course.category as any) !== null ? ((course.category as any).name || 'General') : (course.category || 'General')}
            </span>
          </div>
        )}
      </Link>

      {/* 2. Middle Content Information */}
      <Link
        href={`/courses/${course.slug || course.id}`}
        className="flex-1 min-w-0 pr-4 block cursor-pointer"
      >
        {/* Title */}
        <h3 className="font-bold text-base sm:text-[17px] leading-snug text-[#2d2f31] group-hover:text-[#5022c3] transition-colors line-clamp-2 mb-1">
          {course.title}
        </h3>

        {/* Subtitle / Short Description */}
        <p className="text-xs sm:text-[13px] text-[#2d2f31] leading-relaxed line-clamp-2 mb-1.5 font-normal">
          {(course as any).shortDescription || course.subtitle || course.description}
        </p>

        {/* Instructor */}
        <p className="text-xs text-[#6a6f73] truncate mb-1">
          {course.instructor?.name || 'Faculty of Teacher Excellence'}
        </p>

        {/* Ratings & Students (Clickable -> direct jump to Reviews) */}
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/courses/${course.slug || course.id}#reviews`);
          }}
          className="flex items-center gap-1.5 text-xs mb-1 cursor-pointer group/rating hover:opacity-90 w-fit transition-all"
          title="Click to view student reviews & feedback"
        >
          <span className="font-extrabold text-[#b4690e] text-sm group-hover/rating:underline">
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
          <span className="text-[#6a6f73] group-hover/rating:text-[#5022c3] group-hover/rating:underline">
            ({Number(course.reviewsCount) >= 1000 ? `${(Number(course.reviewsCount) / 1000).toFixed(1)}k` : Number(course.reviewsCount) || 0})
          </span>
        </div>

        {/* Metadata (Version, Updated date, Hours, Level, Badges) */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6a6f73] mb-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-violet-50 text-[#5022c3] border border-violet-200/80">
            <Icon name="layers" size={11} className="text-[#5022c3]" />
            <span>{versionLabel}</span>
          </span>
          <span>·</span>
          {formattedUpdateDate && (
            <>
              <span className="font-medium text-[#5022c3]">Updated {formattedUpdateDate}</span>
              <span>·</span>
            </>
          )}
          <span>{course.durationHours || 24} total hours</span>
          <span>·</span>
          <span>{course.level || 'All Levels'}</span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5">
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
          {course.bestseller && (
            <span className="bg-[#eceb98] text-[#3d3c0a] text-[11px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wide">
              Bestseller
            </span>
          )}
          {course.isNew && (
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
      </Link>

      {/* 3. Right Price Column */}
      <div className="shrink-0 flex sm:flex-col items-baseline sm:items-end gap-1.5 pt-1 sm:pt-0">
        <div className="flex flex-col sm:items-end">
          <span className={`text-base sm:text-lg font-extrabold ${Number(course.price || 0) === 0 ? 'text-emerald-700' : 'text-[#2d2f31]'}`}>
            {Number(course.price || 0) === 0 ? 'Free' : `₹${Number(course.price || 0).toLocaleString('en-IN')}`}
          </span>
          {discountPrice && Number(discountPrice) > Number(course.price || 0) && (
            <span className="text-xs text-[#6a6f73] line-through">
              ₹{Number(discountPrice).toLocaleString('en-IN')}
            </span>
          )}
        </div>
        {Number(course.price || 0) === 0 ? (
          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                showToast('Please sign in or create an account to enroll for free', 'info');
                router.push(`/login?callbackUrl=${encodeURIComponent(`/courses/${course.slug || course.id}?autoEnroll=true`)}`);
              } else {
                router.push(`/courses/${course.slug || course.id}?autoEnroll=true`);
              }
            }}
            className="mt-2 px-3 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Enroll Free
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isInCart(course.id)) {
                router.push('/student/cart');
              } else {
                addToCart(course);
              }
            }}
            className={`mt-2 px-3 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer ${
              isInCart(course.id)
                ? 'bg-purple-100 text-[#5022c3] hover:bg-purple-200'
                : 'bg-[#a435f0] text-white hover:bg-[#8710d8]'
            }`}
          >
            {isInCart(course.id) ? 'In Cart ✓' : 'Add to cart'}
          </button>
        )}
      </div>
    </div>
  );
};
