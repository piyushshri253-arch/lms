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
import { downloadCourseExcelTemplate, parseCourseExcelFile } from '@/lib/course-excel';

const getDefaultCourseState = () => ({
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
          title: 'Welcome & Course Orientation',
          description: 'Introduction to the course structure and key learning outcomes.',
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

  // Background auto-save to database status
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = React.useRef<boolean>(false);
  const lastSavedPayloadRef = React.useRef<string>('');

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
  }>(getDefaultCourseState());

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
            // Only restore if this is an unsaved new course that was NOT previously assigned a DB ID
            // If it already had an ID or wasn't in DRAFT, start clean so "Create Course" is a fresh form
            if (!parsed.courseState.id && parsed.courseState.title && parsed.courseState.status === 'DRAFT') {
              setCourseState((prev) => ({
                ...prev,
                ...parsed.courseState
              }));
              if (typeof parsed.currentStep === 'number') {
                setCurrentStep(parsed.currentStep);
              }
            } else {
              localStorage.removeItem(draftStorageKey);
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

  // Automated background auto-save to PostgreSQL DB (debounced 2.5s)
  // When an instructor creates or updates a course, it automatically saves to DB as DRAFT
  // so if they close the browser or leave, it already appears under Drafts in Instructor Studio!
  useEffect(() => {
    if (!hasLoadedInitial || isPublishing) return;
    if (courseState.status !== 'DRAFT') return;
    if (!courseState.title || courseState.title.trim().length < 3) return;

    // Hash summary of content to prevent duplicate calls
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
        lessons: s.lessons?.map((l) => ({ id: l.id, title: l.title, type: l.type, videoUrl: l.videoUrl }))
      }))
    });

    if (currentPayloadSummary === lastSavedPayloadRef.current) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (isAutoSavingRef.current || isPublishing) return;
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
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [courseState, hasLoadedInitial, isPublishing]);

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
    if (!courseState.title.trim()) {
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
      let savedCourseId = courseState.id;
      let savedSlug = courseState.slug;

      const isSubmitting = Boolean(options?.submitForApproval);
      const isInstructorUser = currentUser?.role === 'INSTRUCTOR';

      // Auto-compress any bulky base64 data URLs to prevent Vercel 413 payload limit
      const [optimizedThumbnail, optimizedBanner] = await Promise.all([
        ensureOptimizedDataUrl(courseState.thumbnail, 960, 540, 0.75),
        ensureOptimizedDataUrl(courseState.banner, 1280, 720, 0.72)
      ]);

      if (optimizedThumbnail !== courseState.thumbnail || optimizedBanner !== courseState.banner) {
        setCourseState((prev) => ({
          ...prev,
          thumbnail: optimizedThumbnail || prev.thumbnail,
          banner: optimizedBanner || prev.banner
        }));
      }

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
        thumbnail: optimizedThumbnail || courseState.thumbnail,
        banner: optimizedBanner || courseState.banner,
        durationHours: courseState.durationHours,
        status: isSubmitting && isInstructorUser ? 'IN_REVIEW' : courseState.status,
        submitForApproval: isSubmitting,
        submitVersionForReview: isSubmitting,
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

      if (options?.resetAfterSave) {
        // Clear all stored builder drafts so it resets completely for a new course
        try {
          localStorage.removeItem('morena_course_builder_draft_new');
          localStorage.removeItem('morena_course_builder_live_preview');
          if (savedCourseId) localStorage.removeItem(`morena_course_builder_draft_${savedCourseId}`);
          if (courseState.id) localStorage.removeItem(`morena_course_builder_draft_${courseState.id}`);
          if (courseState.slug) localStorage.removeItem(`morena_course_builder_draft_${courseState.slug}`);
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('morena_course_builder_draft_')) {
              localStorage.removeItem(k);
            }
          });
        } catch {}

        // Reset course state back to clean initial blank form
        setCourseState(getDefaultCourseState());
        setCurrentStep(0);
        lastSavedPayloadRef.current = '';

        // Reset browser URL to clean builder without courseId
        if (typeof window !== 'undefined') {
          const cleanUrl = isInstructor ? '/instructor/courses/builder' : '/admin/courses/builder';
          window.history.replaceState({}, '', cleanUrl);
        }

        showToast({
          title: 'Draft Saved to Studio 💾',
          description: `"${courseState.title}" saved to Drafts. Form is reset and ready to create a new course!`,
          type: 'success'
        });
      } else {
        if (savedCourseId && savedSlug) {
          setCourseState((prev) => ({ ...prev, id: savedCourseId, slug: savedSlug }));
        }

        // Silent background sync updates URL and local cache
        if (typeof window !== 'undefined' && savedCourseId && !options?.submitForApproval) {
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

      if (!res.ok) throw new Error(data.error || 'Failed to submit course');

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

  const [isImportingExcel, setIsImportingExcel] = useState<boolean>(false);

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

      const modulesCount = parsed.sections?.length || 0;
      const lessonsCount = (parsed.sections || []).reduce((acc, s) => acc + (s.lessons?.length || 0), 0);

      showToast({
        title: 'Course Auto-Filled from Excel! 🚀',
        description: `"${parsed.title || 'Course'}" imported! Basic info, ${modulesCount} modules (${lessonsCount} lessons), and pricing auto-filled successfully.`,
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

  const renderStepNavigationBar = (isTop: boolean = false) => (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isTop
          ? 'bg-surface-container-lowest p-4 sm:p-5 rounded-2xl border border-outline-variant shadow-xs'
          : 'pt-6 border-t border-outline-variant'
      }`}
    >
      <div className="flex items-center gap-2">
        <Link
          href={isInstructor ? '/instructor' : '/admin/courses'}
          className="px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant hover:bg-surface-container text-on-surface font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          title="Exit to courses list"
        >
          <Icon name="arrow_back" size={16} />
          <span>Exit</span>
        </Link>

        <button
          type="button"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          className="px-4 sm:px-5 py-2.5 bg-surface text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:bg-surface-container flex items-center gap-1.5 disabled:opacity-30 cursor-pointer shadow-xs"
        >
          <Icon name="arrow_back" size={16} />
          <span>Previous Step</span>
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

      {/* Excel Course Bulk Template & Auto-Fill Strip */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-indigo-50/50 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-indigo-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Icon name="table_view" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Excel Course Auto-Fill &amp; Template
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                .XLSX Template
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Download the official template, fill in course details, curriculum syllabus modules &amp; pricing in Excel, and upload to auto-fill all steps instantly! (Thumbnail &amp; video lectures are uploaded manually).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleDownloadExcelTemplate}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            title="Download official Excel course spreadsheet template"
          >
            <Icon name="download" size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>Download Template (.xlsx)</span>
          </button>

          <label
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-all disabled:opacity-50"
            title="Upload completed Excel spreadsheet to auto-fill course"
          >
            <Icon
              name={isImportingExcel ? 'sync' : 'upload_file'}
              size={16}
              className={isImportingExcel ? 'animate-spin' : ''}
            />
            <span>{isImportingExcel ? 'Importing Course...' : 'Upload & Auto-Fill'}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUploadExcel}
              disabled={isImportingExcel}
              className="hidden"
            />
          </label>
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

                {/* Course Curriculum & Syllabus (Sections & Lectures) */}
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
                              const lCode = `${lIdx + 1}`;
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
                        const hasPdf = !!currentPlayerItem.pdfUrl;
                        const hasNotes = !!currentPlayerItem.content;

                        return (
                          <div className="space-y-4">
                            {/* 1. VIDEO PLAYER */}
                            {(hasVideo || (!hasPdf && !hasNotes && !hasQuestions)) && (
                              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black min-h-[340px] flex items-center justify-center">
                                {hasVideo ? (
                                  <VideoPlayer
                                    videoUrl={currentPlayerItem.videoUrl}
                                    title={currentPlayerItem.title}
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

                            {/* 2. ATTACHED PDF RESOURCE */}
                            {hasPdf && (
                              <div className="p-4 rounded-2xl bg-slate-800/90 border border-rose-500/40 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                                    <Icon name="picture_as_pdf" size={22} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-extrabold text-white">
                                      📑 Attached PDF Study Material ({currentPlayerItem.code})
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      Downloadable / viewable PDF lecture handout
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href={currentPlayerItem.pdfUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
                                >
                                  <Icon name="open_in_new" size={14} />
                                  <span>Open / Download PDF</span>
                                </a>
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
