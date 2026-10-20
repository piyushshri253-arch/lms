'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { notifyCoursesChanged } from '@/lib/courses-sync';

interface CourseActiveToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    slug?: string;
    title: string;
    status: string;
  } | null;
  onStatusChanged: (newStatus: string) => void;
}

export const CourseActiveToggleModal: React.FC<CourseActiveToggleModalProps> = ({
  isOpen,
  onClose,
  course,
  onStatusChanged
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !course) return null;

  const isCurrentlyActive = course.status === 'PUBLISHED';
  const targetAction = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const identifier = course.slug || course.id;
      const res = await fetch(`/api/courses/${encodeURIComponent(identifier)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetAction
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update course availability status');
      }

      onStatusChanged(data.status);
      notifyCoursesChanged();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header Icon & Title */}
        <div className="p-6 text-center space-y-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
              isCurrentlyActive
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <Icon
              name={isCurrentlyActive ? 'pause_circle' : 'play_circle'}
              size={32}
            />
          </div>

          <h3 className="text-lg font-black text-slate-900">
            {isCurrentlyActive ? 'Deactivate Course?' : 'Activate Course for Enrollments?'}
          </h3>

          <p className="text-xs font-bold text-slate-700 line-clamp-2 px-2">
            &quot;{course.title}&quot;
          </p>

          <div
            className={`p-4 rounded-2xl text-xs text-left space-y-1.5 border ${
              isCurrentlyActive
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <p className="font-bold flex items-center gap-1.5">
              <Icon name="info" size={16} />
              <span>{isCurrentlyActive ? 'Important Deactivation Notice:' : 'Activation Confirmation:'}</span>
            </p>
            <p className="leading-relaxed">
              {isCurrentlyActive
                ? 'Deactivating this course will hide it from new enrollments. Existing enrolled students will keep full access to their learning materials.'
                : 'Making this course active will allow new students to purchase and enroll in the course.'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isCurrentlyActive
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isSubmitting ? (
              <Icon name="sync" size={14} className="animate-spin" />
            ) : (
              <Icon name={isCurrentlyActive ? 'pause' : 'check'} size={14} />
            )}
            <span>
              {isCurrentlyActive ? 'Confirm Deactivate' : 'Confirm Activate'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
