'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function StudentWishlistPage() {
  const { showToast } = useApp();
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWishlist = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/student/wishlist');
      if (res.ok) {
        const d = await res.json();
        setWishlist(d.wishlist || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (courseId: string) => {
    try {
      const res = await fetch(`/api/student/wishlist?courseId=${courseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast({ title: 'Removed from Wishlist', type: 'info' });
        await fetchWishlist();
      }
    } catch {
      showToast({ title: 'Removed', type: 'info' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Wishlist</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Saved Curricula</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Courses you have bookmarked for upcoming learning goals
          </p>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 bg-rose-500/10 text-rose-700 rounded-full border border-rose-500/20">
          {wishlist.length} Saved
        </span>
      </div>

      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((item) => (
            <div
              key={item.id}
              className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden hover:border-primary/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative aspect-video w-full overflow-hidden bg-neutral-950 flex items-center justify-center">
                  {typeof item.thumbnail === 'string' && item.thumbnail.trim().length > 0 ? (
                    <>
                      <img
                        src={item.thumbnail.trim()}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none"
                      />
                      <img
                        src={item.thumbnail.trim()}
                        alt={item.title}
                        className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-primary/60 group-hover:scale-105 transition-transform duration-300">
                      <Icon name="school" size={32} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-outline">{item.category || 'Course'}</span>
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                    {item.category}
                  </div>
                  <button
                    onClick={() => handleRemove(item.courseId)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/50 text-rose-400 hover:text-white hover:bg-rose-600 transition-colors"
                    title="Remove"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-extrabold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">By {item.instructor?.name}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
                    <span className="font-mono font-black text-base text-on-surface">${item.price}</span>
                    <span className="text-[10px] font-mono text-outline uppercase">{item.level}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <Link
                  href={`/courses/${item.slug || item.courseId}`}
                  className="w-full py-2 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Enroll Now</span>
                  <Icon name="arrow_forward" size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto font-bold">
            <Icon name="favorite" size={24} />
          </div>
          <h3 className="font-bold text-base text-on-surface">Your wishlist is empty</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Browse our course library and click the heart icon on any curriculum to save it here.
          </p>
          <Link
            href="/dashboard/explore"
            className="inline-block px-5 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-xs"
          >
            Explore Courses
          </Link>
        </div>
      )}
    </div>
  );
}
