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
  const { addToCart, isInCart } = useApp();
  const discountPrice = course.originalPrice || (course as any).discountPrice;

  return (
    <div className="border-b border-[#d1d7dc] py-4 flex flex-col sm:flex-row gap-4 items-start group">
      {/* 1. Left Thumbnail (16:9) */}
      <Link
        href={`/courses/${course.slug || course.id}`}
        className="w-full sm:w-[240px] md:w-[260px] shrink-0 aspect-[16/9] overflow-hidden border border-[#d1d7dc] bg-[#f7f9fa] relative block cursor-pointer"
      >
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#6a6f73]">
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

        {/* Ratings & Students */}
        <div className="flex items-center gap-1.5 text-xs mb-1">
          <span className="font-extrabold text-[#b4690e] text-sm">
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
          <span className="text-[#6a6f73]">
            ({course.reviewsCount >= 1000 ? `${(course.reviewsCount / 1000).toFixed(1)}k` : course.reviewsCount || 420})
          </span>
        </div>

        {/* Metadata (Hours, Level, Badges) */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6a6f73] mb-1.5">
          <span>{course.durationHours || 24} total hours</span>
          <span>·</span>
          <span>{course.level || 'All Levels'}</span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5">
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
          {!course.bestseller && !course.isNew && (course.rating || 0) >= 4.8 && (
            <span className="bg-purple-100 text-[#5022c3] text-[11px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wide">
              Highest Rated
            </span>
          )}
        </div>
      </Link>

      {/* 3. Right Price Column */}
      <div className="shrink-0 flex sm:flex-col items-baseline sm:items-end gap-1.5 pt-1 sm:pt-0">
        <div className="flex flex-col sm:items-end">
          <span className="text-base sm:text-lg font-bold text-[#2d2f31]">
            {course.price === 0 ? 'Free' : `₹${course.price.toLocaleString('en-IN')}`}
          </span>
          {discountPrice && discountPrice > course.price && (
            <span className="text-xs text-[#6a6f73] line-through">
              ₹{discountPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>
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
      </div>
    </div>
  );
};
