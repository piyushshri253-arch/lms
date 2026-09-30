'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { CourseBasicInfoStep } from '@/components/course-builder/CourseBasicInfoStep';
import { CourseMediaStep } from '@/components/course-builder/CourseMediaStep';
import { CourseCurriculumStep, BuilderSection } from '@/components/course-builder/CourseCurriculumStep';
import { CoursePricingStep } from '@/components/course-builder/CoursePricingStep';
import { CoursePublishStep } from '@/components/course-builder/CoursePublishStep';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { ArticlePlayer } from '@/components/player/ArticlePlayer';
import { QuizPlayer } from '@/components/player/QuizPlayer';

function CourseBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, currentUser } = useApp();

  const editSlugOrId =
    searchParams.get('slug') || searchParams.get('courseId') || searchParams.get('id') || '';

  const draftStorageKey = `morena_course_builder_draft_${editSlugOrId || 'new'}`;

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(!!editSlugOrId);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState<boolean>(false);

  // Live Preview Modal State (keeps 100% of form state intact when opened/closed!)
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'LANDING' | 'PLAYER'>('LANDING');
  const [activePreviewItem, setActivePreviewItem] = useState<any>(null);

  // Full Course Form State
  const [courseState, setCourseState] = useState<{
    id?: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string;
    category: string;
    level: string;
    language: string;
    durationHours: number;
    thumbnail: string;
    banner: string;
    price: number;
    discountPrice: number | null;
    currency: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
    accessType: string;
    accessDays: number | null;
    whatYouWillLearn: string[];
    requirements: string[];
    targetAudience: string[];
    seoTitle: string;
    seoDescription: string;
    sections: BuilderSection[];
  }>({
    title: '',
    slug: '',
    shortDescription: '',
    description: '',
    category: 'Teacher Development',
    level: 'ALL_LEVELS',
    language: 'English',
    durationHours: 12,
    thumbnail: '',
    banner: '',
    price: 2499,
    discountPrice: 1999,
    currency: 'INR',
    status: 'DRAFT',
    accessType: 'LIFETIME',
    accessDays: null,
    whatYouWillLearn: [
      'Master dynamic classroom engagement techniques and pedagogical best practices',
      'Foster inclusive learning environments for early years and primary students',
      'Implement formative assessment strategies to measure holistic student growth'
    ],
    requirements: [
      'Passion for transformative education and classroom leadership',
      'Basic familiarity with primary school curriculum principles'
    ],
    targetAudience: [
      'Early Childhood Educators',
      'Primary & Secondary Teachers',
      'School Principals & Academic Coordinators'
    ],
    seoTitle: '',
    seoDescription: '',
    sections: [
      {
        id: `sec-${Date.now()}-1`,
        title: 'Module 1: Foundations & Pedagogy Setup',
        description: 'Core pedagogical frameworks, active classroom strategies, and foundational orientation.',
        order: 1,
        lessons: [
          {
            id: `les-${Date.now()}-1`,
            title: '1.1 Welcome & Course Orientation',
            description: 'Introduction to the course structure and key learning outcomes.',
            type: 'VIDEO',
            duration: '10:00',
            durationSeconds: 600,
            subLessons: [
              {
                id: `sub-${Date.now()}-1`,
                code: '1.1.1',
                title: '1.1.1 Key Learning Objectives & Syllabus Walkthrough',
                description: 'Detailed breakdown of modules and practical exercises.',
                type: 'VIDEO',
                duration: '05:00',
                order: 1
              }
            ],
            isFree: true,
            isPublished: true,
            order: 1
          }
        ]
      }
    ]
  });

  // Listen for custom preview event from CourseAssessmentsBanner or child components
  useEffect(() => {
    const handleOpenPreview = () => {
      setIsLivePreviewOpen(true);
    };
    window.addEventListener('open-course-builder-preview', handleOpenPreview);
    return () => window.removeEventListener('open-course-builder-preview', handleOpenPreview);
  }, []);

  // Client-side role safeguard
  useEffect(() => {
    if (currentUser && currentUser.role === 'STUDENT') {
      router.replace('/unauthorized?msg=' + encodeURIComponent('Students cannot access the course builder.'));
    }
  }, [currentUser, router]);

  // Load existing course if editing, or restore unsaved draft from localStorage so fields never disappear!
  useEffect(() => {
    if (editSlugOrId) {
      loadCourse(editSlugOrId);
    } else {
      try {
        const savedDraftRaw = localStorage.getItem(draftStorageKey);
        if (savedDraftRaw) {
          const parsed = JSON.parse(savedDraftRaw);
          if (parsed && typeof parsed === 'object' && parsed.courseState) {
            setCourseState((prev) => ({
              ...prev,
              ...parsed.courseState
            }));
            if (typeof parsed.currentStep === 'number') {
              setCurrentStep(parsed.currentStep);
            }
          }
        }
      } catch {
        // Ignore storage parse error
      }
      setHasLoadedInitial(true);
    }
  }, [editSlugOrId]);

  // Continuously save draft state to localStorage on every change so clicking Preview or refreshing NEVER loses work!
  useEffect(() => {
    if (!hasLoadedInitial) return;
    try {
      const payload = JSON.stringify({
        courseState,
        currentStep,
        updatedAt: Date.now()
      });
      localStorage.setItem(draftStorageKey, payload);
      localStorage.setItem('morena_course_builder_live_preview', payload);
    } catch {
      // Ignore quota exceeded errors
    }
  }, [courseState, currentStep, hasLoadedInitial, draftStorageKey]);

  const loadCourse = async (identifier: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${identifier}`);
      const data = await res.json();
      if (res.ok && data.course) {
        const c = data.course;
        const loadedState = {
          id: c.id,
          title: c.title,
          slug: c.slug,
          shortDescription: c.subtitle || c.shortDescription || '',
          description: c.description || '',
          category: c.category || 'Teacher Development',
          level: c.level || 'ALL_LEVELS',
          language: c.language || 'English',
          durationHours: c.durationHours || 0,
          thumbnail: c.thumbnail || '',
          banner: c.banner || '',
          price: c.price || 0,
          discountPrice: c.originalPrice || c.discountPrice || null,
          currency: c.currency || 'INR',
          status: c.status || 'DRAFT',
          accessType: c.accessType || 'LIFETIME',
          accessDays: c.accessDays || null,
          whatYouWillLearn: c.whatYouWillLearn || [],
          requirements: c.requirements || [],
          targetAudience: c.targetAudience || [],
          seoTitle: c.seoTitle || '',
          seoDescription: c.seoDescription || '',
          sections: (c.sections || []).map((s: any, sIdx: number) => ({
            id: s.id,
            title: s.title,
            description: s.description || '',
            order: s.order || sIdx + 1,
            lessons: (s.lessons || []).map((l: any, lIdx: number) => ({
              id: l.id,
              title: l.title,
              description: l.description || '',
              type: l.type || 'VIDEO',
              content: l.content,
              videoUrl: l.videoUrl,
              pdfUrl: l.pdfUrl,
              fileUrl: l.fileUrl,
              quizData: l.quizData,
              subLessons: Array.isArray(l.subLessons) ? l.subLessons : [],
              duration: l.duration,
              durationSeconds: l.durationSeconds,
              isFree: l.isFree,
              isPublished: l.isPublished,
              order: l.order || lIdx + 1
            }))
          }))
        };
        setCourseState(loadedState);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load course details.', type: 'error' });
    } finally {
      setIsLoading(false);
      setHasLoadedInitial(true);
    }
  };

  const handleUpdateField = (field: string, value: any) => {
    setCourseState((prev) => ({ ...prev, [field]: value }));
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!courseState.title.trim()) {
      showToast({
        title: 'Course Title Required',
        description: 'Please enter a course title before saving.',
        type: 'error'
      });
      setCurrentStep(0);
      throw new Error('Course title is required');
    }

    setIsSaving(true);
    try {
      let savedCourseId = courseState.id;
      let savedSlug = courseState.slug;

      const payload = {
        title: courseState.title,
        description: courseState.description || 'Draft course curriculum overview.',
        shortDescription: courseState.shortDescription,
        category: courseState.category,
        level: courseState.level,
        language: courseState.language,
        price: courseState.price,
        discountPrice: courseState.discountPrice,
        currency: courseState.currency || 'INR',
        thumbnail: courseState.thumbnail,
        banner: courseState.banner,
        durationHours: courseState.durationHours,
        status: courseState.status,
        whatYouWillLearn: courseState.whatYouWillLearn,
        requirements: courseState.requirements,
        targetAudience: courseState.targetAudience,
        seoTitle: courseState.seoTitle,
        seoDescription: courseState.seoDescription,
        accessType: courseState.accessType,
        accessDays: courseState.accessDays,
        sections: courseState.sections
      };

      if (!savedCourseId) {
        // Create new course in DB
        const res = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        let data: any = {};
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : {};
        } catch {
          if (res.status === 413) {
            throw new Error('Image or payload is too large for the server. Please select an optimized image under 5MB.');
          }
          throw new Error(`Server returned error (${res.status}). Please try again.`);
        }

        if (!res.ok) throw new Error(data.error || 'Failed to create course');

        savedCourseId = data.course.id;
        savedSlug = data.course.slug;
        setCourseState((prev) => ({ ...prev, id: savedCourseId, slug: savedSlug }));

        // Keep courseId in URL without reloading or resetting state
        if (typeof window !== 'undefined' && savedCourseId) {
          const url = new URL(window.location.href);
          url.searchParams.set('courseId', savedCourseId);
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        // Update existing course in DB
        const res = await fetch(`/api/courses/${courseState.slug || savedCourseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        let data: any = {};
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : {};
        } catch {
          if (res.status === 413) {
            throw new Error('Image or payload is too large for the server. Please select an optimized image under 5MB.');
          }
          throw new Error(`Server returned error (${res.status}). Please try again.`);
        }

        if (!res.ok) throw new Error(data.error || 'Failed to update course');
        if (data.course?.slug) savedSlug = data.course.slug;
      }

      showToast({
        title: 'Draft Saved Successfully 💾',
        description: `"${courseState.title}" saved to database.`,
        type: 'success'
      });

      return { id: savedCourseId, slug: savedSlug };
    } catch (err: any) {
      showToast({ title: 'Save Failed', description: err.message, type: 'error' });
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Course
  const handlePublishCourse = async () => {
    setIsPublishing(true);
    try {
      const savedInfo = await handleSaveDraft();
      const targetIdentifier = savedInfo?.slug || savedInfo?.id || courseState.slug || courseState.id;

      if (!targetIdentifier) {
        throw new Error('Could not identify saved course for publishing.');
      }

      const res = await fetch(`/api/courses/${targetIdentifier}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: true })
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        if (res.status === 413) {
          throw new Error('Publish payload is too large (413). Please choose a smaller image.');
        }
        throw new Error(`Server returned error (${res.status}). Please try again.`);
      }

      if (!res.ok) throw new Error(data.error || 'Failed to publish course');

      try {
        localStorage.removeItem('morena_course_builder_draft_new');
      } catch {}

      const isInstructor = currentUser?.role === 'INSTRUCTOR';
      if (isInstructor) {
        if (courseState.status === 'APPROVED') {
          setCourseState((prev) => ({ ...prev, status: 'PUBLISHED' }));
          showToast({
            title: 'Course Published Live! 🚀',
            description: 'Your approved masterclass is now live on the landing page for student enrollment.',
            type: 'success'
          });
        } else {
          setCourseState((prev) => ({ ...prev, status: 'IN_REVIEW' }));
          showToast({
            title: 'Course Submitted for Approval! 📋',
            description: 'Your course has been submitted for Review. Once approved, you will be able to publish it live.',
            type: 'success'
          });
        }
      } else {
        setCourseState((prev) => ({ ...prev, status: 'PUBLISHED' }));
        showToast({
          title: 'Course Published Live! 🚀',
          description: 'Your masterclass is now live on the landing page and available for student enrollment.',
          type: 'success'
        });
      }

      setTimeout(() => {
        router.push(isInstructor ? '/instructor' : '/admin/courses');
      }, 1200);
    } catch (err: any) {
      showToast({ title: 'Publishing Error', description: err.message, type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  // Revert / Move back to Draft
  const handleUnpublishCourse = async () => {
    setIsPublishing(true);
    try {
      const targetIdentifier = courseState.slug || courseState.id;
      if (!targetIdentifier) {
        throw new Error('Course identifier missing.');
      }

      const res = await fetch(`/api/courses/${targetIdentifier}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UNPUBLISH', status: 'DRAFT' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revert to draft');

      setCourseState((prev) => ({ ...prev, status: 'DRAFT' }));
      showToast({
        title: 'Course Moved to Draft 📝',
        description: 'Course is now unpublished and back in draft mode. You can edit curriculum privately.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({ title: 'Action Failed', description: err.message, type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  const isInstructor = currentUser?.role === 'INSTRUCTOR';

  const steps = [
    { title: '1. Basic Information', icon: 'info' },
    { title: '2. Media & Thumbnail', icon: 'image' },
    { title: '3. Curriculum & Syllabus', icon: 'view_timeline' },
    { title: '4. Pricing & Access', icon: 'payments' },
    { title: isInstructor ? '5. Review & Submit' : '5. Publish & Review', icon: 'verified' }
  ];

  // Flatten all lessons & subLessons for the live preview player
  const allPlayableItems = React.useMemo(() => {
    const items: any[] = [];
    (courseState.sections || []).forEach((sec, sIdx) => {
      const mNum = sIdx + 1;
      (sec.lessons || []).forEach((les, lIdx) => {
        const lCode = `${mNum}.${lIdx + 1}`;
        items.push({
          ...les,
          code: lCode,
          moduleTitle: sec.title,
          isSubTopic: false
        });
        (les.subLessons || []).forEach((sub, subIdx) => {
          const sCode = `${lCode}.${subIdx + 1}`;
          items.push({
            ...sub,
            code: sCode,
            moduleTitle: sec.title,
            parentLessonTitle: les.title,
            isSubTopic: true
          });
        });
      });
    });
    return items;
  }, [courseState.sections]);

  const currentPlayerItem = activePreviewItem || allPlayableItems[0] || null;

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Icon name="sync" size={32} className="animate-spin text-primary" />
        <p className="text-sm font-bold text-on-surface">Loading Course Studio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={isInstructor ? '/instructor' : '/admin/courses'}
            className="p-2 rounded-xl bg-surface border border-outline-variant hover:bg-surface-container text-on-surface-variant cursor-pointer"
            title="Back to courses list"
          >
            <Icon name="arrow_back" size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <span>{isInstructor ? 'Instructor Studio' : 'Course Builder'}</span>
              <span>/</span>
              <span className="text-primary font-bold">{courseState.category}</span>
              <span
                className={`text-[9px] font-bold uppercase font-mono px-2 py-0.2 rounded-full border ${
                  courseState.status === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : courseState.status === 'IN_REVIEW'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-surface-container text-outline border-outline-variant'
                }`}
              >
                {courseState.status === 'IN_REVIEW' ? 'Pending Approval' : courseState.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight mt-0.5">
              {courseState.title || 'Untitled Master Course'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* Live Course Preview Button (Opens modal without losing any form fields!) */}
          <button
            type="button"
            onClick={() => setIsLivePreviewOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Icon name="visibility" size={16} />
            <span>Preview Course</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDraft}
            className="px-4 py-2.5 bg-surface text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:bg-surface-container shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Icon name="save" size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue</span>
              <Icon name="arrow_forward" size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isPublishing}
              onClick={handlePublishCourse}
              className="px-6 py-2.5 bg-primary text-on-primary font-black text-xs rounded-xl hover:bg-primary-container shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Icon name={isInstructor ? 'send' : 'rocket_launch'} size={16} />
              <span>
                {isPublishing
                  ? isInstructor
                    ? 'Submitting...'
                    : 'Publishing...'
                  : isInstructor
                  ? 'Submit for Approval'
                  : 'Publish Course Live'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Step Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant/70">
        {steps.map((s, idx) => {
          const isActive = currentStep === idx;
          const isDone = currentStep > idx;

          return (
            <button
              key={s.title}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`p-3 rounded-xl text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs'
                  : isDone
                  ? 'bg-surface text-emerald-800 hover:bg-surface-container'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isDone
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-surface-container text-outline'
                }`}
              >
                {isDone ? <Icon name="check" size={14} /> : idx + 1}
              </div>
              <span className="text-xs font-bold truncate">{s.title.replace(/^\d+\.\s*/, '')}</span>
            </button>
          );
        })}
      </div>

      {/* Step 1: Basic Info */}
      {currentStep === 0 && (
        <CourseBasicInfoStep
          data={{
            title: courseState.title,
            slug: courseState.slug,
            shortDescription: courseState.shortDescription,
            description: courseState.description,
            category: courseState.category,
            level: courseState.level,
            language: courseState.language,
            durationHours: courseState.durationHours,
            whatYouWillLearn: courseState.whatYouWillLearn,
            requirements: courseState.requirements,
            targetAudience: courseState.targetAudience,
            seoTitle: courseState.seoTitle,
            seoDescription: courseState.seoDescription
          }}
          onChange={handleUpdateField}
        />
      )}

      {/* Step 2: Media */}
      {currentStep === 1 && (
        <CourseMediaStep
          thumbnail={courseState.thumbnail}
          banner={courseState.banner}
          onChange={handleUpdateField}
        />
      )}

      {/* Step 3: Curriculum */}
      {currentStep === 2 && (
        <CourseCurriculumStep
          sections={courseState.sections}
          onChange={(newSections) => handleUpdateField('sections', newSections)}
          courseSlug={courseState.slug}
        />
      )}

      {/* Step 4: Pricing */}
      {currentStep === 3 && (
        <CoursePricingStep
          price={courseState.price}
          discountPrice={courseState.discountPrice}
          currency={courseState.currency}
          accessType={courseState.accessType}
          accessDays={courseState.accessDays}
          onChange={handleUpdateField}
        />
      )}

      {/* Step 5: Publish & Pre-flight Checklist */}
      {currentStep === 4 && (
        <CoursePublishStep
          courseData={courseState}
          userRole={currentUser?.role}
          onJumpToStep={(stepIdx) => setCurrentStep(stepIdx)}
          onPublish={handlePublishCourse}
          onUnpublish={handleUnpublishCourse}
          isPublishing={isPublishing}
        />
      )}

      {/* Bottom Step Navigation Bar */}
      <div className="flex justify-between items-center pt-6 border-t border-outline-variant">
        <button
          type="button"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          className="px-5 py-2.5 bg-surface text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:bg-surface-container flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
        >
          <Icon name="arrow_back" size={16} />
          <span>Previous Step</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsLivePreviewOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Icon name="visibility" size={16} />
            <span>Preview Course</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDraft}
            className="px-4 py-2.5 bg-surface text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:bg-surface-container flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="save" size={16} />
            <span>Save Draft</span>
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="px-6 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next: {steps[currentStep + 1]?.title.replace(/^\d+\.\s*/, '')}</span>
              <Icon name="arrow_forward" size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={
                isPublishing ||
                (isInstructor && (courseState.status === 'IN_REVIEW' || courseState.status === 'PUBLISHED'))
              }
              onClick={handlePublishCourse}
              className={`px-6 py-2.5 font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isInstructor && courseState.status === 'APPROVED'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-primary text-on-primary hover:bg-primary-container'
              }`}
            >
              {isPublishing ? (
                <>
                  <Icon name="sync" size={16} className="animate-spin" />
                  <span>
                    {isInstructor
                      ? courseState.status === 'APPROVED'
                        ? 'Publishing Live...'
                        : 'Submitting...'
                      : 'Publishing...'}
                  </span>
                </>
              ) : isInstructor ? (
                courseState.status === 'APPROVED' ? (
                  <>
                    <Icon name="rocket_launch" size={16} />
                    <span>Publish Masterclass Live 🚀</span>
                  </>
                ) : courseState.status === 'IN_REVIEW' ? (
                  <>
                    <Icon name="hourglass_top" size={16} />
                    <span>Under Review ⏳</span>
                  </>
                ) : courseState.status === 'PUBLISHED' ? (
                  <>
                    <Icon name="check_circle" size={16} />
                    <span>Course is Live ✅</span>
                  </>
                ) : (
                  <>
                    <Icon name="send" size={16} />
                    <span>Submit for Approval 📋</span>
                  </>
                )
              ) : (
                <>
                  <Icon name="rocket_launch" size={16} />
                  <span>Publish Masterclass</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          FULL-SCREEN INTERACTIVE LIVE COURSE PREVIEW MODAL
          Closing (Cross 'X') returns immediately to Builder with 0% data loss!
         ===================================================================== */}
      {isLivePreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col animate-in fade-in duration-150">
          {/* Top Sticky Preview Control Bar */}
          <div className="bg-slate-900 text-white border-b border-indigo-500/30 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold uppercase">
                Live Student Course Preview
              </span>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate max-w-md">
                {courseState.title || 'Untitled Course (Draft Preview)'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-950 p-1 rounded-xl border border-white/10 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewTab('LANDING')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    previewTab === 'LANDING'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon name="storefront" size={15} />
                  <span>1. Course Landing Page &amp; Syllabus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('PLAYER')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    previewTab === 'PLAYER'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon name="play_circle" size={15} />
                  <span>2. Classroom Video &amp; Content Player</span>
                </button>
              </div>

              {/* Close ('X') Button - Closes preview overlay while keeping 100% of typed builder fields! */}
              <button
                type="button"
                onClick={() => setIsLivePreviewOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                title="Close Preview and return to Course Builder (all fields are preserved)"
              >
                <Icon name="close" size={18} />
                <span>Close Preview</span>
              </button>
            </div>
          </div>

          {/* Preview Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-900">
            {previewTab === 'LANDING' ? (
              <div>
                {/* Hero Banner */}
                <section className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white py-10 px-4 sm:px-8">
                  <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase">
                        <span>{courseState.category || 'Course'}</span>
                        <span>•</span>
                        <span>{courseState.level}</span>
                        <span>•</span>
                        <span>{courseState.language}</span>
                      </div>
                      <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                        {courseState.title || 'Untitled Master Course'}
                      </h1>
                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                        {courseState.shortDescription || 'Add a short subtitle in Step 1 to display it here.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
                        <span>👨‍🏫 Instructor: <strong>{currentUser?.name || 'Course Instructor'}</strong></span>
                        <span>⏱️ Duration: <strong>{courseState.durationHours || 12} Hours</strong></span>
                        <span>📚 Modules: <strong>{courseState.sections.length}</strong></span>
                      </div>
                    </div>

                    {/* Right Price & Thumbnail Card */}
                    <div className="lg:col-span-4 bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                      {courseState.thumbnail ? (
                        <img
                          src={courseState.thumbnail}
                          alt={courseState.title}
                          className="w-full aspect-video object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-slate-900 text-slate-400 flex flex-col items-center justify-center gap-2 text-xs">
                          <Icon name="image" size={32} />
                          <span>Course Thumbnail Preview</span>
                        </div>
                      )}
                      <div className="p-5 space-y-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-900">
                            {courseState.price === 0
                              ? 'FREE'
                              : `${courseState.currency === 'USD' ? '$' : '₹'}${courseState.price}`}
                          </span>
                          {courseState.discountPrice && courseState.discountPrice > courseState.price && (
                            <span className="text-sm text-slate-400 line-through font-semibold">
                              {courseState.currency === 'USD' ? '$' : '₹'}
                              {courseState.discountPrice}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewTab('PLAYER')}
                          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Icon name="play_circle" size={18} />
                          <span>Test Course in Classroom Player →</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Main Content & Hierarchical Syllabus (Module -> 1.1 -> 1.1.1) */}
                <div className="max-w-6xl mx-auto py-10 px-4 sm:px-8 space-y-8">
                  {/* What You Will Learn */}
                  {courseState.whatYouWillLearn?.length > 0 && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                      <h3 className="text-base font-black text-slate-900 mb-4">What You Will Learn</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {courseState.whatYouWillLearn.filter(Boolean).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                            <Icon name="check_circle" size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Description */}
                  {courseState.description && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <h3 className="text-base font-black text-slate-900">Course Description</h3>
                      <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                        {courseState.description}
                      </p>
                    </div>
                  )}

                  {/* Complete Multi-Level Curriculum Breakdown */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900">
                      Course Curriculum &amp; Syllabus ({courseState.sections.length} Modules)
                    </h3>

                    {courseState.sections.map((sec, sIdx) => {
                      const mNum = sIdx + 1;
                      return (
                        <div
                          key={sec.id}
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
                        >
                          <div className="p-4 sm:p-5 bg-slate-100/80 border-b border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-mono text-xs">
                                  Module {mNum}
                                </span>
                                <span>{sec.title}</span>
                              </h4>
                              <span className="text-xs font-mono text-slate-500">
                                {sec.lessons.length} Lesson(s)
                              </span>
                            </div>
                            {sec.description && (
                              <p className="text-xs text-slate-600 leading-relaxed pl-1">
                                {sec.description}
                              </p>
                            )}
                          </div>

                          <div className="divide-y divide-slate-100 p-4 space-y-3">
                            {sec.lessons.map((les, lIdx) => {
                              const lCode = `${mNum}.${lIdx + 1}`;
                              const subs = Array.isArray(les.subLessons) ? les.subLessons : [];

                              return (
                                <div key={les.id} className="pt-2 first:pt-0 space-y-2">
                                  <div
                                    onClick={() => {
                                      setActivePreviewItem({ ...les, code: lCode, moduleTitle: sec.title });
                                      setPreviewTab('PLAYER');
                                    }}
                                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-indigo-50/60 cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-xs shrink-0">
                                        {lCode}
                                      </span>
                                      <div>
                                        <p className="text-xs sm:text-sm font-bold text-slate-900">
                                          {les.title}
                                        </p>
                                        {les.description && (
                                          <p className="text-[11px] text-slate-500 mt-0.5">{les.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 shrink-0">
                                      <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-slate-100">
                                        {les.type}
                                      </span>
                                      <span>{les.duration || '10:00'}</span>
                                    </div>
                                  </div>

                                  {/* Sub-Categories (1.1.1, 1.1.2, 2.1.1) */}
                                  {subs.length > 0 && (
                                    <div className="pl-6 sm:pl-10 space-y-1.5 border-l-2 border-indigo-200 ml-3">
                                      {subs.map((sub, subIdx) => {
                                        const sCode = `${lCode}.${subIdx + 1}`;
                                        return (
                                          <div
                                            key={sub.id}
                                            onClick={() => {
                                              setActivePreviewItem({
                                                ...sub,
                                                code: sCode,
                                                moduleTitle: sec.title,
                                                parentLessonTitle: les.title
                                              });
                                              setPreviewTab('PLAYER');
                                            }}
                                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 hover:bg-violet-50 border border-slate-200/70 cursor-pointer transition-colors"
                                          >
                                            <div className="flex items-start gap-2">
                                              <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 font-mono font-bold text-[11px] shrink-0">
                                                {sCode}
                                              </span>
                                              <div>
                                                <p className="text-xs font-semibold text-slate-800">
                                                  {sub.title}
                                                </p>
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* MODE 2: INTERACTIVE CLASSROOM PLAYER */
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[82vh]">
                <div className="lg:col-span-8 bg-slate-950 text-white p-6 flex flex-col justify-between">
                  {currentPlayerItem ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-indigo-300 font-mono">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 font-bold">
                          {currentPlayerItem.code || '1.1'}
                        </span>
                        <span>{currentPlayerItem.moduleTitle}</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        {currentPlayerItem.title}
                      </h3>
                      {currentPlayerItem.description && (
                        <p className="text-xs text-slate-300">{currentPlayerItem.description}</p>
                      )}

                      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black min-h-[360px] flex items-center justify-center">
                        {currentPlayerItem.type === 'VIDEO' ? (
                          currentPlayerItem.videoUrl ? (
                            <VideoPlayer
                              videoUrl={currentPlayerItem.videoUrl}
                              title={currentPlayerItem.title}
                            />
                          ) : (
                            <div className="p-12 text-center space-y-2 text-slate-400">
                              <Icon name="movie" size={40} className="mx-auto text-indigo-400" />
                              <p className="text-sm font-bold text-white">Video Lecture Slot Ready</p>
                              <p className="text-xs">
                                Add a Video URL or Upload an MP4 in Step 3 for {currentPlayerItem.code} to play it here.
                              </p>
                            </div>
                          )
                        ) : currentPlayerItem.type === 'TEXT' ? (
                          <div className="w-full p-6 bg-white text-slate-900 min-h-[360px]">
                            <ArticlePlayer
                              title={currentPlayerItem.title}
                              content={currentPlayerItem.content || 'No article text entered yet.'}
                            />
                          </div>
                        ) : currentPlayerItem.type === 'QUIZ' ? (
                          <div className="w-full p-6 bg-white text-slate-900 min-h-[360px]">
                            <QuizPlayer
                              lessonId={currentPlayerItem.id}
                              quizData={
                                typeof currentPlayerItem.quizData === 'string'
                                  ? currentPlayerItem.quizData
                                  : JSON.stringify(currentPlayerItem.quizData || { questions: [] })
                              }
                              onPass={() => {}}
                            />
                          </div>
                        ) : (
                          <div className="p-12 text-center space-y-3 text-slate-300">
                            <Icon name="picture_as_pdf" size={40} className="mx-auto text-rose-400" />
                            <p className="text-sm font-bold">{currentPlayerItem.title}</p>
                            {currentPlayerItem.pdfUrl ? (
                              <a
                                href={currentPlayerItem.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                              >
                                Open Attached PDF Resource →
                              </a>
                            ) : (
                              <p className="text-xs text-slate-400">No PDF URL attached yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-400">No lessons added yet.</div>
                  )}
                </div>

                {/* Right Curriculum Sidebar inside Player */}
                <div className="lg:col-span-4 bg-white border-l border-slate-200 p-4 overflow-y-auto space-y-4">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-700">
                    Course Syllabus Navigation
                  </h4>
                  {courseState.sections.map((sec, sIdx) => {
                    const mNum = sIdx + 1;
                    return (
                      <div key={sec.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-3 bg-slate-100 font-bold text-xs text-slate-900">
                          Module {mNum}: {sec.title}
                          {sec.description && (
                            <p className="text-[11px] font-normal text-slate-500 mt-0.5">{sec.description}</p>
                          )}
                        </div>
                        <div className="divide-y divide-slate-100">
                          {sec.lessons.map((les, lIdx) => {
                            const lCode = `${mNum}.${lIdx + 1}`;
                            const subs = Array.isArray(les.subLessons) ? les.subLessons : [];
                            return (
                              <div key={les.id}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActivePreviewItem({ ...les, code: lCode, moduleTitle: sec.title })
                                  }
                                  className={`w-full text-left p-2.5 text-xs flex items-center justify-between gap-2 cursor-pointer ${
                                    currentPlayerItem?.id === les.id
                                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                                      : 'hover:bg-slate-50 text-slate-800'
                                  }`}
                                >
                                  <span>
                                    <strong className="font-mono mr-1.5">{lCode}</strong>
                                    {les.title}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">{les.duration}</span>
                                </button>
                                {subs.map((sub, subIdx) => {
                                  const sCode = `${lCode}.${subIdx + 1}`;
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() =>
                                        setActivePreviewItem({
                                          ...sub,
                                          code: sCode,
                                          moduleTitle: sec.title
                                        })
                                      }
                                      className={`w-full text-left pl-7 pr-2.5 py-2 text-[11px] flex items-center justify-between gap-2 border-t border-slate-100 cursor-pointer ${
                                        currentPlayerItem?.id === sub.id
                                          ? 'bg-violet-50 text-violet-700 font-bold'
                                          : 'bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      <span>
                                        <strong className="font-mono text-violet-700 mr-1.5">{sCode}</strong>
                                        {sub.title}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {sub.duration || '05:00'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-on-surface-variant">
          Loading Course Builder...
        </div>
      }
    >
      <CourseBuilderContent />
    </Suspense>
  );
}
