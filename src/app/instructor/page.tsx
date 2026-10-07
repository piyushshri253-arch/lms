'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Modal } from '@/components/ui/Modal';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';

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

type TabType = 'ALL' | 'PUBLISHED' | 'IN_REVIEW' | 'DRAFT' | 'INACTIVE' | 'REJECTED';

function InstructorCoursesStudioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, showToast } = useApp();

  // Courses State
  const [courses, setCourses] = useState<CourseAuthored[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs & Search State
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Course Actions State
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Inactive Modal State (Instructors cannot delete courses, only mark active/inactive)
  const [isMakeInactiveModalOpen, setIsMakeInactiveModalOpen] = useState(false);
  const [courseToMakeInactive, setCourseToMakeInactive] = useState<CourseAuthored | null>(null);
  const [isMarkingInactive, setIsMarkingInactive] = useState(false);

  // Create Course Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('4999');
  const [newCategory, setNewCategory] = useState('Engineering');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sidebarTab = searchParams?.get('tab') || '';
  const createParam = searchParams?.get('create');

  useEffect(() => {
    if (createParam === '1') {
      router.replace('/instructor/courses/builder');
    }
  }, [createParam, router]);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam) {
      const upper = tabParam.toUpperCase();
      if (['ALL', 'PUBLISHED', 'IN_REVIEW', 'DRAFT', 'INACTIVE', 'REJECTED'].includes(upper)) {
        setActiveTab(upper as TabType);
      }
    }
  }, [searchParams]);

  // Fetch Authored Courses
  const fetchInstructorCourses = async () => {
    try {
      setIsLoading(true);
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
    fetchInstructorCourses();
  }, [currentUser]);

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


  // Mark Course as Inactive (Instructors cannot delete courses, only mark active/inactive)
  const handleConfirmMakeInactive = async () => {
    if (!courseToMakeInactive) return;
    setIsMarkingInactive(true);
    setActionInProgressId(courseToMakeInactive.id);
    try {
      const identifier = courseToMakeInactive.slug || courseToMakeInactive.id;
      const res = await fetch(`/api/courses/${identifier}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MAKE_INACTIVE' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark course inactive');
      }

      setCourses((prev) =>
        prev.map((c) => (c.id === courseToMakeInactive.id ? { ...c, status: 'ARCHIVED' } : c))
      );

      showToast({
        title: 'Course Marked Inactive ⏸️',
        description: `"${courseToMakeInactive.title}" is now Inactive and unlisted. Enrolled learners still retain their access.`,
        type: 'success'
      });

      setIsMakeInactiveModalOpen(false);
      setCourseToMakeInactive(null);
    } catch (err: any) {
      showToast({
        title: 'Action Failed',
        description: err.message || 'Failed to mark course inactive.',
        type: 'error'
      });
    } finally {
      setIsMarkingInactive(false);
      setActionInProgressId(null);
    }
  };

  // Mark Inactive Course as Active
  const handleMakeActive = async (course: CourseAuthored) => {
    setActionInProgressId(course.id);
    try {
      const identifier = course.slug || course.id;
      const res = await fetch(`/api/courses/${identifier}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MAKE_ACTIVE' })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to make course active');
      }

      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, status: 'PUBLISHED' } : c))
      );

      showToast({
        title: 'Course Marked Active! 🚀',
        description: `"${course.title}" is now Active and published live on the platform!`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Action Failed',
        description: err.message || 'Failed to make course active.',
        type: 'error'
      });
    } finally {
      setActionInProgressId(null);
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
  const publishedCount = courses.filter((c) => c.status === 'PUBLISHED' || c.status === 'APPROVED').length;
  const inReviewCount = courses.filter((c) => c.status === 'IN_REVIEW' || c.status === 'PENDING').length;
  const draftCount = courses.filter((c) => c.status === 'DRAFT').length;
  const inactiveCount = courses.filter((c) => c.status === 'ARCHIVED' || c.status === 'INACTIVE').length;
  const rejectedCount = courses.filter((c) => c.status === 'REJECTED').length;

  // Filtered Courses
  const filteredAuthoredCourses = courses
    .filter((c) => {
      if (activeTab === 'PUBLISHED') return c.status === 'PUBLISHED' || c.status === 'APPROVED';
      if (activeTab === 'IN_REVIEW') return c.status === 'IN_REVIEW' || c.status === 'PENDING';
      if (activeTab === 'DRAFT') return c.status === 'DRAFT';
      if (activeTab === 'INACTIVE') return c.status === 'ARCHIVED' || c.status === 'INACTIVE';
      if (activeTab === 'REJECTED') return c.status === 'REJECTED';
      return true;
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

  const shellTitle =
    sidebarTab === 'students'
      ? 'Enrolled Students & Learners'
      : sidebarTab === 'notifications'
      ? 'Instructor Notifications & Review Updates'
      : 'My Courses & Curriculum Studio';

  const shellSubtitle =
    sidebarTab === 'students'
      ? 'Track student enrollments and learner activity across your authored courses'
      : sidebarTab === 'notifications'
      ? 'Real-time updates on course audits, reviewer feedback, and payout verifications'
      : 'Create courses, upload syllabus modules & video lessons, and submit for QA review';

  return (
    <InstructorPortalShell
      title={shellTitle}
      subtitle={shellSubtitle}
      profile={{
        name: currentUser?.name || 'Instructor',
        email: currentUser?.email || '',
        role: 'INSTRUCTOR',
        emailVerified: true
      }}
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              avatar={currentUser?.avatar}
              name={currentUser?.name || 'Instructor'}
              size="xl"
              className="w-14 h-14 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Instructor Studio: {currentUser?.name || 'Faculty Lead'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-mono text-xs font-bold uppercase">
                  Faculty
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Create deep-tech courses, upload modules &amp; lessons, manage drafts, and submit for review to launch live.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/instructor/courses/builder"
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-violet-600/20 transition-all cursor-pointer shrink-0"
            >
              <Icon name="add_circle" size={18} />
              <span>+ Create Course</span>
            </Link>
          </div>
        </div>

        {/* Dedicated Students View when sidebar tab=students */}
        {sidebarTab === 'students' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Student Enrollments by Course ({totalStudents} Total Learners)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of active student enrollments and gross revenue across your published courses
                </p>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No courses created yet. Click &quot;+ Create Course&quot; above to launch your first course.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-3 px-3 font-bold">Course Title</th>
                      <th className="py-3 px-3 font-bold">Category</th>
                      <th className="py-3 px-3 font-bold">Status</th>
                      <th className="py-3 px-3 font-bold">Course Fee</th>
                      <th className="py-3 px-3 font-bold">Enrolled Students</th>
                      <th className="py-3 px-3 font-bold">Gross Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courses.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">{c.title}</td>
                        <td className="py-3 px-3 text-slate-600">{c.category || 'Engineering'}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          ₹{Number(c.price || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-violet-700">
                          {c.studentsCount || 0} Learners
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                          ₹{(Number(c.price || 0) * Number(c.studentsCount || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Dedicated Notifications View when sidebar tab=notifications */}
        {sidebarTab === 'notifications' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Course Review &amp; Account Notifications
            </h3>
            <div className="space-y-3">
              {courses
                .filter((c) => c.status === 'REJECTED' || c.status === 'APPROVED' || c.status === 'IN_REVIEW')
                .map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-4 ${
                      c.status === 'REJECTED'
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : c.status === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm">{c.title}</div>
                      <p className="mt-1">
                        {c.status === 'REJECTED'
                          ? `Changes Requested by Auditor: "${c.reviewFeedback || 'Please update syllabus and resubmit.'}"`
                          : c.status === 'APPROVED'
                          ? 'Approved by Course Auditor! Ready to publish live.'
                          : 'Currently in the Course Auditor review queue.'}
                      </p>
                    </div>
                    <Link
                      href={`/instructor/courses/builder?courseId=${c.id}`}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold shrink-0 hover:bg-slate-50"
                    >
                      Open Course
                    </Link>
                  </div>
                ))}
              <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 text-violet-900 text-xs">
                <div className="font-bold">Welcome to the Unified Instructor Studio</div>
                <p className="mt-1 text-violet-700">
                  All your courses, profile settings, bank account verification, earnings ledger, and payout requests are accessible right here from the left navigation sidebar.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Guide Alert */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3 text-xs">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Icon name="verified" size={18} />
          </div>
          <div>
            <span className="font-bold text-indigo-950">
              Course Lifecycle &amp; Revisions:
            </span>{' '}
            <span className="text-indigo-800">
              Draft Syllabus &rarr; Submit for Review &rarr; Auditor Evaluates &rarr; Approved &rarr; Publish Live. You can move any course back to <strong>Draft</strong> anytime to make private updates.
            </span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold">Authored Courses</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{courses.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {publishedCount} Live &bull; {inReviewCount} In Review &bull; {draftCount} Drafts
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center">
              <Icon name="menu_book" size={24} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold">Total Active Learners</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalStudents}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Across all live published courses</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Icon name="groups" size={24} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold">Gross Portfolio Value</p>
              <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Gross enrollment value</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Icon name="payments" size={24} />
            </div>
          </div>
        </div>

        {/* Courses Table / Cards Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Header with Title and Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Your Authored Masterclasses
              </h2>
              <p className="text-xs text-slate-500">
                Manage syllabus, publish live, move to draft, or mark courses active/inactive
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Icon
                name="search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses by title or topic..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
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
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
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
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Icon name="hourglass_top" size={15} />
              <span>Pending Approval ({inReviewCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DRAFT')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'DRAFT'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Icon name="edit_note" size={15} />
              <span>Drafts ({draftCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INACTIVE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'INACTIVE'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Icon name="pause_circle" size={15} />
              <span>Inactive ({inactiveCount})</span>
            </button>

            {rejectedCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('REJECTED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <Icon name="feedback" size={15} />
                <span>Needs Changes ({rejectedCount})</span>
              </button>
            )}

          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Icon name="sync" size={20} className="animate-spin text-violet-600" />
              <span>Loading authored courses...</span>
            </div>
          ) : filteredAuthoredCourses.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center mx-auto">
                <Icon name="school" size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
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
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery
                    ? 'Try searching for another keyword or clear the search filter.'
                    : 'Create your syllabus, configure lesson videos, and submit for review.'}
                </p>
              </div>

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Clear Search
                </button>
              ) : (
                <Link
                  href="/instructor/courses/builder"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-bold text-xs rounded-xl hover:bg-violet-500 shadow-sm cursor-pointer"
                >
                  <Icon name="add_circle" size={16} />
                  <span>Create New Masterclass</span>
                </Link>
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
                const isArchived = course.status === 'ARCHIVED' || course.status === 'INACTIVE';
                const isBusy = actionInProgressId === course.id;

                return (
                  <div
                    key={course.id}
                    className="bg-slate-50 border border-slate-200 hover:border-violet-400 hover:bg-white rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1.5 ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isApproved
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : isUnderReview
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isRejected
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isArchived
                              ? 'bg-slate-200/80 text-slate-700 border border-slate-300'
                              : 'bg-slate-200/70 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {isUnderReview && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                          )}
                          {isPublished
                            ? 'Live on Landing Page'
                            : isApproved
                            ? 'Approved by Auditor ✅'
                            : isUnderReview
                            ? 'Under Review'
                            : isRejected
                            ? 'Changes Requested'
                            : isArchived
                            ? 'Inactive'
                            : 'Draft'}
                        </span>

                        <span className="font-mono text-sm font-black text-emerald-600">
                          {course.price === 0 ? 'Free' : `₹${course.price.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      {isUnderReview && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                          ⏳ Under evaluation by the Course Auditor Studio. You will be notified once reviewed.
                        </p>
                      )}

                      {isApproved && (
                        <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
                          🎉 Auditor Studio approved this course! Click &quot;Publish Live&quot; below to launch it on the website.
                        </p>
                      )}

                      {isRejected && (
                        <div className="space-y-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                          <div className="font-bold flex items-center gap-1 text-rose-700">
                            <Icon name="feedback" size={14} />
                            Auditor Feedback:
                          </div>
                          {course.reviewFeedback ? (
                            <p className="bg-white p-2 rounded-lg border border-rose-200 italic">
                              &quot;{course.reviewFeedback}&quot;
                            </p>
                          ) : (
                            <p>Changes requested. Please update your syllabus and resubmit.</p>
                          )}
                          <p className="text-[10px] text-rose-600">
                            Click &quot;Edit&quot; below to address this feedback and resubmit.
                          </p>
                        </div>
                      )}

                      {isArchived && (
                        <p className="text-[11px] text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-200 font-medium">
                          ⏸️ This course is inactive and unlisted. Click &quot;Make Active&quot; below to restore it.
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-200 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
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
                            className="text-xs font-bold text-slate-700 hover:text-violet-700 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
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
                              className="text-xs font-bold bg-violet-600 text-white hover:bg-violet-500 px-3 py-1.5 rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Icon name="sync" size={13} className="animate-spin" />
                              ) : (
                                <Icon name="send" size={13} />
                              )}
                              <span>Submit</span>
                            </button>
                          )}

                          {/* Move to Draft Option */}
                          {(isPublished || isUnderReview || isApproved) && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleMoveToDraft(course)}
                              className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
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

                          {/* Make Inactive Option (for Live Published Courses) */}
                          {isPublished && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setCourseToMakeInactive(course);
                                setIsMakeInactiveModalOpen(true);
                              }}
                              className="text-xs font-bold text-slate-700 hover:text-amber-800 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-200 px-2.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Mark course as inactive (unlist from live catalog)"
                            >
                              <Icon name="pause_circle" size={13} className="text-amber-600" />
                              <span>Make Inactive</span>
                            </button>
                          )}

                          {/* Make Active Option (for Inactive Courses) */}
                          {isArchived && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleMakeActive(course)}
                              className="text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Mark course as active (publish live)"
                            >
                              {isBusy ? (
                                <Icon name="sync" size={13} className="animate-spin" />
                              ) : (
                                <Icon name="play_circle" size={13} />
                              )}
                              <span>Make Active</span>
                            </button>
                          )}

                          {/* View Course Link (for Published) */}
                          {isPublished && (
                            <Link
                              href={`/courses/${course.slug || course.id}`}
                              target="_blank"
                              className="text-xs font-bold text-violet-600 hover:underline inline-flex items-center gap-1 px-1"
                              title="Open public course page"
                            >
                              <Icon name="open_in_new" size={13} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mark Course Inactive Confirmation Modal */}
      <Modal
        isOpen={isMakeInactiveModalOpen}
        onClose={() => {
          if (!isMarkingInactive) {
            setIsMakeInactiveModalOpen(false);
            setCourseToMakeInactive(null);
          }
        }}
        maxWidth="md"
        title="Mark Course Inactive"
        subtitle="Unlist this course from public enrollment"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <Icon name="pause_circle" size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-950">
                Are you sure you want to mark this course as inactive?
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                You are about to mark <strong className="font-semibold text-amber-950">&quot;{courseToMakeInactive?.title}&quot;</strong> as inactive.
                This course will be hidden from the public catalog. Existing students who already enrolled will continue to have access to their lectures. You can make this course active at any time.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            🔒 <strong>Permanent Deletion Restricted:</strong> Courses cannot be deleted once created to protect student enrollment records and certificates. Instructors can mark courses active or inactive.
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isMarkingInactive}
              onClick={() => {
                setIsMakeInactiveModalOpen(false);
                setCourseToMakeInactive(null);
              }}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isMarkingInactive}
              onClick={handleConfirmMakeInactive}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isMarkingInactive ? (
                <>
                  <Icon name="sync" size={14} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Icon name="pause_circle" size={14} />
                  <span>Make Inactive</span>
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
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Course Title *</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Distributed Systems Architecture & Raft Consensus"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Fee / Price (₹ INR) *</label>
              <input
                type="number"
                required
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Category *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
              >
                <option value="Engineering">Engineering</option>
                <option value="AI & Machine Learning">AI & Machine Learning</option>
                <option value="System Design">System Design</option>
                <option value="Cloud Architecture">Cloud Architecture</option>
                <option value="Security">Security &amp; Cryptography</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-violet-600 text-white font-bold text-xs rounded-xl hover:bg-violet-500 shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Icon name="sync" size={14} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Initialize &amp; Open Studio</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </InstructorPortalShell>
  );
}

export default function InstructorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center text-xs font-semibold">
          Loading Instructor Course Studio...
        </div>
      }
    >
      <InstructorCoursesStudioInner />
    </Suspense>
  );
}
