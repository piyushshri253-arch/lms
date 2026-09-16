'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Modal } from '@/components/ui/Modal';
import { AppHeader } from '@/components/layout/AppHeader';

interface CourseAuthored {
  id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  price: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | string;
  level: string;
  category?: string;
  studentsCount: number;
  rating: number;
  createdAt?: string;
}

export default function InstructorDashboardPage() {
  const router = useRouter();
  const { currentUser, showToast } = useApp();
  const [courses, setCourses] = useState<CourseAuthored[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('4999');
  const [newCategory, setNewCategory] = useState('Engineering');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingCourseId, setSubmittingCourseId] = useState<string | null>(null);

  const fetchInstructorCourses = async () => {
    try {
      setIsLoading(true);
      // Use manage=true to fetch all authored courses for the authenticated instructor
      const res = await fetch('/api/courses?manage=true');
      const data = await res.json();
      if (res.ok && data.courses) {
        setCourses(data.courses);
      } else {
        setCourses([]);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load authored courses.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchInstructorCourses();
    }
  }, [currentUser]);

  // Submit Draft course for Admin approval
  const handleSubmitForApproval = async (courseId: string, courseSlug?: string) => {
    setSubmittingCourseId(courseId);
    try {
      const identifier = courseSlug || courseId;
      const res = await fetch(`/api/courses/${identifier}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: true })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit course for approval');
      }

      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, status: 'IN_REVIEW' } : c))
      );

      showToast({
        title: 'Submitted for Approval! 📋',
        description: 'Course submitted to Super Admin for review. Once approved, it will automatically appear on the landing page.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Submission Incomplete',
        description: err.message || 'Make sure your course has sections, lessons, and pricing configured before submitting.',
        type: 'error'
      });
    } finally {
      setSubmittingCourseId(null);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          price: Number(newPrice) || 0,
          category: newCategory,
          level: 'INTERMEDIATE',
          status: 'DRAFT',
          description: 'Comprehensive course curriculum authored by verified faculty.'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create course');

      showToast({
        title: 'Course Initialized 🎉',
        description: `"${newTitle}" created as draft. Opening Curriculum Studio...`,
        type: 'success'
      });

      setIsCreateOpen(false);
      setNewTitle('');

      // Redirect to Curriculum Studio so instructor can add modules and lessons immediately
      if (data.course?.id) {
        router.push(`/instructor/courses/builder?courseId=${data.course.id}`);
      } else {
        fetchInstructorCourses();
      }
    } catch (err: any) {
      showToast({ title: 'Creation Failed', description: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalStudents = courses.reduce((acc, c) => acc + (c.studentsCount || 0), 0);
  const totalRevenue = courses.reduce((acc, c) => acc + (c.price * (c.studentsCount || 0)), 0);

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              avatar={currentUser?.avatar}
              name={currentUser?.name || 'Instructor'}
              size="2xl"
              className="w-16 h-16 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-on-surface">
                  Instructor Studio: {currentUser?.name || 'Faculty Lead'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-xs font-black uppercase">
                  Faculty
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Create deep-tech courses, upload modules & lessons, and submit for Super Admin approval to go live on the main website.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/instructor/courses/builder"
              className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs px-5 py-3 rounded-2xl hover:bg-primary/90 shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Icon name="add_circle" size={18} />
              <span>+ Create Course</span>
            </Link>
          </div>
        </div>

        {/* Workflow Guide Alert */}
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Icon name="verified" size={18} />
            </div>
            <div>
              <span className="font-bold text-indigo-950 dark:text-indigo-200">
                Single-Platform Publishing Workflow:
              </span>{' '}
              <span className="text-indigo-800 dark:text-indigo-300">
                Create Course & Lessons &rarr; Save Draft &rarr; Submit for Approval &rarr; Admin Review &rarr; Auto-Publishes on Main Landing Page.
              </span>
            </div>
          </div>
          <Link
            href="/instructor/courses/builder"
            className="text-primary font-bold hover:underline shrink-0"
          >
            Launch Builder &rarr;
          </Link>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-on-surface-variant font-bold">Authored Courses</p>
              <h3 className="text-2xl font-black text-on-surface mt-1">{courses.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="menu_book" size={24} />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-on-surface-variant font-bold">Total Active Learners</p>
              <h3 className="text-2xl font-black text-on-surface mt-1">{totalStudents}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center">
              <Icon name="groups" size={24} />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-on-surface-variant font-bold">Catalog Value</p>
              <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <Icon name="payments" size={24} />
            </div>
          </div>
        </div>

        {/* Courses Table / Cards */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-on-surface">Your Authored Masterclasses</h2>
              <p className="text-xs text-on-surface-variant">Live curriculum modules and publishing approval statuses</p>
            </div>
            <span className="text-xs font-mono font-bold text-outline">{courses.length} courses</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <Icon name="sync" size={20} className="animate-spin text-primary" />
              <span>Loading authored courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Icon name="school" size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">No courses authored yet</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Create your first masterclass syllabus, upload lesson media, and submit for review.
                </p>
              </div>
              <Link
                href="/instructor/courses/builder"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary/90 shadow-sm cursor-pointer"
              >
                <Icon name="add_circle" size={16} />
                <span>Create Your First Course</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const isApproved = course.status === 'PUBLISHED';
                const isUnderReview = course.status === 'IN_REVIEW';
                const isRejected = course.status === 'REJECTED';

                return (
                  <div
                    key={course.id}
                    className="bg-surface-container-low/60 border border-outline-variant/70 hover:border-primary/50 rounded-2xl p-5 flex flex-col justify-between transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1.5 ${
                            isApproved
                              ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20'
                              : isUnderReview
                              ? 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30'
                              : isRejected
                              ? 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/30'
                              : 'bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20'
                          }`}
                        >
                          {isUnderReview && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                          )}
                          {isApproved
                            ? 'Live on Landing Page'
                            : isUnderReview
                            ? 'Under Admin Review'
                            : isRejected
                            ? 'Changes Requested'
                            : 'Draft'}
                        </span>

                        <span className="font-mono text-sm font-black text-emerald-600">
                          ₹{course.price.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      {isUnderReview && (
                        <p className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50">
                          ⏳ Pending Super Admin approval. Once approved, this course will automatically appear on the main website.
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-outline-variant/60 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                        <div className="flex items-center gap-1.5">
                          <Icon name="person" size={14} />
                          <span>{course.studentsCount || 0} enrolled</span>
                        </div>
                        <span className="font-mono text-[11px]">
                          ⭐ {course.rating || 5.0}
                        </span>
                      </div>

                      {/* Course Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Link
                          href={`/instructor/courses/builder?courseId=${course.id}`}
                          className="text-xs font-bold text-on-surface hover:text-primary border border-outline-variant px-2.5 py-1.5 rounded-xl hover:bg-surface-container transition-colors inline-flex items-center gap-1"
                        >
                          <Icon name="edit" size={13} />
                          <span>Edit Syllabus</span>
                        </Link>

                        {/* Submit for Approval Button (for Draft / Rejected) */}
                        {(!isApproved && !isUnderReview) && (
                          <button
                            type="button"
                            disabled={submittingCourseId === course.id}
                            onClick={() => handleSubmitForApproval(course.id, course.slug)}
                            className="text-xs font-bold bg-primary text-on-primary hover:bg-primary/90 px-3 py-1.5 rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {submittingCourseId === course.id ? (
                              <Icon name="sync" size={13} className="animate-spin" />
                            ) : (
                              <Icon name="send" size={13} />
                            )}
                            <span>Submit for Approval</span>
                          </button>
                        )}

                        {/* View Course Link (for Published) */}
                        {isApproved && (
                          <Link
                            href={`/courses/${course.slug || course.id}`}
                            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <span>View on Website</span>
                            <Icon name="arrow_forward" size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Course Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="md"
        title="Initialize New Masterclass"
        subtitle="Add a new verified course to your instructor profile"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">Course Title *</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Distributed Systems Architecture & Raft Consensus"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">Fee / Price (₹ INR) *</label>
              <input
                type="number"
                required
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">Category *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="Engineering">Engineering</option>
                <option value="AI & Machine Learning">AI & Machine Learning</option>
                <option value="System Design">System Design</option>
                <option value="Cloud Architecture">Cloud Architecture</option>
                <option value="Security">Security & Cryptography</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/60 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary/90 shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Icon name="sync" size={14} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Initialize & Open Studio</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
