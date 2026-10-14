'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Course } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface UdemyFeaturedCourseCardProps {
  course: Course;
}

export const UdemyFeaturedCourseCard: React.FC<UdemyFeaturedCourseCardProps> = ({ course }) => {
  const router = useRouter();
  const { addToCart, isInCart, currentUser, showToast } = useApp();
  const inCart = isInCart(course.id) || (course.slug ? isInCart(course.slug) : false);
  const discountPrice = course.originalPrice || (course as any).discountPrice;

  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-[#2d2f31] tracking-tight mb-3">
        Featured course
      </h2>

      <Link
        href={`/courses/${course.slug || course.id}`}
        className="block border border-[#d1d7dc] p-6 bg-white hover:bg-[#f7f9fa]/60 transition-colors group cursor-pointer"
      >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* 16:9 Featured Thumbnail */}
          <div className="w-full md:w-[360px] lg:w-[400px] shrink-0 aspect-[16/9] overflow-hidden border border-[#d1d7dc] bg-[#f7f9fa] relative">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#6a6f73]">
                <Icon name="school" size={40} />
                <span className="text-xs mt-1">
                  {typeof (course.category as any) === 'object' && (course.category as any) !== null
                    ? ((course.category as any).name || 'General')
                    : (course.category || 'General')}
                </span>
              </div>
            )}
          </div>

          {/* Details Content */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#2d2f31] leading-snug group-hover:text-[#5022c3] transition-colors mb-2">
                {course.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#2d2f31] leading-relaxed line-clamp-3 mb-3 font-normal">
                {(course as any).shortDescription || course.subtitle || course.description}
              </p>
              <p className="text-xs text-[#6a6f73] mb-2 font-normal">
                By <span className="font-semibold text-[#2d2f31]">{course.instructor?.name || 'Faculty of Teacher Excellence'}</span>
              </p>

              {/* Meta & Duration */}
              <div className="text-xs text-[#6a6f73] flex items-center gap-2 mb-2">
                <span>Updated September 2026</span>
                <span>·</span>
                <span>{course.durationHours || 24} total hours</span>
                <span>·</span>
                <span>{course.level || 'All Levels'}</span>
              </div>

              {/* Rating & Reviews (Clickable -> direct jump to Reviews) */}
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/courses/${course.slug || course.id}#reviews`);
                }}
                className="flex items-center gap-1.5 text-xs mb-3 cursor-pointer group/rating hover:opacity-90 w-fit transition-all"
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
                      size={14}
                      fill={i < Math.floor(Number(course.rating) || 5)}
                      className={i < Math.floor(Number(course.rating) || 5) ? 'text-[#b4690e]' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-[#6a6f73] group-hover/rating:text-[#5022c3] group-hover/rating:underline">
                  ({Number(course.reviewsCount) >= 1000 ? `${(Number(course.reviewsCount) / 1000).toFixed(1)}k` : Number(course.reviewsCount) || 0})
                </span>
              </div>
            </div>

            {/* Price & Bestseller Badge */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
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
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-[#2d2f31]">
                  {Number(course.price || 0) === 0 ? 'Free' : `₹${Number(course.price || 0).toLocaleString('en-IN')}`}
                </span>
                {discountPrice && Number(discountPrice) > Number(course.price || 0) && (
                  <span className="text-xs text-[#6a6f73] line-through">
                    ₹{Number(discountPrice).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
              {Number(course.price || 0) === 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!currentUser) {
                      showToast('Please sign in or create an account to enroll for free', 'info');
                      router.push(`/login?callbackUrl=${encodeURIComponent(`/courses/${course.slug || course.id}?autoEnroll=true`)}`);
                    } else {
                      router.push(`/courses/${course.slug || course.id}?autoEnroll=true`);
                    }
                  }}
                  className="h-10 px-5 text-xs font-bold rounded-[2px] transition-colors flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Icon name="school" size={15} />
                  <span>Enroll Free</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (inCart) {
                      router.push('/student/cart');
                    } else {
                      addToCart(course);
                    }
                  }}
                  className={`h-10 px-5 text-xs font-bold rounded-[2px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                    inCart
                      ? 'bg-purple-100 text-[#5022c3] hover:bg-purple-200 border border-purple-200'
                      : 'bg-[#a435f0] hover:bg-[#8710d8] text-white shadow-xs'
                  }`}
                >
                  <Icon name={inCart ? 'check' : 'shopping_cart'} size={15} />
                  <span>{inCart ? 'In Cart ✓' : 'Add to cart'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push(`/courses/${course.slug || course.id}`)}
                className="h-10 px-4 border border-[#2d2f31] text-[#2d2f31] hover:bg-[#f7f9fa] text-xs font-bold rounded-[2px] transition-colors cursor-pointer"
              >
                View curriculum
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};
