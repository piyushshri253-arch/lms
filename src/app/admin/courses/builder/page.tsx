'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { CourseBasicInfoStep } from '@/components/course-builder/CourseBasicInfoStep';
import { CourseMediaStep } from '@/components/course-builder/CourseMediaStep';
import { CourseCurriculumStep, BuilderSection, getLessonResourcesList, LessonResourceItem } from '@/components/course-builder/CourseCurriculumStep';
import { CoursePricingStep } from '@/components/course-builder/CoursePricingStep';
import { CoursePublishStep } from '@/components/course-builder/CoursePublishStep';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { ArticlePlayer } from '@/components/player/ArticlePlayer';
import { QuizPlayer } from '@/components/player/QuizPlayer';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { CurriculumAccordion } from '@/components/courses/CurriculumAccordion';
import { downloadCourseExcelTemplate, parseCourseExcelFile, exportCourseToExcelFile } from '@/lib/course-excel';
import { BatchCurriculumMediaManager } from '@/components/course-builder/BatchCurriculumMediaManager';
import { CourseTutorialModal } from '@/components/course-builder/CourseTutorialModal';

const getDefaultCourseState = () => ({
  id: '',
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
  status: 'DRAFT' as const,
  accessType: 'LIFETIME',
  accessDays: null,
  whatYouWillLearn: [] as string[],
  requirements: [] as string[],
  targetAudience: [] as string[],
  seoTitle: '',
  seoDescription: '',
  sections: [
    {
      id: `sec-${Date.now()}-1`,
      clientKey: `sec-${Date.now()}-1`,
      tempId: `sec-${Date.now()}-1`,
      title: '',
      description: '',
      order: 1,
      lessons: [
        {
          id: `les-${Date.now()}-1`,
          clientKey: `les-${Date.now()}-1`,
          tempId: `les-${Date.now()}-1`,
          title: '',
          description: '',
          type: 'VIDEO' as const,
          duration: '10:00',
          durationSeconds: 600,
          subLessons: [],
          isFree: true,
          isPublished: true,
          order: 1
        }
      ]
    }
  ] as BuilderSection[]
});

export interface UploadedExcelRecord {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  fileData?: string;
}

function CourseBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, currentUser } = useApp();

  const editSlugOrId =
    searchParams.get('slug') || searchParams.get('courseId') || searchParams.get('id') || '';

  const [activeCourseId, setActiveCourseId] = useState<string>(editSlugOrId);

  useEffect(() => {
    if (editSlugOrId && editSlugOrId !== activeCourseId) {
      setActiveCourseId(editSlugOrId);
    }
  }, [editSlugOrId]);

  const effectiveCourseId = activeCourseId || editSlugOrId;
  const draftStorageKey = effectiveCourseId ? `morena_course_builder_draft_${effectiveCourseId}` : 'morena_course_builder_draft_new';
  const excelStorageKey = effectiveCourseId ? `morena_uploaded_excel_${effectiveCourseId}` : 'morena_uploaded_excel_new';

  const [uploadedExcel, setUploadedExcel] = useState<UploadedExcelRecord | null>(null);
  const uploadedExcelRef = React.useRef<UploadedExcelRecord | null>(uploadedExcel);
  uploadedExcelRef.current = uploadedExcel;

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(!!editSlugOrId);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isImportingExcel, setIsImportingExcel] = useState<boolean>(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState<boolean>(false);

  // Background auto-save to database status
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = React.useRef<boolean>(false);
  const lastSavedPayloadRef = React.useRef<string>('');
  const loadedCourseIdRef = React.useRef<string | null>(null);

  // Live Preview Modal State (keeps 100% of form state intact when opened/closed!)
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'LANDING' | 'PLAYER'>('LANDING');
  const [activePreviewItem, setActivePreviewItem] = useState<any>(null);

  // Video Tutorial Modal State (Dual English & Hindi walkthrough)
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState<boolean>(false);
  const [tutorialModalLang, setTutorialModalLang] = useState<'en' | 'hi'>('en');

  // Load cached uploaded excel file on mount or when course changes
  useEffect(() => {
    try {
      let raw = localStorage.getItem(excelStorageKey);
      if (!raw && effectiveCourseId) {
        // Fallback: check if previously uploaded under 'new'
        raw = localStorage.getItem('morena_uploaded_excel_new');
        if (raw) {
          try {
            localStorage.setItem(excelStorageKey, raw);
          } catch {}
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.fileName) {
          setUploadedExcel(parsed);
          return;
        }
      }

      // CRITICAL FIX: If uploadedExcel is already present in state for this active editing session,
      // DO NOT reset it to null when effectiveCourseId or excelStorageKey changes during background auto-save!
      setUploadedExcel((prev) => {
        if (prev && prev.fileName) {
          try {
            localStorage.setItem(excelStorageKey, JSON.stringify(prev));
          } catch {}
          return prev;
        }
        return null;
      });
    } catch {
      // Ignore parse error
    }
  }, [excelStorageKey, effectiveCourseId]);

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
  }>(getDefaultCourseState());

  // Mutable ref to always have latest courseState without stale closure pitfalls in debounced timers
  const courseStateRef = React.useRef(courseState);
  courseStateRef.current = courseState;

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

  // Start Fresh / Clear form handler
  const handleStartFreshCourse = (showConfirm = true) => {
    if (showConfirm && courseState.title && !confirm('Are you sure you want to start a new course? Any unsaved changes on the current form will be cleared.')) {
      return;
    }
    try {
      localStorage.removeItem('morena_course_builder_draft_new');
      localStorage.removeItem('morena_uploaded_excel_new');
      localStorage.removeItem('morena_course_builder_live_preview');
      if (courseState.id) localStorage.removeItem(`morena_course_builder_draft_${courseState.id}`);
      if (courseState.slug) localStorage.removeItem(`morena_course_builder_draft_${courseState.slug}`);
      if (activeCourseId) localStorage.removeItem(`morena_course_builder_draft_${activeCourseId}`);
    } catch {}

    const cleanDefault = getDefaultCourseState();
    courseStateRef.current = cleanDefault;
    setCourseState(cleanDefault);
    setCurrentStep(0);
    setUploadedExcel(null);
    lastSavedPayloadRef.current = '';
    loadedCourseIdRef.current = null;
    setActiveCourseId('');

    if (typeof window !== 'undefined') {
      const cleanUrl = isInstructor ? '/instructor/courses/builder' : '/admin/courses/builder';
      window.history.replaceState({}, '', cleanUrl);
    }

    showToast({
      title: 'Blank Form Ready 📝',
      description: 'Course builder reset. You can now create a brand new course!',
      type: 'success'
    });
  };

  // Load existing course if editing, or restore unsaved draft from localStorage so fields never disappear!
  useEffect(() => {
    const isFreshNew = searchParams.get('new') === 'true' || searchParams.get('fresh') === 'true';
    if (isFreshNew) {
      try {
        localStorage.removeItem('morena_course_builder_draft_new');
        localStorage.removeItem('morena_uploaded_excel_new');
        localStorage.removeItem('morena_course_builder_live_preview');
      } catch {}

      const cleanDefault = getDefaultCourseState();
      courseStateRef.current = cleanDefault;
      setCourseState(cleanDefault);
      setCurrentStep(0);
      setUploadedExcel(null);
      lastSavedPayloadRef.current = '';
      loadedCourseIdRef.current = null;
      setActiveCourseId('');

      if (typeof window !== 'undefined') {
        const cleanUrl = isInstructor ? '/instructor/courses/builder' : '/admin/courses/builder';
        window.history.replaceState({}, '', cleanUrl);
      }
      setHasLoadedInitial(true);
      setIsLoading(false);
      return;
    }

    if (editSlugOrId) {
      // If this course is already loaded into memory or is currently being authored, do not re-fetch from server!
      if (loadedCourseIdRef.current === editSlugOrId || (courseStateRef.current.id && courseStateRef.current.id === editSlugOrId)) {
        setHasLoadedInitial(true);
        setIsLoading(false);
        return;
      }
      loadedCourseIdRef.current = editSlugOrId;
      loadCourse(editSlugOrId);
    } else {
      // In new course mode (!editSlugOrId), purge any stale bulk import or covid drafts
      try {
        const savedDraftRaw = localStorage.getItem('morena_course_builder_draft_new');
        if (savedDraftRaw) {
          const parsed = JSON.parse(savedDraftRaw);
          const isCovid = /covid/i.test(parsed?.courseState?.title || '') ||
            parsed?.courseState?.sections?.some((s: any) => /covid/i.test(s?.title || ''));
          const isLargeBulkImport = parsed?.courseState?.sections && parsed.courseState.sections.length > 2;

          if (isCovid || isLargeBulkImport || parsed?.courseState?.id) {
            // Immediately purge stale/bulk drafts
            localStorage.removeItem('morena_course_builder_draft_new');
            localStorage.removeItem('morena_uploaded_excel_new');
            const cleanDefault = getDefaultCourseState();
            courseStateRef.current = cleanDefault;
            setCourseState(cleanDefault);
          } else if (parsed && typeof parsed === 'object' && parsed.courseState) {
            if (!parsed.courseState.id && parsed.courseState.title && parsed.courseState.status === 'DRAFT') {
              setCourseState((prev) => ({
                ...prev,
                ...parsed.courseState
              }));
              if (typeof parsed.currentStep === 'number') {
                setCurrentStep(parsed.currentStep);
              }
            } else {
              localStorage.removeItem('morena_course_builder_draft_new');
            }
          }
        }
      } catch {
        // Ignore storage parse error
      }
      setHasLoadedInitial(true);
    }
  }, [editSlugOrId, searchParams]);

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

  // Automated background auto-save to PostgreSQL DB (debounced 3.5s)
  // When an instructor creates or updates a course, it automatically saves to DB as DRAFT
  // so if they close the browser or leave, it already appears under Drafts in Instructor Studio!
  useEffect(() => {
    if (!hasLoadedInitial || isPublishing || isImportingExcel) return;
    if (courseState.status !== 'DRAFT') return;
    if (!courseState.title || courseState.title.trim().length < 3) return;

    // Hash summary of content including lessons, videos, and multi-format attached study resources
    const currentPayloadSummary = JSON.stringify({
      title: courseState.title.trim(),
      description: courseState.description,
      shortDescription: courseState.shortDescription,
      price: courseState.price,
      currency: courseState.currency,
      category: courseState.category,
      level: courseState.level,
      sectionsCount: courseState.sections?.length,
      sectionsSummary: courseState.sections?.map((s) => ({
        id: s.id,
        title: s.title,
        lessons: s.lessons?.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          contentLength: l.content?.length || 0,
          contentPreview: (l.content || '').slice(0, 40),
          quizCount: typeof l.quizData === 'object' && l.quizData?.questions ? l.quizData.questions.length : 0,
          quizScore: typeof l.quizData === 'object' ? l.quizData?.passingScore : undefined,
          videoUrl: l.videoUrl,
          pdfUrl: l.pdfUrl,
          fileUrl: l.fileUrl,
          resourceFileName: l.resourceFileName,
          resourcesCount: l.resourcesList?.length || 0,
          resourcesSummary: l.resourcesList?.map((r) => `${r.id}_${r.name}_${r.url}`).join(',')
        }))
      }))
    });

    if (currentPayloadSummary === lastSavedPayloadRef.current) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (isAutoSavingRef.current || isPublishing || isImportingExcel) return;
      try {
        isAutoSavingRef.current = true;
        setAutoSaveStatus('saving');
        await handleSaveDraft({ silent: true });
        lastSavedPayloadRef.current = currentPayloadSummary;
        setAutoSaveStatus('saved');
      } catch (err: any) {
        console.warn('Background auto-save failed:', err?.message);
        setAutoSaveStatus('idle');
      } finally {
        isAutoSavingRef.current = false;
      }
    }, 3500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [courseState, hasLoadedInitial, isPublishing, isImportingExcel]);

  const loadCourse = async (identifier: string) => {
    setIsLoading(true);
    loadedCourseIdRef.current = identifier;
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(identifier)}`);
      const data = await res.json();
      if (res.ok && data.course) {
        const c = data.course;
        const parseArrayField = (raw: any): string[] => {
          if (Array.isArray(raw)) return raw;
          if (typeof raw === 'string') {
            try {
              const p = JSON.parse(raw);
              if (Array.isArray(p)) return p;
            } catch {}
            return raw.split(/[;\n\r]+/).map((s: string) => s.trim()).filter(Boolean);
          }
          return [];
        };

        const loadedState = {
          id: c.id,
          title: c.title,
          slug: c.slug,
          shortDescription: c.subtitle || c.shortDescription || '',
          description: c.description || '',
          category:
            typeof c.category === 'object' && c.category
              ? c.category.name || ''
              : String(c.category || 'Teacher Development'),
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
          whatYouWillLearn: parseArrayField(c.whatYouWillLearn),
          requirements: parseArrayField(c.requirements),
          targetAudience: parseArrayField(c.targetAudience),
          seoTitle: c.seoTitle || '',
          seoDescription: c.seoDescription || '',
          sections: (c.sections || []).map((s: any, sIdx: number) => ({
            id: s.id,
            clientKey: s.id,
            tempId: s.id,
            title: s.title,
            description: s.description || '',
            order: s.order || sIdx + 1,
            lessons: (s.lessons || []).map((l: any, lIdx: number) => {
              let parsedRes: any = null;
              try {
                parsedRes = JSON.parse(l.resources || '[]');
              } catch {}
              const subLessons = Array.isArray(l.subLessons)
                ? l.subLessons
                : Array.isArray(parsedRes)
                ? parsedRes
                : parsedRes?.subLessons || [];
              const videoFileName = l.videoFileName || (!Array.isArray(parsedRes) && parsedRes?.videoFileName) || undefined;
              const resourceFileName = l.resourceFileName || (!Array.isArray(parsedRes) && parsedRes?.resourceFileName) || undefined;
              const resourcesList = Array.isArray(l.resourcesList)
                ? l.resourcesList
                : (!Array.isArray(parsedRes) && Array.isArray(parsedRes?.resourcesList))
                ? parsedRes.resourcesList
                : undefined;

              return {
                id: l.id,
                clientKey: l.id,
                tempId: l.id,
                title: l.title,
                description: l.description || '',
                type: l.type || 'VIDEO',
                content: l.content,
                videoUrl: l.videoUrl,
                videoFileName,
                resourceFileName,
                resourcesList,
                pdfUrl: l.pdfUrl,
                fileUrl: l.fileUrl,
                quizData: l.quizData,
                subLessons,
                duration: l.duration,
                durationSeconds: l.durationSeconds,
                isFree: l.isFree,
                isFinalAssignment: Boolean(l.isFinalAssignment || (l.type === 'QUIZ' && /final\s+assignment/i.test(l.title || ''))),
                isPublished: l.isPublished,
                order: l.order || lIdx + 1
              };
            })
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

  // Helper to ensure any base64 image payload stays under 200KB before transmission
  const ensureOptimizedDataUrl = async (dataUrl?: string, maxWidth = 960, maxHeight = 540, quality = 0.75): Promise<string | undefined> => {
    if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length < 250 * 1024) {
      return dataUrl;
    }
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch {
        resolve(dataUrl);
      }
    });
  };

  // Save as Draft
  const handleSaveDraft = async (options?: {
    submitForApproval?: boolean;
    silent?: boolean;
    resetAfterSave?: boolean;
  }) => {
    const state = courseStateRef.current;
    if (!state.title.trim()) {
      if (!options?.silent) {
        showToast({
          title: 'Course Title Required',
          description: 'Please enter a course title before saving.',
          type: 'error'
        });
        setCurrentStep(0);
      }
      if (options?.silent) {
        return null;
      }
      throw new Error('Course title is required');
    }

    if (!options?.silent) {
      setIsSaving(true);
    }
    try {
      let savedCourseId = state.id || editSlugOrId || '';
      let savedSlug = state.slug || '';

      const isSubmitting = Boolean(options?.submitForApproval);
      const isInstructorUser = currentUser?.role === 'INSTRUCTOR';

      // Auto-compress any bulky base64 data URLs to prevent Vercel 413 payload limit
      const [optimizedThumbnail, optimizedBanner] = await Promise.all([
        ensureOptimizedDataUrl(state.thumbnail, 960, 540, 0.75),
        ensureOptimizedDataUrl(state.banner, 1280, 720, 0.72)
      ]);

      if (optimizedThumbnail !== state.thumbnail || optimizedBanner !== state.banner) {
        const withOptimized = {
          ...courseStateRef.current,
          thumbnail: optimizedThumbnail || courseStateRef.current.thumbnail,
          banner: optimizedBanner || courseStateRef.current.banner
        };
        courseStateRef.current = withOptimized;
        setCourseState(withOptimized);
      }

      const payload = {
        title: state.title,
        description: state.description || 'Draft course curriculum overview.',
        shortDescription: state.shortDescription,
        category: state.category,
        level: state.level,
        language: state.language,
        price: state.price,
        discountPrice: state.discountPrice,
        currency: state.currency || 'INR',
        thumbnail: optimizedThumbnail || state.thumbnail,
        banner: optimizedBanner || state.banner,
        durationHours: state.durationHours,
        status: isSubmitting && isInstructorUser ? 'IN_REVIEW' : state.status,
        submitForApproval: isSubmitting,
        submitVersionForReview: isSubmitting,
        whatYouWillLearn: state.whatYouWillLearn,
        requirements: state.requirements,
        targetAudience: state.targetAudience,
        seoTitle: state.seoTitle,
        seoDescription: state.seoDescription,
        accessType: state.accessType,
        accessDays: state.accessDays,
        sections: (state.sections || []).map((sec) => ({
          ...sec,
          lessons: (sec.lessons || []).map((les) => ({
            ...les,
            // Prevent bulky base64 data URLs from blowing up request payload
            videoUrl: les.videoUrl?.startsWith('data:') ? '' : les.videoUrl,
            videoFileName: les.videoFileName,
            resourceFileName: les.resourceFileName,
            resourcesList: les.resourcesList,
            pdfUrl: les.pdfUrl,
            fileUrl: les.fileUrl,
            clearVideo: (les as any).clearVideo ? true : undefined,
            removeVideo: (les as any).removeVideo ? true : undefined
          }))
        }))
      };

      let responseData: any = null;

      if (!savedCourseId) {
        // Create new course in DB
        const res = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        try {
          const text = await res.text();
          responseData = text ? JSON.parse(text) : {};
        } catch {
          if (res.status === 413) {
            throw new Error('Image or payload is too large for the server. Please select an optimized image under 5MB.');
          }
          throw new Error(`Server returned error (${res.status}). Please try again.`);
        }

        if (!res.ok) throw new Error(responseData?.error || 'Failed to create course');

        if (responseData?.course?.id) {
          savedCourseId = responseData.course.id;
          loadedCourseIdRef.current = savedCourseId;
          setActiveCourseId(savedCourseId);
          try {
            localStorage.removeItem('morena_course_builder_draft_new');
            localStorage.removeItem('morena_uploaded_excel_new');
          } catch {}
        }
        if (responseData?.course?.slug) savedSlug = responseData.course.slug;
      } else {
        // Update existing course in DB using reliable ID/identifier
        const targetIdentifier = savedCourseId || state.id || state.slug;
        const res = await fetch(`/api/courses/${encodeURIComponent(targetIdentifier)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        try {
          const text = await res.text();
          responseData = text ? JSON.parse(text) : {};
        } catch {
          if (res.status === 413) {
            throw new Error('Image or payload is too large for the server. Please select an optimized image under 5MB.');
          }
          throw new Error(`Server returned error (${res.status}). Please try again.`);
        }

        if (!res.ok) throw new Error(responseData?.error || 'Failed to update course');
        if (responseData?.course?.id) {
          savedCourseId = responseData.course.id;
          loadedCourseIdRef.current = savedCourseId;
          setActiveCourseId(savedCourseId);
          try {
            localStorage.removeItem('morena_course_builder_draft_new');
            localStorage.removeItem('morena_uploaded_excel_new');
          } catch {}
        }
        if (responseData?.course?.slug) savedSlug = responseData.course.slug;
      }

      if (options?.resetAfterSave) {
        // Clear all stored builder drafts so it resets completely for a new course
        try {
          localStorage.removeItem('morena_course_builder_draft_new');
          localStorage.removeItem('morena_course_builder_live_preview');
          if (savedCourseId) localStorage.removeItem(`morena_course_builder_draft_${savedCourseId}`);
          if (state.id) localStorage.removeItem(`morena_course_builder_draft_${state.id}`);
          if (state.slug) localStorage.removeItem(`morena_course_builder_draft_${state.slug}`);
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('morena_course_builder_draft_')) {
              localStorage.removeItem(k);
            }
          });
        } catch {}

        // Reset course state back to clean initial blank form
        const cleanDefault = getDefaultCourseState();
        courseStateRef.current = cleanDefault;
        setCourseState(cleanDefault);
        setCurrentStep(0);
        lastSavedPayloadRef.current = '';

        // Reset browser URL to clean builder without courseId
        if (typeof window !== 'undefined') {
          const cleanUrl = isInstructor ? '/instructor/courses/builder' : '/admin/courses/builder';
          window.history.replaceState({}, '', cleanUrl);
        }

        showToast({
          title: 'Draft Saved to Studio 💾',
          description: `"${state.title}" saved to Drafts. Form is reset and ready to create a new course!`,
          type: 'success'
        });
      } else {
        // Synchronize server-assigned database IDs for sections & lessons so subsequent auto-saves never loop
        if (responseData?.course?.sections && Array.isArray(responseData.course.sections)) {
          const currentState = courseStateRef.current;
          const serverSectionIds = new Set(responseData.course.sections.map((s: any) => s.id));

          const syncedSections: BuilderSection[] = responseData.course.sections.map((s: any, sIdx: number) => {
            const localSec = (currentState.sections || []).find((sec) =>
              sec.id === s.id ||
              (sec.clientKey && sec.clientKey === s.id) ||
              (sec.tempId && sec.tempId === s.id)
            ) || currentState.sections?.[sIdx];
            const serverLessonIds = new Set((s.lessons || []).map((l: any) => l.id));

            const mappedLessons = (s.lessons || []).map((l: any, lIdx: number) => {
              // Local section and lesson lookup to preserve any local videoUrl or resources that were just attached
              const localLes = localSec?.lessons?.find((les) =>
                les.id === l.id ||
                (les.clientKey && les.clientKey === l.id) ||
                (les.tempId && les.tempId === l.id)
              ) || localSec?.lessons?.[lIdx];
              const isVideoExplicitlyCleared = Boolean((localLes as any)?.clearVideo || (localLes as any)?.removeVideo || localLes?.videoUrl === '');
              const resolvedVideo = isVideoExplicitlyCleared ? '' : (localLes?.videoUrl || l.videoUrl || '');
              const resolvedPdf = localLes?.pdfUrl || l.pdfUrl || '';
              const resolvedFile = localLes?.fileUrl || l.fileUrl || '';

              let parsedRes: any = null;
              try {
                parsedRes = JSON.parse(l.resources || '[]');
              } catch {}
              const subLessons = Array.isArray(parsedRes)
                ? parsedRes
                : (localLes?.subLessons || parsedRes?.subLessons || []);
              const videoFileName = isVideoExplicitlyCleared ? '' : (localLes?.videoFileName || (!Array.isArray(parsedRes) && parsedRes?.videoFileName) || l.videoFileName);
              const resourceFileName = localLes?.resourceFileName || (!Array.isArray(parsedRes) && parsedRes?.resourceFileName) || l.resourceFileName;

              // Server resources list
              const serverResourcesList = !Array.isArray(parsedRes) && Array.isArray(parsedRes?.resourcesList) && parsedRes.resourcesList.length > 0
                ? parsedRes.resourcesList
                : (Array.isArray(l.resourcesList) && l.resourcesList.length > 0 ? l.resourcesList : undefined);

              // ALWAYS prioritize localLes.resourcesList if it has items, so newly attached files are never wiped during ID sync
              const localResourcesList = Array.isArray(localLes?.resourcesList) && localLes.resourcesList.length > 0
                ? localLes.resourcesList
                : undefined;

              const resourcesList = localResourcesList || serverResourcesList || undefined;
              const finalResources = resourcesList || [];
              const finalPdf = resolvedPdf || finalResources.find((r: any) => r.type === 'PDF')?.url || '';
              const finalFile = resolvedFile || finalResources[0]?.url || '';
              const finalResName = resourceFileName || localLes?.resourceFileName || finalResources[0]?.name || '';

              // Preserve any in-flight edits the user has made locally (typing in input, editing modal)
              const resolvedTitle = (localLes?.title !== undefined)
                ? localLes.title
                : (l.title || '');
              const resolvedContent = localLes?.content !== undefined
                ? localLes.content
                : (l.content || '');
              const resolvedDescription = localLes?.description !== undefined
                ? localLes.description
                : (l.description || '');
              const resolvedType = localLes?.type || l.type || 'VIDEO';

              let resolvedQuizData = localLes?.quizData;
              if (!resolvedQuizData && l.quizData) {
                resolvedQuizData = typeof l.quizData === 'string'
                  ? (() => { try { return JSON.parse(l.quizData); } catch { return null; } })()
                  : l.quizData;
              }

              const lessonClientKey = localLes?.clientKey || localLes?.tempId || (localLes?.id?.startsWith('les-') ? localLes.id : undefined) || l.clientKey || l.id;
              const lessonTempId = localLes?.id?.startsWith('les-') ? localLes.id : ((localLes as any)?.tempId || lessonClientKey);

              return {
                id: l.id,
                clientKey: lessonClientKey,
                tempId: lessonTempId,
                title: resolvedTitle,
                description: resolvedDescription,
                type: resolvedType,
                content: resolvedContent,
                videoUrl: resolvedVideo,
                videoFileName,
                resourceFileName: finalResName,
                resourcesList,
                pdfUrl: finalPdf,
                fileUrl: finalFile,
                quizData: resolvedQuizData || null,
                subLessons,
                duration: localLes?.duration || l.duration || '10:00',
                durationSeconds: localLes?.durationSeconds || l.durationSeconds || 600,
                isFree: localLes?.isFree !== undefined ? Boolean(localLes.isFree) : Boolean(l.isFree),
                isFinalAssignment: Boolean(localLes?.isFinalAssignment || l.isFinalAssignment || (resolvedType === 'QUIZ' && /final\s+assignment/i.test(resolvedTitle))),
                isPublished: l.isPublished !== false,
                order: l.order || lIdx + 1
              };
            });

            // CRITICAL: Retain any newly added local lessons in this section that were not yet included in server response
            const pendingLocalLessons = (localSec?.lessons || []).filter((les, idx) => {
              if (idx < (s.lessons || []).length) return false;
              return !serverLessonIds.has(les.id) && !(les.clientKey && serverLessonIds.has(les.clientKey));
            });

            const sectionClientKey = localSec?.clientKey || localSec?.tempId || (localSec?.id?.startsWith('sec-') ? localSec.id : undefined) || s.clientKey || s.id;
            const sectionTempId = localSec?.id?.startsWith('sec-') ? localSec.id : ((localSec as any)?.tempId || s.id);

            return {
              id: s.id,
              clientKey: sectionClientKey,
              tempId: sectionTempId,
              title: localSec?.title !== undefined ? localSec.title : (s.title || `Module ${sIdx + 1}`),
              description: localSec?.description !== undefined ? localSec.description : (s.description || ''),
              order: s.order || sIdx + 1,
              lessons: [...mappedLessons, ...pendingLocalLessons]
            };
          });

          // CRITICAL: Retain any newly added local sections that were not yet included in server response
          const pendingLocalSections = (currentState.sections || []).filter(
            (sec) => !serverSectionIds.has(sec.id) && sec.id.startsWith('sec-')
          );

          const updatedState = {
            ...currentState,
            id: savedCourseId || currentState.id,
            slug: savedSlug || currentState.slug,
            sections: [...syncedSections, ...pendingLocalSections]
          };

          courseStateRef.current = updatedState;

          // Synchronize payload ref to prevent immediate re-trigger of auto-save
          lastSavedPayloadRef.current = JSON.stringify({
            title: (updatedState.title || '').trim(),
            description: updatedState.description,
            shortDescription: updatedState.shortDescription,
            price: updatedState.price,
            currency: updatedState.currency,
            category: updatedState.category,
            level: updatedState.level,
            sectionsCount: updatedState.sections?.length,
            sectionsSummary: updatedState.sections?.map((s) => ({
              id: s.id,
              title: s.title,
              lessons: s.lessons?.map((l) => ({
                id: l.id,
                title: l.title,
                type: l.type,
                contentLength: l.content?.length || 0,
                contentPreview: (l.content || '').slice(0, 40),
                quizCount: typeof l.quizData === 'object' && l.quizData?.questions ? l.quizData.questions.length : 0,
                quizScore: typeof l.quizData === 'object' ? l.quizData?.passingScore : undefined,
                videoUrl: l.videoUrl,
                pdfUrl: l.pdfUrl,
                fileUrl: l.fileUrl,
                resourceFileName: l.resourceFileName,
                resourcesCount: l.resourcesList?.length || 0,
                resourcesSummary: l.resourcesList?.map((r) => `${r.id}_${r.name}_${r.url}`).join(',')
              }))
            }))
          });

          setCourseState(updatedState);
        } else if (savedCourseId && savedSlug) {
          const updatedState = { ...courseStateRef.current, id: savedCourseId, slug: savedSlug };
          courseStateRef.current = updatedState;
          setCourseState(updatedState);
        }

        // Silent background sync updates URL and local cache
        if (typeof window !== 'undefined' && savedCourseId && !options?.submitForApproval) {
          loadedCourseIdRef.current = savedCourseId;
          const url = new URL(window.location.href);
          url.searchParams.set('courseId', savedCourseId);
          window.history.replaceState({}, '', url.toString());
          try {
            localStorage.removeItem('morena_course_builder_draft_new');
            localStorage.setItem(
              `morena_course_builder_draft_${savedCourseId}`,
              JSON.stringify({
                courseState: { ...courseState, id: savedCourseId, slug: savedSlug },
                currentStep,
                updatedAt: Date.now()
              })
            );
            if (uploadedExcelRef.current) {
              const excelJson = JSON.stringify(uploadedExcelRef.current);
              localStorage.setItem(`morena_uploaded_excel_${savedCourseId}`, excelJson);
              if (savedSlug) {
                localStorage.setItem(`morena_uploaded_excel_${savedSlug}`, excelJson);
              }
            }
          } catch {}
        }

        if (!options?.silent) {
          showToast({
            title: 'Draft Saved Successfully 💾',
            description: `"${courseState.title}" saved to database.`,
            type: 'success'
          });
        }
      }

      return { id: savedCourseId, slug: savedSlug };
    } catch (err: any) {
      if (!options?.silent) {
        showToast({ title: 'Save Failed', description: err.message, type: 'error' });
      }
      throw err;
    } finally {
      if (!options?.silent) {
        setIsSaving(false);
      }
    }
  };

  // Publish Course or Submit for Approval
  const handlePublishCourse = async () => {
    setIsPublishing(true);
    try {
      // Strict Validation: Quizzes must contain an EVEN number of questions (2, 4, 6, 8, ...)
      const currentState = courseStateRef.current;
      for (const sec of currentState.sections || []) {
        for (const les of sec.lessons || []) {
          if (les.type === 'QUIZ' || les.quizData) {
            let qCount = 0;
            if (les.quizData && typeof les.quizData === 'object' && Array.isArray((les.quizData as any).questions)) {
              qCount = (les.quizData as any).questions.length;
            } else if (typeof les.quizData === 'string') {
              try {
                const parsed = JSON.parse(les.quizData);
                if (Array.isArray(parsed?.questions)) qCount = parsed.questions.length;
              } catch {}
            }
            if (qCount > 0 && qCount % 2 !== 0) {
              showToast({
                title: 'Even Questions Rule Violation ⚠️',
                description: `Quiz "${les.title || 'Untitled Quiz'}" in section "${sec.title}" has ${qCount} question(s). Odd counts are NOT accepted. Quizzes must contain an EVEN number of questions (e.g. 2, 4, 6, 8, 10).`,
                type: 'error'
              });
              setCurrentStep(2); // Jump to Curriculum tab
              setIsPublishing(false);
              return;
            }
          }
        }
      }

      const isInstructor = currentUser?.role === 'INSTRUCTOR';
      const isApprovalSubmit = isInstructor && courseState.status !== 'APPROVED';

      const savedInfo = await handleSaveDraft({ submitForApproval: isApprovalSubmit });
      const targetIdentifier = savedInfo?.slug || savedInfo?.id || courseState.slug || courseState.id;

      if (!targetIdentifier) {
        throw new Error('Could not identify saved course for publishing.');
      }

      const res = await fetch(`/api/courses/${targetIdentifier}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publish: true,
          submitForApproval: isApprovalSubmit
        })
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

      if (!res.ok) {
        // If course was already moved to IN_REVIEW during draft save, treat it as a success!
        if (isApprovalSubmit && (data?.status === 'IN_REVIEW' || data?.error?.toLowerCase()?.includes('review'))) {
          // It is already under review, continue gracefully as success!
        } else {
          throw new Error(data.error || 'Failed to submit course');
        }
      }

      // Clear all builder drafts and cache so returning to Create Course starts completely fresh
      try {
        localStorage.removeItem('morena_course_builder_draft_new');
        localStorage.removeItem('morena_course_builder_live_preview');
        if (courseState.id) localStorage.removeItem(`morena_course_builder_draft_${courseState.id}`);
        if (courseState.slug) localStorage.removeItem(`morena_course_builder_draft_${courseState.slug}`);
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('morena_course_builder_draft_')) {
            localStorage.removeItem(k);
          }
        });
      } catch {}

      // Reset internal builder form completely so it doesn't stay on the submitted course
      setCourseState(getDefaultCourseState());
      setCurrentStep(0);
      lastSavedPayloadRef.current = '';

      if (typeof window !== 'undefined') {
        const cleanUrl = isInstructor ? '/instructor/courses/builder' : '/admin/courses/builder';
        window.history.replaceState({}, '', cleanUrl);
      }

      if (isInstructor) {
        if (courseState.status === 'APPROVED') {
          showToast({
            title: 'Course Published Live! 🚀',
            description: 'Your approved masterclass is now live on the landing page for student enrollment.',
            type: 'success'
          });
        } else {
          showToast({
            title: 'Course Submitted for Approval! 📋',
            description: 'Your course has been moved to Pending Approval. Form is reset and ready for a new course!',
            type: 'success'
          });
        }
      } else {
        showToast({
          title: 'Course Published Live! 🚀',
          description: 'Your masterclass is now live on the landing page and available for student enrollment.',
          type: 'success'
        });
      }

      setTimeout(() => {
        router.push(isInstructor ? '/instructor?tab=IN_REVIEW' : '/admin/courses');
      }, 1000);
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
    { title: '2. Course Curriculum', icon: 'view_timeline' },
    { title: '3. Media & Thumbnail', icon: 'image' },
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

  const rawCurrentPlayerItem = activePreviewItem || allPlayableItems[0] || null;
  const currentPlayerItem = useMemo(() => {
    if (!rawCurrentPlayerItem) return null;
    const fresh = allPlayableItems.find((item) => item.id === rawCurrentPlayerItem.id);
    return fresh ? { ...rawCurrentPlayerItem, ...fresh } : rawCurrentPlayerItem;
  }, [rawCurrentPlayerItem, allPlayableItems]);

  const previewModules = courseState.sections.map((sec, idx) => ({
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

  const previewTotalLectures = courseState.sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Icon name="sync" size={32} className="animate-spin text-primary" />
        <p className="text-sm font-bold text-on-surface">Loading Course Studio...</p>
      </div>
    );
  }

  const handleDownloadExcelTemplate = () => {
    try {
      downloadCourseExcelTemplate();
      showToast({
        title: 'Excel Template Downloaded 📥',
        description: 'Template saved! Fill details in Excel and upload here to auto-populate the course.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Download Failed',
        description: err.message || 'Could not generate template.',
        type: 'error'
      });
    }
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingExcel(true);
    try {
      // Convert to base64 so user can re-download this exact uploaded file
      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const parsed = await parseCourseExcelFile(file);

      if (!parsed.title && (!parsed.sections || parsed.sections.length === 0)) {
        throw new Error('No valid course title or curriculum found. Please use the official MORENA Course Upload Template.');
      }

      setCourseState((prev) => ({
        ...prev,
        title: parsed.title || prev.title,
        slug: parsed.slug || prev.slug,
        category: parsed.category || prev.category,
        level: parsed.level || prev.level,
        language: parsed.language || prev.language,
        shortDescription: parsed.shortDescription || prev.shortDescription,
        description: parsed.description || prev.description,
        whatYouWillLearn: parsed.whatYouWillLearn && parsed.whatYouWillLearn.length > 0 ? parsed.whatYouWillLearn : prev.whatYouWillLearn,
        requirements: parsed.requirements && parsed.requirements.length > 0 ? parsed.requirements : prev.requirements,
        targetAudience: parsed.targetAudience && parsed.targetAudience.length > 0 ? parsed.targetAudience : prev.targetAudience,
        price: parsed.price !== undefined ? parsed.price : prev.price,
        discountPrice: parsed.discountPrice !== undefined ? parsed.discountPrice : prev.discountPrice,
        currency: parsed.currency || prev.currency,
        accessType: parsed.accessType || prev.accessType,
        accessDays: parsed.accessDays !== undefined ? parsed.accessDays : prev.accessDays,
        sections: parsed.sections && parsed.sections.length > 0 ? parsed.sections : prev.sections,
        // Thumbnail is intentionally kept manual as requested: "thumnail vo maunally he kraega"
      }));

      // Store uploaded file info & replace previous file ("purani wali hatt jaye, jo upload kiya hai wahi download par aa jaye")
      const newRecord: UploadedExcelRecord = {
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        fileData: fileBase64
      };
      setUploadedExcel(newRecord);
      uploadedExcelRef.current = newRecord;

      try {
        const fullJson = JSON.stringify(newRecord);
        localStorage.setItem(excelStorageKey, fullJson);
        localStorage.setItem('morena_uploaded_excel_new', fullJson);
        if (effectiveCourseId) {
          localStorage.setItem(`morena_uploaded_excel_${effectiveCourseId}`, fullJson);
        }
        if (courseStateRef.current.id) {
          localStorage.setItem(`morena_uploaded_excel_${courseStateRef.current.id}`, fullJson);
        }
        if (courseStateRef.current.slug) {
          localStorage.setItem(`morena_uploaded_excel_${courseStateRef.current.slug}`, fullJson);
        }
      } catch (storageErr) {
        console.warn('Could not cache full file in localStorage, caching metadata only:', storageErr);
        try {
          const metaOnly = JSON.stringify({ ...newRecord, fileData: '' });
          localStorage.setItem(excelStorageKey, metaOnly);
          localStorage.setItem('morena_uploaded_excel_new', metaOnly);
        } catch {}
      }

      const modulesCount = parsed.sections?.length || 0;
      const lessonsCount = (parsed.sections || []).reduce((acc, s) => acc + (s.lessons?.length || 0), 0);

      showToast({
        title: 'Course Auto-Filled from Excel! 🚀',
        description: `"${file.name}" uploaded successfully! ${modulesCount} modules and ${lessonsCount} lessons imported.`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Excel Import Error',
        description: err.message || 'Failed to read spreadsheet file.',
        type: 'error'
      });
    } finally {
      setIsImportingExcel(false);
      e.target.value = '';
    }
  };

  const handleDownloadUploadedExcel = () => {
    if (!uploadedExcel) return;

    try {
      if (uploadedExcel.fileData) {
        // Direct download of the exact uploaded file
        const link = document.createElement('a');
        link.href = uploadedExcel.fileData;
        link.download = uploadedExcel.fileName || 'Course_Curriculum.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast({
          title: 'File Downloaded 📥',
          description: `Downloaded "${uploadedExcel.fileName}". You can edit it and re-upload here.`,
          type: 'success'
        });
      } else {
        // Fallback: export populated course spreadsheet
        exportCourseToExcelFile(courseStateRef.current, uploadedExcel.fileName || `${courseStateRef.current.slug || 'Course'}_Curriculum.xlsx`);
        showToast({
          title: 'Excel Downloaded 📥',
          description: `Exported populated course curriculum spreadsheet. Edit in Excel and re-upload here.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Download Failed',
        description: err?.message || 'Could not download Excel file.',
        type: 'error'
      });
    }
  };

  const handleRemoveUploadedExcel = () => {
    setUploadedExcel(null);
    uploadedExcelRef.current = null;
    try {
      localStorage.removeItem(excelStorageKey);
      localStorage.removeItem('morena_uploaded_excel_new');
      if (effectiveCourseId) localStorage.removeItem(`morena_uploaded_excel_${effectiveCourseId}`);
      if (courseStateRef.current.id) localStorage.removeItem(`morena_uploaded_excel_${courseStateRef.current.id}`);
      if (courseStateRef.current.slug) localStorage.removeItem(`morena_uploaded_excel_${courseStateRef.current.slug}`);
    } catch {}
    showToast({
      title: 'File Removed',
      description: 'Uploaded template record cleared. You can upload a new Excel file anytime.',
      type: 'info'
    });
  };

  const renderStepNavigationBar = (isTop: boolean = false) => (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isTop
          ? 'bg-surface-container-lowest p-4 sm:p-5 rounded-2xl border border-outline-variant shadow-xs'
          : 'pt-6 border-t border-outline-variant'
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          className="px-4 sm:px-5 py-2.5 bg-surface text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:bg-surface-container flex items-center gap-1.5 disabled:opacity-30 cursor-pointer shadow-xs"
        >
          <Icon name="arrow_back" size={16} />
          <span>Previous Step</span>
        </button>

        <button
          type="button"
          onClick={() => handleStartFreshCourse(true)}
          className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          title="Clear form and start a clean brand new course"
        >
          <Icon name="restart_alt" size={16} />
          <span>New Course</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Live Course Preview Button */}
        <button
          type="button"
          onClick={() => setIsLivePreviewOpen(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Icon name="visibility" size={16} />
          <span>Preview Course</span>
        </button>

        {/* Save Draft Button */}
        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleSaveDraft({ resetAfterSave: true })}
          className="px-4 py-2.5 bg-surface text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:bg-surface-container shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Icon name="save" size={16} />
          <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
        </button>

        {/* Next Step / Publish Action */}
        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
            className="px-5 sm:px-6 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: {steps[currentStep + 1]?.title.replace(/^\d+\.\s*/, '')}</span>
            <Icon name="arrow_forward" size={16} />
          </button>
        ) : (
          <button
            type="button"
            disabled={isPublishing || (isInstructor && courseState.status === 'IN_REVIEW')}
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
                  <Icon name="send" size={16} />
                  <span>Submit Changes for Approval 📋</span>
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
                <span>Publish Course Live</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Top Step Navigation Bar (Replaces old breadcrumb/title banner) */}
      {renderStepNavigationBar(true)}

      {/* Excel Course Bulk Template & Auto-Fill Studio Banner */}
      <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden space-y-4">
        {/* Subtle top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

        {/* Top: Header, Title, Badges & Full-Width Description */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <Icon name="table_view" size={24} />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg text-on-surface">
                Excel Course Auto-Fill &amp; Curriculum Importer
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                .XLSX Template
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant">
                One-Click Auto-Fill
              </span>
              <button
                type="button"
                onClick={() => {
                  setTutorialModalLang('en');
                  setIsTutorialModalOpen(true);
                }}
                className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-300 dark:border-violet-800 hover:bg-violet-200 dark:hover:bg-violet-900 cursor-pointer flex items-center gap-1 transition-all"
                title="Watch complete video walkthrough in English or Hindi"
              >
                <Icon name="smart_display" size={12} className="text-violet-600 dark:text-violet-400" />
                <span>Video Tutorial (Hindi &amp; EN)</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Download the official template, fill in course details, modules, lectures, quizzes &amp; pricing in Excel, and upload to auto-fill all instantly! You can then upload video lectures and resources directly below.{' '}
              <button
                type="button"
                onClick={() => {
                  setTutorialModalLang('en');
                  setIsTutorialModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-500 hover:underline cursor-pointer ml-1"
              >
                <Icon name="play_circle" size={14} />
                <span>Need help? Watch 3-min video guide (Hindi &amp; English)</span>
              </button>
            </p>
          </div>
        </div>

        {/* Bottom: Action Buttons Placed Cleanly Underneath */}
        <div className="pt-3 border-t border-outline-variant/60 flex flex-wrap items-center gap-3">
          {/* Download Template Button */}
          <button
            type="button"
            onClick={handleDownloadExcelTemplate}
            className="px-4 py-2.5 bg-surface hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:border-emerald-500/50 flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
            title="Download official Excel course spreadsheet template"
          >
            <Icon name="download" size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>Download Template (.xlsx)</span>
          </button>

          {/* Upload & Auto-Fill OR Uploaded File Action Pill */}
          {!uploadedExcel ? (
            <label
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] disabled:opacity-50 shrink-0"
              title="Upload completed Excel spreadsheet to auto-fill course"
            >
              <Icon
                name={isImportingExcel ? 'sync' : 'upload_file'}
                size={16}
                className={isImportingExcel ? 'animate-spin' : ''}
              />
              <span>{isImportingExcel ? 'Importing Course...' : 'Upload & Auto-Fill 🚀'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleUploadExcel}
                disabled={isImportingExcel}
                className="hidden"
              />
            </label>
          ) : (
            <div className="h-[38px] flex items-center gap-1.5 px-2.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-emerald-950 dark:text-emerald-100 text-xs shadow-2xs animate-in fade-in zoom-in-95 duration-150 shrink-0">
              {/* File Icon & Truncated Name */}
              <div
                className="flex items-center gap-1.5 min-w-0 cursor-default"
                title={`${uploadedExcel.fileName} ${uploadedExcel.fileSize ? `(${(uploadedExcel.fileSize / 1024).toFixed(0)} KB)` : ''}`}
              >
                <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon name="description" size={13} />
                </div>
                <span className="font-bold text-xs truncate max-w-[70px] sm:max-w-[80px] text-emerald-900 dark:text-emerald-100">
                  {uploadedExcel.fileName}
                </span>
              </div>

              <span className="h-3.5 w-px bg-emerald-300 dark:bg-emerald-700/80 shrink-0 mx-0.5" />

              {/* Icon-Only Download Button */}
              <button
                type="button"
                onClick={handleDownloadUploadedExcel}
                className="w-6 h-6 bg-white dark:bg-emerald-900/90 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-md border border-emerald-300 dark:border-emerald-600/80 shadow-2xs flex items-center justify-center cursor-pointer transition-all hover:scale-110 shrink-0"
                title={`Download ${uploadedExcel.fileName}`}
              >
                <Icon name="download" size={13} className="text-emerald-700 dark:text-emerald-300" />
              </button>

              {/* Icon-Only Replace Button */}
              <label
                className="w-6 h-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md shadow-2xs flex items-center justify-center cursor-pointer transition-all hover:scale-110 shrink-0"
                title="Replace with another Excel spreadsheet"
              >
                <Icon
                  name={isImportingExcel ? 'sync' : 'swap_horiz'}
                  size={13}
                  className={isImportingExcel ? 'animate-spin' : ''}
                />
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleUploadExcel}
                  disabled={isImportingExcel}
                  className="hidden"
                />
              </label>

              {/* Icon-Only Del / Delete Button */}
              <button
                type="button"
                onClick={handleRemoveUploadedExcel}
                className="w-6 h-6 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-md border border-rose-200 dark:border-rose-800/80 shadow-2xs flex items-center justify-center cursor-pointer transition-all hover:scale-110 shrink-0"
                title="Delete uploaded template file and revert to upload button"
              >
                <Icon name="delete_outline" size={13} className="text-rose-600 dark:text-rose-400" />
              </button>
            </div>
          )}

          {/* Watch Tutorial Video Button (Dual-Language Hindi & English) */}
          <button
            type="button"
            onClick={() => {
              setTutorialModalLang('en');
              setIsTutorialModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-violet-600/20 transition-all hover:scale-[1.02]"
            title="Watch step-by-step video tutorial in English or Hindi"
          >
            <Icon name="smart_display" size={17} />
            <span>Watch Tutorial Video</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-black">
              HINDI / EN
            </span>
          </button>
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

      {/* Step 2: Curriculum & Syllabus */}
      {currentStep === 1 && (
        <CourseCurriculumStep
          sections={courseState.sections || []}
          onChange={(newSections) => handleUpdateField('sections', newSections)}
          courseSlug={courseState.slug}
          onOpenBatchMediaManager={() => setCurrentStep(2)}
        />
      )}

      {/* Step 3: Media & Thumbnail + Curriculum Video & Resources Studio */}
      {currentStep === 2 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <CourseMediaStep
            thumbnail={courseState.thumbnail}
            banner={courseState.banner}
            onChange={handleUpdateField}
          />

          {/* Curriculum Media & Resources Studio */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                <Icon name="folder_zip" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-on-surface">Curriculum Resources &amp; Media Studio</h3>
                <p className="text-xs text-on-surface-variant">
                  Attach study resources, PDFs &amp; files to your written articles and quizzes, and manage course media.
                </p>
              </div>
            </div>
            <BatchCurriculumMediaManager
              isOpen={true}
              sections={courseState.sections || []}
              onChangeSections={(newSections) => handleUpdateField('sections', newSections)}
              courseTitle={courseState.title}
            />
          </div>
        </div>
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
      {renderStepNavigationBar(false)}

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

              {/* Open full dedicated student preview tab if course has an ID */}
              {courseState.id && (
                <a
                  href={`/instructor/courses/preview/${encodeURIComponent(courseState.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Open dedicated preview page in new tab"
                >
                  <span>Open Full Preview Page</span>
                  <Icon name="open_in_new" size={14} />
                </a>
              )}

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
          <div className="flex-1 overflow-y-auto bg-white text-[#2d2f31]">
            {previewTab === 'LANDING' ? (
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
                          {courseState.category || 'Teacher Development'}
                        </span>
                        <Icon name="chevron_right" size={16} />
                        <span className="text-on-surface truncate">
                          {courseState.title || 'Untitled Course'}
                        </span>
                      </div>

                      <h1 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-on-surface leading-tight tracking-tight">
                        {courseState.title || 'Untitled Course'}
                      </h1>

                      <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
                        {courseState.shortDescription || courseState.description || 'Master practical skills with real-world video lectures, hands-on quizzes, and downloadable architectural guides.'}
                      </p>

                      {/* Badges & Meta Metrics */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                        <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant hover:bg-surface-container-high transition-colors">
                          <span className="text-sm font-bold text-on-surface">5.0</span>
                          <div className="flex text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Icon key={i} name="star" fill size={16} />
                            ))}
                          </div>
                          <span className="text-xs text-on-surface-variant ml-1">
                            (Draft Preview)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-on-surface-variant text-xs sm:text-sm">
                          <Icon name="group" size={20} />
                          <span>0 students</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-on-surface-variant text-xs sm:text-sm">
                          <Icon name="schedule" size={20} />
                          <span>{courseState.durationHours || 12} hours total</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-on-surface-variant text-xs sm:text-sm">
                          <Icon name="language" size={20} />
                          <span>{courseState.language || 'English'}</span>
                        </div>
                      </div>

                      {/* Instructor Bio Card */}
                      <div className="flex items-center gap-3.5 mt-4 p-3 bg-surface-container-low/60 rounded-xl border border-outline-variant/50 w-fit">
                        <UserAvatar
                          avatar={currentUser?.avatar}
                          name={currentUser?.name || 'Course Instructor'}
                          size="lg"
                          className="w-12 h-12 shrink-0"
                        />
                        <div>
                          <p className="text-sm font-bold text-on-surface">
                            Created by {currentUser?.name || 'Course Instructor'}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            Course Author &amp; Educator
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* Mobile Video Preview & Pricing Box (< lg) */}
                    <div className="lg:hidden bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-md overflow-hidden flex flex-col">
                      <div
                        onClick={() => setPreviewTab('PLAYER')}
                        className="w-full aspect-video bg-neutral-950 relative group cursor-pointer border-b border-outline-variant overflow-hidden flex items-center justify-center"
                      >
                        {courseState.thumbnail ? (
                          <>
                            <img
                              src={courseState.thumbnail}
                              alt=""
                              aria-hidden="true"
                              className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none"
                            />
                            <img
                              src={courseState.thumbnail}
                              alt={courseState.title}
                              className="relative z-10 w-full h-full object-contain"
                            />
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-surface-container to-surface-container-high flex items-center justify-center text-primary/60">
                            <Icon name="school" size={48} />
                          </div>
                        )}
                        <div className="absolute inset-0 z-20 bg-black/25 group-hover:bg-black/15 transition-colors flex items-center justify-center cursor-pointer">
                          <div className="w-14 h-14 bg-surface-container-lowest/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:text-primary transition-all duration-300">
                            <Icon name="play_arrow" fill size={28} className="ml-1 text-primary" />
                          </div>
                        </div>
                        <div className="absolute bottom-2.5 left-0 w-full px-3 flex justify-center z-20 pointer-events-none">
                          <span className="bg-black/70 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md">
                            Preview this course
                          </span>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 flex flex-col gap-4">
                        <div className="flex items-end gap-3">
                          <span className={`text-2xl sm:text-3xl font-extrabold leading-none font-mono ${Number(courseState.price) === 0 ? 'text-emerald-700' : 'text-on-surface'}`}>
                            {Number(courseState.price) === 0 ? 'Free' : `₹${Number(courseState.price).toLocaleString('en-IN')}`}
                          </span>
                          {courseState.discountPrice && Number(courseState.discountPrice) > Number(courseState.price) && (
                            <span className="text-sm text-outline line-through mb-0.5 font-mono">
                              ₹{Number(courseState.discountPrice).toLocaleString('en-IN')}
                            </span>
                          )}
                          {Number(courseState.price) === 0 && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-0.5">
                              100% Free
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewTab('PLAYER')}
                          className="w-full bg-[#a435f0] text-white font-bold py-3 rounded hover:bg-[#8710d8] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm"
                        >
                          <Icon name="play_circle" fill size={18} />
                          <span>Test Classroom Player</span>
                        </button>
                      </div>
                    </div>

                    {/* What You'll Learn Card */}
                    {Array.isArray(courseState.whatYouWillLearn) && courseState.whatYouWillLearn.filter(Boolean).length > 0 && (
                      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                        <div className="border-b border-outline-variant pb-3">
                          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2.5">
                            <Icon name="check_circle" size={24} className="text-primary" />
                            <span>WHAT YOU’LL LEARN</span>
                          </h2>
                          <p className="text-xs text-on-surface-variant mt-0.5">Key learning outcomes &amp; skills</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-1">
                          {courseState.whatYouWillLearn.filter(Boolean).map((item: string, idx: number) => (
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
                      modules={previewModules}
                      courseSlug={courseState.slug || 'preview'}
                    />

                    {/* Before You Begin & Who This Course Is For */}
                    {((Array.isArray(courseState.requirements) && courseState.requirements.filter(Boolean).length > 0) ||
                      (Array.isArray(courseState.targetAudience) && courseState.targetAudience.filter(Boolean).length > 0)) && (
                      <div className={
                        (Array.isArray(courseState.requirements) && courseState.requirements.filter(Boolean).length > 0) &&
                        (Array.isArray(courseState.targetAudience) && courseState.targetAudience.filter(Boolean).length > 0)
                          ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                          : "space-y-6"
                      }>
                        {Array.isArray(courseState.requirements) && courseState.requirements.filter(Boolean).length > 0 && (
                          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                            <div className="border-b border-outline-variant pb-3">
                              <h2 className="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
                                <Icon name="rule" size={22} className="text-secondary" />
                                <span>BEFORE YOU BEGIN</span>
                              </h2>
                              <p className="text-xs text-on-surface-variant mt-0.5">Knowledge or experience you may need</p>
                            </div>
                            <ul className="space-y-3 pt-1">
                              {courseState.requirements.filter(Boolean).map((item: string, idx: number) => (
                                <li key={idx} className="flex gap-3 items-start text-xs sm:text-sm text-on-surface">
                                  <span className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-1.5" />
                                  <span className="leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {Array.isArray(courseState.targetAudience) && courseState.targetAudience.filter(Boolean).length > 0 && (
                          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                            <div className="border-b border-outline-variant pb-3">
                              <h2 className="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
                                <Icon name="groups" size={22} className="text-tertiary" />
                                <span>WHO THIS COURSE IS FOR</span>
                              </h2>
                              <p className="text-xs text-on-surface-variant mt-0.5">Who can benefit from this course</p>
                            </div>
                            <ul className="space-y-3 pt-1">
                              {courseState.targetAudience.filter(Boolean).map((item: string, idx: number) => (
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
                    {courseState.description && (
                      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-on-surface pb-3 border-b border-outline-variant">
                          Description
                        </h2>
                        <div className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-line">
                          {courseState.description}
                        </div>
                      </section>
                    )}

                    {/* Student Reviews & Ratings Section (Preview Placeholder) */}
                    <section id="reviews" className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24">
                      <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
                        <div>
                          <h3 className="text-xl font-bold text-on-surface">Student Reviews &amp; Feedback</h3>
                          <p className="text-xs text-on-surface-variant mt-0.5">Real verified ratings from enrolled students</p>
                        </div>
                        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-200">
                          <Icon name="star" fill size={18} className="text-amber-500" />
                          <span className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                            5.0 / 5.0
                          </span>
                        </div>
                      </div>

                      <div className="text-center py-8 bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant">
                        <Icon name="rate_review" size={32} className="text-on-surface-variant/40 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-on-surface">No student reviews yet (Preview Mode)</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Enrolled students will be able to leave ratings and reviews once this course is published.
                        </p>
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Floating Purchase Card */}
                  <div className="hidden lg:block lg:col-span-4 relative">
                    <div className="sticky top-[96px] bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:border-primary/40">
                      {/* Video Preview Hero */}
                      <div
                        onClick={() => setPreviewTab('PLAYER')}
                        className="w-full aspect-video bg-neutral-950 relative group cursor-pointer border-b border-outline-variant overflow-hidden flex items-center justify-center"
                      >
                        {courseState.thumbnail ? (
                          <>
                            <img
                              src={courseState.thumbnail}
                              alt=""
                              aria-hidden="true"
                              className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none"
                            />
                            <img
                              src={courseState.thumbnail}
                              alt={courseState.title}
                              className="relative z-10 w-full h-full object-contain"
                            />
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-surface-container to-surface-container-high flex items-center justify-center text-primary/60">
                            <Icon name="school" size={48} />
                          </div>
                        )}
                        <div className="absolute inset-0 z-20 bg-black/25 group-hover:bg-black/15 transition-colors flex items-center justify-center cursor-pointer">
                          <div className="w-16 h-16 bg-surface-container-lowest/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:text-primary transition-all duration-300">
                            <Icon name="play_arrow" fill size={32} className="ml-1 text-primary" />
                          </div>
                        </div>
                        <div className="absolute bottom-3 left-0 w-full px-3 flex justify-center z-20 pointer-events-none">
                          <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-md">
                            Preview this course
                          </span>
                        </div>
                      </div>

                      {/* Pricing & Checkout CTAs */}
                      <div className="p-6 sm:p-8 flex flex-col gap-5">
                        <div className="flex items-end gap-3">
                          <span className={`text-3xl sm:text-4xl font-extrabold leading-none font-mono ${Number(courseState.price) === 0 ? 'text-emerald-700' : 'text-on-surface'}`}>
                            {Number(courseState.price) === 0 ? 'Free' : `₹${Number(courseState.price).toLocaleString('en-IN')}`}
                          </span>
                          {courseState.discountPrice && Number(courseState.discountPrice) > Number(courseState.price) && (
                            <span className="text-base text-outline line-through mb-1 font-mono">
                              ₹{Number(courseState.discountPrice).toLocaleString('en-IN')}
                            </span>
                          )}
                          {Number(courseState.price) === 0 && (
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                              100% Free
                            </span>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          <button
                            type="button"
                            onClick={() => setPreviewTab('PLAYER')}
                            className="w-full bg-[#a435f0] text-white font-bold py-3.5 rounded hover:bg-[#8710d8] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                          >
                            <Icon name="play_circle" fill size={20} />
                            <span>Test Classroom Player</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewTab('PLAYER')}
                            className="w-full bg-white text-[#2d2f31] border border-[#2d2f31] font-bold py-3.5 rounded hover:bg-[#f7f9fa] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                          >
                            <span>Buy now (Preview)</span>
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
                              <span>{courseState.durationHours || 12} hours on-demand video</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <Icon name="menu_book" size={18} className="text-primary" />
                              <span>{previewTotalLectures} lessons &amp; study resources</span>
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
                      </div>
                    </div>
                  </div>
                </main>

                <UdemyFooter />
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

                      {(() => {
                        const quizObj =
                          typeof currentPlayerItem.quizData === 'string'
                            ? (() => {
                                try {
                                  return JSON.parse(currentPlayerItem.quizData);
                                } catch {
                                  return { questions: [] };
                                }
                              })()
                            : currentPlayerItem.quizData || { questions: [] };
                        const hasQuestions =
                          Array.isArray(quizObj?.questions) && quizObj.questions.length > 0;
                        const hasVideo = !!currentPlayerItem.videoUrl;
                        const attachedResources = getLessonResourcesList(currentPlayerItem);
                        const hasResources = attachedResources.length > 0;
                        const hasNotes = !!currentPlayerItem.content;

                        return (
                          <div className="space-y-4">
                            {/* 1. VIDEO PLAYER */}
                            {(hasVideo || (!hasResources && !hasNotes && !hasQuestions)) && (
                              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black min-h-[340px] flex items-center justify-center">
                                {hasVideo ? (
                                  <VideoPlayer
                                    videoUrl={currentPlayerItem.videoUrl}
                                    title={currentPlayerItem.title}
                                    isFree={true}
                                  />
                                ) : (
                                  <div className="p-12 text-center space-y-2 text-slate-400">
                                    <Icon name="movie" size={40} className="mx-auto text-indigo-400" />
                                    <p className="text-sm font-bold text-white">
                                      Lesson {currentPlayerItem.code} Ready
                                    </p>
                                    <p className="text-xs">
                                      Upload a Video, PDF, Text Notes, or Quick Questions in Step 3 for{' '}
                                      {currentPlayerItem.code} to preview them here.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 2. ATTACHED STUDY RESOURCES (PDF, DOC, IMAGE, WEB LINKS) */}
                            {hasResources && (
                              <div className="space-y-2.5">
                                <div className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 px-1">
                                  <Icon name="attach_file" size={14} className="text-indigo-400" />
                                  <span>Attached Study Resources &amp; Downloads ({attachedResources.length})</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {attachedResources.map((res) => {
                                    const isPdf = res.type === 'PDF' || res.url.toLowerCase().endsWith('.pdf');
                                    const isDoc = res.type === 'DOC' || res.url.toLowerCase().endsWith('.doc') || res.url.toLowerCase().endsWith('.docx');
                                    const isImage = res.type === 'IMAGE' || res.url.toLowerCase().match(/\.(png|jpg|jpeg|webp|svg)$/);
                                    const isLink = res.type === 'LINK' || res.url.startsWith('http');
                                    const isZip = res.type === 'ZIP' || res.url.toLowerCase().endsWith('.zip');

                                    const iconName = isPdf ? 'picture_as_pdf' : isDoc ? 'description' : isImage ? 'image' : isZip ? 'folder_zip' : isLink ? 'link' : 'attach_file';
                                    const colorClass = isPdf ? 'text-rose-400 bg-rose-500/20 border-rose-500/30' : isDoc ? 'text-blue-400 bg-blue-500/20 border-blue-500/30' : isImage ? 'text-purple-400 bg-purple-500/20 border-purple-500/30' : isZip ? 'text-amber-400 bg-amber-500/20 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
                                    const btnClass = isPdf ? 'bg-rose-600 hover:bg-rose-500' : isDoc ? 'bg-blue-600 hover:bg-blue-500' : isImage ? 'bg-purple-600 hover:bg-purple-500' : isZip ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500';

                                    return (
                                      <div key={res.id} className="p-3.5 rounded-2xl bg-slate-800/90 border border-white/10 flex items-center justify-between gap-3 shadow-md">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${colorClass}`}>
                                            <Icon name={iconName} size={18} />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold text-white truncate" title={res.name}>
                                              {res.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 capitalize">
                                              {res.type || 'Resource'}
                                            </p>
                                          </div>
                                        </div>
                                        <a
                                          href={res.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={`px-3 py-1.5 rounded-xl ${btnClass} text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs`}
                                          title="Open or download resource"
                                        >
                                          <Icon name={isLink ? 'open_in_new' : 'download'} size={13} />
                                          <span>{isLink ? 'Open Link' : 'Download'}</span>
                                        </a>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 3. TEXT / STUDY NOTES */}
                            {hasNotes && (
                              <div className="rounded-2xl overflow-hidden bg-white text-slate-900 p-6 border border-slate-200">
                                <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-1.5">
                                  <Icon name="article" size={16} />
                                  <span>📝 Lesson Study Notes &amp; Reading ({currentPlayerItem.code})</span>
                                </div>
                                <ArticlePlayer
                                  title={currentPlayerItem.title}
                                  type="TEXT"
                                  content={currentPlayerItem.content}
                                  onComplete={() => {}}
                                />
                              </div>
                            )}

                            {/* 4. QUICK QUESTIONS / PRACTICE QUIZ */}
                            {hasQuestions && (
                              <div className="rounded-2xl overflow-hidden bg-white text-slate-900 p-6 border border-amber-300">
                                <div className="text-xs font-extrabold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
                                  <Icon name="quiz" size={16} />
                                  <span>
                                    ❓ Quick Practice Questions for {currentPlayerItem.code} (
                                    {quizObj.questions.length})
                                  </span>
                                </div>
                                <QuizPlayer
                                  lessonId={currentPlayerItem.id}
                                  title={`${currentPlayerItem.code}: Quick Check`}
                                  quizData={
                                    typeof currentPlayerItem.quizData === 'string'
                                      ? currentPlayerItem.quizData
                                      : JSON.stringify(quizObj)
                                  }
                                  onPass={() => {}}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
                            const lCode = `${lIdx + 1}`;
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
                                    <strong className="font-mono mr-1.5">{lCode}.</strong>
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

      {/* Course Creation & Excel Bulk Upload Video Tutorial Modal (Dual-Language) */}
      <CourseTutorialModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
        defaultLang={tutorialModalLang}
      />

      {/* Bottom of Course Builder Form */}
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
