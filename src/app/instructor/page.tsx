'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Modal } from '@/components/ui/Modal';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import { CourseVersionHistoryModal } from '@/components/courses/CourseVersionHistoryModal';
import { CourseActiveToggleModal } from '@/components/courses/CourseActiveToggleModal';
import { notifyCoursesChanged, useCoursesAutoRefresh } from '@/lib/courses-sync';
import {
  Users,
  Search,
  Download,
  Mail,
  Phone,
  BookOpen,
  CheckCircle2,
  Clock,
  TrendingUp,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

interface CourseAuthored {
  id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  price: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'ARCHIVED' | 'INACTIVE' | string;
  parentCourseId?: string | null;
  parentCourseTitle?: string | null;
  versionNumber?: number;
  versionLabel?: string;
  level: string;
  category?: string;
  studentsCount: number;
  rating: number;
  hasDraftVersion?: boolean;
  draftVersionNumber?: number;
  liveVersionNumber?: number;
  versionStatus?: string | null;
  isVersionDraftItem?: boolean;
  originalCourseId?: string;
  reviewFeedback?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  instructor?: {
    name?: string;
    avatar?: string;
  };
}

interface EnrolledStudent {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  studentAvatar?: string | null;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  courseCategory?: string;
  coursePrice: number;
  amountPaid: number;
  orderNumber?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  enrolledAt: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

type TabType = 'ALL' | 'PUBLISHED' | 'IN_REVIEW' | 'DRAFT' | 'INACTIVE' | 'REJECTED';

function InstructorCoursesStudioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, showToast } = useApp();

  // Courses State
  const [courses, setCourses] = useState<CourseAuthored[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tabs & Search State
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Course Actions State
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Inactive Modal State
  const [isMakeInactiveModalOpen, setIsMakeInactiveModalOpen] = useState(false);
  const [courseToMakeInactive, setCourseToMakeInactive] = useState<CourseAuthored | null>(null);
  const [isMarkingInactive, setIsMarkingInactive] = useState(false);

  // Version History & Active/Inactive Toggle Modals
  const [selectedCourseForHistory, setSelectedCourseForHistory] = useState<CourseAuthored | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCourseForToggle, setSelectedCourseForToggle] = useState<CourseAuthored | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);

  const handleUpdateVersion = async (course: CourseAuthored) => {
    setActionInProgressId(course.id);
    try {
      showToast({
        title: 'Initializing Update Version...',
        description: `Duplicating course into an independent draft version...`,
        type: 'info'
      });
      const res = await fetch(`/api/courses/${encodeURIComponent(course.id)}/update-version`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize update version.');
      }
      showToast({
        title: data.reused ? 'Draft Resumed' : 'Version Draft Created 🎉',
        description: data.message || 'Draft version ready. Opening course editor...',
        type: 'success'
      });
      notifyCoursesChanged();
      const targetUrl = data.draftUrl || `/instructor/courses/builder?courseId=${encodeURIComponent(data.draftCourse?.id || course.id)}&mode=version_draft`;
      router.push(targetUrl);
    } catch (err: any) {
      showToast({
        title: 'Update Version Failed',
        description: err.message || 'Could not create new draft version.',
        type: 'error'
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Delete Draft Course Modal State (Instructors can delete DRAFT courses)
  const [isDeleteDraftModalOpen, setIsDeleteDraftModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<CourseAuthored | null>(null);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  // Create Course Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('4999');
  const [newCategory, setNewCategory] = useState('Engineering');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sidebarTab = searchParams?.get('tab') || '';
  const createParam = searchParams?.get('create');

  // Enrolled Students State (for sidebar tab=students)
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [studentsMetrics, setStudentsMetrics] = useState<{
    totalEnrollments: number;
    totalUniqueStudents: number;
    totalRevenue: number;
    activeEnrollments: number;
    completedEnrollments: number;
  } | null>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('ALL');
  const [studentStatusFilter, setStudentStatusFilter] = useState('ALL');

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

  // Fetch Authored Courses with silent background auto-refresh support
  const fetchInstructorCourses = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setIsRefreshing(true);
      const res = await fetch('/api/courses?manage=true');
      const data = await res.json();
      if (res.ok && data.courses) {
        setCourses(data.courses);
      } else if (!silent) {
        setCourses([]);
      }
    } catch {
      if (!silent) {
        showToast({ title: 'Error', description: 'Failed to load authored courses.', type: 'error' });
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  };

  // Auto-refresh hook: silent background polling every 5s while tab is visible,
  // instant refresh on tab visibility/focus, and real-time cross-tab sync via BroadcastChannel
  useCoursesAutoRefresh(fetchInstructorCourses, { intervalMs: 5000, enabled: true });

  // Instantly re-fetch whenever user switches status tabs so counts and cards are always 100% fresh
  useEffect(() => {
    fetchInstructorCourses(true);
  }, [activeTab]);

  // Fetch Enrolled Students for this Instructor
  const fetchInstructorStudents = async () => {
    try {
      setIsLoadingStudents(true);
      const res = await fetch('/api/instructor/students');
      const data = await res.json();
      if (res.ok && data.students) {
        setEnrolledStudents(data.students);
        if (data.metrics) {
          setStudentsMetrics(data.metrics);
        }
      } else {
        setEnrolledStudents([]);
      }
    } catch (err) {
      console.error('Failed to load instructor students:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchInstructorCourses();
  }, [currentUser]);

  useEffect(() => {
    if (sidebarTab === 'students') {
      fetchInstructorStudents();
    }
  }, [sidebarTab, currentUser]);

  // Submit Draft course for Reviewer/Admin approval
  const handleSubmitForApproval = async (courseId: string, courseSlug?: string) => {
    setActionInProgressId(courseId);
    try {
      const targetCourse = courses.find((c) => c.id === courseId);
      if (targetCourse?.hasDraftVersion && (targetCourse.status === 'PUBLISHED' || targetCourse.status === 'ARCHIVED')) {
        const res = await fetch('/api/instructor/course-versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SUBMIT_FOR_REVIEW', courseId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit version draft for review');

        setCourses((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, versionStatus: 'PENDING_REVIEW' } : c))
        );

        showToast({
          title: 'Version Draft Submitted! 🛡️',
          description: data.message || 'Version draft submitted to Course Auditor for approval.',
          type: 'success'
        });
        notifyCoursesChanged();
        fetchInstructorCourses(true);
        return;
      }

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
      notifyCoursesChanged();
      fetchInstructorCourses(true);
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
        body: JSON.stringify({ publish: true, action: 'PUBLISH_APPROVED', publishApproved: true })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish course');
      }

      showToast({
        title: 'Course Published Live! 🚀',
        description: data.message || 'Your course is now published live on the platform.',
        type: 'success'
      });
      notifyCoursesChanged();
      fetchInstructorCourses(true);
    } catch (err: any) {
      showToast({
        title: 'Publish Failed',
        description: err.message || 'Could not publish course live.',
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
      notifyCoursesChanged();
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

  // Permanently delete a Draft course or discard a Version Draft
  const handleConfirmDeleteDraft = async () => {
    if (!courseToDelete) return;
    setIsDeletingDraft(true);
    setActionInProgressId(courseToDelete.id);
    try {
      const isVersionDraft = Boolean(
        courseToDelete.parentCourseId ||
        (courseToDelete.hasDraftVersion &&
        (courseToDelete.status === 'PUBLISHED' || courseToDelete.status === 'ARCHIVED'))
      );

      if (isVersionDraft) {
        // Discard the in-progress draft version only. The live published course remains active and untouched!
        const res = await fetch(`/api/courses/${encodeURIComponent(courseToDelete.id)}/version/draft`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete version draft');
        }

        setCourses((prev) => {
          if (courseToDelete.parentCourseId) {
            return prev
              .filter((c) => c.id !== courseToDelete.id)
              .map((c) =>
                c.id === courseToDelete.parentCourseId
                  ? { ...c, hasDraftVersion: false, versionStatus: null }
                  : c
              );
          } else {
            return prev
              .filter((c) => c.parentCourseId !== courseToDelete.id)
              .map((c) =>
                c.id === courseToDelete.id
                  ? { ...c, hasDraftVersion: false, versionStatus: null }
                  : c
              );
          }
        });

        showToast({
          title: 'Version Draft Discarded 🗑️',
          description: `Draft revision for "${courseToDelete.title}" has been deleted. Your live published course remains active and untouched!`,
          type: 'success'
        });
        fetchInstructorCourses(true);
      } else {
        const identifier = courseToDelete.id || courseToDelete.slug;
        const res = await fetch(`/api/courses/${encodeURIComponent(identifier)}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete draft course');
        }

        setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));

        // Clear local storage draft cache if any
        try {
          localStorage.removeItem(`morena_course_builder_draft_${courseToDelete.id}`);
          if (courseToDelete.slug) {
            localStorage.removeItem(`morena_course_builder_draft_${courseToDelete.slug}`);
          }
        } catch {}

        showToast({
          title: 'Draft Course Deleted 🗑️',
          description: `"${courseToDelete.title}" has been permanently deleted from your drafts.`,
          type: 'success'
        });
      }
      notifyCoursesChanged();

      setIsDeleteDraftModalOpen(false);
      setCourseToDelete(null);
    } catch (err: any) {
      showToast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete draft course.',
        type: 'error'
      });
    } finally {
      setIsDeletingDraft(false);
      setActionInProgressId(null);
    }
  };

  // Mark Course as Inactive
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
      notifyCoursesChanged();

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
      notifyCoursesChanged();
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
      notifyCoursesChanged();

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
  const inReviewCount = courses.filter((c) =>
    c.status === 'IN_REVIEW' ||
    c.status === 'PENDING' ||
    c.status === 'PENDING_APPROVAL' ||
    (!courses.some((other) => other.parentCourseId === c.id) && c.hasDraftVersion && c.versionStatus === 'PENDING_REVIEW')
  ).length;
  const isDraftCourse = (c: CourseAuthored) => {
    // 1. Regular course in DRAFT status
    if (c.status === 'DRAFT') return true;

    // 2. Child version draft course (has parentCourseId, not live published or approved, not currently under active review)
    if (
      Boolean(c.parentCourseId) &&
      c.status !== 'PUBLISHED' &&
      c.status !== 'APPROVED' &&
      c.status !== 'IN_REVIEW' &&
      c.status !== 'PENDING' &&
      c.status !== 'PENDING_APPROVAL'
    ) {
      return true;
    }

    // 3. Parent course with in-progress version draft where child is not listed separately
    const hasSeparateChild = courses.some((other) => other.parentCourseId === c.id);
    if (
      !hasSeparateChild &&
      c.hasDraftVersion &&
      c.versionStatus !== 'PENDING_REVIEW' &&
      c.versionStatus !== 'APPROVED'
    ) {
      return true;
    }

    return false;
  };

  const draftCount = courses.filter(isDraftCourse).length;
  const inactiveCount = courses.filter((c) => c.status === 'ARCHIVED' || c.status === 'INACTIVE').length;
  const rejectedCount = courses.filter((c) =>
    c.status === 'REJECTED' ||
    c.status === 'CHANGES_REQUESTED' ||
    (!courses.some((other) => other.parentCourseId === c.id) && c.hasDraftVersion && c.versionStatus === 'VERSION_REJECTED')
  ).length;

  // Filtered Courses
  const filteredAuthoredCourses = courses
    .filter((c) => {
      if (activeTab === 'PUBLISHED') {
        return c.status === 'PUBLISHED' || c.status === 'APPROVED';
      }
      if (activeTab === 'IN_REVIEW') {
        return (
          c.status === 'IN_REVIEW' ||
          c.status === 'PENDING' ||
          c.status === 'PENDING_APPROVAL' ||
          (!courses.some((other) => other.parentCourseId === c.id) && c.hasDraftVersion && c.versionStatus === 'PENDING_REVIEW')
        );
      }
      if (activeTab === 'DRAFT') {
        return isDraftCourse(c);
      }
      if (activeTab === 'INACTIVE') {
        return c.status === 'ARCHIVED' || c.status === 'INACTIVE';
      }
      if (activeTab === 'REJECTED') {
        return (
          c.status === 'REJECTED' ||
          c.status === 'CHANGES_REQUESTED' ||
          (!courses.some((other) => other.parentCourseId === c.id) && c.hasDraftVersion && c.versionStatus === 'VERSION_REJECTED')
        );
      }
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

  // Filtered Enrolled Students for tab=students
  const filteredStudents = enrolledStudents.filter((s) => {
    if (studentCourseFilter !== 'ALL' && s.courseId !== studentCourseFilter) {
      return false;
    }
    if (studentStatusFilter !== 'ALL' && s.status !== studentStatusFilter) {
      return false;
    }
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.studentEmail.toLowerCase().includes(q) ||
      s.courseTitle.toLowerCase().includes(q) ||
      (s.orderNumber && s.orderNumber.toLowerCase().includes(q))
    );
  });

  // Export Enrolled Students to CSV
  const exportStudentsToCSV = () => {
    if (filteredStudents.length === 0) return;
    const headers = [
      'Student Name',
      'Email',
      'Phone',
      'Course Enrolled',
      'Enrolled Date',
      'Amount Paid (INR)',
      'Payment Status',
      'Progress (%)',
      'Access Status'
    ];
    const rows = filteredStudents.map((s) => [
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.studentEmail.replace(/"/g, '""')}"`,
      `"${(s.studentPhone || '').replace(/"/g, '""')}"`,
      `"${s.courseTitle.replace(/"/g, '""')}"`,
      `"${new Date(s.enrolledAt).toLocaleDateString('en-IN')}"`,
      s.amountPaid,
      s.paymentStatus,
      `${s.progressPercentage}%`,
      s.status
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `enrolled_students_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                {sidebarTab === 'students'
                  ? 'Track enrolled students, monitor curriculum progress, and review student purchase details.'
                  : 'Create deep-tech courses, upload modules & lessons, manage drafts, and submit for review to launch live.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/instructor/courses/builder?new=true"
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-violet-600/20 transition-all cursor-pointer shrink-0"
            >
              <Icon name="add_circle" size={18} />
              <span>Create New Course</span>
            </Link>
          </div>
        </div>

        {/* Dedicated Students View when sidebar tab=students */}
        {sidebarTab === 'students' && (
          <div className="space-y-6">
            {/* 1. Quick Stats Cards for Enrolled Students */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Total Enrollments</span>
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {studentsMetrics?.totalEnrollments ?? totalStudents}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Across all your authored courses
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Unique Learners</span>
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-sky-600">
                  {studentsMetrics?.totalUniqueStudents ?? 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Individual registered students
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Active Learners</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-600">
                  {studentsMetrics?.activeEnrollments ?? 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Actively studying coursework
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Gross Enrollment Value</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
                  ₹{(studentsMetrics?.totalRevenue ?? totalRevenue).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Total student course purchases
                </p>
              </div>
            </div>

            {/* 2. Main Enrolled Students Roster Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-600" />
                    Enrolled Students &amp; Purchase Roster
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time list of students who purchased or enrolled in your courses with full student names, contact, purchase dates, and progress.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={fetchInstructorStudents}
                    disabled={isLoadingStudents}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                    title="Refresh student list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStudents ? 'animate-spin text-violet-600' : ''}`} />
                  </button>
                  <button
                    onClick={exportStudentsToCSV}
                    disabled={filteredStudents.length === 0}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
                {/* Search */}
                <div className="relative w-full sm:flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search by student name, email, or course..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white transition-all"
                  />
                  {studentSearchQuery && (
                    <button
                      onClick={() => setStudentSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Course Filter */}
                <div className="w-full sm:w-auto">
                  <select
                    value={studentCourseFilter}
                    onChange={(e) => setStudentCourseFilter(e.target.value)}
                    className="w-full sm:w-56 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-violet-500 focus:bg-white truncate"
                  >
                    <option value="ALL">All Courses ({courses.length})</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-auto">
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                    className="w-full sm:w-36 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-violet-500 focus:bg-white"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              {/* Table / List */}
              {isLoadingStudents ? (
                <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-violet-600" />
                  <p>Loading enrolled students and purchase records...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {enrolledStudents.length === 0
                      ? 'No students enrolled yet'
                      : 'No students match your search filter'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {enrolledStudents.length === 0
                      ? 'When a student purchases or enrolls in any of your courses, their name, purchase details, and learning progress will appear here.'
                      : 'Try resetting the search bar or changing the course filter dropdown to see your students.'}
                  </p>
                  {studentSearchQuery && (
                    <button
                      onClick={() => {
                        setStudentSearchQuery('');
                        setStudentCourseFilter('ALL');
                        setStudentStatusFilter('ALL');
                      }}
                      className="mt-3 text-xs font-bold text-violet-600 hover:underline cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4">Student Name &amp; Contact</th>
                        <th className="py-3.5 px-4">Purchased Course</th>
                        <th className="py-3.5 px-4">Enrolled / Purchase Date</th>
                        <th className="py-3.5 px-4">Amount Paid</th>
                        <th className="py-3.5 px-4">Progress</th>
                        <th className="py-3.5 px-4">Access Status</th>
                        <th className="py-3.5 px-4 text-right">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                avatar={student.studentAvatar}
                                name={student.studentName}
                                size="sm"
                                className="w-9 h-9 shrink-0 shadow-2xs"
                              />
                              <div>
                                <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                  {student.studentName}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{student.studentEmail}</span>
                                </div>
                                {student.studentPhone && (
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span>{student.studentPhone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 max-w-[260px] line-clamp-1" title={student.courseTitle}>
                              {student.courseTitle}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {student.courseCategory || 'Engineering'}
                              </span>
                              {student.orderNumber && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{student.orderNumber}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {new Date(student.enrolledAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {new Date(student.enrolledAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-emerald-700 text-xs">
                              ₹{Number(student.amountPaid || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
                              {student.paymentMethod} • {student.paymentStatus}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="w-32 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                                <span>{student.progressPercentage}%</span>
                                <span className="text-slate-400 font-normal">
                                  {student.completedLessons}/{student.totalLessons}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    student.progressPercentage === 100
                                      ? 'bg-emerald-500'
                                      : 'bg-violet-600'
                                  }`}
                                  style={{ width: `${Math.min(student.progressPercentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                student.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : student.status === 'ACTIVE'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  student.status === 'COMPLETED'
                                    ? 'bg-emerald-500'
                                    : student.status === 'ACTIVE'
                                    ? 'bg-sky-500'
                                    : 'bg-slate-400'
                                }`}
                              />
                              {student.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <a
                              href={`mailto:${student.studentEmail}?subject=${encodeURIComponent(
                                `Welcome to ${student.courseTitle} - Morena Teach`
                              )}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-[11px] font-bold transition-all shadow-2xs"
                              title={`Email ${student.studentName}`}
                            >
                              <Mail className="w-3.5 h-3.5 text-violet-600" />
                              <span>Email</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. Course Breakdown Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Course-Wise Enrollment Breakdown ({totalStudents} Total Learners)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Breakdown of student seats and revenue across each authored course
                  </p>
                </div>
              </div>

              {courses.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No courses created yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
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

        {/* Course Studio View (Only when not on students or notifications tab) */}
        {sidebarTab !== 'students' && sidebarTab !== 'notifications' && (
          <>
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

        {/* Metric Cards (Authored Courses, Total Active Learners, Gross Portfolio Value - Commented out as requested) */}
        {/*
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
        */}

        {/* Courses Table / Cards Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Header with Title and Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-black text-slate-900">
                  Your Authored Courses
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Auto-Sync Active</span>
                </span>
                <button
                  type="button"
                  onClick={() => fetchInstructorCourses(false)}
                  disabled={isRefreshing}
                  className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all cursor-pointer"
                  title="Refresh courses"
                >
                  <Icon name="refresh" size={15} className={isRefreshing ? 'animate-spin text-violet-600' : ''} />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Manage syllabus, publish live, move to draft, or mark courses active/inactive
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-72 md:w-80">
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
                  href="/instructor/courses/builder?new=true"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  <Icon name="add_circle" size={16} />
                  <span>Create New Course</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAuthoredCourses.map((course) => {
                const isDraftTab = activeTab === 'DRAFT';
                const isReviewTab = activeTab === 'IN_REVIEW';

                const hasSeparateChild = courses.some((other) => other.parentCourseId === course.id);

                // Version state flags (only for parent course if no separate child card exists)
                const hasPendingVersionReview = Boolean(!hasSeparateChild && course.hasDraftVersion && course.versionStatus === 'PENDING_REVIEW');
                const hasApprovedVersion = Boolean(!hasSeparateChild && course.hasDraftVersion && course.versionStatus === 'APPROVED');
                const hasVersionDraft = Boolean(!hasSeparateChild && course.hasDraftVersion && (course.versionStatus === 'DRAFT_VERSION' || !course.versionStatus || course.versionStatus === 'VERSION_REJECTED'));
                const hasRejectedVersion = Boolean(!hasSeparateChild && course.hasDraftVersion && course.versionStatus === 'VERSION_REJECTED');

                const isApproved = course.status === 'APPROVED';
                const isUnderReview = !isApproved && course.status !== 'PUBLISHED' && (course.status === 'IN_REVIEW' || course.status === 'PENDING' || course.status === 'PENDING_APPROVAL' || hasPendingVersionReview);
                const isRejected = !isApproved && !isUnderReview && course.status !== 'PUBLISHED' && (course.status === 'REJECTED' || course.status === 'CHANGES_REQUESTED' || hasRejectedVersion);
                const isDraft = !isApproved && !isUnderReview && course.status !== 'PUBLISHED' && (
                  course.status === 'DRAFT' ||
                  (Boolean(course.parentCourseId) && course.status !== 'PUBLISHED') ||
                  (isDraftTab && hasVersionDraft)
                );
                const isArchived = (course.status === 'ARCHIVED' || course.status === 'INACTIVE') && !isDraftTab && !isReviewTab;
                const isPublished = course.status === 'PUBLISHED' && !isDraftTab && !isReviewTab;
                const isBusy = actionInProgressId === course.id;

                const canDeleteOrDiscard = !isApproved && !isUnderReview && course.status !== 'PUBLISHED' && (
                  isDraft ||
                  isRejected ||
                  Boolean(course.parentCourseId) ||
                  course.status === 'DRAFT' ||
                  course.status === 'REJECTED' ||
                  course.status === 'CHANGES_REQUESTED' ||
                  hasVersionDraft
                );

                return (
                  <div
                    key={course.id}
                    className="bg-slate-50 border border-slate-200 hover:border-violet-400 hover:bg-white rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Status & Version Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1.5 ${
                              isApproved
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : isUnderReview
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : isRejected
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isPublished
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isArchived
                                ? 'bg-slate-200/80 text-slate-700 border border-slate-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                            }`}
                          >
                            {isApproved ? (
                              'Approved by Auditor ✅'
                            ) : isUnderReview ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                                <span>
                                  {course.parentCourseId
                                    ? `Under Review (${course.versionLabel || `v${course.versionNumber || 2}.0`})`
                                    : hasPendingVersionReview
                                    ? `Under Review (v${course.draftVersionNumber || 2}.0)`
                                    : 'Under Review'}
                                </span>
                              </>
                            ) : isRejected ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                                <span>Changes Requested</span>
                              </>
                            ) : isPublished ? (
                              `Live (${course.versionLabel || `v${course.versionNumber || 1}.0`})`
                            ) : isArchived ? (
                              'Inactive'
                            ) : course.parentCourseId || (isDraftTab && hasVersionDraft) ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                                <span>Version Draft ({course.versionLabel || `v${course.versionNumber || 2}.0`})</span>
                              </>
                            ) : (
                              'Draft'
                            )}
                          </span>

                          {/* Version Badge */}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-violet-100 text-violet-800 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-700">
                            {course.versionLabel || `v${course.versionNumber || 1}.0`}
                          </span>

                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {course.id.slice(-6)}
                          </span>
                        </div>

                        <span className="font-mono text-sm font-black text-emerald-600">
                          {course.price === 0 ? 'Free' : `₹${course.price.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      {course.parentCourseId && course.status !== 'PUBLISHED' && (
                        <div className="text-[11px] font-semibold text-violet-800 bg-violet-50/90 dark:bg-violet-950/40 dark:text-violet-200 border border-violet-200 dark:border-violet-800 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                          <Icon name="device_hub" size={13} className="text-violet-600 shrink-0" />
                          <span className="line-clamp-1">Version update for: <strong>{course.parentCourseTitle || 'Original Published Course'}</strong></span>
                        </div>
                      )}

                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      {isDraftTab && hasVersionDraft && !hasSeparateChild ? (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] space-y-1">
                          <div className="flex items-center justify-between gap-1 text-amber-800 dark:text-amber-300 font-bold">
                            <span className="flex items-center gap-1.5">
                              <Icon name="edit_note" size={14} className="text-amber-600" />
                              <span>In-Progress Version Draft</span>
                            </span>
                            <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-black">
                              Unpublished Draft
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400">
                            Editable revision for Version {course.draftVersionNumber || 2}.0. Your live published course remains active and safe on the landing page!
                          </p>
                        </div>
                      ) : null}

                      {isUnderReview && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                          {hasPendingVersionReview
                            ? `⏳ Version ${course.draftVersionNumber || 2}.0 is under evaluation by Course Auditor Studio. Live course remains active on website.`
                            : '⏳ Under evaluation by the Course Auditor Studio. You will be notified once reviewed.'}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {isPublished ? (
                            /* Published Course Actions: Preview, Edit, Update Version / Resume Draft, Active/Inactive Toggle, Version History */
                            <>
                              {/* A. Preview */}
                              <Link
                                href={`/instructor/courses/preview/${encodeURIComponent(course.id)}`}
                                className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs"
                                title="Student View Preview of currently published version"
                              >
                                <Icon name="visibility" size={13} />
                                <span>Preview</span>
                              </Link>

                              {/* B. Quick Minor Edit */}
                              <Link
                                href={`/instructor/courses/builder?courseId=${course.id}&mode=minor_edit`}
                                className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs"
                                title="Quick edit course title, description, or minor wording fixes"
                              >
                                <Icon name="edit_note" size={13} />
                                <span>Edit</span>
                              </Link>

                              {/* C. Update Version */}
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUpdateVersion(course)}
                                className="text-xs font-bold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Create or resume editable draft for the next version"
                              >
                                {isBusy ? (
                                  <Icon name="sync" size={13} className="animate-spin" />
                                ) : (
                                  <Icon name="edit_document" size={13} />
                                )}
                                <span>Update Version</span>
                              </button>

                              {/* D. Active / Inactive Toggle */}
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setSelectedCourseForToggle(course);
                                  setIsToggleModalOpen(true);
                                }}
                                className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Toggle course availability (Active / Inactive)"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                <span>Active</span>
                              </button>

                              {/* E. Version History */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCourseForHistory(course);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                title="View complete version history and audit records"
                              >
                                <Icon name="history" size={13} />
                                <span>Version History</span>
                              </button>
                            </>
                          ) : isArchived ? (
                            /* Inactive Course Actions: Preview, Active Toggle, Version History */
                            <>
                              <Link
                                href={`/instructor/courses/preview/${encodeURIComponent(course.id)}`}
                                className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs"
                                title="Preview course as seen by students"
                              >
                                <Icon name="visibility" size={13} />
                                <span>Preview</span>
                              </Link>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setSelectedCourseForToggle(course);
                                  setIsToggleModalOpen(true);
                                }}
                                className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                                title="Activate this inactive course"
                              >
                                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                <span>Inactive</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCourseForHistory(course);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                title="View version history"
                              >
                                <Icon name="history" size={13} />
                                <span>Version History</span>
                              </button>
                            </>
                          ) : (
                            /* Draft, In Review, Approved, or Rejected Course Actions */
                            <>
                              <Link
                                href={
                                  (isDraftTab && hasVersionDraft) || course.parentCourseId
                                    ? `/instructor/courses/builder?courseId=${course.id}&mode=version_draft`
                                    : `/instructor/courses/builder?courseId=${course.id}`
                                }
                                className="text-xs font-bold text-slate-700 hover:text-violet-700 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors inline-flex items-center gap-1 shadow-2xs"
                                title="Edit curriculum, lectures, and settings"
                              >
                                <Icon name="edit" size={13} />
                                <span>
                                  {course.parentCourseId && course.status !== 'PUBLISHED'
                                    ? `Resume Draft (${course.versionLabel || `v${course.versionNumber || 2}.0`})`
                                    : (isDraftTab && hasVersionDraft)
                                    ? `Resume Draft (v${course.draftVersionNumber || 2}.0)`
                                    : isRejected
                                    ? 'Edit & Resubmit'
                                    : 'Edit'}
                                </span>
                              </Link>

                              <Link
                                href={`/instructor/courses/preview/${encodeURIComponent(course.id)}`}
                                className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs"
                                title="Preview course exactly as students see it"
                              >
                                <Icon name="visibility" size={13} />
                                <span>Preview</span>
                              </Link>

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

                              {(isDraft || isRejected) && !isApproved && (
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
                                  <span>Submit for Approval</span>
                                </button>
                              )}

                              {canDeleteOrDiscard && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    setCourseToDelete(course);
                                    setIsDeleteDraftModalOpen(true);
                                  }}
                                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                                  title={course.parentCourseId ? 'Discard this draft revision (live original course remains untouched)' : hasVersionDraft ? 'Discard this draft revision (live course remains untouched)' : 'Delete this draft course permanently'}
                                >
                                  <Icon name="delete" size={13} />
                                  <span>{course.parentCourseId || hasVersionDraft ? 'Discard Draft' : 'Del'}</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create New Course Action Below Course Cards */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-center">
              <Link
                href="/instructor/courses/builder?new=true"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-violet-600/20 hover:shadow-lg transition-all cursor-pointer"
              >
                <Icon name="add_circle" size={18} />
                <span>Create New Course</span>
              </Link>
            </div>
          </div>
        )}
        </div>
        </>
      )}
      </div>

      {/* Delete Draft Course Confirmation Modal */}
      <Modal
        isOpen={isDeleteDraftModalOpen}
        onClose={() => {
          if (!isDeletingDraft) {
            setIsDeleteDraftModalOpen(false);
            setCourseToDelete(null);
          }
        }}
        maxWidth="md"
        title={courseToDelete?.parentCourseId || (courseToDelete?.hasDraftVersion && (courseToDelete?.status === 'PUBLISHED' || courseToDelete?.status === 'ARCHIVED')) ? 'Discard Version Draft' : 'Delete Draft Course'}
        subtitle={courseToDelete?.parentCourseId || (courseToDelete?.hasDraftVersion && (courseToDelete?.status === 'PUBLISHED' || courseToDelete?.status === 'ARCHIVED')) ? 'Discard in-progress version changes' : 'This action cannot be undone'}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <Icon name="delete_forever" size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-950">
                {courseToDelete?.parentCourseId || (courseToDelete?.hasDraftVersion && (courseToDelete?.status === 'PUBLISHED' || courseToDelete?.status === 'ARCHIVED')) ? (
                  <>Are you sure you want to <strong>discard</strong> this version draft?</>
                ) : (
                  <>Are you sure you want to <strong>"permanently delete"</strong> this draft?</>
                )}
              </h4>
              <p className="text-xs text-rose-800 leading-relaxed">
                {courseToDelete?.parentCourseId || (courseToDelete?.hasDraftVersion && (courseToDelete?.status === 'PUBLISHED' || courseToDelete?.status === 'ARCHIVED')) ? (
                  <>
                    You are discarding the in-progress draft changes for <strong className="font-semibold text-rose-950">&quot;{courseToDelete?.title}&quot;</strong>.
                    All unsubmitted curriculum modifications for this draft will be removed.
                  </>
                ) : (
                  <>
                    You are about to delete <strong className="font-semibold text-rose-950">&quot;{courseToDelete?.title}&quot;</strong>.
                    All draft curriculum sections, lessons, and uploaded files for this draft will be <strong>"permanently deleted"</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-xs ${
            courseToDelete?.parentCourseId || (courseToDelete?.hasDraftVersion && (courseToDelete?.status === 'PUBLISHED' || courseToDelete?.status === 'ARCHIVED'))
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            {courseToDelete?.parentCourseId || (courseToDelete?.hasDraftVersion && (courseToDelete?.status === 'PUBLISHED' || courseToDelete?.status === 'ARCHIVED')) ? (
              <span>
                🛡️ <strong>Live Published Course 100% Safe:</strong> {courseToDelete?.parentCourseId ? `The original published course ("${courseToDelete?.parentCourseTitle || 'Published Course'}") and all enrolled students remain active and completely untouched!` : 'Your live published course on the landing page and all enrolled student access remain active and completely untouched! Only the in-progress draft revision is discarded.'}
              </span>
            ) : (
              <span>
                ℹ️ <strong>Draft Only:</strong> Only unpublished draft courses can be deleted. Published courses with student enrollments cannot be deleted.
              </span>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isDeletingDraft}
              onClick={() => {
                setIsDeleteDraftModalOpen(false);
                setCourseToDelete(null);
              }}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingDraft}
              onClick={handleConfirmDeleteDraft}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isDeletingDraft ? (
                <>
                  <Icon name="sync" size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Icon name="delete" size={14} />
                  <span>{courseToDelete?.parentCourseId || (courseToDelete?.hasDraftVersion && (courseToDelete?.status === 'PUBLISHED' || courseToDelete?.status === 'ARCHIVED')) ? 'Discard Draft Revision' : 'Delete Draft'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

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
        title="Initialize New Course"
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
              prev.map((c) => (c.id === selectedCourseForToggle.id ? { ...c, status: newStatus } : c))
            );
            showToast({
              title: newStatus === 'PUBLISHED' ? 'Course Activated! 🚀' : 'Course Deactivated ⏸️',
              description:
                newStatus === 'PUBLISHED'
                  ? 'Course is now active and accepting student enrollments.'
                  : 'Course is now inactive. New enrollments are blocked, existing student access is preserved.',
              type: 'info'
            });
          }}
        />
      )}
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
