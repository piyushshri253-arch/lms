'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { CurriculumAccordion } from '@/components/courses/CurriculumAccordion';
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

  const modules = (course?.sections || []).map((sec: any, idx: number) => ({
    id: sec.id,
    moduleNumber: idx + 1,
    title: sec.title,
    lessons: (sec.lessons || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      duration: l.duration || '10:00',
      type: (l.type === 'QUIZ' || l.type === 'quiz' ? 'quiz' : l.type === 'ARTICLE' || l.type === 'reading' ? 'reading' : 'video') as 'video' | 'reading' | 'quiz',
      completed: false,
      locked: !l.isFree
    }))
  }));

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
              <span>1. Course Landing Page (Student View)</span>
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
              <span>2. Classroom Player & Lectures</span>
            </button>
          </div>

          <a
            href={`/courses/${course.slug || course.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Open direct live student page in new tab"
          >
            <span>Live Student URL</span>
            <Icon name="open_in_new" size={13} />
          </a>
        </div>
      </header>

      {/* MODE 1: STUDENT COURSE LANDING PAGE VIEW (EXACT 100% MATCH TO STUDENT VIEW) */}
      {viewMode === 'LANDING_PAGE' ? (
        <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col antialiased">
          <UdemyNavbar />

          <main className="w-full max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative pb-24 md:pb-16">
            {/* Left Column: Course Details */}
            <div className="lg:col-span-8 flex flex-col gap-10">
              {/* Breadcrumbs & Hero */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-on-surface-variant text-xs sm:text-sm font-semibold">
                  <span className="hover:text-primary transition-colors cursor-pointer">
                    Browse
                  </span>
                  <Icon name="chevron_right" size={16} />
                  <span className="hover:text-primary transition-colors cursor-pointer">
                    {typeof course.category === 'object'
                      ? course.category?.name || 'Masterclass'
                      : course.category || 'Masterclass'}
                  </span>
                  <Icon name="chevron_right" size={16} />
                  <span className="text-on-surface truncate">{course.title}</span>
                </div>

                <h1 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-on-surface leading-tight tracking-tight">
                  {course.title}
                </h1>

                <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
                  {course.subtitle || course.shortDescription || course.description || 'Master practical skills with real-world video lectures, hands-on quizzes, and downloadable architectural guides.'}
                </p>

                {/* Badges & Meta Metrics */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                  <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant hover:bg-surface-container-high transition-colors">
                    <span className="text-sm font-bold text-on-surface">
                      {typeof course.rating === 'number' ? course.rating.toFixed(1) : (course.rating || '5.0')}
                    </span>
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Icon key={i} name="star" fill size={16} />
                      ))}
                    </div>
                    <span className="text-xs text-on-surface-variant ml-1">
                      ({course.reviews?.length || course.reviewsCount || 0} reviews)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-on-surface-variant text-xs sm:text-sm">
                    <Icon name="group" size={20} />
                    <span>{course.studentsCount?.toLocaleString() || 0} students</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-on-surface-variant text-xs sm:text-sm">
                    <Icon name="schedule" size={20} />
                    <span>{course.durationHours || 30} hours total</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-on-surface-variant text-xs sm:text-sm">
                    <Icon name="language" size={20} />
                    <span>{course.language || 'English'}</span>
                  </div>
                </div>

                {/* Instructor Bio Card */}
                {course.instructor && (
                  <div className="flex items-center gap-3.5 mt-4 p-3 bg-surface-container-low/60 rounded-xl border border-outline-variant/50 w-fit">
                    <UserAvatar
                      avatar={course.instructor.avatar}
                      name={course.instructor.name || 'Course Instructor'}
                      size="lg"
                      className="w-12 h-12 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        Created by {course.instructor.name || 'Course Instructor'}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {course.instructor.title || course.instructor.bio || 'Lead Instructor & Systems Architect'}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Mobile Video Preview & Pricing Box (< lg) */}
              <div className="lg:hidden bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-md overflow-hidden flex flex-col">
                <div
                  onClick={() => setViewMode('CLASSROOM_PLAYER')}
                  className="w-full aspect-video bg-surface-container relative group cursor-pointer border-b border-outline-variant"
                >
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-surface-container to-surface-container-high flex items-center justify-center text-primary/60">
                      <Icon name="school" size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-pointer">
                    <div className="w-14 h-14 bg-surface-container-lowest/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:text-primary transition-all duration-300">
                      <Icon name="play_arrow" fill size={28} className="ml-1 text-primary" />
                    </div>
                  </div>
                  <div className="absolute bottom-2.5 left-0 w-full px-3 flex justify-center">
                    <span className="bg-black/70 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md">
                      Preview this course
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 flex flex-col gap-4">
                  <div className="flex items-end gap-3">
                    <span className={`text-2xl sm:text-3xl font-extrabold leading-none font-mono ${effectivePrice === 0 ? 'text-emerald-700' : 'text-on-surface'}`}>
                      {effectivePrice === 0 ? 'Free' : `₹${effectivePrice.toLocaleString('en-IN')}`}
                    </span>
                    {originalPrice && originalPrice > effectivePrice && (
                      <span className="text-sm text-outline line-through mb-0.5 font-mono">
                        ₹{originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                    {effectivePrice === 0 && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-0.5">
                        100% Free
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setViewMode('CLASSROOM_PLAYER')}
                    className="w-full bg-[#a435f0] text-white font-bold py-3 rounded hover:bg-[#8710d8] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Icon name="play_circle" fill size={18} />
                    <span>Test Classroom Player</span>
                  </button>
                </div>
              </div>

              {/* What You'll Learn Card */}
              {whatYouWillLearnList.length > 0 && (
                <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                  <div className="border-b border-outline-variant pb-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2.5">
                      <Icon name="check_circle" size={24} className="text-primary" />
                      <span>WHAT YOU’LL LEARN</span>
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">Key learning outcomes &amp; skills</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-1">
                    {whatYouWillLearnList.map((item: string, idx: number) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <Icon
                          name="check_circle"
                          fill
                          size={20}
                          className="text-primary mt-0.5 shrink-0"
                        />
                        <p className="text-xs sm:text-sm text-on-surface leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Curriculum Section */}
              <CurriculumAccordion
                modules={modules}
                courseSlug={course.slug || course.id}
              />

              {/* Before You Begin & Who This Course Is For */}
              {(requirementsList.length > 0 || targetAudienceList.length > 0) && (
                <div className={requirementsList.length > 0 && targetAudienceList.length > 0 ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-6"}>
                  {requirementsList.length > 0 && (
                    <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                      <div className="border-b border-outline-variant pb-3">
                        <h2 className="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
                          <Icon name="rule" size={22} className="text-secondary" />
                          <span>BEFORE YOU BEGIN</span>
                        </h2>
                        <p className="text-xs text-on-surface-variant mt-0.5">Knowledge or experience you may need</p>
                      </div>
                      <ul className="space-y-3 pt-1">
                        {requirementsList.map((item: string, idx: number) => (
                          <li key={idx} className="flex gap-3 items-start text-xs sm:text-sm text-on-surface">
                            <span className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-1.5" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {targetAudienceList.length > 0 && (
                    <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                      <div className="border-b border-outline-variant pb-3">
                        <h2 className="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
                          <Icon name="groups" size={22} className="text-tertiary" />
                          <span>WHO THIS COURSE IS FOR</span>
                        </h2>
                        <p className="text-xs text-on-surface-variant mt-0.5">Who can benefit from this course</p>
                      </div>
                      <ul className="space-y-3 pt-1">
                        {targetAudienceList.map((item: string, idx: number) => (
                          <li key={idx} className="flex gap-3 items-start text-xs sm:text-sm text-on-surface">
                            <Icon name="person" size={18} className="text-tertiary shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}

              {/* Course Description Section */}
              {course.description && (
                <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-on-surface pb-3 border-b border-outline-variant">
                    Description
                  </h2>
                  <div className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-line">
                    {course.description}
                  </div>
                </section>
              )}

              {/* Student Reviews & Ratings Section */}
              <section id="reviews" className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24">
                <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Student Reviews &amp; Feedback</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">Real verified ratings from enrolled students</p>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-200">
                    <Icon name="star" fill size={18} className="text-amber-500" />
                    <span className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                      {typeof course.rating === 'number' ? course.rating.toFixed(1) : (course.rating || '5.0')} / 5.0
                    </span>
                  </div>
                </div>

                <div className="space-y-4 divide-y divide-outline-variant/40">
                  {(!course.reviews || course.reviews.length === 0) ? (
                    <div className="text-center py-8 bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant">
                      <Icon name="rate_review" size={32} className="text-on-surface-variant/40 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-on-surface">No student reviews yet</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Students can review this course once published and enrolled.
                      </p>
                    </div>
                  ) : (
                    course.reviews.map((r: any) => {
                      const reviewerName = r.user?.name || (typeof r.user === 'string' ? r.user : 'Verified Student');
                      const reviewerAvatar = r.user?.avatar || null;
                      return (
                        <div key={r.id} className="pt-4 first:pt-0 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                avatar={reviewerAvatar}
                                name={reviewerName}
                                size="sm"
                                className="w-8 h-8 rounded-full"
                              />
                              <div>
                                <span className="font-bold text-xs text-on-surface">{reviewerName}</span>
                                {r.date && (
                                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                                    {new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex text-amber-500">
                              {[...Array(r.rating || 5)].map((_, i) => (
                                <Icon key={i} name="star" fill size={14} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed pl-10.5">{r.comment}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Floating Purchase Card */}
            <div className="hidden lg:block lg:col-span-4 relative">
              <div className="sticky top-[96px] bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:border-primary/40">
                {/* Video Preview Hero */}
                <div
                  onClick={() => setViewMode('CLASSROOM_PLAYER')}
                  className="w-full aspect-video bg-surface-container relative group cursor-pointer border-b border-outline-variant"
                >
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-surface-container to-surface-container-high flex items-center justify-center text-primary/60">
                      <Icon name="school" size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-pointer">
                    <div className="w-16 h-16 bg-surface-container-lowest/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:text-primary transition-all duration-300">
                      <Icon name="play_arrow" fill size={32} className="ml-1 text-primary" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-0 w-full px-3 flex justify-center">
                    <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-md">
                      Preview this course
                    </span>
                  </div>
                </div>

                {/* Pricing & Checkout CTAs */}
                <div className="p-6 sm:p-8 flex flex-col gap-5">
                  <div className="flex items-end gap-3">
                    <span className={`text-3xl sm:text-4xl font-extrabold leading-none font-mono ${effectivePrice === 0 ? 'text-emerald-700' : 'text-on-surface'}`}>
                      {effectivePrice === 0 ? 'Free' : `₹${effectivePrice.toLocaleString('en-IN')}`}
                    </span>
                    {originalPrice && originalPrice > effectivePrice && (
                      <span className="text-base text-outline line-through mb-1 font-mono">
                        ₹{originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                    {effectivePrice === 0 && (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                        100% Free
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => setViewMode('CLASSROOM_PLAYER')}
                      className="w-full bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold py-3.5 rounded transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <Icon name="play_circle" fill size={20} />
                      <span>Test in Classroom Player</span>
                    </button>
                    <button
                      className="w-full bg-white text-[#2d2f31] border border-[#2d2f31] font-bold py-3.5 rounded hover:bg-[#f7f9fa] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <span>Buy now (Student CTA)</span>
                    </button>
                  </div>

                  <p className="text-center text-xs text-on-surface-variant font-medium">
                    30-Day Money-Back Guarantee
                  </p>

                  <div className="pt-4 border-t border-outline-variant">
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">
                      This course includes:
                    </h4>
                    <ul className="space-y-2.5 text-xs text-on-surface-variant">
                      <li className="flex items-center gap-2.5">
                        <Icon name="ondemand_video" size={18} className="text-primary" />
                        <span>{course.durationHours || 30} hours on-demand video</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Icon name="menu_book" size={18} className="text-primary" />
                        <span>{(course.sections || []).length} modules • {allLessons.length} lectures</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Icon name="all_inclusive" size={18} className="text-primary" />
                        <span>Full lifetime access</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Icon name="military_tech" size={18} className="text-primary" />
                        <span>Certificate of completion</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex justify-center items-center pt-4 border-t border-outline-variant">
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard?.writeText(window.location.href);
                          alert('Preview link copied to clipboard!');
                        }
                      }}
                      className="text-on-surface-variant text-xs font-semibold hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-lg hover:bg-surface-container-low"
                    >
                      <Icon name="share" size={18} />
                      <span>Share this preview</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>

          <UdemyFooter />
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
                  isFree={true}
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
