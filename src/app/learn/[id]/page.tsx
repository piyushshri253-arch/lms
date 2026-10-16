'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { QuizPlayer } from '@/components/player/QuizPlayer';
import { ArticlePlayer } from '@/components/player/ArticlePlayer';
import { LessonTabs, PlayerTab } from '@/components/player/LessonTabs';
import { Icon } from '@/components/ui/Icon';
import { AiLessonTutorDrawer } from '@/components/player/AiLessonTutorDrawer';
import { CertificateModal } from '@/components/student/CertificateModal';
import { useApp } from '@/context/AppContext';
import confetti from 'canvas-confetti';
import { cleanSectionTitle, cleanLessonTitle, generateCurriculumDisplayMap } from '@/lib/course-formatting';

export default function LearnPlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, isLoadingUser, showToast } = useApp();

  const courseSlug = (params?.id as string) || (params?.slug as string) || '';
  const initialLessonId = searchParams.get('lessonId') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [activeLessonId, setActiveLessonId] = useState<string>(initialLessonId);
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [playerTab, setPlayerTab] = useState<PlayerTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileCurriculumOpen, setIsMobileCurriculumOpen] = useState(false);
  const [isProgressDropdownOpen, setIsProgressDropdownOpen] = useState(false);
  const [openResourceMenuId, setOpenResourceMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoPlayNextEnabled, setAutoPlayNextEnabled] = useState(true);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  // Close resource dropdowns on click outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.resource-dropdown-container')) {
        setOpenResourceMenuId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Helper to download lecture article notes as an editable Microsoft Word .doc file
  const downloadArticleAsDoc = (title: string, content: string) => {
    if (!content || !content.trim()) return;
    const cleanTitle = (title || 'Lecture Notes').trim();

    const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${cleanTitle}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      margin: 1in;
      size: A4;
    }
    body {
      font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 32px;
    }
    h1 {
      color: #0f172a;
      font-size: 20pt;
      font-weight: bold;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .meta {
      color: #64748b;
      font-size: 10pt;
      margin-bottom: 24px;
    }
    .content {
      font-size: 11.5pt;
      line-height: 1.75;
      color: #334155;
    }
  </style>
</head>
<body>
  <h1>${cleanTitle}</h1>
  <div class="meta">Lecture Study Notes &amp; Handout • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
  <div class="content">${content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')}</div>
</body>
</html>`;

    const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = cleanTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
    a.download = `${safeFilename || 'Lecture'}_Notes.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Sync tab with URL hash if present (#overview, #notes, etc.)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['overview', 'notes', 'bookmarks', 'discussion', 'assignments', 'resources', 'reviews', 'announcements'].includes(hash)) {
        setPlayerTab(hash as PlayerTab);
      }
    }
  }, []);

  // Fetch live course from database
  const fetchLiveCourse = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseSlug}`);
      if (res.ok) {
        const data = await res.json();
        const c = data.course;
        setCourse(c);

        // Check enrollment / privileged status
        const userIsEnrolled = Boolean(
          data.isEnrolled ||
          currentUser?.role === 'SUPER_ADMIN' ||
          currentUser?.role === 'ADMIN' ||
          currentUser?.role === 'REVIEWER' ||
          (currentUser && c.instructorId === currentUser.id) ||
          c.price === 0 ||
          !c.price
        );
        setIsEnrolled(userIsEnrolled);

        const allLessonsList = c.sections?.flatMap((s: any) => s.lessons) || [];

        // Select initial lesson:
        // If not enrolled, prefer the first free preview lesson if initialLessonId is not specified
        if (!activeLessonId && allLessonsList.length > 0) {
          if (!userIsEnrolled) {
            const firstFree = allLessonsList.find((l: any) => l.isFree);
            setActiveLessonId(firstFree ? firstFree.id : allLessonsList[0].id);
          } else {
            const firstAccessible = allLessonsList.find((l: any) => !l.versionLocked);
            setActiveLessonId(firstAccessible ? firstAccessible.id : allLessonsList[0].id);
          }
        }

        if (c.sections && c.sections.length > 0) {
          // Expand all modules by default so full curriculum is immediately accessible
          setExpandedSectionIds(c.sections.map((s: any) => s.id));
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
      fetchLiveCourse();
    }
  }, [courseSlug, isLoadingUser, currentUser]);

  const allSections = course?.sections || [];
  const allLessons = allSections.flatMap((s: any) => s.lessons) || [];
  const lessonDisplayMap = useMemo(() => generateCurriculumDisplayMap(allSections), [allSections]);
  const activeLesson = allLessons.find((l: any) => l.id === activeLessonId) || allLessons[0] || null;
  const activeSection = allSections.find((s: any) => s.lessons?.some((l: any) => l.id === activeLesson?.id)) || allSections[0] || null;

  // Active media sub-tab if lesson has multiple contents (Video, Article, Quiz, PDF)
  const [activeMediaMode, setActiveMediaMode] = useState<'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF' | null>(null);

  useEffect(() => {
    setActiveMediaMode(null);
    // Ensure section containing active lesson is expanded
    if (activeSection?.id) {
      setExpandedSectionIds((prev) => prev.includes(activeSection.id) ? prev : [...prev, activeSection.id]);
    }
  }, [activeLessonId, activeSection?.id]);

  const hasValidVideo = Boolean(
    activeLesson?.videoUrl &&
    !activeLesson.videoUrl.startsWith('blob:') &&
    activeLesson.videoUrl.trim().length > 0
  );

  const hasQuizQuestions = useMemo(() => {
    if (!activeLesson?.quizData) return false;
    try {
      const q = typeof activeLesson.quizData === 'string' ? JSON.parse(activeLesson.quizData) : activeLesson.quizData;
      return Array.isArray(q?.questions) && q.questions.length > 0;
    } catch {
      return false;
    }
  }, [activeLesson?.quizData]);

  const hasArticleContent = Boolean(
    activeLesson?.content && activeLesson.content.trim().length > 0
  );

  const hasPdfContent = Boolean(
    activeLesson?.pdfUrl && activeLesson.pdfUrl.trim().length > 0
  );

  // Determine primary/effective lesson content mode
  const effectiveLessonType = useMemo<'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF'>(() => {
    // If the lecture has a video, the main theater player stage is ALWAYS the video.
    // Supplementary materials (Article .doc, PDF) are accessed via the 📁 Resources folder dropdown.
    if (hasValidVideo) {
      if (activeMediaMode === 'QUIZ' && hasQuizQuestions) return 'QUIZ';
      return 'VIDEO';
    }
    if (activeMediaMode) return activeMediaMode;
    if (activeLesson?.type === 'QUIZ' || hasQuizQuestions) return 'QUIZ';
    if (activeLesson?.type === 'TEXT' || hasArticleContent) return 'TEXT';
    if (activeLesson?.type === 'PDF' || hasPdfContent) return 'PDF';
    return (activeLesson?.type as any) || 'VIDEO';
  }, [activeMediaMode, activeLesson, hasValidVideo, hasQuizQuestions, hasArticleContent, hasPdfContent]);

  // Multiple content types count for switcher tabs
  const availableContentTypes = useMemo(() => {
    const list: Array<{ id: 'VIDEO' | 'TEXT' | 'QUIZ' | 'PDF'; label: string; icon: string }> = [];
    if (hasValidVideo) list.push({ id: 'VIDEO', label: 'Video Lecture', icon: 'movie' });
    if (hasArticleContent) list.push({ id: 'TEXT', label: 'Article / Notes', icon: 'article' });
    if (hasQuizQuestions) list.push({ id: 'QUIZ', label: 'Quiz Assessment', icon: 'quiz' });
    if (hasPdfContent) list.push({ id: 'PDF', label: 'PDF Handout', icon: 'picture_as_pdf' });
    return list;
  }, [hasValidVideo, hasArticleContent, hasQuizQuestions, hasPdfContent]);

  const finalAssignmentLesson = useMemo(() => {
    return allLessons.find((l: any) =>
      Boolean(l.isFinalAssignment) ||
      (l.type === 'QUIZ' && /final\s+assignment/i.test(l.title || ''))
    ) || null;
  }, [allLessons]);

  const hasPassedFinalAssignment = useMemo(() => {
    if (!finalAssignmentLesson) return true;
    return completedLessonIds.includes(finalAssignmentLesson.id);
  }, [finalAssignmentLesson, completedLessonIds]);

  const isCurrentFinalAssignment = useMemo(() => {
    if (!activeLesson) return false;
    return Boolean(
      activeLesson.isFinalAssignment ||
      (activeLesson.type === 'QUIZ' && /final\s+assignment/i.test(activeLesson.title || ''))
    );
  }, [activeLesson]);

  const currentIndex = allLessons.findIndex((l: any) => l.id === activeLesson?.id);
  const isCurrentCompleted = activeLesson?.id ? completedLessonIds.includes(activeLesson.id) : false;

  // Is current lesson locked for this student?
  const isCurrentLocked = Boolean((!isEnrolled && !activeLesson?.isFree) || activeLesson?.versionLocked);

  // Calculate total course duration string
  const totalCourseDurationFormatted = useMemo(() => {
    let totalMinutes = 0;
    allLessons.forEach((les: any) => {
      if (les.duration) {
        const parts = String(les.duration).split(':');
        if (parts.length === 2) {
          totalMinutes += parseInt(parts[0], 10) || 0;
        } else if (parts.length === 3) {
          totalMinutes += (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        } else {
          totalMinutes += parseInt(String(les.duration), 10) || 10;
        }
      } else {
        totalMinutes += 15;
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${hours} hr ${mins > 0 ? `${mins} min` : ''} total`;
    }
    return `${mins} min total`;
  }, [allLessons]);

  // Filtered sections and lessons when student searches
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return allSections;
    const q = searchQuery.toLowerCase().trim();
    return allSections
      .map((sec: any) => {
        const matchedLessons = (sec.lessons || []).filter((l: any) => {
          const itemInfo = lessonDisplayMap.get(l.id);
          const sTitle = itemInfo?.sidebarTitle || l.title || '';
          return (
            (l.title && l.title.toLowerCase().includes(q)) ||
            sTitle.toLowerCase().includes(q) ||
            (sec.title && sec.title.toLowerCase().includes(q))
          );
        });
        return { ...sec, lessons: matchedLessons };
      })
      .filter((sec: any) => sec.lessons && sec.lessons.length > 0);
  }, [allSections, searchQuery, lessonDisplayMap]);

  const toggleSection = (id: string) => {
    setExpandedSectionIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSelectLesson = (lessonId: string, autoPlay = false) => {
    setShouldAutoPlay(autoPlay);
    setActiveLessonId(lessonId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?lessonId=${lessonId}#${playerTab}`);
    }
    const targetSection = allSections.find((sec: any) =>
      (sec.lessons || []).some((l: any) => l.id === lessonId)
    );
    if (targetSection) {
      setExpandedSectionIds((prev) =>
        prev.includes(targetSection.id) ? prev : [...prev, targetSection.id]
      );
    }
  };

  const handleNextLesson = () => {
    if (currentIndex < allLessons.length - 1) {
      handleSelectLesson(allLessons[currentIndex + 1].id, true);
    }
  };

  const handlePrevLesson = () => {
    if (currentIndex > 0) {
      handleSelectLesson(allLessons[currentIndex - 1].id, false);
    }
  };

  // Mark lesson as completed without toggling (idempotent - safe for auto-triggers like video completion)
  const isMarkingCompleteRef = React.useRef<Record<string, boolean>>({});
  const handleMarkLessonComplete = async (targetLessonId?: string) => {
    const lId = targetLessonId || activeLesson?.id;
    if (!lId || !isEnrolled) return;
    if (completedLessonIds.includes(lId) || isMarkingCompleteRef.current[lId]) return;

    isMarkingCompleteRef.current[lId] = true;
    try {
      const res = await fetch(`/api/lessons/${lId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.completedLessonIds) setCompletedLessonIds(data.completedLessonIds);
        else setCompletedLessonIds((prev) => [...prev, lId]);
        if (data.progressPercent !== undefined) setProgressPercent(data.progressPercent);
        if (data.certificate) {
          setCertificateData(data.certificate);
          setIsCertificateOpen(true);
          confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
          showToast({ title: 'Course Completed! 🎉', description: 'Your verified certificate is ready.', type: 'success' });
        } else {
          showToast({ title: 'Lecture Completed ✓', type: 'info' });
        }
      }
    } catch {
      // Silently handle
    } finally {
      setTimeout(() => {
        delete isMarkingCompleteRef.current[lId];
      }, 1000);
    }
  };

  // Automatically advance to the next lecture when the current video finishes
  const handleVideoEnded = async () => {
    const currentId = activeLesson?.id;
    if (currentId && isEnrolled && !completedLessonIds.includes(currentId)) {
      await handleMarkLessonComplete(currentId);
    }

    if (autoPlayNextEnabled && currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      const nextTitle = lessonDisplayMap.get(nextLesson.id)?.underPlayerTitle || nextLesson.title || 'Next Lecture';
      showToast({
        title: 'Opening Next Lecture 🎬',
        description: nextTitle,
        type: 'info'
      });
      handleSelectLesson(nextLesson.id, true);
    } else if (currentIndex >= allLessons.length - 1) {
      showToast({
        title: 'Course Completed! 🎉',
        description: 'You have finished all lectures in this course.',
        type: 'success'
      });
    }
  };

  // Automatically advance to the next lecture after student passes a quiz
  const handleQuizAdvance = () => {
    const currentId = activeLesson?.id;
    if (currentId && !completedLessonIds.includes(currentId)) {
      handleMarkLessonComplete(currentId);
    }
    if (currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      const nextTitle = lessonDisplayMap.get(nextLesson.id)?.underPlayerTitle || nextLesson.title || 'Next Lecture';
      showToast({
        title: 'Quiz Passed! 🎯',
        description: `Advancing to ${nextTitle}`,
        type: 'success'
      });
      handleSelectLesson(nextLesson.id, true);
    } else {
      showToast({
        title: 'Course Completed! 🎉',
        description: 'You have finished all curriculum items in this course.',
        type: 'success'
      });
    }
  };

  // Automatically advance to the next lecture after student marks an article/reading guide as read
  const handleArticleAdvance = async () => {
    const currentId = activeLesson?.id;
    if (currentId && isEnrolled && !completedLessonIds.includes(currentId)) {
      await handleMarkLessonComplete(currentId);
    }

    if (currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      const nextTitle =
        lessonDisplayMap.get(nextLesson.id)?.underPlayerTitle || nextLesson.title || 'Next Lecture';
      showToast({
        title: 'Article Completed ✓',
        description: `Advancing to ${nextTitle}`,
        type: 'success'
      });
      setTimeout(() => {
        handleSelectLesson(nextLesson.id, true);
      }, 350);
    } else {
      showToast({
        title: 'Course Completed! 🎉',
        description: 'You have finished all curriculum items in this course.',
        type: 'success'
      });
    }
  };

  const isTogglingRef = React.useRef(false);
  const handleToggleLessonComplete = async (targetLessonId?: string) => {
    const lId = targetLessonId || activeLesson?.id;
    if (!lId) return;

    if (!isEnrolled) {
      showToast({
        title: 'Enrollment Required',
        description: 'Please enroll in the course to save lecture completion progress.',
        type: 'info'
      });
      return;
    }

    if (isTogglingRef.current) return;
    isTogglingRef.current = true;

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
    } finally {
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 500);
    }
  };

  // Build active resources list for current lecture & course
  const activeLessonHasPdf = Boolean(activeLesson?.pdfUrl && activeLesson.pdfUrl.trim().length > 0);
  const activeLessonHasFile = Boolean(activeLesson?.fileUrl && activeLesson.fileUrl.trim().length > 0);
  const activeLessonHasArticleDoc = Boolean(activeLesson?.content && activeLesson.content.trim().length > 0);
  const activeLessonCustomResources: any[] = Array.isArray(activeLesson?.resourcesList) ? activeLesson.resourcesList : [];
  const activeLessonHasResources = activeLessonHasPdf || activeLessonHasFile || activeLessonHasArticleDoc || activeLessonCustomResources.length > 0;

  const activeResources = [
    ...(activeLessonHasArticleDoc ? [{ name: `${activeLesson.title} (Study Notes .doc)`, url: '#doc', isDocArticle: true }] : []),
    ...activeLessonCustomResources.map((r: any) => ({
      name: r.name,
      url: r.url,
      type: r.type,
      size: r.sizeBytes ? `${Math.round(r.sizeBytes / 1024)} KB` : undefined
    })),
    // Fallback if resourcesList is empty but legacy pdfUrl / fileUrl exist
    ...(activeLessonCustomResources.length === 0 && activeLessonHasPdf ? [{ name: `${activeLesson.title} (PDF Handout)`, url: activeLesson.pdfUrl }] : []),
    ...(activeLessonCustomResources.length === 0 && activeLessonHasFile ? [{ name: `${activeLesson.title} (Downloadable Resource)`, url: activeLesson.fileUrl }] : []),
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
        {/* Left: Brand Icon + Back to Course / My learning + Course Title */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <Link
            href={isEnrolled ? "/student/learning" : `/courses/${courseSlug}`}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors py-1.5 px-2 rounded hover:bg-white/10 shrink-0 cursor-pointer"
            title={isEnrolled ? "Back to My learning" : "Back to Course Page"}
          >
            <Icon name="arrow_back" size={16} />
            <span className="hidden sm:inline">{isEnrolled ? "My learning" : "Course overview"}</span>
          </Link>

          <div className="h-4 w-[1px] bg-slate-700 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <h1
              className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md lg:max-w-lg cursor-default"
              title={course?.title}
            >
              {course?.title || 'Course Player'}
            </h1>
            {!isEnrolled && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold tracking-wide uppercase shrink-0 border border-amber-500/30">
                <Icon name="visibility" size={12} />
                Preview Mode
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (Enroll CTA or Progress, Rating, Share, Sidebar Toggle) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* If NOT Enrolled: Show High-Converting Enroll Button */}
          {!isEnrolled ? (
            <Link
              href={`/courses/${courseSlug}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a435f0] hover:bg-[#8710d8] text-white rounded font-extrabold text-xs transition-colors shadow-sm cursor-pointer"
              title="Enroll to get full lifetime access and certificate"
            >
              <Icon name="shopping_cart" size={14} />
              <span>Enroll Now • ₹{course?.price ? Number(course.price).toLocaleString('en-IN') : 'Free'}</span>
            </Link>
          ) : (
            <>
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
                    {progressPercent >= 100 && hasPassedFinalAssignment ? (
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
                    ) : finalAssignmentLesson && !hasPassedFinalAssignment ? (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left">
                          <p className="font-bold flex items-center gap-1">
                            <Icon name="lock" size={14} className="text-amber-700" />
                            <span>Certificate Locked</span>
                          </p>
                          <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                            Pass the mandatory Final Assignment ({finalAssignmentLesson.title || 'Final Assignment'}) to unlock your certificate.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveLessonId(finalAssignmentLesson.id);
                            setIsProgressDropdownOpen(false);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                        >
                          <span>Take Final Assignment</span>
                          <Icon name="arrow_forward" size={13} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Complete all lectures to claim your verified certificate of completion.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

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
            lessonTitle={lessonDisplayMap.get(activeLesson?.id)?.underPlayerTitle || activeLesson?.title}
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

      {/* 2. MAIN BODY (Theater Stage + Navigation + Tabs + Course Content Sidebar on the RIGHT) */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)] bg-[#f7f9fa]">
        {/* Left Column: Video Theater Stage + Navigation + Bottom Tabs */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-white">
          {/* 2A. CINEMA THEATER STAGE (Responsive 16:9 Black Container) */}
          <div
            className={`w-full bg-black flex items-center justify-center relative shrink-0 ${
              effectiveLessonType === 'QUIZ' || effectiveLessonType === 'TEXT' || effectiveLessonType === 'PDF'
                ? 'min-h-[480px] py-6 sm:py-10 px-4 bg-slate-950'
                : 'min-h-[260px] sm:min-h-[380px] md:min-h-[460px] lg:min-h-[520px] max-h-[78vh]'
            }`}
          >
            {/* If lesson is LOCKED (version locked or unenrolled & !isFree) */}
            {isCurrentLocked ? (
              activeLesson?.versionLocked ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-5 bg-gradient-to-b from-[#1c1d1f] to-black z-20 select-none">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-lg">
                    <Icon name="lock" size={32} />
                  </div>
                  <div className="space-y-2 max-w-lg">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                      <span>Version Update • {activeLesson.requiredVersionLabel || 'v2.0'}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-white tracking-tight">
                      This lecture is exclusive to {activeLesson.requiredVersionLabel || 'Version 2.0'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      You are currently enrolled in <strong>{course?.userVersionInfo?.enrolledVersionLabel || 'Version 1.0'}</strong> of {course?.title}. To access newly added lectures, videos, and materials, upgrade your course access to {activeLesson.requiredVersionLabel || 'Version 2.0'}.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Link
                      href={`/courses/${courseSlug}`}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-[#a435f0] hover:opacity-90 text-white rounded font-extrabold text-sm transition-opacity shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Icon name="bolt" size={16} />
                      <span>Upgrade to {activeLesson.requiredVersionLabel || 'Version 2.0'} (₹{course?.price ? Number(course.price).toLocaleString('en-IN') : '0'})</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-5 bg-gradient-to-b from-[#1c1d1f] to-black z-20 select-none">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-lg">
                    <Icon name="lock" size={32} />
                  </div>
                  <div className="space-y-2 max-w-lg">
                    <h3 className="text-xl font-extrabold text-white tracking-tight">
                      This lecture is part of the full curriculum
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Enroll in <strong>{course?.title}</strong> to unlock all {allSections.length} modules, {allLessons.length} lectures, downloadable resources, and your verified certificate of completion.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Link
                      href={`/courses/${courseSlug}`}
                      className="px-6 py-2.5 bg-[#a435f0] hover:bg-[#8710d8] text-white rounded font-extrabold text-sm transition-colors shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Icon name="shopping_cart" size={16} />
                      <span>Enroll Now — ₹{course?.price ? Number(course.price).toLocaleString('en-IN') : 'Free'}</span>
                    </Link>

                    {allLessons.some((l: any) => l.isFree) && (
                      <button
                        type="button"
                        onClick={() => {
                          const freeLes = allLessons.find((l: any) => l.isFree);
                          if (freeLes) handleSelectLesson(freeLes.id);
                        }}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded font-bold text-xs transition-colors border border-white/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Icon name="play_arrow" size={16} />
                        <span>Watch Free Preview (Lecture 1.1)</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            ) : effectiveLessonType === 'QUIZ' ? (
              <div className="w-full max-w-4xl p-2 sm:p-4 my-2">
                <QuizPlayer
                  key={activeLesson?.id}
                  title={activeLesson?.title || (isCurrentFinalAssignment ? 'Final Assignment' : 'Lecture Quiz')}
                  lessonId={activeLesson?.id}
                  quizData={activeLesson?.quizData}
                  isFinalAssignment={isCurrentFinalAssignment}
                  onPass={() => {
                    handleMarkLessonComplete(activeLesson?.id);
                    if (isCurrentFinalAssignment) {
                      confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
                    }
                  }}
                  onAutoAdvanceNext={handleQuizAdvance}
                  onClaimCertificate={() => {
                    setIsCertificateOpen(true);
                    confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
                  }}
                />
              </div>
            ) : effectiveLessonType === 'TEXT' || effectiveLessonType === 'PDF' ? (
              <div className="w-full max-w-4xl p-4 sm:p-6 my-4">
                <ArticlePlayer
                  title={activeLesson?.title || 'Lecture Guide'}
                  lessonId={activeLesson?.id}
                  type={effectiveLessonType === 'PDF' ? 'PDF' : 'TEXT'}
                  content={activeLesson?.content}
                  pdfUrl={activeLesson?.pdfUrl}
                  fileUrl={activeLesson?.fileUrl}
                  allowDownload={Boolean(activeLesson?.allowDownload)}
                  duration={activeLesson?.duration}
                  isCompleted={isCurrentCompleted}
                  hasNextLesson={currentIndex < allLessons.length - 1}
                  nextLessonTitle={
                    currentIndex < allLessons.length - 1
                      ? lessonDisplayMap.get(allLessons[currentIndex + 1].id)?.underPlayerTitle || allLessons[currentIndex + 1].title
                      : undefined
                  }
                  onComplete={handleArticleAdvance}
                />
              </div>
            ) : (
              <div className="w-full max-w-[1280px] aspect-video max-h-[78vh] mx-auto flex items-center justify-center relative">
                {activeLesson?.isFree && !isEnrolled && (
                  <div className="absolute top-4 left-4 z-30 bg-purple-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-extrabold text-white shadow-md flex items-center gap-1.5 pointer-events-none">
                    <Icon name="visibility" size={13} />
                    <span>Free Preview Lecture</span>
                  </div>
                )}
                <VideoPlayer
                  key={activeLesson?.id}
                  title={activeLesson?.title || course?.title || 'Lecture Video'}
                  videoUrl={hasValidVideo ? activeLesson?.videoUrl : null}
                  lessonId={activeLesson?.id || undefined}
                  thumbnail={course?.thumbnail || ''}
                  duration={activeLesson?.duration || '10:00'}
                  isFree={!!activeLesson?.isFree}
                  autoPlay={shouldAutoPlay}
                  onLessonComplete={() => handleMarkLessonComplete(activeLesson?.id)}
                  onVideoEnded={handleVideoEnded}
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

            {/* Current Lecture Title & Module */}
            <div className="text-center min-w-0 flex-1 px-2">
              <span className="text-xs sm:text-sm font-extrabold text-[#2d2f31] truncate block">
                {lessonDisplayMap.get(activeLesson?.id)?.underPlayerTitle || activeLesson?.title || 'Lecture'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {activeLesson?.duration || (lessonDisplayMap.get(activeLesson?.id)?.isArticle ? 'Article' : '10:00')} • {activeSection ? `Module ${(allSections.indexOf(activeSection) + 1)}: ${cleanSectionTitle(activeSection.title, allSections.indexOf(activeSection) + 1)}` : 'Curriculum'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Active Lecture 📁 Resources Dropdown (Doc notes, PDF, etc.) */}
              {activeLessonHasResources && (
                <div className="relative resource-dropdown-container">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenResourceMenuId(openResourceMenuId === 'active_under_player' ? null : 'active_under_player');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                      openResourceMenuId === 'active_under_player'
                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                        : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900'
                    }`}
                    title="Download lecture resources (.doc notes, PDF, downloads)"
                  >
                    <span className="text-sm">📁</span>
                    <span>Resources</span>
                    <Icon name={openResourceMenuId === 'active_under_player' ? 'expand_less' : 'expand_more'} size={14} />
                  </button>

                  {openResourceMenuId === 'active_under_player' && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-[#d1d7dc] p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
                      <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                        <span>Lecture Resources</span>
                        <span>📁</span>
                      </div>

                      {activeLessonHasArticleDoc && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadArticleAsDoc(activeLesson.title, activeLesson.content);
                            showToast({ title: 'Downloading Notes', description: `${activeLesson.title} notes downloading as .doc...`, type: 'success' });
                          }}
                          className="w-full text-left p-2 text-xs text-slate-800 hover:text-blue-700 hover:bg-blue-50/70 rounded-lg font-semibold flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <span className="text-base leading-none">📝</span>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-bold text-slate-900">Download Article (.doc)</div>
                            <div className="text-[10px] text-slate-500 font-normal">Editable Word document</div>
                          </div>
                          <Icon name="download" size={14} className="text-slate-400 shrink-0" />
                        </button>
                      )}

                      {/* Multiple Attached Resources (PDF, DOC, IMAGE, LINK, ZIP) */}
                      {activeLessonCustomResources.length > 0 ? (
                        activeLessonCustomResources.map((res: any) => {
                          const isPdf = res.type === 'PDF' || res.url?.toLowerCase().endsWith('.pdf');
                          const isDoc = res.type === 'DOC' || res.url?.toLowerCase().match(/\.(doc|docx|txt|rtf)$/);
                          const isImage = res.type === 'IMAGE' || res.url?.toLowerCase().match(/\.(png|jpg|jpeg|webp|svg)$/);
                          const isLink = res.type === 'LINK' || res.url?.startsWith('http');
                          const isZip = res.type === 'ZIP' || res.url?.toLowerCase().endsWith('.zip');

                          const iconEmoji = isPdf ? '📑' : isDoc ? '📝' : isImage ? '🖼️' : isZip ? '📦' : isLink ? '🔗' : '📎';
                          const typeLabel = isPdf ? 'PDF Document' : isDoc ? 'Word Document' : isImage ? 'Image' : isZip ? 'Zip Archive' : isLink ? 'Web Link' : 'Resource';

                          return (
                            <a
                              key={res.id}
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={!isLink}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-left p-2 text-xs text-slate-800 hover:text-indigo-700 hover:bg-indigo-50/70 rounded-lg font-semibold flex items-center gap-2.5 cursor-pointer transition-colors"
                            >
                              <span className="text-base leading-none">{iconEmoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-bold text-slate-900" title={res.name}>{res.name}</div>
                                <div className="text-[10px] text-slate-500 font-normal">{typeLabel}</div>
                              </div>
                              <Icon name={isLink ? 'open_in_new' : 'download'} size={14} className="text-slate-400 shrink-0" />
                            </a>
                          );
                        })
                      ) : (
                        <>
                          {activeLessonHasPdf && (
                            <a
                              href={activeLesson.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-left p-2 text-xs text-slate-800 hover:text-rose-700 hover:bg-rose-50/70 rounded-lg font-semibold flex items-center gap-2.5 cursor-pointer transition-colors"
                            >
                              <span className="text-base leading-none">📑</span>
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-bold text-slate-900">Download PDF Handout</div>
                                <div className="text-[10px] text-slate-500 font-normal">Slides &amp; reference guide</div>
                              </div>
                              <Icon name="open_in_new" size={14} className="text-slate-400 shrink-0" />
                            </a>
                          )}

                          {activeLessonHasFile && (
                            <a
                              href={activeLesson.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-left p-2 text-xs text-slate-800 hover:text-indigo-700 hover:bg-indigo-50/70 rounded-lg font-semibold flex items-center gap-2.5 cursor-pointer transition-colors"
                            >
                              <span className="text-base leading-none">📦</span>
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-bold text-slate-900">Download Attached File</div>
                                <div className="text-[10px] text-slate-500 font-normal">Project assets &amp; code</div>
                              </div>
                              <Icon name="download" size={14} className="text-slate-400 shrink-0" />
                            </a>
                          )}
                        </>
                      )}

                      {activeLessonHasArticleDoc && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayerTab('overview');
                            setOpenResourceMenuId(null);
                            const el = document.getElementById('lesson-tabs-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full text-left px-2 py-1.5 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded font-medium flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100 mt-1"
                        >
                          <Icon name="visibility" size={13} className="text-slate-500 shrink-0" />
                          <span>Read Notes in Overview tab</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mark Complete Checkbox / Button */}
              {isEnrolled && (
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
              )}

              {/* Autoplay Next Toggle */}
              <button
                type="button"
                onClick={() => setAutoPlayNextEnabled((prev) => !prev)}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                  autoPlayNextEnabled
                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                title={autoPlayNextEnabled ? 'Autoplay Next Lecture is ON' : 'Autoplay Next Lecture is OFF'}
              >
                <Icon
                  name={autoPlayNextEnabled ? 'play_circle' : 'pause_circle'}
                  size={15}
                  className={autoPlayNextEnabled ? 'text-purple-600' : 'text-slate-400'}
                />
                <span>Autoplay {autoPlayNextEnabled ? 'ON' : 'OFF'}</span>
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
              courseTitle={course?.title}
              courseSubtitle={course?.subtitle || "Learn how educators can use children's interests, questions and observations to develop responsive and meaningful learning experiences."}
              courseDescription={course?.description}
              whatYouWillLearn={course?.whatYouWillLearn}
              requirements={course?.requirements}
              targetAudience={course?.targetAudience}
              level={course?.level || 'Intermediate'}
              totalLectures={allLessons.length}
              totalDuration={totalCourseDurationFormatted}
              lessonId={activeLesson?.id}
              lessonTitle={lessonDisplayMap.get(activeLesson?.id)?.underPlayerTitle || activeLesson?.title || course?.title || 'Lecture Details'}
              lessonDescription={activeLesson?.description}
              lessonContent={activeLesson?.content}
              instructorName={course?.instructor?.name || 'Dr. Neha Kapoor'}
              instructorRole={course?.instructor?.bio || 'Inclusive Education Consultant & Diverse Learner Specialist'}
              instructorAvatar={course?.instructor?.avatar || ''}
              instructorBio={course?.instructor?.bio}
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

        {/* Floating Quick-Open Tab on Desktop when sidebar is closed */}
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#2d2f31] hover:bg-black text-white px-2.5 py-4 rounded-l-xl text-xs font-bold items-center gap-1.5 shadow-2xl border-l border-t border-b border-white/20 transition-all cursor-pointer"
            title="Open Course Content Sidebar"
          >
            <Icon name="chevron_left" size={16} />
            <span className="[writing-mode:vertical-rl] tracking-wider uppercase text-[10px]">Course content</span>
          </button>
        )}

        {/* Mobile floating button to view course curriculum drawer */}
        <button
          type="button"
          onClick={() => setIsMobileCurriculumOpen(true)}
          className="lg:hidden fixed bottom-6 right-5 z-40 bg-[#2d2f31] hover:bg-black text-white px-4 py-3 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl border border-white/20 cursor-pointer animate-in fade-in"
        >
          <Icon name="menu_book" size={16} />
          <span>Curriculum ({allLessons.length})</span>
        </button>

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

            {/* Sidebar Search Bar */}
            <div className="px-4 py-2.5 bg-white border-b border-[#d1d7dc]">
              <div className="relative">
                <Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search course content..."
                  className="w-full pl-8 pr-7 py-1.5 bg-[#f7f9fa] border border-[#d1d7dc] rounded text-xs text-slate-900 focus:outline-none focus:border-[#2d2f31]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar Sub-Header / Stats */}
            <div className="px-4 py-2 bg-[#f7f9fa] border-b border-[#d1d7dc] text-[11px] text-slate-500 font-semibold flex items-center justify-between">
              <span>{allSections.length} modules • {allLessons.length} lectures</span>
              <span>{totalCourseDurationFormatted}</span>
            </div>

            {/* Version Update Notice Banner */}
            {course?.userVersionInfo?.hasUpdateAvailable && (
              <div className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-purple-500/10 border-b border-amber-300">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold text-sm">✨</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 leading-snug">
                      New {course.userVersionInfo.liveVersionLabel} Available!
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      You own {course.userVersionInfo.enrolledVersionLabel}. New lectures require upgrade.
                    </p>
                    <Link
                      href={`/courses/${courseSlug}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black text-[#a435f0] hover:text-[#8710d8]"
                    >
                      <span>Upgrade Course Access</span>
                      <Icon name="arrow_forward" size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Accordion of Modules */}
            <div className="overflow-y-auto flex-1 divide-y divide-[#d1d7dc]">
              {filteredSections.map((sec: any, sIdx: number) => {
                const isExpanded = expandedSectionIds.includes(sec.id);
                const secLessons = sec.lessons || [];
                const secCompletedCount = secLessons.filter((l: any) => completedLessonIds.includes(l.id)).length;

                return (
                  <div key={sec.id} className="border-b border-[#d1d7dc]">
                    {/* Module Header Accordion Button */}
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className="w-full px-4 py-3.5 flex justify-between items-start bg-[#f7f9fa] hover:bg-[#e4e8eb] text-left transition-colors cursor-pointer"
                    >
                      <div className="flex-1 pr-2">
                        <span className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider mb-0.5">
                          Module {sIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#2d2f31] block leading-snug">
                          {cleanSectionTitle(sec.title, sIdx + 1)}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                          {secCompletedCount} / {secLessons.length} completed
                        </span>
                      </div>
                      <Icon
                        name={isExpanded ? 'expand_less' : 'expand_more'}
                        size={18}
                        className="text-slate-600 mt-0.5"
                      />
                    </button>

                    {/* Module Lectures List */}
                    {isExpanded && (
                      <div className="divide-y divide-[#d1d7dc]/40 bg-white">
                        {secLessons.map((les: any, lIdx: number) => {
                          const isCompleted = completedLessonIds.includes(les.id);
                          const isActive = activeLessonId === les.id;
                          const hasPdf = Boolean(les.pdfUrl && les.pdfUrl.trim().length > 0);
                          const hasFile = Boolean(les.fileUrl && les.fileUrl.trim().length > 0);
                          const hasArticleDoc = Boolean(les.content && les.content.trim().length > 0);
                          const customResources: any[] = Array.isArray(les.resourcesList) ? les.resourcesList : [];
                          const hasResources = hasPdf || hasFile || hasArticleDoc || customResources.length > 0;
                          const isVersionLocked = Boolean(les.versionLocked);
                          const isLessonLocked = (!isEnrolled && !les.isFree) || isVersionLocked;

                          const itemInfo = lessonDisplayMap.get(les.id);
                          const isQuizItem = les.type === 'QUIZ' || (les.quizData && (!les.videoUrl || les.videoUrl.startsWith('blob:'))) || (itemInfo?.isQuiz ?? false);
                          const isArticleItem = !isQuizItem && (les.type === 'TEXT' || (les.content && (!les.videoUrl || les.videoUrl.startsWith('blob:'))) || (itemInfo?.isArticle ?? false));
                          const isPdfItem = !isQuizItem && !isArticleItem && (les.type === 'PDF' || (les.pdfUrl && (!les.videoUrl || les.videoUrl.startsWith('blob:'))));

                          return (
                            <div
                              key={les.id}
                              className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-[#f7f9fa] border-l-4 border-l-[#2d2f31]'
                                  : 'hover:bg-[#f7f9fa]'
                              }`}
                            >
                              {/* Left: Square Checkbox or Lock Icon */}
                              {isLessonLocked ? (
                                <div className="mt-0.5 w-4 h-4 flex items-center justify-center text-slate-400 shrink-0">
                                  <Icon name="lock" size={13} className={isVersionLocked ? 'text-amber-500' : 'text-slate-400'} />
                                </div>
                              ) : (
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
                              )}

                              {/* Center: Title & Type Icon + Duration */}
                              <div
                                className="flex-1 min-w-0"
                                onClick={() => handleSelectLesson(les.id)}
                              >
                                <span
                                  className={`text-xs block leading-snug truncate ${
                                    isActive
                                      ? 'font-extrabold text-[#2d2f31]'
                                      : 'text-slate-800 hover:text-black font-semibold'
                                  }`}
                                >
                                  {itemInfo?.sidebarTitle || les.title}
                                </span>

                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                                  {les.isFinalAssignment || /final\s+assignment/i.test(les.title || '') ? (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase tracking-wide flex items-center gap-1 border border-amber-300">
                                      <Icon name="workspace_premium" size={12} className="text-amber-700" fill />
                                      <span>Final Assignment</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Icon
                                        name={
                                          isQuizItem
                                            ? 'quiz'
                                            : isPdfItem
                                            ? 'picture_as_pdf'
                                            : isArticleItem
                                            ? 'article'
                                            : 'movie'
                                        }
                                        size={12}
                                        className={isArticleItem ? 'text-amber-600' : 'text-slate-500'}
                                      />
                                      <span>{les.duration || (isQuizItem ? 'Quiz' : isArticleItem ? 'Article' : '10:00')}</span>
                                    </span>
                                  )}

                                  {isVersionLocked && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-extrabold text-[9px] uppercase tracking-wide flex items-center gap-0.5">
                                      <span>🔒</span>
                                      <span>{les.requiredVersionLabel || 'v2.0'}</span>
                                    </span>
                                  )}

                                  {les.isFree && !isEnrolled && !isVersionLocked && (
                                    <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-extrabold text-[9px] uppercase tracking-wide">
                                      Preview
                                    </span>
                                  )}

                                  {hasResources && (
                                    <span className="text-amber-700 font-bold text-[10px] flex items-center gap-0.5">
                                      • 📁 Resources
                                    </span>
                                  )}
                                </div>

                                {/* Sub-lessons / Sub-topics list */}
                                {Array.isArray(les.subLessons) && les.subLessons.length > 0 && (
                                  <div className="pl-2 border-l-2 border-slate-200 mt-2 space-y-1">
                                    {les.subLessons.map((sub: any, subIdx: number) => (
                                      <div
                                        key={sub.id || subIdx}
                                        className="text-[11px] text-slate-600 hover:text-black py-0.5 flex items-center gap-1.5"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                        <span className="truncate">{sub.title}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Right: Resources Dropdown Pill with Folder Icon */}
                              {hasResources && (
                                <div className="relative shrink-0 resource-dropdown-container">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenResourceMenuId(openResourceMenuId === les.id ? null : les.id);
                                    }}
                                    className={`px-2 py-1 border rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${
                                      openResourceMenuId === les.id
                                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                                        : 'bg-amber-50/80 hover:bg-amber-100/90 border-amber-200/90 text-amber-900'
                                    }`}
                                    title="Download lecture resources (.doc, PDF, files)"
                                  >
                                    <span className="text-xs">📁</span>
                                    <span>Resources</span>
                                    <Icon name={openResourceMenuId === les.id ? 'expand_less' : 'expand_more'} size={12} />
                                  </button>

                                  {openResourceMenuId === les.id && (
                                    <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-[#d1d7dc] p-2 space-y-1 z-50 animate-in fade-in duration-100 text-left">
                                      <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                                        <span>Resources</span>
                                        <span>📁</span>
                                      </div>

                                      {hasArticleDoc && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            downloadArticleAsDoc(les.title, les.content);
                                            showToast({ title: 'Downloading Notes', description: `${les.title} notes downloading as .doc...`, type: 'success' });
                                          }}
                                          className="w-full text-left p-1.5 text-xs text-slate-800 hover:text-blue-700 hover:bg-blue-50/70 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                          <span className="text-sm">📝</span>
                                          <div className="flex-1 min-w-0">
                                            <div className="truncate font-bold text-slate-900">Download Article (.doc)</div>
                                            <div className="text-[10px] text-slate-500 font-normal">Editable Word document</div>
                                          </div>
                                          <Icon name="download" size={13} className="text-slate-400 shrink-0" />
                                        </button>
                                      )}

                                      {customResources.length > 0 ? (
                                        customResources.map((res: any) => {
                                          const isPdf = res.type === 'PDF' || res.url?.toLowerCase().endsWith('.pdf');
                                          const isDoc = res.type === 'DOC' || res.url?.toLowerCase().match(/\.(doc|docx|txt|rtf)$/);
                                          const isImage = res.type === 'IMAGE' || res.url?.toLowerCase().match(/\.(png|jpg|jpeg|webp|svg)$/);
                                          const isLink = res.type === 'LINK' || res.url?.startsWith('http');
                                          const isZip = res.type === 'ZIP' || res.url?.toLowerCase().endsWith('.zip');

                                          const iconEmoji = isPdf ? '📑' : isDoc ? '📝' : isImage ? '🖼️' : isZip ? '📦' : isLink ? '🔗' : '📎';
                                          const typeLabel = isPdf ? 'PDF Handout' : isDoc ? 'Word Doc' : isImage ? 'Image' : isZip ? 'Zip File' : isLink ? 'Web Link' : 'Resource';

                                          return (
                                            <a
                                              key={res.id}
                                              href={res.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download={!isLink}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-full text-left p-1.5 text-xs text-slate-800 hover:text-indigo-700 hover:bg-indigo-50/70 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                            >
                                              <span className="text-sm">{iconEmoji}</span>
                                              <div className="flex-1 min-w-0">
                                                <div className="truncate font-bold text-slate-900" title={res.name}>{res.name}</div>
                                                <div className="text-[10px] text-slate-500 font-normal">{typeLabel}</div>
                                              </div>
                                              <Icon name={isLink ? 'open_in_new' : 'download'} size={13} className="text-slate-400 shrink-0" />
                                            </a>
                                          );
                                        })
                                      ) : (
                                        <>
                                          {hasPdf && (
                                            <a
                                              href={les.pdfUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-full text-left p-1.5 text-xs text-slate-800 hover:text-rose-700 hover:bg-rose-50/70 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                            >
                                              <span className="text-sm">📑</span>
                                              <div className="flex-1 min-w-0">
                                                <div className="truncate font-bold text-slate-900">Download PDF Handout</div>
                                                <div className="text-[10px] text-slate-500 font-normal">Lecture slides &amp; guide</div>
                                              </div>
                                              <Icon name="open_in_new" size={13} className="text-slate-400 shrink-0" />
                                            </a>
                                          )}

                                          {hasFile && (
                                            <a
                                              href={les.fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-full text-left p-1.5 text-xs text-slate-800 hover:text-indigo-700 hover:bg-indigo-50/70 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                            >
                                              <span className="text-sm">📦</span>
                                              <div className="flex-1 min-w-0">
                                                <div className="truncate font-bold text-slate-900">Download Attached File</div>
                                                <div className="text-[10px] text-slate-500 font-normal">Project resources</div>
                                              </div>
                                              <Icon name="download" size={13} className="text-slate-400 shrink-0" />
                                            </a>
                                          )}
                                        </>
                                      )}

                                      {hasArticleDoc && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectLesson(les.id);
                                            setPlayerTab('overview');
                                            setOpenResourceMenuId(null);
                                            const el = document.getElementById('lesson-tabs-section');
                                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                                          }}
                                          className="w-full text-left px-2 py-1 text-[10px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded font-medium flex items-center gap-1.5 cursor-pointer transition-colors border-t border-slate-100 mt-1"
                                        >
                                          <Icon name="visibility" size={12} className="text-slate-500 shrink-0" />
                                          <span>Read Notes in Overview</span>
                                        </button>
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
                          Module {sIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#2d2f31]">{cleanSectionTitle(sec.title, sIdx + 1)}</span>
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
                          const hasPdf = Boolean(les.pdfUrl && les.pdfUrl.trim().length > 0);
                          const hasFile = Boolean(les.fileUrl && les.fileUrl.trim().length > 0);
                          const hasArticleDoc = Boolean(les.content && les.content.trim().length > 0);
                          const customResources: any[] = Array.isArray(les.resourcesList) ? les.resourcesList : [];
                          const hasResources = hasPdf || hasFile || hasArticleDoc || customResources.length > 0;
                          const isVersionLocked = Boolean(les.versionLocked);
                          const isLessonLocked = (!isEnrolled && !les.isFree) || isVersionLocked;

                          const itemInfo = lessonDisplayMap.get(les.id);
                          const isQuizItem = les.type === 'QUIZ' || (les.quizData && (!les.videoUrl || les.videoUrl.startsWith('blob:'))) || (itemInfo?.isQuiz ?? false);
                          const isArticleItem = !isQuizItem && (les.type === 'TEXT' || (les.content && (!les.videoUrl || les.videoUrl.startsWith('blob:'))) || (itemInfo?.isArticle ?? false));
                          const isPdfItem = !isQuizItem && !isArticleItem && (les.type === 'PDF' || (les.pdfUrl && (!les.videoUrl || les.videoUrl.startsWith('blob:'))));

                          return (
                            <div
                              key={les.id}
                              className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-[#f7f9fa] border-l-4 border-l-[#2d2f31]'
                                  : 'hover:bg-[#f7f9fa]'
                              }`}
                            >
                              {isLessonLocked ? (
                                <div className="mt-0.5 w-4 h-4 flex items-center justify-center text-slate-400 shrink-0">
                                  <Icon name="lock" size={13} className={isVersionLocked ? 'text-amber-500' : 'text-slate-400'} />
                                </div>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleLessonComplete(les.id);
                                  }}
                                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2d2f31] focus:ring-0 cursor-pointer shrink-0"
                                />
                              )}
                              <div
                                className="flex-1 min-w-0"
                                onClick={() => {
                                  handleSelectLesson(les.id);
                                  setIsMobileCurriculumOpen(false);
                                }}
                              >
                                <span
                                  className={`text-xs block leading-snug truncate ${
                                    isActive ? 'font-bold text-[#2d2f31]' : 'text-slate-800'
                                  }`}
                                >
                                  {itemInfo?.sidebarTitle || les.title}
                                </span>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  {les.isFinalAssignment || /final\s+assignment/i.test(les.title || '') ? (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase tracking-wide flex items-center gap-1 border border-amber-300">
                                      <Icon name="workspace_premium" size={12} className="text-amber-700" fill />
                                      <span>Final Assignment</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Icon
                                        name={
                                          isQuizItem
                                            ? 'quiz'
                                            : isPdfItem
                                            ? 'picture_as_pdf'
                                            : isArticleItem
                                            ? 'article'
                                            : 'movie'
                                        }
                                        size={12}
                                        className={isArticleItem ? 'text-amber-600' : 'text-slate-500'}
                                      />
                                      <span>{les.duration || (isQuizItem ? 'Quiz' : isArticleItem ? 'Article' : '10:00')}</span>
                                    </span>
                                  )}
                                  {isVersionLocked && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-extrabold text-[9px] uppercase tracking-wide flex items-center gap-0.5">
                                      <span>🔒</span>
                                      <span>{les.requiredVersionLabel || 'v2.0'}</span>
                                    </span>
                                  )}
                                  {hasResources && (
                                    <span className="text-amber-700 font-bold text-[10px]">
                                      • 📁 Resources
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Mobile 📁 Resources Button & Dropdown */}
                              {hasResources && (
                                <div className="relative shrink-0 resource-dropdown-container">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenResourceMenuId(openResourceMenuId === `mobile_${les.id}` ? null : `mobile_${les.id}`);
                                    }}
                                    className={`px-2 py-1 border rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${
                                      openResourceMenuId === `mobile_${les.id}`
                                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                                        : 'bg-amber-50/80 hover:bg-amber-100/90 border-amber-200 text-amber-900'
                                    }`}
                                  >
                                    <span>📁</span>
                                    <span>Resources</span>
                                  </button>

                                  {openResourceMenuId === `mobile_${les.id}` && (
                                    <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-[#d1d7dc] p-2 space-y-1 z-50 animate-in fade-in duration-100 text-left">
                                      {hasArticleDoc && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            downloadArticleAsDoc(les.title, les.content);
                                            showToast({ title: 'Downloading Notes', description: `${les.title} notes downloading as .doc...`, type: 'success' });
                                          }}
                                          className="w-full text-left p-1.5 text-xs text-slate-800 hover:text-blue-700 hover:bg-blue-50/70 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                          <span>📝</span>
                                          <div className="flex-1 min-w-0">
                                            <div className="truncate font-bold text-slate-900">Download Article (.doc)</div>
                                            <div className="text-[10px] text-slate-500 font-normal">Editable Word file</div>
                                          </div>
                                        </button>
                                      )}

                                      {customResources.length > 0 ? (
                                        customResources.map((res: any) => {
                                          const isPdf = res.type === 'PDF' || res.url?.toLowerCase().endsWith('.pdf');
                                          const isDoc = res.type === 'DOC' || res.url?.toLowerCase().match(/\.(doc|docx|txt|rtf)$/);
                                          const isImage = res.type === 'IMAGE' || res.url?.toLowerCase().match(/\.(png|jpg|jpeg|webp|svg)$/);
                                          const isLink = res.type === 'LINK' || res.url?.startsWith('http');
                                          const isZip = res.type === 'ZIP' || res.url?.toLowerCase().endsWith('.zip');

                                          const iconEmoji = isPdf ? '📑' : isDoc ? '📝' : isImage ? '🖼️' : isZip ? '📦' : isLink ? '🔗' : '📎';
                                          const typeLabel = isPdf ? 'PDF Handout' : isDoc ? 'Word Doc' : isImage ? 'Image' : isZip ? 'Zip File' : isLink ? 'Web Link' : 'Resource';

                                          return (
                                            <a
                                              key={res.id}
                                              href={res.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download={!isLink}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-full text-left p-1.5 text-xs text-slate-800 hover:text-indigo-700 hover:bg-indigo-50/70 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                            >
                                              <span className="text-sm">{iconEmoji}</span>
                                              <div className="flex-1 min-w-0">
                                                <div className="truncate font-bold text-slate-900" title={res.name}>{res.name}</div>
                                                <div className="text-[10px] text-slate-500 font-normal">{typeLabel}</div>
                                              </div>
                                              <Icon name={isLink ? 'open_in_new' : 'download'} size={13} className="text-slate-400 shrink-0" />
                                            </a>
                                          );
                                        })
                                      ) : (
                                        <>
                                          {hasPdf && (
                                            <a
                                              href={les.pdfUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-full text-left p-1.5 text-xs text-slate-800 hover:text-rose-700 hover:bg-rose-50/70 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                            >
                                              <span>📑</span>
                                              <div className="flex-1 min-w-0">
                                                <div className="truncate font-bold text-slate-900">Download PDF Handout</div>
                                                <div className="text-[10px] text-slate-500 font-normal">PDF document</div>
                                              </div>
                                            </a>
                                          )}

                                          {hasFile && (
                                            <a
                                              href={les.fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-full text-left p-1.5 text-xs text-slate-800 hover:text-indigo-700 hover:bg-indigo-50/70 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                                            >
                                              <span>📦</span>
                                              <div className="flex-1 min-w-0">
                                                <div className="truncate font-bold text-slate-900">Download Attached File</div>
                                              </div>
                                            </a>
                                          )}
                                        </>
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
