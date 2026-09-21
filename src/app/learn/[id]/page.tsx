'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { QuizPlayer } from '@/components/player/QuizPlayer';
import { ArticlePlayer } from '@/components/player/ArticlePlayer';
import { LessonTabs } from '@/components/player/LessonTabs';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { AiLessonTutorDrawer } from '@/components/player/AiLessonTutorDrawer';
import { CertificateModal } from '@/components/student/CertificateModal';
import { useApp } from '@/context/AppContext';
import confetti from 'canvas-confetti';

export default function LearnPlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, showToast } = useApp();

  const courseSlug = (params?.id as string) || (params?.slug as string) || '';
  const initialLessonId = searchParams.get('lessonId') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [activeLessonId, setActiveLessonId] = useState<string>(initialLessonId);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [playerTab, setPlayerTab] = useState<'overview' | 'notes' | 'bookmarks' | 'discussion' | 'assignments' | 'resources' | 'reviews'>('overview');

  // Fetch live course from database
  const fetchLiveCourse = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseSlug}`);
      if (res.ok) {
        const data = await res.json();
        const c = data.course;
        setCourse(c);

        const allLessons = c.sections?.flatMap((s: any) => s.lessons) || [];
        if (!activeLessonId && allLessons.length > 0) {
          setActiveLessonId(allLessons[0].id);
        }
        if (c.sections && c.sections.length > 0) {
          setExpandedModuleIds([c.sections[0].id]);
        }

        // Fetch user's completed lessons for this course
        if (data.completedLessonIds) {
          setCompletedLessonIds(data.completedLessonIds);
          const comp = data.completedLessonIds.length;
          const tot = allLessons.length || 1;
          setProgressPercent(Math.min(100, Math.round((comp / tot) * 100)));
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseSlug) {
      fetchLiveCourse();
    }
  }, [courseSlug]);

  const allSections = course?.sections || [];
  const allLessons = allSections.flatMap((s: any) => s.lessons) || [];
  const activeLesson = allLessons.find((l: any) => l.id === activeLessonId) || allLessons[0] || null;

  const isCurrentCompleted = activeLesson?.id ? completedLessonIds.includes(activeLesson.id) : false;

  const toggleModule = (id: string) => {
    setExpandedModuleIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleNextLesson = () => {
    const currentIndex = allLessons.findIndex((l: any) => l.id === activeLessonId);
    if (currentIndex < allLessons.length - 1) {
      setActiveLessonId(allLessons[currentIndex + 1].id);
    }
  };

  const handlePrevLesson = () => {
    const currentIndex = allLessons.findIndex((l: any) => l.id === activeLessonId);
    if (currentIndex > 0) {
      setActiveLessonId(allLessons[currentIndex - 1].id);
    }
  };

  const handleToggleComplete = async () => {
    if (!activeLesson?.id) return;

    try {
      const res = await fetch(`/api/lessons/${activeLesson.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: !isCurrentCompleted
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update progress');

      if (data.completedLessonIds) {
        setCompletedLessonIds(data.completedLessonIds);
      } else {
        setCompletedLessonIds((prev) =>
          !isCurrentCompleted ? [...prev, activeLesson.id] : prev.filter((id) => id !== activeLesson.id)
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
          title: !isCurrentCompleted ? 'Lesson Completed ✓' : 'Marked as uncompleted',
          type: 'info'
        });
      }
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col h-screen overflow-hidden antialiased font-body-md">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 sm:px-8 py-3 bg-surface-container-lowest border-b border-outline-variant shadow-xs h-16 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href="/student/learning"
            className="text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-container shrink-0 cursor-pointer"
            title="Back to My Learning"
          >
            <Icon name="arrow_back" size={20} />
          </Link>
          <div className="h-6 w-[1px] bg-outline-variant shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xs font-semibold text-on-surface-variant truncate">
              {course?.title || 'Loading Course...'}
            </h1>
            <h2 className="text-sm sm:text-base font-bold text-primary truncate leading-tight mt-0.5">
              {activeLesson?.title || 'Loading lecture...'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <AiLessonTutorDrawer
            lessonId={activeLesson?.id}
            lessonTitle={activeLesson?.title}
            courseSlug={courseSlug}
          />

          <button
            onClick={() => {
              setPlayerTab('reviews');
              document.getElementById('lesson-tabs-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-amber-300/80 bg-amber-50/90 hover:bg-amber-100 text-amber-900 transition-all shadow-xs cursor-pointer"
            title="Rate & Review this course"
          >
            <Icon name="star" fill size={15} className="text-amber-500" />
            <span className="hidden sm:inline">Rate Course</span>
          </button>

          {progressPercent >= 100 && (
            <button
              onClick={() => setIsCertificateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all animate-bounce cursor-pointer"
            >
              <Icon name="workspace_premium" fill size={18} />
              <span>Claim Certificate</span>
            </button>
          )}

          <button
            onClick={handleToggleComplete}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer ${
              isCurrentCompleted
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-primary text-on-primary hover:bg-primary-container'
            }`}
          >
            <Icon
              name="check_circle"
              fill={isCurrentCompleted}
              size={18}
              className={isCurrentCompleted ? 'text-emerald-700' : 'text-on-primary'}
            />
            <span className="hidden sm:inline">
              {isCurrentCompleted ? 'Completed ✓' : 'Mark as complete'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Container with Sidebar + Player Canvas */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-64px)]">
        {/* Left Curriculum Sidebar */}
        <aside className="w-[300px] sm:w-[340px] bg-surface-container-lowest border-r border-outline-variant hidden md:flex flex-col h-full shrink-0">
          {/* Progress Header */}
          <div className="p-4 sm:p-5 border-b border-outline-variant bg-surface-container-low/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                Course Progress
              </span>
              <span className="text-xs font-bold text-primary font-mono">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-on-surface-variant mt-1.5">
              <span>{completedLessonIds.length} of {allLessons.length} lessons completed</span>
              {progressPercent >= 100 && (
                <span className="text-emerald-600 font-bold">100% Certified</span>
              )}
            </div>
          </div>

          {/* Module List */}
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/40">
            {allSections.map((sec: any, sIdx: number) => {
              const isExpanded = expandedModuleIds.includes(sec.id);

              return (
                <div key={sec.id} className="border-b border-outline-variant/40">
                  <button
                    onClick={() => toggleModule(sec.id)}
                    className="w-full px-4 py-3 flex justify-between items-center bg-surface-container-low/40 text-left hover:bg-surface-variant transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-secondary block uppercase tracking-wider mb-0.5">
                        Section {sIdx + 1}
                      </span>
                      <span className="text-xs font-bold text-on-surface">{sec.title}</span>
                    </div>
                    <Icon
                      name={isExpanded ? 'expand_less' : 'expand_more'}
                      size={18}
                      className="text-secondary"
                    />
                  </button>

                  {isExpanded && (
                    <div className="flex flex-col py-1 bg-surface-container-lowest divide-y divide-outline-variant/20">
                      {sec.lessons?.map((lesson: any) => {
                        const isCompleted = completedLessonIds.includes(lesson.id);
                        const isActive = activeLessonId === lesson.id;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setActiveLessonId(lesson.id)}
                            className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors cursor-pointer group ${
                              isActive
                                ? 'bg-primary/10 border-l-4 border-primary'
                                : 'hover:bg-surface-container-low'
                            }`}
                          >
                            <Icon
                              name={
                                isCompleted
                                  ? 'check_circle'
                                  : isActive
                                  ? 'play_circle'
                                  : 'radio_button_unchecked'
                              }
                              fill={isCompleted || isActive}
                              size={18}
                              className={`mt-0.5 shrink-0 ${
                                isCompleted
                                  ? 'text-emerald-600'
                                  : isActive
                                  ? 'text-primary'
                                  : 'text-outline'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-xs block truncate ${
                                  isActive
                                    ? 'font-bold text-primary'
                                    : 'text-on-surface group-hover:text-primary'
                                }`}
                              >
                                {lesson.title}
                              </span>
                              <span className="text-[11px] text-secondary mt-0.5 flex items-center gap-1">
                                <Icon name="play_circle" size={13} />
                                <span>{lesson.duration || '10:00'}</span>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Video & Lesson Content */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-[1000px] mx-auto space-y-6">
            {activeLesson?.type === 'QUIZ' ? (
              <QuizPlayer
                title={activeLesson.title}
                lessonId={activeLesson.id}
                quizData={activeLesson.quizData}
                onPass={handleToggleComplete}
              />
            ) : activeLesson?.type === 'TEXT' || activeLesson?.type === 'PDF' || activeLesson?.type === 'DOWNLOAD' ? (
              <ArticlePlayer
                title={activeLesson.title}
                type={activeLesson.type}
                content={activeLesson.content}
                pdfUrl={activeLesson.pdfUrl}
                fileUrl={activeLesson.fileUrl}
                duration={activeLesson.duration}
                isCompleted={isCurrentCompleted}
                onComplete={handleToggleComplete}
              />
            ) : (
              <VideoPlayer
                title={activeLesson?.title || course?.title || 'Lecture Stream'}
                videoUrl={activeLesson?.videoUrl || null}
                lessonId={activeLesson?.id || undefined}
                thumbnail={course?.thumbnail || ''}
                duration={activeLesson?.duration || '10:00'}
                isFree={!!activeLesson?.isFree}
                onLessonComplete={handleToggleComplete}
              />
            )}

            {/* Next / Prev Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevLesson}
                className="flex items-center gap-2 px-4 py-2 border border-outline-variant bg-surface-container-lowest rounded-xl text-xs sm:text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors shadow-xs cursor-pointer"
              >
                <Icon name="chevron_left" size={18} />
                <span>Previous Lesson</span>
              </button>

              <button
                onClick={handleNextLesson}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary-container transition-colors shadow-xs cursor-pointer"
              >
                <span>Next Lesson</span>
                <Icon name="chevron_right" size={18} />
              </button>
            </div>

            {/* Lesson Tabs (Overview, Notes, Bookmarks, Discussion, Assignments, Resources, Reviews) */}
            <div id="lesson-tabs-section" className="scroll-mt-6">
              <LessonTabs
                courseId={course?.id}
                lessonId={activeLesson?.id}
                lessonTitle={activeLesson?.title || course?.title || 'Lecture Details'}
                instructorName={course?.instructor?.name || 'Lead Architect'}
                instructorRole={course?.instructor?.bio || 'Distinguished Faculty'}
                instructorAvatar={course?.instructor?.avatar || ''}
                activeTab={playerTab}
                onTabChange={setPlayerTab}
              />
            </div>
          </div>
        </main>
      </div>

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
