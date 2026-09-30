'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { QuizPlayer } from '@/components/player/QuizPlayer';
import { ArticlePlayer } from '@/components/player/ArticlePlayer';
import { LessonTabs } from '@/components/player/LessonTabs';
import { Icon } from '@/components/ui/Icon';
import { AiLessonTutorDrawer } from '@/components/player/AiLessonTutorDrawer';
import { CertificateModal } from '@/components/student/CertificateModal';
import { useApp } from '@/context/AppContext';
import confetti from 'canvas-confetti';

export default function LearnPlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, isLoadingUser, showToast } = useApp();

  const courseSlug = (params?.id as string) || (params?.slug as string) || '';
  const initialLessonId = searchParams.get('lessonId') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [activeLessonId, setActiveLessonId] = useState<string>(initialLessonId);
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [playerTab, setPlayerTab] = useState<'overview' | 'notes' | 'bookmarks' | 'discussion' | 'assignments' | 'resources' | 'reviews'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileCurriculumOpen, setIsMobileCurriculumOpen] = useState(false);
  const [isProgressDropdownOpen, setIsProgressDropdownOpen] = useState(false);
  const [openResourceMenuId, setOpenResourceMenuId] = useState<string | null>(null);

  // Sync tab with URL hash if present (#overview, #notes, etc.)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['overview', 'notes', 'bookmarks', 'discussion', 'assignments', 'resources', 'reviews'].includes(hash)) {
        setPlayerTab(hash as any);
      }
    }
  }, []);

  // Check authentication once user state is resolved
  useEffect(() => {
    if (!isLoadingUser && !currentUser) {
      showToast({
        title: 'Sign In Required',
        description: 'Please sign in or create an account to access this course.',
        type: 'info'
      });
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/courses/${courseSlug}?autoEnroll=true`)}`);
    }
  }, [isLoadingUser, currentUser, courseSlug, router]);

  // Fetch live course from database
  const fetchLiveCourse = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseSlug}`);
      if (res.ok) {
        const data = await res.json();
        const c = data.course;

        // Security / Access Protection:
        // Must be logged in and enrolled to access course lectures!
        if (!data.isEnrolled && currentUser?.role !== 'SUPER_ADMIN') {
          if (!currentUser) {
            showToast({
              title: 'Sign In Required',
              description: 'Please sign in or create an account to access this course.',
              type: 'info'
            });
            router.replace(`/login?callbackUrl=${encodeURIComponent(`/courses/${courseSlug}?autoEnroll=true`)}`);
          } else {
            showToast({
              title: 'Enrollment Required',
              description: c.price === 0
                ? 'Please enroll in this free course to access the lectures.'
                : 'Please enroll in this course to access the lectures.',
              type: 'info'
            });
            router.replace(`/courses/${courseSlug}`);
          }
          return;
        }

        setCourse(c);

        const allLessonsList = c.sections?.flatMap((s: any) => s.lessons) || [];
        if (!activeLessonId && allLessonsList.length > 0) {
          setActiveLessonId(allLessonsList[0].id);
        }
        if (c.sections && c.sections.length > 0) {
          setExpandedSectionIds([c.sections[0].id]);
        }

        // Fetch user's completed lessons for this course
        if (data.completedLessonIds) {
          setCompletedLessonIds(data.completedLessonIds);
          const comp = data.completedLessonIds.length;
          const tot = allLessonsList.length || 1;
          setProgressPercent(Math.min(100, Math.round((comp / tot) * 100)));
        }
      } else {
        router.replace('/courses');
      }
    } catch {
      router.replace('/courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseSlug && !isLoadingUser) {
      if (currentUser) {
        fetchLiveCourse();
      }
    }
  }, [courseSlug, isLoadingUser, currentUser]);

  const allSections = course?.sections || [];
  const allLessons = allSections.flatMap((s: any) => s.lessons) || [];
  const activeLesson = allLessons.find((l: any) => l.id === activeLessonId) || allLessons[0] || null;
  const activeSection = allSections.find((s: any) => s.lessons?.some((l: any) => l.id === activeLesson?.id)) || allSections[0] || null;

  const currentIndex = allLessons.findIndex((l: any) => l.id === activeLesson?.id);
  const isCurrentCompleted = activeLesson?.id ? completedLessonIds.includes(activeLesson.id) : false;

  const toggleSection = (id: string) => {
    setExpandedSectionIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?lessonId=${lessonId}#${playerTab}`);
    }
  };

  const handleNextLesson = () => {
    if (currentIndex < allLessons.length - 1) {
      handleSelectLesson(allLessons[currentIndex + 1].id);
    }
  };

  const handlePrevLesson = () => {
    if (currentIndex > 0) {
      handleSelectLesson(allLessons[currentIndex - 1].id);
    }
  };

  const handleToggleLessonComplete = async (targetLessonId?: string) => {
    const lId = targetLessonId || activeLesson?.id;
    if (!lId) return;

    const isCompleted = completedLessonIds.includes(lId);

    try {
      const res = await fetch(`/api/lessons/${lId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: !isCompleted
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update progress');

      if (data.completedLessonIds) {
        setCompletedLessonIds(data.completedLessonIds);
      } else {
        setCompletedLessonIds((prev) =>
          !isCompleted ? [...prev, lId] : prev.filter((id) => id !== lId)
        );
      }

      if (data.progressPercent !== undefined) {
        setProgressPercent(data.progressPercent);
      }

      if (data.certificate) {
        setCertificateData(data.certificate);
        setIsCertificateOpen(true);
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
        showToast({ title: 'Course Completed! 🎉', description: 'Your verified certificate is ready.', type: 'success' });
      } else {
        showToast({
          title: !isCompleted ? 'Lecture Completed ✓' : 'Marked as uncompleted',
          type: 'info'
        });
      }
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  // Build active resources list for current lecture & course
  const activeResources = [
    ...(activeLesson?.pdfUrl ? [{ name: `${activeLesson.title} (PDF Document)`, url: activeLesson.pdfUrl }] : []),
    ...(activeLesson?.fileUrl ? [{ name: `${activeLesson.title} (Downloadable Resource)`, url: activeLesson.fileUrl }] : []),
    ...(Array.isArray(course?.resources) ? course.resources : [])
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1c1d1f] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-slate-600 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">Loading course player...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1c1d1f] text-white min-h-screen flex flex-col h-screen overflow-hidden antialiased font-sans">
      {/* 1. UDEMY TOP NAVBAR (Dark Theme) */}
      <header className="h-14 bg-[#1c1d1f] text-white px-3 sm:px-5 flex items-center justify-between border-b border-[#2d2f31] shrink-0 z-30 select-none">
        {/* Left: Back to Learning + Divider + Course Title */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <Link
            href="/student/learning"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors py-1.5 px-2 rounded hover:bg-white/10 shrink-0 cursor-pointer"
            title="Back to My learning"
          >
            <Icon name="arrow_back" size={16} />
            <span className="hidden sm:inline">My learning</span>
          </Link>

          <div className="h-4 w-[1px] bg-slate-700 shrink-0" />

          <h1
            className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg cursor-default"
            title={course?.title}
          >
            {course?.title || 'Course Player'}
          </h1>
        </div>

        {/* Right: Actions (Rating, Progress, Share, Sidebar Toggle) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Leave a Rating Button */}
          <button
            type="button"
            onClick={() => {
              setPlayerTab('reviews');
              document.getElementById('lesson-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Leave or edit your rating"
          >
            <Icon name="star" size={14} fill className="text-amber-400" />
            <span className="hidden md:inline">Leave a rating</span>
          </button>

          {/* Your Progress Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProgressDropdownOpen(!isProgressDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="View your completion progress"
            >
              <div className="w-5 h-5 rounded-full border-2 border-indigo-400 flex items-center justify-center text-[9px] font-mono text-indigo-300 font-bold shrink-0">
                {progressPercent}%
              </div>
              <span className="hidden lg:inline">Your progress</span>
              <Icon name="expand_more" size={14} />
            </button>

            {isProgressDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-slate-900 rounded-lg shadow-2xl border border-[#d1d7dc] p-4 space-y-3 z-50 animate-in fade-in duration-150">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>{completedLessonIds.length} of {allLessons.length} completed</span>
                  <span className="font-mono text-indigo-700">{progressPercent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {progressPercent >= 100 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCertificateOpen(true);
                      setIsProgressDropdownOpen(false);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Icon name="workspace_premium" size={16} fill />
                    <span>Claim Certificate</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Complete all lectures to claim your verified certificate of completion.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Share Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(window.location.href);
                showToast({ title: 'Link Copied', description: 'Course link copied to clipboard.', type: 'info' });
              }
            }}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
            title="Share this course"
          >
            <Icon name="share" size={14} />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* AI Tutor Drawer Button */}
          <AiLessonTutorDrawer
            lessonId={activeLesson?.id}
            lessonTitle={activeLesson?.title}
            courseSlug={courseSlug}
          />

          {/* Course Content Sidebar Toggle Button (Desktop & Mobile) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                setIsMobileCurriculumOpen(true);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              isSidebarOpen ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Course content sidebar"
          >
            <Icon name="view_sidebar" size={16} />
            <span className="hidden sm:inline">Course content</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN BODY (Theater Left + Course Content Sidebar on the RIGHT) */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)] bg-[#f7f9fa]">
        {/* Left Column: Video Theater + Navigation + Bottom Tabs */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-white">
          {/* 2A. CINEMA THEATER STAGE (16:9 Black Container) */}
          <div className="w-full bg-black flex items-center justify-center relative min-h-[260px] sm:min-h-[400px] lg:min-h-[480px] max-h-[72vh] shrink-0">
            {activeLesson?.type === 'QUIZ' ? (
              <div className="w-full max-w-3xl p-6 sm:p-8 bg-white my-6 rounded-xl shadow-lg text-slate-900">
                <QuizPlayer
                  title={activeLesson.title}
                  lessonId={activeLesson.id}
                  quizData={activeLesson.quizData}
                  onPass={() => handleToggleLessonComplete(activeLesson.id)}
                />
              </div>
            ) : activeLesson?.type === 'TEXT' || activeLesson?.type === 'PDF' || activeLesson?.type === 'DOWNLOAD' ? (
              <div className="w-full max-w-4xl p-4 sm:p-6 my-4">
                <ArticlePlayer
                  title={activeLesson.title}
                  lessonId={activeLesson.id}
                  type={activeLesson.type}
                  content={activeLesson.content}
                  pdfUrl={activeLesson.pdfUrl}
                  fileUrl={activeLesson.fileUrl}
                  allowDownload={Boolean(activeLesson.allowDownload)}
                  duration={activeLesson.duration}
                  isCompleted={isCurrentCompleted}
                  onComplete={() => handleToggleLessonComplete(activeLesson.id)}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <VideoPlayer
                  title={activeLesson?.title || course?.title || 'Lecture Video'}
                  videoUrl={activeLesson?.videoUrl || null}
                  lessonId={activeLesson?.id || undefined}
                  thumbnail={course?.thumbnail || ''}
                  duration={activeLesson?.duration || '10:00'}
                  isFree={!!activeLesson?.isFree}
                  onLessonComplete={() => handleToggleLessonComplete(activeLesson?.id)}
                />
              </div>
            )}
          </div>

          {/* 2B. UNDER-PLAYER NAVIGATION BAR */}
          <div className="px-4 sm:px-8 py-3 bg-[#f7f9fa] border-b border-[#d1d7dc] flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Previous Lecture */}
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={handlePrevLesson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#d1d7dc] bg-white text-xs font-bold text-[#2d2f31] hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
            >
              <Icon name="arrow_back" size={14} />
              <span>Previous</span>
            </button>

            {/* Current Lecture Title */}
            <div className="text-center min-w-0 flex-1 px-2">
              <span className="text-xs sm:text-sm font-bold text-[#2d2f31] truncate block">
                {activeLesson?.title || 'Lecture'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {activeLesson?.duration || '10:00'} • {activeSection?.title || 'Section'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Mark Complete Checkbox / Button */}
              <button
                type="button"
                onClick={() => handleToggleLessonComplete(activeLesson?.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold transition-colors cursor-pointer ${
                  isCurrentCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-white text-slate-700 border-[#d1d7dc] hover:bg-slate-100'
                }`}
              >
                <Icon
                  name={isCurrentCompleted ? 'check_circle' : 'radio_button_unchecked'}
                  size={15}
                  fill={isCurrentCompleted}
                  className={isCurrentCompleted ? 'text-emerald-600' : 'text-slate-400'}
                />
                <span>{isCurrentCompleted ? 'Completed' : 'Mark complete'}</span>
              </button>

              {/* Next Lecture */}
              <button
                type="button"
                disabled={currentIndex >= allLessons.length - 1}
                onClick={handleNextLesson}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#2d2f31] hover:bg-black text-white text-xs font-bold disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors shadow-2xs"
              >
                <span>Next</span>
                <Icon name="arrow_forward" size={14} />
              </button>
            </div>
          </div>

          {/* 2C. UDEMY BOTTOM TABS (Overview, Q&A, Notes, Announcements, Reviews, Resources) */}
          <div id="lesson-tabs-section" className="flex-1 p-4 sm:p-8 max-w-5xl">
            <LessonTabs
              courseId={course?.id}
              lessonId={activeLesson?.id}
              lessonTitle={activeLesson?.title || course?.title || 'Lecture Details'}
              instructorName={course?.instructor?.name || 'Faculty Lead'}
              instructorRole={course?.instructor?.bio || 'Distinguished Instructor'}
              instructorAvatar={course?.instructor?.avatar || ''}
              resources={activeResources}
              activeTab={playerTab}
              onTabChange={(tab) => {
                setPlayerTab(tab);
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', `#${tab}`);
                }
              }}
            />
          </div>
        </div>

        {/* 2D. UDEMY RIGHT SIDEBAR: "Course content" (Desktop) */}
        {isSidebarOpen && (
          <aside className="w-[360px] lg:w-[400px] border-l border-[#d1d7dc] bg-white h-full hidden lg:flex flex-col shrink-0 shadow-xs z-20 select-none">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-[#d1d7dc] flex items-center justify-between bg-white">
              <span className="font-extrabold text-base text-[#2d2f31]">Course content</span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                title="Close course content"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Sidebar Sub-Header / Stats */}
            <div className="px-4 py-2 bg-[#f7f9fa] border-b border-[#d1d7dc] text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>{allSections.length} sections • {allLessons.length} lectures</span>
              <span>{completedLessonIds.length} completed</span>
            </div>

            {/* Accordion of Sections */}
            <div className="overflow-y-auto flex-1 divide-y divide-[#d1d7dc]">
              {allSections.map((sec: any, sIdx: number) => {
                const isExpanded = expandedSectionIds.includes(sec.id);
                const secLessons = sec.lessons || [];
                const secCompletedCount = secLessons.filter((l: any) => completedLessonIds.includes(l.id)).length;

                return (
                  <div key={sec.id} className="border-b border-[#d1d7dc]">
                    {/* Section Header Accordion Button */}
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className="w-full px-4 py-3.5 flex justify-between items-start bg-[#f7f9fa] hover:bg-[#e4e8eb] text-left transition-colors cursor-pointer"
                    >
                      <div className="flex-1 pr-2">
                        <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider mb-0.5">
                          Section {sIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#2d2f31] block leading-snug">
                          {sec.title}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          {secCompletedCount} / {secLessons.length} completed
                        </span>
                      </div>
                      <Icon
                        name={isExpanded ? 'expand_less' : 'expand_more'}
                        size={18}
                        className="text-slate-600 mt-0.5"
                      />
                    </button>

                    {/* Section Lectures List */}
                    {isExpanded && (
                      <div className="divide-y divide-[#d1d7dc]/40 bg-white">
                        {secLessons.map((les: any, lIdx: number) => {
                          const isCompleted = completedLessonIds.includes(les.id);
                          const isActive = activeLessonId === les.id;
                          const hasResources = !!(les.pdfUrl || les.fileUrl);

                          return (
                            <div
                              key={les.id}
                              className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-[#f7f9fa] border-l-4 border-l-[#2d2f31]'
                                  : 'hover:bg-[#f7f9fa]'
                              }`}
                            >
                              {/* Left: Square Checkbox */}
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleLessonComplete(les.id);
                                }}
                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2d2f31] focus:ring-0 cursor-pointer shrink-0"
                                title={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                              />

                              {/* Center: Title & Type Icon + Duration */}
                              <div
                                className="flex-1 min-w-0"
                                onClick={() => handleSelectLesson(les.id)}
                              >
                                <span
                                  className={`text-xs block leading-snug truncate ${
                                    isActive
                                      ? 'font-bold text-[#2d2f31]'
                                      : 'text-slate-800 hover:text-black font-medium'
                                  }`}
                                >
                                  {lIdx + 1}. {les.title}
                                </span>

                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Icon
                                      name={
                                        les.type === 'QUIZ'
                                          ? 'quiz'
                                          : les.type === 'PDF'
                                          ? 'picture_as_pdf'
                                          : les.type === 'TEXT'
                                          ? 'article'
                                          : 'movie'
                                      }
                                      size={12}
                                      className="text-slate-500"
                                    />
                                    <span>{les.duration || '10:00'}</span>
                                  </span>

                                  {hasResources && (
                                    <span className="text-indigo-600 font-bold text-[10px]">
                                      • 📁 Resource
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right: Resources Dropdown Pill */}
                              {hasResources && (
                                <div className="relative shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenResourceMenuId(openResourceMenuId === les.id ? null : les.id);
                                    }}
                                    className="px-2 py-1 border border-slate-200 hover:border-slate-400 bg-white rounded text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Download lecture resources"
                                  >
                                    <span>Resources</span>
                                    <Icon name="expand_more" size={12} />
                                  </button>

                                  {openResourceMenuId === les.id && (
                                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-md shadow-xl border border-[#d1d7dc] p-2 space-y-1.5 z-40 animate-in fade-in duration-100">
                                      {les.pdfUrl && (
                                        <a
                                          href={les.pdfUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          download
                                          className="block p-1.5 text-xs text-slate-700 hover:text-indigo-700 hover:bg-slate-50 rounded font-semibold truncate"
                                        >
                                          📑 Download PDF Handout
                                        </a>
                                      )}
                                      {les.fileUrl && (
                                        <a
                                          href={les.fileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          download
                                          className="block p-1.5 text-xs text-slate-700 hover:text-indigo-700 hover:bg-slate-50 rounded font-semibold truncate"
                                        >
                                          📄 Download Attached File
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* 3. MOBILE CURRICULUM SLIDE-OVER DRAWER (< lg) */}
      {isMobileCurriculumOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-5/6 max-w-sm bg-white h-full overflow-y-auto flex flex-col shadow-2xl border-l border-[#d1d7dc] text-slate-900">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#d1d7dc] flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-bold text-[#2d2f31]">Course content</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {completedLessonIds.length} of {allLessons.length} completed ({progressPercent}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCurriculumOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Close curriculum"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-200">
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Sections List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#d1d7dc]">
              {allSections.map((sec: any, sIdx: number) => {
                const isExpanded = expandedSectionIds.includes(sec.id);
                const secLessons = sec.lessons || [];

                return (
                  <div key={sec.id} className="border-b border-[#d1d7dc]">
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className="w-full px-4 py-3 flex justify-between items-center bg-[#f7f9fa] text-left hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider mb-0.5">
                          Section {sIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#2d2f31]">{sec.title}</span>
                      </div>
                      <Icon
                        name={isExpanded ? 'expand_less' : 'expand_more'}
                        size={18}
                        className="text-slate-600"
                      />
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-[#d1d7dc]/40 bg-white">
                        {secLessons.map((les: any, lIdx: number) => {
                          const isCompleted = completedLessonIds.includes(les.id);
                          const isActive = activeLessonId === les.id;

                          return (
                            <div
                              key={les.id}
                              onClick={() => {
                                handleSelectLesson(les.id);
                                setIsMobileCurriculumOpen(false);
                              }}
                              className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-[#f7f9fa] border-l-4 border-l-[#2d2f31]'
                                  : 'hover:bg-[#f7f9fa]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleLessonComplete(les.id);
                                }}
                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2d2f31] focus:ring-0 cursor-pointer shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span
                                  className={`text-xs block leading-snug truncate ${
                                    isActive ? 'font-bold text-[#2d2f31]' : 'text-slate-800'
                                  }`}
                                >
                                  {lIdx + 1}. {les.title}
                                </span>
                                <span className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Icon name="movie" size={12} />
                                  <span>{les.duration || '10:00'}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Verified Certificate Modal */}
      <CertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        certificate={{
          certificateNumber: certificateData?.certificateNumber || course?.certificates?.[0]?.certificateNumber,
          courseTitle: course?.title,
          studentName: currentUser?.name || 'Verified Student',
          instructorName: course?.instructor?.name,
          issuedAt: certificateData?.issuedAt || new Date().toISOString()
        }}
      />
    </div>
  );
}
