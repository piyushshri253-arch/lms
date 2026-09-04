'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export default function SuperAdminReviewsPage() {
  const { showToast } = useApp();
  const [reviews, setReviews] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/super-admin/reviews?status=${statusFilter}&q=${encodeURIComponent(search)}`
      );
      if (res.ok) {
        const d = await res.json();
        setReviews(d.reviews || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, search]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/super-admin/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        showToast({ title: 'Status Updated', description: `Review marked as ${status}`, type: 'success' });
        await fetchReviews();
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    try {
      const res = await fetch(`/api/super-admin/reviews?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast({ title: 'Review Deleted', type: 'info' });
        await fetchReviews();
      }
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Reviews</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Review Moderation &amp; Quality Control
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Audit student feedback, approve public display, and moderate rating submissions
          </p>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 bg-amber-500/10 text-amber-700 rounded-full border border-amber-500/20">
          {reviews.length} Total Reviews
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Icon
            name="search"
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feedback comments, student name..."
            className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {['ALL', 'APPROVED', 'PENDING', 'HIDDEN'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/80 text-outline hover:text-on-surface'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatar={r.user?.avatar}
                    name={r.user?.name}
                    size="sm"
                    shape="rounded"
                    className="w-10 h-10"
                  />
                  <div>
                    <h4 className="font-extrabold text-xs text-on-surface">{r.user?.name}</h4>
                    <p className="text-[10px] text-outline font-mono">{r.user?.email}</p>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    r.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.status === 'HIDDEN'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {r.status}
                </span>
              </div>

              <div>
                <span className="text-amber-500 font-mono font-bold text-sm tracking-wider">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </span>
                <p className="text-xs font-extrabold text-on-surface mt-1">{r.course?.title}</p>
                <p className="text-xs text-on-surface-variant italic mt-1 leading-relaxed">
                  "{r.comment}"
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-between">
              <span className="text-[10px] font-mono text-outline">{r.createdAt?.split('T')[0]}</span>

              <div className="flex items-center gap-1.5">
                {r.status !== 'APPROVED' && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, 'APPROVED')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                )}
                {r.status !== 'HIDDEN' && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, 'HIDDEN')}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[10px] hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                  >
                    Hide
                  </button>
                )}
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1 text-outline hover:text-rose-600 rounded-lg cursor-pointer"
                  title="Delete Review"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
