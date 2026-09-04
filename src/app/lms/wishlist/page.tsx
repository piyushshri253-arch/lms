'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsWishlistPage() {
  const wishlist = [
    {
      id: 'c-102',
      title: 'Kubernetes Platform Engineering & Cloud Native DevOps',
      slug: 'k8s-cloud-native-devops',
      category: 'DevOps & Cloud',
      instructor: 'Marcus Chen',
      duration: '22h 10m',
      rating: 4.8
    }
  ];

  return (
    <LmsLayout activePath={LMS_ROUTES.WISHLIST} pageTitle="Saved Curricula">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Wishlist</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Saved Masterclasses & Wishlist
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Curricula and courses bookmarked for future enrollment.
            </p>
          </div>
        </div>

        {/* Wishlist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {wishlist.map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl group"
            >
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {c.category}
                </span>
                <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-400">Instructor: {c.instructor}</p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                <Link
                  href={LMS_ROUTES.COURSE_DETAILS(c.slug || c.id)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <span>Enroll Now</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </LmsLayout>
  );
}
