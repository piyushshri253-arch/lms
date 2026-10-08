'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { ArticlePlayer } from '@/components/player/ArticlePlayer';
import { QuizPlayer } from '@/components/player/QuizPlayer';

function CourseStudentPreviewInner() {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const courseId = (params?.id as string) || '';

  const isAuditorMode =
    Boolean(pathname?.startsWith('/reviewer')) || searchParams?.get('mode') === 'auditor';

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'LANDING_PAGE' | 'CLASSROOM_PLAYER'>('LANDING_PAGE');
  const [useStagedVersion, setUseStagedVersion] = useState(true);
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;

    const fetchCoursePreview = async () => {
      try {
        setLoading(true);
        const query = useStagedVersion ? '?version=staged' : '';
        const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}${query}`);
        let resolvedCourse: any = null;

        if (res.ok) {
          const data = await res.json();
          // Unwrap `{ course, versionState, isEnrolled }` returned by GET /api/courses/[slug]
          resolvedCourse = data.course
            ? {
                ...data.course,
                versionState: data.versionState || data.course.versionState,
                isEnrolled: data.isEnrolled ?? data.course.isEnrolled
              }
            : data;
        }

        // Fallback / enrichment for Auditor session if GET /api/reviewer/courses is available
        if (!resolvedCourse || isAuditorMode) {
          try {
            const auditRes = await fetch(
              `/api/reviewer/courses?courseId=${encodeURIComponent(courseId)}`
            );
            if (auditRes.ok) {
              const auditJson = await auditRes.json();
              if (auditJson?.course) {
                const ac = auditJson.course;
                if (!resolvedCourse) {
                  resolvedCourse = {
                    ...ac,
                    subtitle: ac.shortDescription || '',
                    originalPrice: ac.discountPrice || undefined,
                    category: ac.category?.name || ac.category || 'Masterclass',
                    whatYouWillLearn: ac.parsedOutcomes || [],
                    requirements: ac.parsedRequirements || [],
                    targetAudience: ac.parsedTargetAudience || [],
                    versionState: auditJson.versionState,
                    submissionType: auditJson.submissionType,
                    versionLabel: auditJson.versionLabel
                  };
                } else {
                  resolvedCourse = {
                    ...resolvedCourse,
                    quizzes: resolvedCourse.quizzes?.length
                      ? resolvedCourse.quizzes
                      : ac.quizzes || [],
                    submissionType: auditJson.submissionType,
                    versionLabel: auditJson.versionLabel,
                    effectiveReviewStatus:
                      auditJson.auditMeta?.reviewStatus || resolvedCourse.status
                  };
                }
              }
            }
          } catch {
            // Ignore secondary fallback error if primary resolvedCourse succeeded
          }
        }

        if (!isMounted) return;

        if (!resolvedCourse || !resolvedCourse.id) {
          throw new Error('Failed to load course preview data.');
        }

        // Normalize sections & attach standalone Course Quizzes if any exist outside lesson items
        const baseSections: any[] = Array.isArray(resolvedCourse.sections)
          ? [...resolvedCourse.sections]
          : [];

        const standaloneQuizzes: any[] = Array.isArray(resolvedCourse.quizzes)
          ? resolvedCourse.quizzes
          : [];

        if (standaloneQuizzes.length > 0) {
          const hasQuizLessons = baseSections.some((sec) =>
            (sec.lessons || []).some((l: any) => l.type === 'QUIZ')
          );
          if (!hasQuizLessons) {
            baseSections.push({
              id: 'standalone-course-quizzes',
              title: 'Course Quizzes & Assessments',
              description: 'Interactive course assessments and certification quizzes',
              order: baseSections.length + 1,
              lessons: standaloneQuizzes.map((qz: any, idx: number) => ({
                id: `quiz-${qz.id || idx}`,
                title: qz.title || `Assessment Quiz #${idx + 1}`,
                description: qz.description || '',
                duration: `${qz.timeLimit || 15}:00`,
                type: 'QUIZ',
                isFree: true,
                quizData: JSON.stringify({
                  passingScore: qz.passingScore || 70,
                  timeLimit: qz.timeLimit || 15,
                  questions: (qz.questions || []).map((q: any) => {
                    let parsedOpts: string[] = [];
                    try {
                      parsedOpts =
                        typeof q.options === 'string' ? JSON.parse(q.options) : q.options || [];
                    } catch {
                      parsedOpts = [];
                    }
                    return {
                      id: q.id,
                      question: q.question,
                      options: parsedOpts,
                      correctAnswer: q.correctAnswer,
                      explanation: q.explanation || ''
                    };
                  })
                })
              }))
            });
          }
        }

        const finalCourse = {
          ...resolvedCourse,
          sections: baseSections
        };

        setCourse(finalCourse);
        setExpandedSections(baseSections.map((s: any) => s.id));
        const firstLesson = baseSections.flatMap((s: any) => s.lessons || [])[0];
        if (firstLesson && !activeLessonId) {
          setActiveLessonId(firstLesson.id);
        }
        setError(null);
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCoursePreview();
    return () => {
      isMounted = false;
    };
  }, [courseId, useStagedVersion, isAuditorMode]);

  const allLessons: any[] = (course?.sections || []).flatMap((sec: any) => sec.lessons || []);
  const activeLesson =
    allLessons.find((l) => l.id === activeLessonId) || allLessons[0] || null;

  const parseList = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'string' && val.trim()) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        return val.split('\n').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const whatYouWillLearnList = course ? parseList(course.whatYouWillLearn) : [];
  const requirementsList = course ? parseList(course.requirements) : [];
  const targetAudienceList = course ? parseList(course.targetAudience) : [];

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) =>
      prev.includes(secId) ? prev.filter((id) => id !== secId) : [...prev, secId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-3 p-8">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-300">
          Rendering Student Preview Sandbox (Landing Page + Video + Quiz + Pricing)...
        </p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Icon name="error" size={40} className="text-rose-400" />
        <h2 className="text-lg font-bold">Unable to Load Course Preview</h2>
        <p className="text-xs text-slate-400 max-w-md">
          {error || 'Please verify the course ID and try again.'}
        </p>
        <div className="flex items-center gap-3">
          {isAuditorMode ? (
            <>
              <Link
                href={`/reviewer/courses/${encodeURIComponent(courseId)}`}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Back to Course Review
              </Link>
              <Link
                href="/reviewer"
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                Auditor Queue
              </Link>
            </>
          ) : (
            <Link
              href="/instructor/courses/builder"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Back to Course Builder
            </Link>
          )}
        </div>
      </div>
    );
  }

  const hasStagedDraft = Boolean(course.versionState?.stagedSnapshot);
  const effectivePrice = Number(course.price || 0);
  const originalPrice = course.originalPrice ? Number(course.originalPrice) : null;
  const discountPercent =
    originalPrice && originalPrice > effectivePrice
      ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
      : 0;

  const displayStatus = course.effectiveReviewStatus || course.status || 'DRAFT';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Sticky Simulation Control Bar (Role-Aware for Auditor & Instructor) */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-indigo-500/30 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3 flex-wrap">
          {isAuditorMode ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/reviewer/courses/${encodeURIComponent(course.id)}`}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Icon name="fact_check" size={16} />
                <span>Back to Audit Review</span>
              </Link>
              <Link
                href="/reviewer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Icon name="dashboard" size={15} />
                <span>Auditor Queue</span>
              </Link>
            </div>
          ) : (
            <Link
              href={`/instructor/courses/builder?id=${encodeURIComponent(course.id)}`}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Icon name="arrow_back" size={16} />
              <span>Back to Builder</span>
            </Link>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                isAuditorMode
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                  : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
              }`}
            >
              {isAuditorMode ? 'Auditor Student-View Preview' : 'Instructor Student-View Sandbox'}
            </span>
            <span className="text-xs font-bold text-slate-200 truncate max-w-[260px] sm:max-w-md">
              {course.title}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              Status: {displayStatus}
            </span>
            {course.versionLabel && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                {course.versionLabel}
              </span>
            )}
          </div>
        </div>

        {/* Switcher: Student Landing Page vs Student Classroom Player */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasStagedDraft && (
            <button
              onClick={() => setUseStagedVersion(!useStagedVersion)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer transition-all ${
                useStagedVersion
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-white/5 border-white/15 text-slate-300'
              }`}
            >
              {useStagedVersion
                ? 'Viewing: Staged Draft ' + (course.versionState?.pendingVersionLabel || 'v2.0')
                : 'Viewing: Live ' + (course.versionState?.liveVersionLabel || 'v1.0')}
            </button>
          )}

          <div className="bg-slate-950 p-1 rounded-xl border border-white/10 flex items-center gap-1">
            <button
              onClick={() => setViewMode('LANDING_PAGE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'LANDING_PAGE'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon name="storefront" size={15} />
              <span>1. Course Landing Page & Pricing</span>
            </button>

            <button
              onClick={() => setViewMode('CLASSROOM_PLAYER')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'CLASSROOM_PLAYER'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon name="play_circle" size={15} />
              <span>2. Video, Quiz & Curriculum Player</span>
            </button>
          </div>
        </div>
      </header>

      {/* MODE 1: STUDENT COURSE LANDING PAGE VIEW */}
      {viewMode === 'LANDING_PAGE' ? (
        <div className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white py-10 sm:py-14 px-4 sm:px-8 border-b border-white/10">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 8 Columns: Title, Subtitle, Rating, Meta */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold">
                    {typeof course.category === 'object'
                      ? course.category?.name || 'Masterclass'
                      : course.category || 'Masterclass'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 text-[11px] font-semibold">
                    Level: {course.level || 'All Levels'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                    Language: {course.language || 'English'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold">
                    Status: {displayStatus}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                  {course.title}
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  {course.subtitle ||
                    course.shortDescription ||
                    'Master practical production skills with real-world video lectures, hands-on quizzes, and downloadable architectural guides.'}
                </p>

                <div className="flex flex-wrap items-center gap-5 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Icon name="star" fill size={16} />
                    <span>{course.rating || '5.0'}</span>
                    <span className="text-slate-400 font-normal">
                      ({course.reviewsCount || 0} ratings)
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-white">{course.studentsCount || 0}</span>{' '}
                    students enrolled
                  </div>
                  <div>
                    Created by{' '}
                    <span className="font-bold text-indigo-300">
                      {course.instructor?.name || 'Course Instructor'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right 4 Columns: Student Pricing & Enrollment Card */}
              <div className="lg:col-span-4 bg-white text-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4">
                <div
                  onClick={() => setViewMode('CLASSROOM_PLAYER')}
                  className="relative rounded-xl overflow-hidden aspect-video bg-slate-900 flex items-center justify-center cursor-pointer group"
                >
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400 text-xs">
                      No Thumbnail Uploaded
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-lg">
                      <Icon name="play_arrow" fill size={26} />
                    </div>
                    <span className="text-[11px] font-bold text-white bg-black/60 px-3 py-1 rounded-full">
                      Preview Course Video & Player
                    </span>
                  </div>
                </div>

                {/* Pricing Display */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-slate-900">
                      {effectivePrice === 0
                        ? 'Free'
                        : `₹${effectivePrice.toLocaleString('en-IN')}`}
                    </span>
                    {originalPrice && originalPrice > effectivePrice && (
                      <>
                        <span className="text-sm text-slate-400 line-through">
                          ₹{originalPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {discountPercent}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {course.accessType === 'LIMITED_DAYS'
                      ? `${course.accessDays || 365}-Days Full Enrolled Access`
                      : 'Full Lifetime Enrolled Access • Certificate of Completion'}
                  </p>
                </div>

                <button
                  onClick={() => setViewMode('CLASSROOM_PLAYER')}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Icon name="play_circle" size={18} />
                  <span>Test Classroom Player (Video, PDF & Quiz)</span>
                </button>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="font-bold text-slate-900">This course includes:</div>
                  <div className="flex items-center gap-2">
                    <Icon name="smart_display" size={16} className="text-indigo-600" />
                    <span>{allLessons.length} curriculum lectures & assessments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="verified_user" size={16} className="text-emerald-600" />
                    <span>256-Bit Signed DRM Video & PDF Protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="workspace_premium" size={16} className="text-amber-500" />
                    <span>Verified Completion Certificate</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Main Landing Page Content: What You'll Learn, Description, Curriculum */}
          <div className="max-w-6xl mx-auto py-10 px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              {/* What You Will Learn */}
              {whatYouWillLearnList.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                      <Icon name="check_circle" size={20} className="text-emerald-600" />
                      <span>WHAT YOU’LL LEARN</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Key learning outcomes &amp; skills</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {whatYouWillLearnList.map((item: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <Icon
                          name="check_circle"
                          size={16}
                          className="text-emerald-600 shrink-0 mt-0.5"
                        />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Curriculum Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Course Curriculum</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(course.sections || []).length} modules • {allLessons.length} lectures
                      (Click any lecture to preview its Video/Quiz/PDF)
                    </p>
                  </div>
                </div>

                {allLessons.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                    No curriculum modules or lectures have been added to this course yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {(course.sections || []).map((sec: any, sIdx: number) => {
                      const isOpen = expandedSections.includes(sec.id);
                      const mNum = sIdx + 1;
                      return (
                        <div key={sec.id}>
                          <button
                            onClick={() => toggleSection(sec.id)}
                            className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left cursor-pointer"
                          >
                            <div>
                              <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 block">
                                Module {mNum}
                              </span>
                              <span className="text-sm font-bold text-slate-900">{sec.title}</span>
                              {sec.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{sec.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span>{(sec.lessons || []).length} lectures</span>
                              <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={18} />
                            </div>
                          </button>

                          {isOpen && (
                            <div className="divide-y divide-slate-100 bg-white">
                              {(sec.lessons || []).map((les: any, lIdx: number) => {
                                const lCode = `${mNum}.${lIdx + 1}`;
                                const subs = Array.isArray(les.subLessons) ? les.subLessons : [];
                                return (
                                  <div key={les.id} className="px-4 py-3 space-y-2 hover:bg-indigo-50/30">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-xs shrink-0">
                                          {lCode}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-slate-800 truncate">
                                            {les.title}
                                          </div>
                                          {les.description && (
                                            <p className="text-[11px] text-slate-500">{les.description}</p>
                                          )}
                                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                            <span>{les.type || 'VIDEO'}</span>
                                            <span>•</span>
                                            <span>{les.duration || '10:00'}</span>
                                            {les.isFree ? (
                                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold">
                                                Free Preview
                                              </span>
                                            ) : (
                                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                                                🔒 Enrolled Student Only
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => {
                                          setActiveLessonId(les.id);
                                          setViewMode('CLASSROOM_PLAYER');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0 cursor-pointer"
                                      >
                                        Test in Player →
                                      </button>
                                    </div>

                                    {subs.length > 0 && (
                                      <div className="pl-6 sm:pl-9 space-y-1.5 border-l-2 border-indigo-200 ml-3 pt-1">
                                        {subs.map((sub: any, subIdx: number) => {
                                          const sCode = `${lCode}.${subIdx + 1}`;
                                          return (
                                            <div
                                              key={sub.id || subIdx}
                                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
                                            >
                                              <div className="flex items-start gap-2">
                                                <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 font-mono font-bold text-[10px] shrink-0">
                                                  {sCode}
                                                </span>
                                                <div>
                                                  <p className="font-semibold text-slate-800">{sub.title}</p>
                                                  {sub.description && (
                                                    <p className="text-[11px] text-slate-500">{sub.description}</p>
                                                  )}
                                                </div>
                                              </div>
                                              <span className="text-[11px] font-mono text-slate-500 shrink-0">
                                                {sub.duration || '05:00'}
                                              </span>
                                            </div>
                                          );
                                        })}
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
                )}
              </div>

              {/* Requirements & Target Audience */}
              {(requirementsList.length > 0 || targetAudienceList.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {requirementsList.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                          <Icon name="rule" size={18} className="text-indigo-600" />
                          <span>BEFORE YOU BEGIN</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Knowledge or experience you may need</p>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {requirementsList.map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {targetAudienceList.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                          <Icon name="groups" size={18} className="text-purple-600" />
                          <span>WHO THIS COURSE IS FOR</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Who can benefit from this course</p>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {targetAudienceList.map((t: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <Icon name="person" size={15} className="text-purple-500 shrink-0 mt-0.5" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Full Course Description */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <h2 className="text-lg font-extrabold text-slate-900">Course Description</h2>
                <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-7">
                  {course.description || 'No detailed description added yet.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: ENROLLED STUDENT CLASSROOM PLAYER VIEW (VIDEO, QUIZ, PDF, CURRICULUM) */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Curriculum Sidebar */}
          <aside className="w-full lg:w-80 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="text-[10px] font-mono font-bold uppercase text-indigo-600">
                Enrolled Student Curriculum View
              </div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                Click any Video, Quiz, or PDF to test
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {(course.sections || []).map((sec: any, sIdx: number) => (
                <div key={sec.id} className="p-3 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-400 px-2">
                    Module {sIdx + 1}: {sec.title}
                  </div>
                  {(sec.lessons || []).map((les: any) => {
                    const isCurrent = activeLesson?.id === les.id;
                    return (
                      <button
                        key={les.id}
                        onClick={() => setActiveLessonId(les.id)}
                        className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-indigo-600 text-white font-bold shadow-sm'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon
                            name={
                              les.type === 'QUIZ'
                                ? 'quiz'
                                : les.type === 'PDF'
                                ? 'picture_as_pdf'
                                : 'play_circle'
                            }
                            size={16}
                          />
                          <span className="text-xs truncate">{les.title}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono shrink-0 ${
                            isCurrent ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {les.type || 'VIDEO'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </aside>

          {/* Right Active Player Canvas */}
          <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-100">
            <div className="max-w-4xl mx-auto space-y-6">
              {!activeLesson ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-500 text-sm">
                  Add at least one lecture or quiz in the Course Builder to test the classroom player.
                </div>
              ) : activeLesson.type === 'QUIZ' ? (
                <QuizPlayer
                  title={activeLesson.title}
                  lessonId={activeLesson.id}
                  quizData={activeLesson.quizData}
                  onPass={() => {}}
                />
              ) : activeLesson.type === 'PDF' ||
                activeLesson.type === 'TEXT' ||
                activeLesson.type === 'DOWNLOAD' ? (
                <ArticlePlayer
                  title={activeLesson.title}
                  lessonId={activeLesson.id}
                  type={activeLesson.type}
                  content={activeLesson.content}
                  pdfUrl={activeLesson.pdfUrl}
                  fileUrl={activeLesson.fileUrl}
                  allowDownload={Boolean(activeLesson.allowDownload)}
                  duration={activeLesson.duration}
                  isCompleted={false}
                  onComplete={() => {}}
                />
              ) : (
                <VideoPlayer
                  title={activeLesson.title}
                  videoUrl={activeLesson.videoUrl}
                  lessonId={activeLesson.id}
                  thumbnail={course.thumbnail}
                  duration={activeLesson.duration}
                  isFree={Boolean(activeLesson.isFree)}
                />
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default function InstructorCourseStudentPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8 text-xs font-mono">
          Loading Course Student-View Preview...
        </div>
      }
    >
      <CourseStudentPreviewInner />
    </Suspense>
  );
}
