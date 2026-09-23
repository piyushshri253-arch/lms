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
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'APPROVED' | 'REJECTED' | string;
  level: string;
  category?: string;
  studentsCount: number;
  rating: number;
  reviewFeedback?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  instructor?: {
    name?: string;
    avatar?: string;
  };
}

type TabType = 'ALL' | 'PUBLISHED' | 'IN_REVIEW' | 'DRAFT' | 'REJECTED' | 'CATALOG';

export default function InstructorDashboardPage() {
  const router = useRouter();
  const { currentUser, showToast } = useApp();

  // Courses State
  const [courses, setCourses] = useState<CourseAuthored[]>([]);
  const [platformCourses, setPlatformCourses] = useState<CourseAuthored[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  // Tabs & Search State
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Course Actions State
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<CourseAuthored | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create Course Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('4999');
  const [newCategory, setNewCategory] = useState('Engineering');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Authored Courses
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

  // Fetch Entire Platform Catalog (Optional tab for instructors to view all platform offerings)
  const fetchPlatformCatalog = async () => {
    if (platformCourses.length > 0) return;
    try {
      setIsCatalogLoading(true);
      const res = await fetch('/api/courses');
      const data = await res.json();
      if (res.ok && data.courses) {
        setPlatformCourses(data.courses);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load academy catalog.', type: 'error' });
    } finally {
      setIsCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchInstructorCourses();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'CATALOG') {
      fetchPlatformCatalog();
    }
  }, [activeTab]);

  // Submit Draft course for Reviewer/Admin approval
  const handleSubmitForApproval = async (courseId: string, courseSlug?: string) => {
    setActionInProgressId(courseId);
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
        description: 'Course submitted to QA Review Studio. Once approved, you will be able to publish it live.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Submission Incomplete',
        description: err.message || 'Make sure your course has sections, lessons, and pricing configured before submitting.',
        type: 'error'
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Publish course after Reviewer approval
  const handlePublishApprovedCourse = async (courseId: string, courseSlug?: string) => {
    setActionInProgressId(courseId);
    try {
      const identifier = courseSlug || courseId;
      const res = await fetch(`/api/courses/${identifier}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: true })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish course');
      }

      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, status: 'PUBLISHED' } : c))
      );

      showToast({
        title: 'Course Published Live! 🚀',
        description: 'Your approved masterclass is now live on the landing page for student enrollments.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Publishing Error',
        description: err.message || 'Failed to publish course.',
        type: 'error'
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Move course back to Draft state (Unpublish)
  const handleMoveToDraft = async (course: CourseAuthored) => {
    setActionInProgressId(course.id);
    try {
      const identifier = course.slug || course.id;
      const res = await fetch(`/api/courses/${identifier}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UNPUBLISH', status: 'DRAFT' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to move course to draft');
      }

      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, status: 'DRAFT' } : c))
      );

      showToast({
        title: 'Moved to Draft 📝',
        description: `"${course.title}" is now back in Draft mode. You can edit the curriculum privately and resubmit when ready.`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Action Failed',
        description: err.message || 'Failed to revert course to draft.',
        type: 'error'
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Trigger Delete Modal
  const handleOpenDeleteModal = (course: CourseAuthored) => {
    setCourseToDelete(course);
    setIsDeleteModalOpen(true);
  };

  // Confirm Permanent Course Deletion
  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      const identifier = courseToDelete.slug || courseToDelete.id;
      const res = await fetch(`/api/courses/${identifier}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete course');
      }

      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));

      showToast({
        title: 'Course Deleted 🗑️',
        description: `"${courseToDelete.title}" has been permanently removed.`,
        type: 'success'
      });

      setIsDeleteModalOpen(false);
      setCourseToDelete(null);
    } catch (err: any) {
      showToast({
        title: 'Deletion Failed',
        description: err.message || 'Failed to delete course.',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Initialize New Course
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

  // Metrics Calculations
  const totalStudents = courses.reduce((acc, c) => acc + (c.studentsCount || 0), 0);
  const totalRevenue = courses.reduce((acc, c) => acc + (c.price * (c.studentsCount || 0)), 0);

  // Status Tab Counts
  const publishedCount = courses.filter((c) => c.status === 'PUBLISHED').length;
  const inReviewCount = courses.filter((c) => c.status === 'IN_REVIEW').length;
  const draftCount = courses.filter((c) => c.status === 'DRAFT').length;
  const rejectedCount = courses.filter((c) => c.status === 'REJECTED').length;

  // Filtered Courses
  const filteredAuthoredCourses = courses
    .filter((c) => {
      if (activeTab === 'PUBLISHED') return c.status === 'PUBLISHED';
      if (activeTab === 'IN_REVIEW') return c.status === 'IN_REVIEW';
      if (activeTab === 'DRAFT') return c.status === 'DRAFT';
      if (activeTab === 'REJECTED') return c.status === 'REJECTED';
      return true; // 'ALL'
    })
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.level && c.level.toLowerCase().includes(q))
      );
    });

  const filteredCatalogCourses = platformCourses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.instructor?.name && c.instructor.name.toLowerCase().includes(q))
    );
  });

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
                Create deep-tech courses, upload modules & lessons, manage drafts, and submit for review to launch live.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs px-5 py-3 rounded-2xl hover:bg-primary/90 shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Icon name="add_circle" size={18} />
              <span>+ Create Course</span>
            </button>
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
                Course Lifecycle &amp; Revisions:
              </span>{' '}
              <span className="text-indigo-800 dark:text-indigo-300">
                Draft Syllabus &rarr; Submit for Review &rarr; Reviewer Evaluates &rarr; Approved &rarr; Publish Live. You can move any course back to <strong>Draft</strong> anytime to make private updates.
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
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                {publishedCount} Live &bull; {inReviewCount} In Review &bull; {draftCount} Drafts
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="menu_book" size={24} />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-on-surface-variant font-bold">Total Active Learners</p>
              <h3 className="text-2xl font-black text-on-surface mt-1">{totalStudents}</h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Across all live published courses</p>
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
              <p className="text-[11px] text-on-surface-variant mt-0.5">Gross enrollment value</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <Icon name="payments" size={24} />
            </div>
          </div>
        </div>

        {/* Courses Table / Cards Container */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Header with Title and Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-on-surface">
                {activeTab === 'CATALOG' ? 'Academy Course Catalog' : 'Your Authored Masterclasses'}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {activeTab === 'CATALOG'
                  ? 'Browse all live published courses available across Morena Teach'
                  : 'Manage syllabus, publish live, move to draft, or delete your courses'}
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Icon
                name="search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses by title or topic..."
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-8 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-outline-variant/70 pb-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Icon name="dashboard" size={15} />
              <span>All Courses ({courses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PUBLISHED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'PUBLISHED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Icon name="rocket_launch" size={15} />
              <span>Published Live ({publishedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('IN_REVIEW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'IN_REVIEW'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Icon name="hourglass_top" size={15} />
              <span>In Review ({inReviewCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DRAFT')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'DRAFT'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Icon name="edit_note" size={15} />
              <span>Drafts ({draftCount})</span>
            </button>

            {rejectedCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('REJECTED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-surface-container-low text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Icon name="feedback" size={15} />
                <span>Needs Changes ({rejectedCount})</span>
              </button>
            )}

            <div className="h-5 w-px bg-outline-variant mx-1" />

            <button
              type="button"
              onClick={() => setActiveTab('CATALOG')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'CATALOG'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
              title="Explore all courses on Morena Teach platform"
            >
              <Icon name="public" size={15} />
              <span>Academy Catalog 🌐</span>
            </button>
          </div>

          {/* Tab Content: Platform Catalog View */}
          {activeTab === 'CATALOG' ? (
            isCatalogLoading ? (
              <div className="py-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
                <Icon name="sync" size={20} className="animate-spin text-primary" />
                <span>Loading academy course catalog...</span>
              </div>
            ) : filteredCatalogCourses.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm font-bold text-on-surface">No courses found matching your search</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Clear search filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCatalogCourses.map((c) => (
                  <div
                    key={c.id}
                    className="bg-surface-container-low/60 border border-outline-variant/70 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/50 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 text-[10px] font-bold">
                          Live on Platform
                        </span>
                        <span className="font-mono text-sm font-black text-emerald-600">
                          {c.price === 0 ? 'Free' : `₹${c.price.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-on-surface line-clamp-2">{c.title}</h3>
                      <p className="text-xs text-on-surface-variant line-clamp-2">
                        {c.category || 'General'} &bull; {c.level}
                      </p>

                      {c.instructor && (
                        <div className="flex items-center gap-2 pt-1 text-xs text-on-surface-variant">
                          <UserAvatar
                            avatar={c.instructor.avatar}
                            name={c.instructor.name || 'Instructor'}
                            size="sm"
                            className="w-5 h-5 text-[9px]"
                          />
                          <span className="truncate">{c.instructor.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-outline-variant/60 flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant font-mono">
                        ⭐ {c.rating || 5.0}
                      </span>
                      <Link
                        href={`/courses/${c.slug || c.id}`}
                        target="_blank"
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Course Page</span>
                        <Icon name="open_in_new" size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : /* Authored Courses Views */
          isLoading ? (
            <div className="py-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <Icon name="sync" size={20} className="animate-spin text-primary" />
              <span>Loading authored courses...</span>
            </div>
          ) : filteredAuthoredCourses.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Icon name="school" size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  {searchQuery
                    ? 'No courses match your search'
                    : activeTab === 'PUBLISHED'
                    ? 'No published live courses yet'
                    : activeTab === 'IN_REVIEW'
                    ? 'No courses currently under review'
                    : activeTab === 'DRAFT'
                    ? 'No draft courses'
                    : activeTab === 'REJECTED'
                    ? 'No courses pending revision'
                    : 'No courses authored yet'}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {searchQuery
                    ? 'Try searching for another keyword or clear the search filter.'
                    : 'Create your syllabus, configure lesson videos, and submit for review.'}
                </p>
              </div>

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-surface-container border border-outline-variant text-xs font-bold rounded-xl hover:bg-surface-container-high cursor-pointer"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary/90 shadow-sm cursor-pointer"
                >
                  <Icon name="add_circle" size={16} />
                  <span>Create New Masterclass</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAuthoredCourses.map((course) => {
                const isPublished = course.status === 'PUBLISHED';
                const isApproved = course.status === 'APPROVED';
                const isUnderReview = course.status === 'IN_REVIEW';
                const isRejected = course.status === 'REJECTED';
                const isDraft = course.status === 'DRAFT';
                const isBusy = actionInProgressId === course.id;

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
                            isPublished
                              ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20'
                              : isApproved
                              ? 'bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/30'
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
                          {isPublished
                            ? 'Live on Landing Page'
                            : isApproved
                            ? 'Approved by Reviewer ✅'
                            : isUnderReview
                            ? 'Under Review'
                            : isRejected
                            ? 'Changes Requested'
                            : 'Draft'}
                        </span>

                        <span className="font-mono text-sm font-black text-emerald-600">
                          {course.price === 0 ? 'Free' : `₹${course.price.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      {isUnderReview && (
                        <p className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/50">
                          ⏳ Under evaluation by the Course Review Studio. You will be notified once reviewed.
                        </p>
                      )}

                      {isApproved && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200/50 font-medium">
                          🎉 Review Studio approved this course! Click &quot;Publish Live&quot; below to launch it on the website.
                        </p>
                      )}

                      {isRejected && (
                        <div className="space-y-1.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 text-[11px] text-rose-700 dark:text-rose-300">
                          <div className="font-bold flex items-center gap-1 text-rose-600">
                            <Icon name="feedback" size={14} />
                            Reviewer Feedback:
                          </div>
                          {course.reviewFeedback ? (
                            <p className="bg-white/70 dark:bg-rose-900/30 p-2 rounded-lg border border-rose-300/40 italic">
                              &quot;{course.reviewFeedback}&quot;
                            </p>
                          ) : (
                            <p>Changes requested. Please update your syllabus and resubmit.</p>
                          )}
                          <p className="text-[10px] text-rose-500">
                            Click &quot;Edit Syllabus&quot; below to address this feedback and resubmit.
                          </p>
                        </div>
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

                      {/* Course Actions Bar */}
                      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Edit Syllabus */}
                          <Link
                            href={`/instructor/courses/builder?courseId=${course.id}`}
                            className="text-xs font-bold text-on-surface hover:text-primary border border-outline-variant px-2.5 py-1.5 rounded-xl hover:bg-surface-container transition-colors inline-flex items-center gap-1"
                            title="Edit curriculum, lectures, and settings"
                          >
                            <Icon name="edit" size={13} />
                            <span>Edit</span>
                          </Link>

                          {/* Approved: Instructor can now publish live */}
                          {isApproved && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handlePublishApprovedCourse(course.id, course.slug)}
                              className="text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Icon name="sync" size={13} className="animate-spin" />
                              ) : (
                                <Icon name="rocket_launch" size={13} />
                              )}
                              <span>Publish Live</span>
                            </button>
                          )}

                          {/* Submit for Approval Button (for Draft / Rejected) */}
                          {(isDraft || isRejected) && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleSubmitForApproval(course.id, course.slug)}
                              className="text-xs font-bold bg-primary text-on-primary hover:bg-primary/90 px-3 py-1.5 rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Icon name="sync" size={13} className="animate-spin" />
                              ) : (
                                <Icon name="send" size={13} />
                              )}
                              <span>Submit</span>
                            </button>
                          )}

                          {/* Move to Draft Option (for Published, In Review, or Approved) */}
                          {(isPublished || isUnderReview || isApproved) && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleMoveToDraft(course)}
                              className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Unpublish / Move course back to draft for private revisions"
                            >
                              {isBusy ? (
                                <Icon name="sync" size={13} className="animate-spin" />
                              ) : (
                                <Icon name="history" size={13} />
                              )}
                              <span>Move to Draft</span>
                            </button>
                          )}

                          {/* View Course Link (for Published) */}
                          {isPublished && (
                            <Link
                              href={`/courses/${course.slug || course.id}`}
                              target="_blank"
                              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 px-1"
                              title="Open public course page"
                            >
                              <Icon name="open_in_new" size={13} />
                            </Link>
                          )}
                        </div>

                        {/* Delete Course Button (Opens Confirmation Modal) */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleOpenDeleteModal(course)}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 p-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Course Permanently"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Delete Course Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setCourseToDelete(null);
          }
        }}
        maxWidth="md"
        title="Delete Course Permanently"
        subtitle="This action cannot be undone"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <Icon name="warning" size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Are you sure you want to delete this course?
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                You are about to delete <strong className="font-semibold text-rose-950 dark:text-white">&quot;{courseToDelete?.title}&quot;</strong>.
                All curriculum sections, video lessons, and resources associated with this course will be permanently removed.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 text-xs text-amber-800 dark:text-amber-200">
            💡 <strong>Helpful Tip:</strong> If you only want to take this course down to make revisions or updates, click <strong>Cancel</strong> and use <strong>&quot;Move to Draft&quot;</strong> instead!
          </div>

          <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setCourseToDelete(null);
              }}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Icon name="sync" size={14} className="animate-spin" />
                  <span>Deleting Course...</span>
                </>
              ) : (
                <>
                  <Icon name="delete_forever" size={14} />
                  <span>Yes, Delete Course</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

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
