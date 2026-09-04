'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function StudentReviewsPage() {
  const { showToast } = useApp();
  const [reviews, setReviews] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const fetchReviewsAndCourses = async () => {
    setIsLoading(true);
    try {
      const [revRes, crsRes] = await Promise.all([
        fetch('/api/student/reviews'),
        fetch('/api/student/courses')
      ]);

      if (revRes.ok) {
        const d = await revRes.json();
        setReviews(d.reviews || []);
      }
      if (crsRes.ok) {
        const d = await crsRes.json();
        setEnrolledCourses(d.courses || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewsAndCourses();
  }, []);

  const handleWriteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !comment.trim()) return;

    try {
      const res = await fetch('/api/student/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          rating,
          comment
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      showToast({ title: 'Review Submitted!', description: data.message, type: 'success' });
      setIsWriteModalOpen(false);
      setSelectedCourseId('');
      setComment('');
      setRating(5);
      await fetchReviewsAndCourses();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      const res = await fetch(`/api/student/reviews?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast({ title: 'Review Deleted', type: 'info' });
        await fetchReviewsAndCourses();
      }
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
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
            <span className="text-primary font-bold">Reviews</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            My Course Reviews &amp; Ratings
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Share feedback with instructors and prospective learners
          </p>
        </div>

        <button
          onClick={() => setIsWriteModalOpen(true)}
          className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Icon name="rate_review" size={16} />
          <span>Write a Review</span>
        </button>
      </div>

      {reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-500 font-mono font-bold text-sm tracking-wider">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </span>
                  <span className="text-[10px] text-outline font-mono">{r.createdAt}</span>
                </div>

                <h3 className="font-extrabold text-base text-on-surface">{r.course?.title}</h3>
                <p className="text-xs text-on-surface-variant italic leading-relaxed">
                  "{r.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {r.status}
                </span>
                <button
                  onClick={() => handleDeleteReview(r.id)}
                  className="text-outline hover:text-error p-1 rounded-lg cursor-pointer"
                  title="Delete Review"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto font-bold">
            <Icon name="star" size={24} />
          </div>
          <h3 className="font-bold text-base text-on-surface">No reviews submitted yet</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            You can review any course you are actively enrolled in to share your experience.
          </p>
          <button
            onClick={() => setIsWriteModalOpen(true)}
            className="px-5 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-xs cursor-pointer"
          >
            Review an Enrolled Course
          </button>
        </div>
      )}

      {/* Write Review Modal */}
      <Modal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        maxWidth="md"
        title="Write Course Review"
        subtitle="Provide honest feedback to help instructors and students"
      >
        <form onSubmit={handleWriteReview} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Select Enrolled Course
            </label>
            <select
              required
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">-- Choose Course --</option>
              {enrolledCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Rating (1 to 5 Stars)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl cursor-pointer transition-transform hover:scale-110 ${
                    star <= rating ? 'text-amber-500' : 'text-slate-300'
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="text-xs font-mono font-bold text-on-surface ml-2">
                {rating} / 5 Stars
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Your Review &amp; Feedback
            </label>
            <textarea
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you learn? How was the teaching style and lecture quality?"
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsWriteModalOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs cursor-pointer"
            >
              Submit Review
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
