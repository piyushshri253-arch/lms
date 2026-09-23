'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Modal } from '@/components/ui/Modal';

interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  duration: string;
  durationSeconds: number;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  fileUrl?: string | null;
  isFree: boolean;
  order: number;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  thumbnail: string;
  trailerVideoUrl?: string | null;
  price: number;
  discountPrice?: number | null;
  currency: string;
  level: string;
  status: string;
  durationHours: number;
  reviewFeedback?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  createdAt: string;
  updatedAt: string;
  learningOutcomes: string[];
  requirementsList: string[];
  audienceList: string[];
  totalLessons: number;
  totalSections: number;
  instructor: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    bio?: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  sections: Section[];
}

interface Stats {
  pendingReview: number;
  approved: number;
  changesRequested: number;
  total: number;
}

export default function ReviewerDashboardPage() {
  const { showToast } = useApp();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    pendingReview: 0,
    approved: 0,
    changesRequested: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL'>('IN_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');

  // Course Evaluation Modal State
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [modalTab, setModalTab] = useState<'CURRICULUM' | 'SYLLABUS'>('CURRICULUM');
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('REJECT');
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/reviewer/courses?status=${activeTab}&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCourses(data.courses || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        showToast({ title: 'Error', description: data.error || 'Failed to load courses', type: 'error' });
      }
    } catch (e: any) {
      showToast({ title: 'Error', description: e.message || 'Failed to fetch review queue', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCourses();
  };

  const handleOpenReviewModal = (course: CourseItem) => {
    setSelectedCourse(course);
    setModalTab('CURRICULUM');
    // Default action: if already approved, default to APPROVE, else default to REJECT to enforce thoughtful check
    setReviewAction(course.status === 'APPROVED' ? 'APPROVE' : 'REJECT');
    setReviewNote(course.reviewFeedback || '');
  };

  const handleCloseModal = () => {
    setSelectedCourse(null);
    setReviewNote('');
    setIsSubmitting(false);
  };

  const handleSubmitDecision = async () => {
    if (!selectedCourse) return;

    if (reviewAction === 'REJECT' && reviewNote.trim().length < 5) {
      showToast({
        title: 'Feedback Note Required',
        description: 'Please explain in detail (at least 5 characters) what the instructor must fix before requesting changes.',
        type: 'error'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/reviewer/courses/${selectedCourse.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          note: reviewNote.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          title: reviewAction === 'APPROVE' ? 'Course Approved! 🎉' : 'Changes Requested ⚠️',
          description: data.message,
          type: 'success'
        });
        handleCloseModal();
        fetchCourses();
      } else {
        showToast({
          title: 'Review Error',
          description: data.error || 'Could not submit review decision.',
          type: 'error'
        });
      }
    } catch (e: any) {
      showToast({ title: 'Error', description: e.message || 'Network error', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.instructor.name.toLowerCase().includes(q) ||
      c.category.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Mission */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Icon name="rate_review" size={28} />
            </span>
            Course Quality & Review Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Evaluate instructor curriculum, verify instructional quality, and provide constructive feedback before courses go live.
          </p>
        </div>

        <button
          onClick={fetchCourses}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors shadow-sm self-start md:self-auto"
        >
          <Icon name="refresh" size={18} className={isLoading ? 'animate-spin' : ''} />
          Refresh Queue
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Review Card */}
        <div
          onClick={() => setActiveTab('IN_REVIEW')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'IN_REVIEW'
              ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
              Awaiting Review
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Icon name="pending_actions" size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white">{stats.pendingReview}</span>
            {stats.pendingReview > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 animate-pulse">
                Action Needed
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Courses waiting for your evaluation</p>
        </div>

        {/* Approved Card */}
        <div
          onClick={() => setActiveTab('APPROVED')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'APPROVED'
              ? 'bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
              Approved
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Icon name="check_circle" size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-white">{stats.approved}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Cleared for live student enrollment</p>
        </div>

        {/* Changes Requested Card */}
        <div
          onClick={() => setActiveTab('REJECTED')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'REJECTED'
              ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400/90">
              Changes Requested
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Icon name="error" size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-white">{stats.changesRequested}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Awaiting instructor revisions</p>
        </div>

        {/* Total Catalog Card */}
        <div
          onClick={() => setActiveTab('ALL')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'ALL'
              ? 'bg-indigo-950/20 border-indigo-500/50 ring-1 ring-indigo-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              All Courses
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Icon name="auto_stories" size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-white">{stats.total}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Total academy courses in database</p>
        </div>
      </div>

      {/* Action Banner if courses pending */}
      {stats.pendingReview > 0 && activeTab !== 'IN_REVIEW' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <Icon name="hourglass_top" size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-200">
                {stats.pendingReview} course{stats.pendingReview > 1 ? 's are' : ' is'} waiting for review
              </p>
              <p className="text-xs text-amber-300/70">
                Instructors cannot publish their courses live until you inspect and approve them.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('IN_REVIEW')}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
          >
            Review Now
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('IN_REVIEW')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'IN_REVIEW'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon name="pending_actions" size={16} />
            Pending Review
            {stats.pendingReview > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">
                {stats.pendingReview}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon name="check_circle" size={16} />
            Approved ({stats.approved})
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon name="assignment_late" size={16} />
            Changes Requested ({stats.changesRequested})
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'ALL'
                ? 'bg-slate-800 text-white shadow'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon name="view_list" size={16} />
            All Courses ({stats.total})
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, instructor..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <span className="absolute left-3 top-2.5 text-slate-500">
            <Icon name="search" size={16} />
          </span>
        </form>
      </div>

      {/* Courses List */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="inline-block animate-spin text-indigo-400 mb-3">
            <Icon name="sync" size={32} />
          </div>
          <p className="text-sm text-slate-400">Loading course review queue...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Icon name="task_alt" size={30} />
          </div>
          <h3 className="text-base font-semibold text-white">Queue is clear</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {activeTab === 'IN_REVIEW'
              ? 'No courses are currently waiting for review. You are all caught up!'
              : 'No courses found matching the selected filter or search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isPending = course.status === 'IN_REVIEW';
            const isApproved = course.status === 'APPROVED';
            const isRejected = course.status === 'REJECTED';
            const isPublished = course.status === 'PUBLISHED';

            return (
              <div
                key={course.id}
                className={`flex flex-col rounded-2xl bg-slate-900/80 border transition-all duration-200 overflow-hidden ${
                  isPending
                    ? 'border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/5'
                    : isApproved
                    ? 'border-emerald-500/30 hover:border-emerald-500/60'
                    : isRejected
                    ? 'border-rose-500/30 hover:border-rose-500/60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Thumbnail & Badges */}
                <div className="relative aspect-video w-full bg-slate-800 overflow-hidden group">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 to-indigo-950/40 text-slate-500">
                      <Icon name="image" size={36} />
                      <span className="text-[11px] mt-1">No Thumbnail</span>
                    </div>
                  )}

                  {/* Status Overlay Badge */}
                  <div className="absolute top-3 left-3">
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-md">
                        <Icon name="hourglass_top" size={14} />
                        Needs Review
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md">
                        <Icon name="verified" size={14} />
                        Approved
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-md">
                        <Icon name="cancel" size={14} />
                        Changes Requested
                      </span>
                    )}
                    {isPublished && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500 text-white shadow-md">
                        <Icon name="public" size={14} />
                        Published Live
                      </span>
                    )}
                    {course.status === 'DRAFT' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-200">
                        <Icon name="edit" size={14} />
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Category & Price Badge */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-semibold">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-300 backdrop-blur-sm border border-slate-700/50">
                      {course.category?.name || 'General'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-indigo-300 backdrop-blur-sm border border-indigo-500/30 font-bold">
                      {course.price === 0 ? 'FREE' : `₹${course.price}`}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Instructor Info */}
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <UserAvatar
                        name={course.instructor?.name || 'Instructor'}
                        avatar={course.instructor?.avatar}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">
                          {course.instructor?.name || 'Unknown Instructor'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{course.instructor?.email}</p>
                      </div>
                    </div>

                    {/* Course Title */}
                    <h3 className="font-bold text-white text-base line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">
                      {course.title}
                    </h3>

                    {/* Curriculum Specs */}
                    <div className="mt-3 grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500">Modules</span>
                        <span className="text-xs font-bold text-slate-200">{course.totalSections}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500">Lectures</span>
                        <span className="text-xs font-bold text-slate-200">{course.totalLessons}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-500">Level</span>
                        <span className="text-xs font-bold text-slate-200">{course.level || 'All'}</span>
                      </div>
                    </div>

                    {/* Previous Feedback Note if rejected */}
                    {course.reviewFeedback && (
                      <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold mb-1">
                          <Icon name="feedback" size={14} />
                          Reviewer Note:
                        </div>
                        <p className="text-rose-200/90 text-[11px] line-clamp-3 italic">
                          "{course.reviewFeedback}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">
                      Updated {new Date(course.updatedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleOpenReviewModal(course)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isPending
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30'
                      }`}
                    >
                      <Icon name="rate_review" size={15} />
                      {isPending ? 'Inspect & Review' : 'View Inspection'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Evaluation Modal */}
      {selectedCourse && (
        <Modal
          isOpen={!!selectedCourse}
          onClose={handleCloseModal}
          title=""
          maxWidth="xl"
        >
          <div className="space-y-6 text-slate-200">
            {/* Modal Header */}
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedCourse.category?.name || 'Course'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Priced at: <strong className="text-white">{selectedCourse.price === 0 ? 'FREE' : `₹${selectedCourse.price}`}</strong>
                  </span>
                </div>
                <div>
                  {selectedCourse.status === 'IN_REVIEW' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Pending Evaluation
                    </span>
                  )}
                  {selectedCourse.status === 'APPROVED' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Approved
                    </span>
                  )}
                  {selectedCourse.status === 'REJECTED' && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Changes Requested
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                {selectedCourse.title}
              </h2>

              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <UserAvatar
                    name={selectedCourse.instructor.name}
                    avatar={selectedCourse.instructor.avatar}
                    size="xs"
                  />
                  <span className="text-slate-200 font-medium">{selectedCourse.instructor.name}</span>
                  <span>({selectedCourse.instructor.email})</span>
                </div>
                <span>•</span>
                <span>{selectedCourse.totalSections} Modules</span>
                <span>•</span>
                <span>{selectedCourse.totalLessons} Lectures</span>
              </div>
            </div>

            {/* Inspection Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800">
              <button
                onClick={() => setModalTab('CURRICULUM')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
                  modalTab === 'CURRICULUM'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon name="view_module" size={16} />
                Curriculum Breakdown ({selectedCourse.sections.length} Sections)
              </button>

              <button
                onClick={() => setModalTab('SYLLABUS')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
                  modalTab === 'SYLLABUS'
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon name="description" size={16} />
                Syllabus & Course Details
              </button>
            </div>

            {/* Tab 1: Curriculum Breakdown */}
            {modalTab === 'CURRICULUM' && (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {selectedCourse.sections.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-900 rounded-xl">
                    No curriculum sections created yet.
                  </div>
                ) : (
                  selectedCourse.sections.map((section, sIdx) => (
                    <div key={section.id} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
                      <div className="p-3 bg-slate-850 flex items-center justify-between font-semibold text-xs text-slate-200">
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">
                            {sIdx + 1}
                          </span>
                          {section.title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {section.lessons.length} lecture{section.lessons.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-800/60">
                        {section.lessons.map((lesson, lIdx) => (
                          <div key={lesson.id} className="p-2.5 px-4 flex items-center justify-between text-xs hover:bg-slate-800/40">
                            <div className="flex items-center gap-2.5">
                              <span className="text-slate-500 text-[10px]">{sIdx + 1}.{lIdx + 1}</span>
                              <Icon
                                name={lesson.type === 'VIDEO' ? 'play_circle' : lesson.type === 'PDF' ? 'picture_as_pdf' : 'description'}
                                size={16}
                                className="text-indigo-400"
                              />
                              <span className="font-medium text-slate-300">{lesson.title}</span>
                              {lesson.isFree && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                                  FREE PREVIEW
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 text-[11px]">{lesson.duration || '10:00'}</span>
                              {lesson.videoUrl && (
                                <a
                                  href={lesson.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                                >
                                  Preview <Icon name="open_in_new" size={13} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Syllabus & Details */}
            {modalTab === 'SYLLABUS' && (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1 text-xs">
                {/* Description */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">
                    Course Description
                  </h4>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedCourse.description || 'No description provided.'}
                  </p>
                </div>

                {/* What You Will Learn */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">
                    Learning Outcomes
                  </h4>
                  {selectedCourse.learningOutcomes.length === 0 ? (
                    <p className="text-slate-500 italic">None specified</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {selectedCourse.learningOutcomes.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <Icon name="check" size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Requirements */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">
                    Prerequisites & Requirements
                  </h4>
                  {selectedCourse.requirementsList.length === 0 ? (
                    <p className="text-slate-500 italic">None specified</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {selectedCourse.requirementsList.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <Icon name="arrow_right" size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Decision Panel */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Icon name="gavel" size={16} className="text-indigo-400" />
                  Review Decision Console
                </span>
                <span className="text-[11px] text-slate-400">
                  {reviewAction === 'REJECT' ? 'Mandatory critique required' : 'Ready to certify'}
                </span>
              </div>

              {/* Action Selection Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction('APPROVE')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-600/20'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon name="check_circle" size={18} />
                  Approve Course
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('REJECT')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    reviewAction === 'REJECT'
                      ? 'bg-rose-600 text-white border-rose-500 ring-2 ring-rose-500/30 shadow-lg shadow-rose-600/20'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon name="cancel" size={18} />
                  Request Changes / Reject
                </button>
              </div>

              {/* Feedback Note Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>
                    {reviewAction === 'REJECT' ? (
                      <span className="text-rose-400 font-bold">Critique Note (Mandatory for Rejection)*</span>
                    ) : (
                      <span>Approval Note / Feedback (Optional)</span>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {reviewNote.length} characters
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    reviewAction === 'REJECT'
                      ? 'Explain specifically what needs to be changed (e.g. Module 2 has no video links, description needs more details, title formatting)...'
                      : 'Congratulations on an excellent curriculum! Ready to be published live.'
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 transition-all ${
                    reviewAction === 'REJECT' && reviewNote.trim().length < 5
                      ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-400'
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {reviewAction === 'REJECT' && reviewNote.trim().length < 5 && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <Icon name="warning" size={13} />
                    Critique note must be at least 5 characters so the instructor knows what to improve.
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDecision}
                  disabled={isSubmitting || (reviewAction === 'REJECT' && reviewNote.trim().length < 5)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? (
                    <>
                      <Icon name="sync" size={15} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Icon name={reviewAction === 'APPROVE' ? 'verified' : 'send'} size={15} />
                      {reviewAction === 'APPROVE' ? 'Certify & Approve Course' : 'Send Rejection Note'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
