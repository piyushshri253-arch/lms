'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export interface MarketplaceCourse {
  id: string;
  slug: string;
  title: string;
  instructor: string;
  rating: number;
  ratingsCount: number;
  price: number;
  originalPrice?: number;
  thumbnail: string;
  badge?: 'Bestseller' | 'Hot & New' | 'Highest Rated' | null;
  category?: string;
  level?: string;
  durationHours?: number;
}

interface UdemyMarketplaceCardProps {
  course: MarketplaceCourse;
}

export const UdemyMarketplaceCard: React.FC<UdemyMarketplaceCardProps> = ({ course }) => {
  const router = useRouter();
  const { wishlistCourseIds, toggleWishlist, addToCart, isInCart, showToast } = useApp();

  const isWishlisted = wishlistCourseIds.includes(course.id) || wishlistCourseIds.includes(course.slug);
  const inCart = isInCart(course.id) || isInCart(course.slug);

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

  const handleCartAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) {
      router.push('/student/cart');
    } else {
      addToCart({
        id: course.id,
        slug: course.slug,
        title: course.title,
        price: course.price,
        discountPrice: course.originalPrice,
        thumbnail: course.thumbnail,
        instructorName: course.instructor,
        rating: course.rating,
        durationHours: course.durationHours || 16
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white group select-none">
      {/* 1. Thumbnail Container */}
      <div className="relative aspect-[16/9] w-full overflow-hidden border border-[#d1d7dc] bg-[#f7f9fa] mb-2">
        <Link href={`/courses/${course.slug}`} className="block w-full h-full">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Quick Wishlist Icon */}
        <button
          onClick={handleWishlistClick}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer ${
            isWishlisted
              ? 'bg-white text-red-500 shadow-md'
              : 'bg-white/90 text-[#2d2f31] hover:bg-white hover:text-red-500 shadow-sm opacity-90 hover:opacity-100'
          }`}
        >
          <Icon name={isWishlisted ? 'favorite' : 'favorite_border'} size={18} fill={isWishlisted} />
        </button>
      </div>

      {/* 2. Course Details */}
      <div className="flex flex-col flex-1">
        {/* Title */}
        <Link href={`/courses/${course.slug}`}>
          <h3 className="font-bold text-[#2d2f31] text-[15px] leading-[1.25] line-clamp-2 mb-1 hover:text-[#5022c3] transition-colors min-h-[38px]">
            {course.title}
          </h3>
        </Link>

        {/* Instructor */}
        <p className="text-xs text-[#6a6f73] truncate mb-1">
          {course.instructor}
        </p>

        {/* Rating Row */}
        <div className="flex items-center gap-1.5 mb-1.5 text-xs">
          <span className="font-extrabold text-[#b4690e]">
            {course.rating.toFixed(1)}
          </span>
          <div className="flex items-center text-[#b4690e]">
            {[...Array(5)].map((_, i) => (
              <Icon
                key={i}
                name="star"
                size={13}
                fill={i < Math.floor(course.rating)}
                className={i < Math.floor(course.rating) ? 'text-[#b4690e]' : 'text-gray-300'}
              />
            ))}
          </div>
          <span className="text-[#6a6f73] font-normal">
            ({course.ratingsCount.toLocaleString('en-IN')})
          </span>
        </div>

        {/* Price & Add To Cart Row */}
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[#2d2f31]">
              ₹{course.price.toLocaleString('en-IN')}
            </span>
            {course.originalPrice && course.originalPrice > course.price && (
              <span className="text-xs text-[#6a6f73] line-through">
                ₹{course.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleCartAction}
            className={`cursor-pointer font-bold text-xs px-3.5 py-1.5 rounded-[4px] shrink-0 transition-colors ${
              inCart
                ? 'bg-[#a435f0] text-white hover:bg-[#8710d8] flex items-center gap-1'
                : 'border border-[#a435f0] text-[#a435f0] hover:bg-purple-50'
            }`}
            title={inCart ? 'Go to cart' : 'Add to cart'}
          >
            {inCart ? (
              <>
                <Icon name="check" size={13} />
                <span>In cart</span>
              </>
            ) : (
              'Add to cart'
            )}
          </button>
        </div>

        {/* Badges */}
        <div className="mt-2 min-h-[22px]">
          {course.badge === 'Bestseller' && (
            <span className="inline-block bg-[#eceb98] text-[#3d3c0a] font-bold text-[11px] px-2 py-0.5 rounded-[2px]">
              Bestseller
            </span>
          )}
          {course.badge === 'Hot & New' && (
            <span className="inline-block bg-[#ffe7e8] text-[#b32d0f] font-bold text-[11px] px-2 py-0.5 rounded-[2px]">
              Hot & New
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
