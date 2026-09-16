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
  const { wishlistCourseIds, toggleWishlist, addToCart, isInCart, showToast } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isWishlisted = wishlistCourseIds.includes(course.id);
  const inCart = isInCart(course.id) || (course.slug ? isInCart(course.slug) : false);
  const discountPrice = course.originalPrice || (course as any).discountPrice;

  // Format exact published date & time
  const formattedDateTime = React.useMemo(() => {
    const rawDate = course.createdAt || (course as any).updatedAt;
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, [course.createdAt, (course as any).updatedAt]);

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

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(course.id);
    showToast({
      title: isWishlisted ? 'Removed from Wishlist' : 'Added to Wishlist',
      description: course.title,
      type: 'info'
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
        href={`/courses/${course.slug}`}
        className="flex flex-col h-full bg-white cursor-pointer group"
      >
        {/* Thumbnail (Crisp 16:9 with Udemy 1px border) */}
        <div className="relative aspect-[16/9] w-full overflow-hidden border border-[#d1d7dc] bg-[#f7f9fa] mb-2">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#6a6f73] p-4 text-center">
              <Icon name="school" size={32} />
              <span className="text-[11px] mt-1 font-medium">
                {typeof (course.category as any) === 'object' && (course.category as any) !== null ? ((course.category as any).name || 'General') : (course.category || 'General')}
              </span>
            </div>
          )}

          {/* Quick Wishlist button */}
          <button
            onClick={handleWishlistClick}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-all ${
              isWishlisted
                ? 'bg-white text-red-500 shadow-sm'
                : 'bg-white/80 text-[#2d2f31] hover:bg-white hover:text-red-500 shadow-sm'
            }`}
          >
            <Icon name={isWishlisted ? 'favorite' : 'favorite_border'} size={18} fill={isWishlisted} />
          </button>
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

          {/* Published Date & Time */}
          {formattedDateTime && (
            <div className="flex items-center gap-1 text-[11px] text-[#5022c3] font-medium mb-1 bg-purple-50/80 px-1.5 py-0.5 rounded w-fit">
              <Icon name="schedule" size={12} className="text-[#5022c3] shrink-0" />
              <span>Published: {formattedDateTime}</span>
            </div>
          )}

          {/* Ratings Row */}
          <div className="flex items-center gap-1 mb-1 text-xs">
            <span className="font-extrabold text-[#b4690e]">
              {(course.rating || 4.8).toFixed(1)}
            </span>
            <div className="flex items-center text-[#b4690e]">
              {[...Array(5)].map((_, i) => (
                <Icon
                  key={i}
                  name="star"
                  size={13}
                  fill={i < Math.floor(course.rating || 5)}
                  className={i < Math.floor(course.rating || 5) ? 'text-[#b4690e]' : 'text-gray-300'}
                />
              ))}
            </div>
            <span className="text-[#6a6f73] font-normal">
              ({course.reviewsCount >= 1000 ? `${(course.reviewsCount / 1000).toFixed(1)}k` : course.reviewsCount || 0})
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
            <span className="text-base font-bold text-[#2d2f31]">
              {course.price === 0 ? 'Free' : `₹${course.price.toLocaleString('en-IN')}`}
            </span>
            {discountPrice && discountPrice > course.price && (
              <span className="text-xs text-[#6a6f73] line-through">
                ₹{discountPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
            {!course.bestseller && !course.isNew && (course.rating || 0) >= 4.8 && (
              <span className="bg-purple-100 text-[#5022c3] text-[11px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wide">
                Highest Rated
              </span>
            )}
          </div>

          {/* Direct Card Action Button (Mobile & Quick Add) */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
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
          <h4 className="font-bold text-[#2d2f31] text-base leading-snug mb-2">
            {course.title}
          </h4>
          <p className="text-xs text-emerald-800 font-semibold mb-2 flex items-center gap-1">
            <Icon name="schedule" size={13} />
            <span>Published: {formattedDateTime || 'Recently Added'}</span>
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
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex-1 py-2.5 font-bold text-xs rounded-none sm:rounded-[4px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                inCart
                  ? 'bg-purple-100 text-[#5022c3] hover:bg-purple-200 border border-purple-300'
                  : 'bg-[#a435f0] hover:bg-[#8710d8] text-white'
              }`}
            >
              <Icon name={inCart ? 'check' : 'shopping_cart'} size={15} />
              <span>{inCart ? 'Go to cart' : 'Add to cart'}</span>
            </button>
            <button
              type="button"
              onClick={handleWishlistClick}
              className={`p-2 rounded-none sm:rounded-[4px] border transition-colors cursor-pointer ${
                isWishlisted
                  ? 'border-red-500 text-red-500 bg-red-50'
                  : 'border-[#2d2f31] text-[#2d2f31] hover:bg-[#f7f9fa]'
              }`}
              title="Add to wishlist"
            >
              <Icon name={isWishlisted ? 'favorite' : 'favorite_border'} size={18} fill={isWishlisted} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
