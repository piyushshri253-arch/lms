'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function StudentWishlistPage() {
  const { wishlistCourseIds, toggleWishlist, addToCart, isInCart, showToast } = useApp();
  const [wishlistCourses, setWishlistCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWishlist() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/wishlist');
        if (res.ok) {
          const data = await res.json();
          if (data.wishlist) {
            setWishlistCourses(data.wishlist.map((w: any) => w.course).filter(Boolean));
          }
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    }
    loadWishlist();
  }, [wishlistCourseIds]);

  return (
    <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col font-sans antialiased">
      <UdemyNavbar />

      {/* Header Banner */}
      <section className="bg-[#1c1d1f] text-white py-8 px-4 sm:px-8 border-b border-[#3e4143]">
        <div className="max-w-[1340px] mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            My Wishlist
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1.5">
            Curricula and masterclasses you have saved for later.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-[1340px] mx-auto px-4 sm:px-8 py-8 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-3 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#6a6f73]">Loading your saved wishlist...</p>
          </div>
        ) : wishlistCourses.length === 0 ? (
          <div className="border border-[#d1d7dc] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-4 my-8 bg-[#f7f9fa]/50">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-rose-500 border border-[#d1d7dc] shadow-xs">
              <Icon name="favorite_border" size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#1c1d1f]">
              Your wishlist is empty.
            </h3>
            <p className="text-xs sm:text-sm text-[#6a6f73] max-w-md">
              Explore courses and click the heart icon on any curriculum to save it to your wishlist.
            </p>
            <Link
              href="/courses"
              className="px-6 py-2.5 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-xs rounded transition-colors shadow-xs"
            >
              Explore Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistCourses.map((c) => (
              <div
                key={c.id}
                className="border border-[#d1d7dc] bg-white rounded-lg overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-200 group"
              >
                <div>
                  <Link
                    href={`/courses/${c.slug || c.id}`}
                    className="relative aspect-[16/9] w-full bg-gray-100 overflow-hidden block"
                  >
                    {c.thumbnail ? (
                      <img
                        src={c.thumbnail}
                        alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <Icon name="school" size={32} />
                      </div>
                    )}
                  </Link>

                  <div className="p-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6f73]">
                      {c.category?.name || c.category || 'Curriculum'}
                    </span>
                    <Link
                      href={`/courses/${c.slug || c.id}`}
                      className="font-bold text-[15px] leading-snug text-[#1c1d1f] group-hover:text-[#5022c3] transition-colors line-clamp-2 block"
                    >
                      {c.title}
                    </Link>
                    <p className="text-xs text-[#6a6f73] truncate">
                      {c.instructor?.name || 'Academic Faculty'}
                    </p>
                    <p className="text-base font-extrabold text-[#1c1d1f] font-mono pt-1">
                      ${Number(c.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-2">
                  <button
                    onClick={() => addToCart(c)}
                    className={`w-full py-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isInCart(c.id)
                        ? 'bg-purple-100 text-[#5022c3] hover:bg-purple-200'
                        : 'bg-[#a435f0] text-white hover:bg-[#8710d8]'
                    }`}
                  >
                    <Icon name="shopping_cart" size={16} />
                    <span>{isInCart(c.id) ? 'In Cart ✓' : 'Add to cart'}</span>
                  </button>
                  <button
                    onClick={() => {
                      toggleWishlist(c.id);
                      showToast({ title: 'Removed from Wishlist', type: 'info' });
                    }}
                    className="w-full py-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <UdemyFooter />
    </div>
  );
}
