'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';
import { CourseVersionHistoryModal } from '@/components/courses/CourseVersionHistoryModal';
import { CourseActiveToggleModal } from '@/components/courses/CourseActiveToggleModal';
import { notifyCoursesChanged, useCoursesAutoRefresh } from '@/lib/courses-sync';

function getCategoryName(category: any): string {
  if (!category) return 'General';
  if (typeof category === 'string') return category;
  if (typeof category === 'object' && category.name) return category.name;
  return 'General';
}

function getInstructorName(instructor: any): string {
  if (!instructor) return 'Academic Faculty';
  if (typeof instructor === 'string') return instructor;
  if (typeof instructor === 'object' && instructor.name) return instructor.name;
  return 'Academic Faculty';
}

function CoursesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, isSuperAdmin } = useAdmin();
  const { showToast } = useApp();

  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'review' | 'drafts' | 'categories' | 'reviews'>('all');
  const [isAssignInstructorOpen, setIsAssignInstructorOpen] = useState(false);
  const [selectedCourseForInstructor, setSelectedCourseForInstructor] = useState<any | null>(null);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Version Management Modals
  const [selectedCourseForHistory, setSelectedCourseForHistory] = useState<any | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCourseForToggle, setSelectedCourseForToggle] = useState<any | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [isUpdatingVersionId, setIsUpdatingVersionId] = useState<string | null>(null);

  const handleUpdateVersion = async (course: any) => {
    setIsUpdatingVersionId(course.id);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.id)}/version/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize version draft');
      }

      showToast(data.message || 'Draft version initialized in builder.', 'success');
      router.push(data.draftUrl || `/admin/courses/builder?courseId=${course.id}&mode=version_draft`);
    } catch (err: any) {
      showToast(err.message || 'Could not create version draft.', 'error');
    } finally {
      setIsUpdatingVersionId(null);
    }
  };
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    category: 'Engineering',
    level: 'INTERMEDIATE',
    price: 4999,
    instructor: 'Dr. Sameer Verma',
    description: '',
    status: 'PUBLISHED'
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'categories') setActiveTab('categories');
    else if (tab === 'reviews') setActiveTab('reviews');
    const status = searchParams.get('status');
    if (status === 'IN_REVIEW') setActiveTab('review');
    const search = searchParams.get('search');
    if (search) setSearchQuery(search);
  }, [searchParams]);

  const fetchCourses = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const url = `/api/admin/courses?search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const rawCourses = data.courses || [];
        const sanitized = rawCourses.map((c: any) => ({
          ...c,
          category: getCategoryName(c.category),
          instructor: getInstructorName(c.instructor),
          price: Number(c.price) || 0
        }));
        setCourses(sanitized);
      } else if (!silent) {
        setCourses([]);
      }
    } catch {
      if (!silent) {
        setCourses([]);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useCoursesAutoRefresh(fetchCourses, { intervalMs: 5000, enabled: true });

  useEffect(() => {
    fetchCourses(true);
  }, [activeTab]);

  useEffect(() => {
    fetchCourses();
  }, [searchQuery]);

  // Handle Course Creation
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormData.title.trim()) {
      showToast('Course title is required', 'error');
      return;
    }
    setIsCreatingCourse(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: courseFormData.title.trim(),
          description: courseFormData.description.trim() || 'Comprehensive course curriculum.',
          price: Number(courseFormData.price) || 0,
          level: courseFormData.level,
          category: courseFormData.category,
          status: courseFormData.status || 'PUBLISHED'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.course;
        const created = raw
          ? {
              ...raw,
              category: getCategoryName(raw.category || courseFormData.category),
              instructor: getInstructorName(raw.instructor || courseFormData.instructor),
              price: Number(raw.price) || Number(courseFormData.price) || 0,
              studentsCount: raw.studentsCount ?? 0,
              rating: raw.rating ?? 5.0,
              reviewsCount: raw.reviewsCount ?? 0,
              status: raw.status || courseFormData.status,
              isPublished: (raw.status || courseFormData.status) === 'PUBLISHED',
              createdAt: raw.createdAt || new Date().toISOString()
            }
          : {
              id: `c-${Date.now()}`,
              title: courseFormData.title.trim(),
              instructor: courseFormData.instructor,
              category: courseFormData.category,
              level: courseFormData.level,
              price: Number(courseFormData.price) || 0,
              studentsCount: 0,
              rating: 5.0,
              reviewsCount: 0,
              status: courseFormData.status,
              isPublished: courseFormData.status === 'PUBLISHED',
              createdAt: new Date().toISOString()
            };
        setCourses((prev) => [created, ...prev]);
        showToast('Course published directly to catalog & landing page!', 'success');
        notifyCoursesChanged();
      } else {
        showToast('Failed to save course. Please check fields.', 'error');
      }

      setIsCreateCourseModalOpen(false);
      setCourseFormData({
        title: '',
        category: 'Engineering',
        level: 'INTERMEDIATE',
        price: 4999,
        instructor: 'Dr. Sameer Verma',
        description: '',
        status: 'PUBLISHED'
      });
    } catch (err) {
      showToast('Error saving course', 'error');
      setIsCreateCourseModalOpen(false);
    } finally {
      setIsCreatingCourse(false);
    }
  };

  // Handle course status updates (Approve, Reject, Publish, Unpublish)
  const handleUpdateCourseStatus = async (courseId: string, nextStatus: 'PUBLISHED' | 'DRAFT' | 'REJECTED' | 'APPROVED') => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? { ...c, isPublished: nextStatus === 'PUBLISHED', status: nextStatus }
          : c
      )
    );

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: courseId,
          status: nextStatus
        })
      });
      if (res.ok) {
        if (nextStatus === 'PUBLISHED') {
          showToast('Course approved and published live to landing page! 🚀', 'success');
        } else if (nextStatus === 'APPROVED') {
          showToast('Course approved! The instructor can now publish it live.', 'success');
        } else if (nextStatus === 'REJECTED') {
          showToast('Course submission rejected.', 'info');
        } else {
          showToast('Course unpublished to draft state.', 'info');
        }
        notifyCoursesChanged();
      } else {
        showToast('Failed to update course status on server.', 'error');
      }
    } catch {
      showToast('Status updated locally.', 'info');
    }
  };

  // Legacy wrapper for backwards compatibility
  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    await handleUpdateCourseStatus(courseId, !currentStatus ? 'PUBLISHED' : 'DRAFT');
  };

  const inReviewCount = courses.filter((c) => c.status === 'IN_REVIEW').length;

  const filteredCourses = courses.filter((c) => {
    if (activeTab === 'published') return c.isPublished;
    if (activeTab === 'review') return c.status === 'IN_REVIEW' || c.status === 'APPROVED';
    if (activeTab === 'drafts') return !c.isPublished && c.status !== 'IN_REVIEW' && c.status !== 'APPROVED';
    return true;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Course Catalog & Curriculum Studio
            </h1>
            <span className="text-[11px] font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full">
              MORENA TEACH LMS
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Build, review, publish, and structure instructional courses and syllabus modules.
          </p>
        </div>

        {/* Action Buttons: Review Studio + Create Course Modal */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/reviewer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-500/20 transition-all cursor-pointer"
          >
            <Icon name="rate_review" size={16} />
            <span>Review Studio ({inReviewCount})</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsCreateCourseModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Icon name="add_circle" size={16} />
            <span>+ Create Course</span>
          </button>
          <Link
            href="/admin/courses/builder"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant/80 text-on-surface hover:bg-surface-container text-xs font-bold transition-all"
            title="Curriculum Builder Studio"
          >
            <Icon name="design_services" size={16} className="text-primary" />
            <span>Curriculum Builder</span>
          </Link>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl overflow-x-auto">
            {(
              [
                { key: 'all', label: 'All Courses' },
                { key: 'published', label: 'Published' },
                { key: 'review', label: `In Review${inReviewCount > 0 ? ` (${inReviewCount})` : ''}` },
                { key: 'drafts', label: 'Drafts' },
                { key: 'categories', label: 'Categories' },
                { key: 'reviews', label: 'Student Reviews' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Icon
              name="search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course title or instructor..."
              className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Tab: Categories View */}
        {activeTab === 'categories' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              { name: 'Engineering & Next.js', courses: 6, icon: 'code' },
              { name: 'Artificial Intelligence & Agents', courses: 4, icon: 'psychology' },
              { name: 'Backend & Distributed Systems', courses: 5, icon: 'dns' },
              { name: 'Cloud & DevOps Architecture', courses: 3, icon: 'cloud' }
            ].map((cat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Icon name={cat.icon} size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{cat.name}</h4>
                    <p className="text-[11px] text-outline font-mono">{cat.courses} active courses</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'reviews' ? (
          /* Tab: Reviews View */
          <div className="divide-y divide-outline-variant/30 pt-2">
            {[
              { student: 'Aarav Sharma', course: 'Full-Stack Next.js 15 Masterclass', rating: 5, comment: 'Phenomenal clarity on App Router server actions and caching.', date: 'Yesterday' },
              { student: 'Priya Patel', course: 'Production AI Agents with LangGraph', rating: 5, comment: 'Best course on production LLM architecture I have taken.', date: '3 days ago' },
              { student: 'Vikram Singh', course: 'Modern Distributed Systems with Go', rating: 4, comment: 'Great depth, would love more hands-on gRPC benchmarking.', date: '5 days ago' }
            ].map((rev, idx) => (
              <div key={idx} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-on-surface">{rev.student}</span>
                    <span className="text-[11px] text-amber-500 font-bold font-mono">
                      {'★'.repeat(rev.rating)}
                    </span>
                    <span className="text-[10px] text-outline font-mono">• {rev.date}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium">{rev.comment}</p>
                  <p className="text-[10px] text-outline font-mono">Course: {rev.course}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Courses Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-outline uppercase font-mono text-[10px] border-b border-outline-variant/40">
                <tr>
                  <th className="p-3">Course Title</th>
                  <th className="p-3">Category & Level</th>
                  <th className="p-3">Instructor</th>
                  <th className="p-3 text-center">Students</th>
                  <th className="p-3">Fee / Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-medium text-on-surface">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-outline">
                      Loading courses catalog...
                    </td>
                  </tr>
                ) : filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-outline">
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5022c3] flex items-center justify-center mx-auto">
                          <Icon name="auto_stories" size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">No Courses Found</p>
                          <p className="text-xs text-outline mt-1">
                            Your course catalog is empty. Click below to add and publish your first academic course.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCreateCourseModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Icon name="add_circle" size={16} />
                          <span>+ Create First Course</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="p-3">
                        <div className="min-w-[200px]">
                          <p className="font-bold text-on-surface line-clamp-1">{course.title}</p>
                          <p className="text-[11px] text-outline font-mono mt-0.5">
                            ⭐ {course.rating || 5.0} ({course.reviewsCount || 0} reviews)
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container">
                          {getCategoryName(course.category)} • {course.level}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourseForInstructor(course);
                            setIsAssignInstructorOpen(true);
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer group"
                          title="Click to change or assign faculty"
                        >
                          <span>{getInstructorName(course.instructor)}</span>
                          <Icon name="edit" size={13} className="text-outline group-hover:text-primary transition-colors" />
                        </button>
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        {course.studentsCount ?? 0}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600">
                        ₹{(Number(course.price) || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${
                            course.status === 'PUBLISHED'
                              ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20'
                              : course.status === 'APPROVED'
                              ? 'bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/30'
                              : course.status === 'IN_REVIEW'
                              ? 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30'
                              : course.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/30'
                              : 'bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20'
                          }`}
                        >
                          {course.status === 'IN_REVIEW' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                          )}
                          {course.status === 'IN_REVIEW'
                            ? 'Pending Approval'
                            : course.status === 'APPROVED'
                            ? 'Approved (Ready to Publish)'
                            : course.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* In-Review Workflow Actions: Approve, Approve & Publish, or Reject */}
                          {course.status === 'IN_REVIEW' && (hasPermission('course.publish') || isSuperAdmin) && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateCourseStatus(course.id, 'APPROVED')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                title="Approve course so instructor can publish it"
                              >
                                <Icon name="check" size={13} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateCourseStatus(course.id, 'PUBLISHED')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                title="Approve submission and publish immediately to live landing page"
                              >
                                <Icon name="check_circle" size={13} />
                                <span>Approve & Publish</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateCourseStatus(course.id, 'REJECTED')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Reject course submission"
                              >
                                <Icon name="cancel" size={13} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Approved State: Publish Live or Reject */}
                          {course.status === 'APPROVED' && (hasPermission('course.publish') || isSuperAdmin) && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateCourseStatus(course.id, 'PUBLISHED')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                title="Publish approved course live to landing page"
                              >
                                <Icon name="rocket_launch" size={13} />
                                <span>Publish Live</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateCourseStatus(course.id, 'REJECTED')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Reject course submission"
                              >
                                <Icon name="cancel" size={13} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Published State: Preview, Update Version, Active/Inactive Toggle, Version History */}
                          {course.status === 'PUBLISHED' && (
                            <>
                              <Link
                                href={`/courses/${course.slug || course.id}?preview=true`}
                                target="_blank"
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 transition-colors inline-flex items-center gap-1 shadow-2xs"
                                title="Preview live published course exactly as seen by students"
                              >
                                <Icon name="visibility" size={13} />
                                <span>Preview</span>
                              </Link>

                              {(hasPermission('course.edit') || isSuperAdmin) && (
                                <button
                                  type="button"
                                  disabled={isUpdatingVersionId === course.id}
                                  onClick={() => handleUpdateVersion(course)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                                  title="Create or resume editable draft for the next version"
                                >
                                  {isUpdatingVersionId === course.id ? (
                                    <Icon name="sync" size={13} className="animate-spin" />
                                  ) : (
                                    <Icon name="edit_document" size={13} />
                                  )}
                                  <span>Update Version</span>
                                </button>
                              )}

                              {(hasPermission('course.publish') || isSuperAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCourseForToggle(course);
                                    setIsToggleModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="Toggle course Active / Inactive status"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                  <span>Active</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCourseForHistory(course);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/80 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="View version history, audit logs, and past versions"
                              >
                                <Icon name="history" size={13} />
                                <span>History</span>
                              </button>
                            </>
                          )}

                          {/* Inactive / Archived State */}
                          {(course.status === 'INACTIVE' || course.status === 'ARCHIVED') && (
                            <>
                              <Link
                                href={`/courses/${course.slug || course.id}?preview=true`}
                                target="_blank"
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/80 transition-colors inline-flex items-center gap-1"
                                title="Preview course"
                              >
                                <Icon name="visibility" size={13} />
                                <span>Preview</span>
                              </Link>

                              {(hasPermission('course.publish') || isSuperAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCourseForToggle(course);
                                    setIsToggleModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Activate course"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                  <span>Inactive</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCourseForHistory(course);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/80 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="View version history"
                              >
                                <Icon name="history" size={13} />
                                <span>History</span>
                              </button>
                            </>
                          )}

                          {/* Draft or Rejected State: Publish Live & Curriculum */}
                          {(course.status === 'DRAFT' || course.status === 'REJECTED') && (
                            <>
                              {(hasPermission('course.publish') || isSuperAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCourseStatus(course.id, 'PUBLISHED')}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                  title="Publish course directly to live landing page"
                                >
                                  <Icon name="rocket_launch" size={13} />
                                  <span>Publish Live</span>
                                </button>
                              )}

                              {(hasPermission('course.edit') || isSuperAdmin) && (
                                <Link
                                  href={`/admin/courses/builder?courseId=${course.id}`}
                                  className="px-2.5 py-1 rounded-lg border border-outline-variant/80 hover:bg-surface-container text-[11px] font-bold text-on-surface transition-colors"
                                  title="Open Curriculum Studio"
                                >
                                  Curriculum
                                </Link>
                              )}

                              {(hasPermission('course.delete') || isSuperAdmin) && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete ${course.title}?`)) {
                                      try {
                                        const res = await fetch(`/api/admin/courses?id=${course.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          setCourses((prev) => prev.filter((c) => c.id !== course.id));
                                          showToast('Draft course deleted successfully.', 'info');
                                        } else {
                                          showToast('Failed to delete course.', 'error');
                                        }
                                      } catch {
                                        showToast('Failed to delete course.', 'error');
                                      }
                                    }
                                  }}
                                  className="p-1 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                                  title="Delete Draft Course"
                                >
                                  <Icon name="delete" size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Instructor Modal */}
      {isAssignInstructorOpen && selectedCourseForInstructor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '480px' }}
            className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 w-full max-w-[480px] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
              <h3 className="font-black text-sm text-on-surface">Assign Faculty Lead</h3>
              <button
                type="button"
                onClick={() => setIsAssignInstructorOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p className="text-xs text-outline">
              Select teaching faculty for: <strong className="text-on-surface">{selectedCourseForInstructor.title}</strong>
            </p>
            <div className="space-y-2">
              {[
                'Dr. Alan Turing',
                'Dr. Elena Rodriguez',
                'Priya Sharma',
                'Vikramaditya Roy',
                'Dr. Sameer Verma'
              ].map((facultyName, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCourses((prev) =>
                      prev.map((c) =>
                        c.id === selectedCourseForInstructor.id ? { ...c, instructor: facultyName } : c
                      )
                    );
                    setIsAssignInstructorOpen(false);
                    showToast(`Assigned ${facultyName} to course`, 'success');
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between transition-colors cursor-pointer ${
                    getInstructorName(selectedCourseForInstructor.instructor) === facultyName
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span>{facultyName}</span>
                  {getInstructorName(selectedCourseForInstructor.instructor) === facultyName && (
                    <Icon name="check" size={16} className="text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Course */}
      {isCreateCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '640px' }}
            className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 sm:p-8 w-full max-w-[640px] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="add_box" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-on-surface">Create New Course</h3>
                  <p className="text-[11px] text-outline">Provision course syllabus into MORENA TEACH LMS catalog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCourseModalOpen(false)}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-on-surface block mb-1">
                  Course Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={courseFormData.title}
                  onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
                  placeholder="e.g. Masterclass on Early Childhood Montessori Pedagogy"
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-on-surface block mb-1">Academic Category</label>
                  <select
                    value={courseFormData.category}
                    onChange={(e) => setCourseFormData({ ...courseFormData, category: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="Engineering">Engineering & Technology</option>
                    <option value="Artificial Intelligence">Artificial Intelligence & ML</option>
                    <option value="Backend Architecture">Backend Architecture & Cloud</option>
                    <option value="Early Childhood Education">Early Childhood & Pedagogy</option>
                    <option value="Business & Management">Business & Management</option>
                    <option value="Design & UX">Design & UX</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-on-surface block mb-1">Difficulty Level</label>
                  <select
                    value={courseFormData.level}
                    onChange={(e) => setCourseFormData({ ...courseFormData, level: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="BEGINNER">Foundational</option>
                    <option value="INTERMEDIATE">Intermediate Level</option>
                    <option value="ADVANCED">Advanced / Masterclass</option>
                    <option value="ALL_LEVELS">All Levels Welcome</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-on-surface block mb-1">Price (₹ INR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-outline font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={courseFormData.price}
                      onChange={(e) => setCourseFormData({ ...courseFormData, price: Number(e.target.value) })}
                      className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-on-surface block mb-1">Assigned Instructor</label>
                  <select
                    value={courseFormData.instructor}
                    onChange={(e) => setCourseFormData({ ...courseFormData, instructor: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="Dr. Sameer Verma">Dr. Sameer Verma</option>
                    <option value="Elena Rostova">Elena Rostova</option>
                    <option value="Priya Sharma">Priya Sharma</option>
                    <option value="Alex Thorne">Alex Thorne</option>
                    <option value="Dr. Alan Turing">Dr. Alan Turing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-on-surface block mb-1">Initial Visibility</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="courseStatus"
                      value="PUBLISHED"
                      checked={courseFormData.status === 'PUBLISHED'}
                      onChange={() => setCourseFormData({ ...courseFormData, status: 'PUBLISHED' })}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-bold text-emerald-600">Publish Immediately (Live)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="courseStatus"
                      value="DRAFT"
                      checked={courseFormData.status === 'DRAFT'}
                      onChange={() => setCourseFormData({ ...courseFormData, status: 'DRAFT' })}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-bold text-outline">Save as Draft</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-on-surface block mb-1">Course Overview & Description</label>
                <textarea
                  rows={2}
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                  placeholder="Key concepts, learning outcomes, curriculum highlights..."
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl p-3 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-outline-variant/40">
                <Link
                  href="/admin/courses/builder"
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Icon name="tune" size={14} />
                  <span>Open Full Video Curriculum Studio &rarr;</span>
                </Link>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreateCourseModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-outline-variant/80 text-xs font-bold text-outline hover:bg-surface-container cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingCourse}
                    className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isCreatingCourse ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating Course...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={16} />
                        <span>Create & Save Course</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Version History Modal */}
      {selectedCourseForHistory && (
        <CourseVersionHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedCourseForHistory(null);
          }}
          courseId={selectedCourseForHistory.id}
          courseTitle={selectedCourseForHistory.title}
        />
      )}

      {/* Course Active / Inactive Confirmation Modal */}
      {selectedCourseForToggle && (
        <CourseActiveToggleModal
          isOpen={isToggleModalOpen}
          onClose={() => {
            setIsToggleModalOpen(false);
            setSelectedCourseForToggle(null);
          }}
          course={selectedCourseForToggle}
          onStatusChanged={(newStatus) => {
            setCourses((prev) =>
              prev.map((c) => (c.id === selectedCourseForToggle.id ? { ...c, status: newStatus, isPublished: newStatus === 'PUBLISHED' } : c))
            );
            showToast(
              newStatus === 'PUBLISHED'
                ? 'Course Activated! Accepting student enrollments.'
                : 'Course Deactivated. New enrollments blocked, existing student access preserved.',
              'info'
            );
          }}
        />
      )}
    </div>
  );
}

export default function CoursesAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-outline">Loading Courses...</div>}>
      <CoursesPageContent />
    </Suspense>
  );
}
