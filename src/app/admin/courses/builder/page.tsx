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

function CourseBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, currentUser } = useApp();

  const editSlugOrId = searchParams.get('slug') || searchParams.get('courseId') || '';

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(!!editSlugOrId);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

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
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
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
    category: 'Engineering',
    level: 'ALL_LEVELS',
    language: 'English',
    durationHours: 12,
    thumbnail: '',
    banner: '',
    price: 1499,
    discountPrice: 999,
    currency: 'INR',
    status: 'DRAFT',
    accessType: 'LIFETIME',
    accessDays: null,
    whatYouWillLearn: [
      'Master foundational architectural principles and domain-driven design',
      'Build and deploy resilient microservices under heavy concurrency',
      'Implement production-grade observability, telemetry and distributed locks'
    ],
    requirements: ['Basic programming background in Go, TypeScript, or Python', 'Basic familiarity with containerized microservices'],
    targetAudience: ['Senior Software Engineers', 'Cloud Solutions Architects', 'Backend Technical Leads'],
    seoTitle: '',
    seoDescription: '',
    sections: [
      {
        id: `sec-${Date.now()}-1`,
        title: 'Module 1: Architecture Foundations & Environment Setup',
        order: 1,
        lessons: [
          {
            id: `les-${Date.now()}-1`,
            title: '1.1 Welcome & System Architecture Overview',
            type: 'VIDEO',
            duration: '08:45',
            durationSeconds: 525,
            isFree: true,
            isPublished: true,
            order: 1
          }
        ]
      }
    ]
  });

  // Load existing course if editing
  useEffect(() => {
    if (editSlugOrId) {
      loadCourse(editSlugOrId);
    }
  }, [editSlugOrId]);

  const loadCourse = async (identifier: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${identifier}`);
      const data = await res.json();
      if (res.ok && data.course) {
        const c = data.course;
        setCourseState({
          id: c.id,
          title: c.title,
          slug: c.slug,
          shortDescription: c.subtitle || c.shortDescription || '',
          description: c.description || '',
          category: c.category || 'Engineering',
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
          sections: (c.sections || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            order: s.order,
            lessons: (s.lessons || []).map((l: any) => ({
              id: l.id,
              title: l.title,
              description: l.description,
              type: l.type || 'VIDEO',
              content: l.content,
              videoUrl: l.videoUrl,
              pdfUrl: l.pdfUrl,
              fileUrl: l.fileUrl,
              quizData: l.quizData,
              duration: l.duration,
              durationSeconds: l.durationSeconds,
              isFree: l.isFree,
              isPublished: l.isPublished,
              order: l.order
            }))
          }))
        });
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load course details.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateField = (field: string, value: any) => {
    setCourseState((prev) => ({ ...prev, [field]: value }));
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!courseState.title.trim()) {
      showToast({ title: 'Course Title Required', description: 'Please enter a course title before saving.', type: 'error' });
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

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create course');

        savedCourseId = data.course.id;
        savedSlug = data.course.slug;
        setCourseState((prev) => ({ ...prev, id: savedCourseId, slug: savedSlug }));
      } else {
        // Update existing course in DB
        const res = await fetch(`/api/courses/${courseState.slug || savedCourseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
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
      // First ensure latest updates are saved and retrieve verified course identifier
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish course');

      setCourseState((prev) => ({ ...prev, status: 'PUBLISHED' }));
      showToast({
        title: 'Course Published Live! 🚀',
        description: 'Your masterclass is now live and available for student enrollment.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({ title: 'Publishing Error', description: err.message, type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  const steps = [
    { title: '1. Basic Information', icon: 'info' },
    { title: '2. Media & Thumbnail', icon: 'image' },
    { title: '3. Curriculum & Syllabus', icon: 'view_timeline' },
    { title: '4. Pricing & Access', icon: 'payments' },
    { title: '5. Publish & Review', icon: 'verified' }
  ];

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
            href="/admin/content"
            className="p-2 rounded-xl bg-surface border border-outline-variant hover:bg-surface-container text-on-surface-variant cursor-pointer"
            title="Back to courses list"
          >
            <Icon name="arrow_back" size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <span>Course Builder</span>
              <span>/</span>
              <span className="text-primary font-bold">{courseState.category}</span>
              <span
                className={`text-[9px] font-bold uppercase font-mono px-2 py-0.2 rounded-full border ${
                  courseState.status === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {courseState.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight mt-0.5">
              {courseState.title || 'Untitled Master Course'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
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
              <Icon name="rocket_launch" size={16} />
              <span>{isPublishing ? 'Publishing...' : 'Publish Course'}</span>
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
          onJumpToStep={(stepIdx) => setCurrentStep(stepIdx)}
          onPublish={handlePublishCourse}
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
              disabled={isPublishing}
              onClick={handlePublishCourse}
              className="px-6 py-2.5 bg-primary text-on-primary font-black text-xs rounded-xl hover:bg-primary-container shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Icon name="rocket_launch" size={16} />
              <span>Publish Masterclass</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CourseBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-on-surface-variant">Loading Course Builder...</div>}>
      <CourseBuilderContent />
    </Suspense>
  );
}
