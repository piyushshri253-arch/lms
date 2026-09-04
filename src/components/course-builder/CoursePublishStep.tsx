'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import confetti from 'canvas-confetti';
import { Modal } from '@/components/ui/Modal';

interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  message?: string;
  step: number;
}

interface CoursePublishStepProps {
  courseData: any;
  onJumpToStep: (stepIndex: number) => void;
  onPublish: () => Promise<void>;
  isPublishing: boolean;
}

export const CoursePublishStep: React.FC<CoursePublishStepProps> = ({
  courseData,
  onJumpToStep,
  onPublish,
  isPublishing
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const allLessons = (courseData.sections || []).flatMap((s: any) => s.lessons || []);

  const checklist: ChecklistItem[] = [
    {
      id: 'title',
      label: 'Course Title & Subtitle',
      passed: !!courseData.title && courseData.title.trim().length >= 3,
      message: courseData.title ? `Title: "${courseData.title}"` : 'Please provide a course title.',
      step: 0
    },
    {
      id: 'description',
      label: 'Syllabus & Course Description',
      passed: !!courseData.description && courseData.description.trim().length >= 20,
      message:
        courseData.description?.length >= 20
          ? 'Comprehensive course description provided.'
          : 'Description should be at least 20 characters.',
      step: 0
    },
    {
      id: 'thumbnail',
      label: 'Course Thumbnail Image',
      passed: !!courseData.thumbnail && courseData.thumbnail.length > 0,
      message: courseData.thumbnail ? 'Thumbnail uploaded.' : 'Upload a thumbnail image for course cards.',
      step: 1
    },
    {
      id: 'sections',
      label: 'Curriculum Sections / Modules',
      passed: (courseData.sections || []).length >= 1,
      message:
        (courseData.sections || []).length >= 1
          ? `${courseData.sections.length} module(s) created.`
          : 'Create at least 1 section in Curriculum.',
      step: 2
    },
    {
      id: 'lessons',
      label: 'Lectures & Lesson Content',
      passed: allLessons.length >= 1,
      message:
        allLessons.length >= 1
          ? `${allLessons.length} lesson(s) in curriculum.`
          : 'Add at least 1 lecture in Curriculum.',
      step: 2
    },
    {
      id: 'pricing',
      label: 'Monetization & Pricing',
      passed: courseData.price !== undefined && courseData.price >= 0,
      message:
        courseData.price === 0
          ? 'Configured as Free Course.'
          : `Priced at ${courseData.currency === 'USD' ? '$' : '₹'}${courseData.price} (${courseData.currency || 'INR'}).`,
      step: 3
    }
  ];

  const passedCount = checklist.filter((c) => c.passed).length;
  const canPublish = checklist.every((c) => c.passed);

  const handlePublishClick = async () => {
    await onPublish();
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Ready to Publish Banner */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
          canPublish
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : 'bg-surface-container-lowest border-outline-variant'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                canPublish ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider font-mono">
              {canPublish ? 'Ready for Live Platform Release' : 'Action Required Before Publishing'}
            </span>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-on-surface">
            {canPublish ? 'All Systems Go! 🚀' : 'Complete Required Pre-Flight Checklist'}
          </h3>
          <p className="text-xs text-on-surface-variant max-w-lg">
            {canPublish
              ? 'Your masterclass curriculum is fully configured and ready to be enrolled by students globally.'
              : `${passedCount} of ${checklist.length} publishing criteria met. Resolve the remaining items below to publish.`}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2.5 bg-surface border border-outline-variant text-on-surface font-bold text-xs rounded-xl hover:bg-surface-container shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="visibility" size={16} />
            <span>Preview Syllabus</span>
          </button>

          <button
            type="button"
            disabled={!canPublish || isPublishing}
            onClick={handlePublishClick}
            className="px-6 py-2.5 bg-primary text-on-primary font-black text-xs rounded-xl hover:bg-primary-container shadow-md flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            {isPublishing ? (
              <>
                <Icon name="sync" size={16} className="animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Icon name="rocket_launch" size={16} />
                <span>Publish Course Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pre-Publish Checklist Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div>
          <h4 className="text-sm font-black text-on-surface uppercase tracking-wider">
            Pre-Publish Quality &amp; Completeness Checklist
          </h4>
          <p className="text-xs text-on-surface-variant">
            Each requirement ensures high pedagogical quality and seamless student onboarding.
          </p>
        </div>

        <div className="divide-y divide-outline-variant/40">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    item.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <Icon name={item.passed ? 'check' : 'priority_high'} size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{item.label}</p>
                  <p className="text-[11px] text-on-surface-variant truncate">{item.message}</p>
                </div>
              </div>

              {!item.passed && (
                <button
                  type="button"
                  onClick={() => onJumpToStep(item.step)}
                  className="px-3 py-1 bg-surface-container hover:bg-primary hover:text-on-primary text-primary font-bold text-[11px] rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Fix Item →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Syllabus Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        maxWidth="lg"
        title={`Student Preview: "${courseData.title || 'Untitled Course'}"`}
        subtitle="This is how students will see the curriculum breakdown on the course landing page."
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60 flex flex-col sm:flex-row gap-4 items-center">
            {courseData.thumbnail && (
              <img
                src={courseData.thumbnail}
                alt="Thumbnail"
                className="w-32 aspect-video object-cover rounded-xl shrink-0"
              />
            )}
            <div>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px] uppercase">
                {courseData.category || 'Engineering'}
              </span>
              <h3 className="font-extrabold text-base text-on-surface mt-1">{courseData.title}</h3>
              <p className="text-xs text-on-surface-variant">{courseData.shortDescription}</p>
              <p className="text-xs font-mono font-bold text-primary mt-1">
                {courseData.price === 0 ? 'FREE' : `$${courseData.price} USD`}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-on-surface tracking-wider">
              Curriculum Structure ({allLessons.length} Lectures)
            </h4>
            {(courseData.sections || []).map((sec: any, sIdx: number) => (
              <div key={sec.id} className="p-4 rounded-2xl bg-surface border border-outline-variant space-y-2">
                <p className="font-bold text-xs text-primary">
                  Section {sIdx + 1}: {sec.title}
                </p>
                <div className="space-y-1 pl-3 border-l-2 border-primary/30">
                  {(sec.lessons || []).map((l: any) => (
                    <div key={l.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-on-surface font-medium flex items-center gap-1.5">
                        <Icon name={l.type === 'VIDEO' ? 'play_circle' : 'article'} size={14} />
                        <span>{l.title}</span>
                      </span>
                      <span className="font-mono text-on-surface-variant text-[11px]">{l.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
