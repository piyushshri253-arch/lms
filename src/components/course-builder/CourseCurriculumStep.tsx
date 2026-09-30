'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { VideoUploadModal } from '@/components/media/VideoUploadModal';
import { AiCourseGeneratorModal } from '@/components/ai/AiCourseGeneratorModal';
import { useApp } from '@/context/AppContext';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points: number;
}

export interface QuizConfig {
  questions: QuizQuestion[];
  passingScore: number; // e.g. 70 (%)
  attemptLimit: number; // 0 = unlimited
}

export interface BuilderSubLesson {
  id: string;
  code?: string; // e.g. "1.1.1", "2.1.1"
  title: string;
  description?: string;
  type: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'DOWNLOAD';
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  duration?: string;
  isFree?: boolean;
  order: number;
}

export interface BuilderLesson {
  id: string;
  title: string;
  description?: string;
  type: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'DOWNLOAD';
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  fileUrl?: string;
  quizData?: QuizConfig | string;
  subLessons?: BuilderSubLesson[];
  duration?: string;
  durationSeconds?: number;
  isFree?: boolean;
  isPublished?: boolean;
  order: number;
}

export interface BuilderSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: BuilderLesson[];
}

interface CourseCurriculumStepProps {
  sections: BuilderSection[];
  onChange: (sections: BuilderSection[]) => void;
  courseSlug?: string;
}

export const CourseCurriculumStep: React.FC<CourseCurriculumStepProps> = ({
  sections,
  onChange,
  courseSlug
}) => {
  const { showToast } = useApp();

  // Section modal state
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Lesson modal state
  const [editingLesson, setEditingLesson] = useState<{ sectionId: string; lesson: BuilderLesson } | null>(null);

  // Video Upload Modal State (supports both main lesson and subLesson)
  const [videoModalTarget, setVideoModalTarget] = useState<{
    sectionId: string;
    lessonId: string;
    subLessonId?: string;
    title: string;
  } | null>(null);

  const handleImportAiCurriculum = (curriculum: any) => {
    if (!curriculum.sections) return;
    const newSections: BuilderSection[] = curriculum.sections.map((s: any, sIdx: number) => {
      const mNum = sections.length + sIdx + 1;
      return {
        id: `sec-${Date.now()}-${sIdx}`,
        title: s.title || `Module ${mNum}`,
        description: s.description || '',
        order: mNum,
        lessons: (s.lessons || []).map((l: any, lIdx: number) => ({
          id: `les-${Date.now()}-${sIdx}-${lIdx}`,
          title: l.title || `${mNum}.${lIdx + 1} Lesson Topic`,
          type: l.type || 'VIDEO',
          description: l.description || '',
          duration: l.duration || '10:00',
          subLessons: [],
          order: lIdx + 1,
          isFree: lIdx === 0
        }))
      };
    });
    onChange([...sections, ...newSections]);
  };

  // Add / Edit Section Handler
  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    if (editingSectionId) {
      const updated = sections.map((s) =>
        s.id === editingSectionId
          ? { ...s, title: newSectionTitle.trim(), description: newSectionDescription.trim() }
          : s
      );
      onChange(updated);
      setEditingSectionId(null);
      showToast({ title: 'Module Updated', type: 'info' });
    } else {
      const newSec: BuilderSection = {
        id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: newSectionTitle.trim(),
        description: newSectionDescription.trim(),
        order: sections.length + 1,
        lessons: [
          {
            id: `les-${Date.now()}-1`,
            title: `${sections.length + 1}.1 Introduction & Overview`,
            description: '',
            type: 'VIDEO',
            duration: '10:00',
            durationSeconds: 600,
            subLessons: [],
            isFree: false,
            isPublished: true,
            order: 1
          }
        ]
      };
      onChange([...sections, newSec]);
      showToast({ title: 'Module Added', description: `Created ${newSec.title}`, type: 'success' });
    }

    setNewSectionTitle('');
    setNewSectionDescription('');
    setIsAddSectionOpen(false);
  };

  // Update Module field inline (Title or Description)
  const handleUpdateSectionField = (sectionId: string, field: 'title' | 'description', value: string) => {
    onChange(
      sections.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s))
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this module and all its lessons?')) return;
    onChange(sections.filter((s) => s.id !== sectionId).map((s, idx) => ({ ...s, order: idx + 1 })));
    showToast({ title: 'Module Removed', type: 'info' });
  };

  // Add / Create Lesson (e.g., 1.1, 1.2, 2.1)
  const handleCreateLesson = (
    sectionId: string,
    type: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'DOWNLOAD',
    openModal = false
  ) => {
    const sIdx = sections.findIndex((s) => s.id === sectionId);
    if (sIdx === -1) return;
    const targetSec = sections[sIdx];
    const moduleNum = sIdx + 1;
    const lessonNum = targetSec.lessons.length + 1;
    const lessonCode = `${moduleNum}.${lessonNum}`;

    const defaultTitle =
      type === 'VIDEO'
        ? `${lessonCode} Video Lecture`
        : type === 'TEXT'
        ? `${lessonCode} Reading & Concept Guide`
        : type === 'PDF'
        ? `${lessonCode} PDF Study Resource`
        : type === 'QUIZ'
        ? `${lessonCode} Module Knowledge Check`
        : `${lessonCode} Downloadable Material`;

    let defaultQuiz: QuizConfig | undefined;
    if (type === 'QUIZ') {
      defaultQuiz = {
        passingScore: 70,
        attemptLimit: 0,
        questions: [
          {
            id: `q-${Date.now()}`,
            question: 'Enter your assessment question here...',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
            explanation: 'Explanation for the correct answer.',
            points: 1
          }
        ]
      };
    }

    const newLesson: BuilderLesson = {
      id: `les-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: defaultTitle,
      description: '',
      type,
      duration: type === 'VIDEO' ? '10:00' : '05:00',
      durationSeconds: type === 'VIDEO' ? 600 : 300,
      content: type === 'TEXT' ? '# Key Concepts\n\nWrite your lesson notes and explanation here.' : undefined,
      quizData: defaultQuiz,
      subLessons: [],
      isFree: lessonNum === 1 && moduleNum === 1,
      isPublished: true,
      order: lessonNum
    };

    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
    );

    onChange(updated);
    if (openModal || type === 'QUIZ') {
      setEditingLesson({ sectionId, lesson: newLesson });
    }
    showToast({ title: `Added ${lessonCode}`, description: `${defaultTitle} added to Module ${moduleNum}.`, type: 'success' });
  };

  // Update Lesson inline
  const handleUpdateLessonInline = (sectionId: string, lessonId: string, patch: Partial<BuilderLesson>) => {
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l))
            }
          : s
      )
    );
  };

  // Add Sub-Lesson / Sub-Category (e.g., 1.1.1, 1.1.2, 2.1.1)
  const handleAddSubLesson = (sectionId: string, lessonId: string) => {
    const sIdx = sections.findIndex((s) => s.id === sectionId);
    if (sIdx === -1) return;
    const section = sections[sIdx];
    const lIdx = section.lessons.findIndex((l) => l.id === lessonId);
    if (lIdx === -1) return;

    const lesson = section.lessons[lIdx];
    const currentSubs = Array.isArray(lesson.subLessons) ? lesson.subLessons : [];
    const nextSubNum = currentSubs.length + 1;
    const subCode = `${sIdx + 1}.${lIdx + 1}.${nextSubNum}`;

    const newSub: BuilderSubLesson = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      code: subCode,
      title: `${subCode} Sub-Topic Title`,
      description: '',
      type: 'VIDEO',
      duration: '05:00',
      videoUrl: '',
      content: '',
      pdfUrl: '',
      isFree: !!lesson.isFree,
      order: nextSubNum
    };

    handleUpdateLessonInline(sectionId, lessonId, {
      subLessons: [...currentSubs, newSub]
    });

    showToast({
      title: `Sub-Topic ${subCode} Added`,
      description: `Added ${subCode} under ${sIdx + 1}.${lIdx + 1}`,
      type: 'success'
    });
  };

  // Update Sub-Lesson inline
  const handleUpdateSubLesson = (
    sectionId: string,
    lessonId: string,
    subLessonId: string,
    patch: Partial<BuilderSubLesson>
  ) => {
    onChange(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          lessons: s.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const subs = (l.subLessons || []).map((sub) =>
              sub.id === subLessonId ? { ...sub, ...patch } : sub
            );
            return { ...l, subLessons: subs };
          })
        };
      })
    );
  };

  // Delete Sub-Lesson
  const handleDeleteSubLesson = (sectionId: string, lessonId: string, subLessonId: string) => {
    onChange(
      sections.map((s, sIdx) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          lessons: s.lessons.map((l, lIdx) => {
            if (l.id !== lessonId) return l;
            const filtered = (l.subLessons || [])
              .filter((sub) => sub.id !== subLessonId)
              .map((sub, subIdx) => ({
                ...sub,
                order: subIdx + 1,
                code: `${sIdx + 1}.${lIdx + 1}.${subIdx + 1}`
              }));
            return { ...l, subLessons: filtered };
          })
        };
      })
    );
    showToast({ title: 'Sub-Topic Removed', type: 'info' });
  };

  // Move Sub-Lesson up/down
  const moveSubLesson = (sectionId: string, lessonId: string, subIdx: number, direction: 'up' | 'down') => {
    const sIdx = sections.findIndex((s) => s.id === sectionId);
    if (sIdx === -1) return;
    const lIdx = sections[sIdx].lessons.findIndex((l) => l.id === lessonId);
    if (lIdx === -1) return;
    const subs = [...(sections[sIdx].lessons[lIdx].subLessons || [])];
    const targetIdx = direction === 'up' ? subIdx - 1 : subIdx + 1;
    if (targetIdx < 0 || targetIdx >= subs.length) return;

    const [moved] = subs.splice(subIdx, 1);
    subs.splice(targetIdx, 0, moved);

    const renumbered = subs.map((sub, idx) => ({
      ...sub,
      order: idx + 1,
      code: `${sIdx + 1}.${lIdx + 1}.${idx + 1}`
    }));

    handleUpdateLessonInline(sectionId, lessonId, { subLessons: renumbered });
  };

  const handleSaveLessonEdit = (updatedLesson: BuilderLesson) => {
    if (!editingLesson) return;

    const updatedSections = sections.map((s) => {
      if (s.id === editingLesson.sectionId) {
        return {
          ...s,
          lessons: s.lessons.map((l) => (l.id === updatedLesson.id ? updatedLesson : l))
        };
      }
      return s;
    });

    onChange(updatedSections);
    setEditingLesson(null);
    showToast({ title: 'Lesson Saved', description: `Updated "${updatedLesson.title}".`, type: 'success' });
  };

  const handleDeleteLesson = (sectionId: string, lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson and its sub-topics?')) return;

    const updated = sections.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          lessons: s.lessons
            .filter((l) => l.id !== lessonId)
            .map((l, idx) => ({ ...l, order: idx + 1 }))
        };
      }
      return s;
    });

    onChange(updated);
    if (editingLesson?.lesson.id === lessonId) setEditingLesson(null);
    showToast({ title: 'Lesson Deleted', type: 'info' });
  };

  // Reordering helpers
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const copy = [...sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIdx, 0, moved);
    onChange(copy.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const moveLesson = (sectionId: string, index: number, direction: 'up' | 'down') => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= sec.lessons.length) return;

    const lessonsCopy = [...sec.lessons];
    const [moved] = lessonsCopy.splice(index, 1);
    lessonsCopy.splice(newIdx, 0, moved);

    const updated = sections.map((s) =>
      s.id === sectionId
        ? { ...s, lessons: lessonsCopy.map((l, i) => ({ ...l, order: i + 1 })) }
        : s
    );
    onChange(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-xs">
        <div>
          <h3 className="text-lg font-black text-on-surface">
            Curriculum &amp; Multi-Level Syllabus Builder (Module → 1.1 → 1.1.1)
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Create Modules with Module Descriptions, Lessons (<span className="font-mono font-bold text-primary">1.1</span>, <span className="font-mono font-bold text-primary">2.1</span>), and Sub-Topics (<span className="font-mono font-bold text-indigo-600">1.1.1</span>, <span className="font-mono font-bold text-indigo-600">1.1.2</span>, <span className="font-mono font-bold text-indigo-600">2.1.1</span>) easily in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <Icon name="sparkles" size={16} />
            <span>AI Curriculum Generator</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingSectionId(null);
              setNewSectionTitle(`Module ${sections.length + 1}: `);
              setNewSectionDescription('');
              setIsAddSectionOpen(true);
            }}
            className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
          >
            <Icon name="add" size={16} />
            <span>+ Add Module (Module {sections.length + 1})</span>
          </button>
        </div>
      </div>

      {/* Sections & Lessons Tree */}
      {sections.length === 0 ? (
        <div className="p-12 bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-3xl text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Icon name="view_timeline" size={28} />
          </div>
          <h4 className="font-bold text-sm text-on-surface">Curriculum is currently empty</h4>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Start building your course by adding your first module (e.g. &ldquo;Module 1: Getting Started&rdquo;).
          </p>
          <button
            type="button"
            onClick={() => {
              setNewSectionTitle('Module 1: Foundations & Core Concepts');
              setNewSectionDescription('');
              setIsAddSectionOpen(true);
            }}
            className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs cursor-pointer"
          >
            + Create Module 1
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section, sIdx) => {
            const moduleNum = sIdx + 1;

            return (
              <div
                key={section.id}
                className="bg-surface-container-lowest border-2 border-outline-variant/80 rounded-3xl overflow-hidden shadow-xs"
              >
                {/* Module Header + Inline Module Title & Module Description */}
                <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-outline-variant space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={sIdx === 0}
                          onClick={() => moveSection(sIdx, 'up')}
                          className="p-1 text-outline hover:text-primary disabled:opacity-30 cursor-pointer"
                          title="Move Module Up"
                        >
                          <Icon name="arrow_upward" size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={sIdx === sections.length - 1}
                          onClick={() => moveSection(sIdx, 'down')}
                          className="p-1 text-outline hover:text-primary disabled:opacity-30 cursor-pointer"
                          title="Move Module Down"
                        >
                          <Icon name="arrow_downward" size={16} />
                        </button>
                      </div>

                      <span className="px-3 py-1 rounded-xl bg-primary text-on-primary font-mono font-black text-xs uppercase shrink-0 shadow-2xs">
                        Module {moduleNum}
                      </span>

                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => handleUpdateSectionField(section.id, 'title', e.target.value)}
                        placeholder={`Module ${moduleNum} Title (e.g., Classroom Pedagogy & Foundations)`}
                        className="flex-1 bg-white border border-slate-300 focus:border-primary rounded-xl px-3.5 py-2 text-sm font-extrabold text-slate-900 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                      {/* Quick Add Lesson Buttons */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleCreateLesson(section.id, 'VIDEO', false)}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          title={`Add Lesson ${moduleNum}.${section.lessons.length + 1} (Video)`}
                        >
                          <Icon name="movie" size={14} className="text-primary" />
                          <span>+ {moduleNum}.{section.lessons.length + 1} Video</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateLesson(section.id, 'TEXT', false)}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          title={`Add Lesson ${moduleNum}.${section.lessons.length + 1} (Article)`}
                        >
                          <Icon name="article" size={14} className="text-secondary" />
                          <span>+ Text</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateLesson(section.id, 'PDF', false)}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-rose-50 hover:text-rose-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          title={`Add Lesson ${moduleNum}.${section.lessons.length + 1} (PDF)`}
                        >
                          <Icon name="picture_as_pdf" size={14} className="text-rose-600" />
                          <span>+ PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateLesson(section.id, 'QUIZ', true)}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          title={`Add Lesson ${moduleNum}.${section.lessons.length + 1} (Quiz)`}
                        >
                          <Icon name="quiz" size={14} className="text-amber-600" />
                          <span>+ Quiz</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Delete Module"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Module Description Field */}
                  <div className="pl-0 sm:pl-14">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Module {moduleNum} Description &amp; Learning Summary
                    </label>
                    <textarea
                      rows={2}
                      value={section.description || ''}
                      onChange={(e) => handleUpdateSectionField(section.id, 'description', e.target.value)}
                      placeholder={`Write a brief description for Module ${moduleNum} (what key topics, skills, or goals students will cover in this module)...`}
                      className="w-full bg-white border border-slate-200 focus:border-primary rounded-xl px-3.5 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none transition-colors resize-y"
                    />
                  </div>
                </div>

                {/* Lessons (1.1, 1.2 / 2.1, 2.2) & Sub-Topics (1.1.1, 1.1.2 / 2.1.1) */}
                <div className="p-4 sm:p-5 space-y-4 bg-white">
                  {section.lessons.length === 0 ? (
                    <div className="py-6 text-center text-xs text-on-surface-variant border-2 border-dashed border-slate-200 rounded-2xl">
                      No lessons in Module {moduleNum} yet. Click{' '}
                      <button
                        type="button"
                        onClick={() => handleCreateLesson(section.id, 'VIDEO', false)}
                        className="font-bold text-primary underline cursor-pointer"
                      >
                        + {moduleNum}.1 Video
                      </button>{' '}
                      above to add your first lesson.
                    </div>
                  ) : (
                    section.lessons.map((les, lIdx) => {
                      const lessonCode = `${moduleNum}.${lIdx + 1}`;
                      const subLessons = Array.isArray(les.subLessons) ? les.subLessons : [];
                      const nextSubCode = `${lessonCode}.${subLessons.length + 1}`;
                      const isVideo = les.type === 'VIDEO';
                      const isText = les.type === 'TEXT';
                      const isPdf = les.type === 'PDF';
                      const isQuiz = les.type === 'QUIZ';

                      return (
                        <div
                          key={les.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/50 hover:border-indigo-300 transition-all overflow-hidden shadow-2xs"
                        >
                          {/* Main Lesson Row (e.g. 1.1 or 2.1) */}
                          <div className="p-3.5 sm:p-4 bg-white flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={lIdx === 0}
                                    onClick={() => moveLesson(section.id, lIdx, 'up')}
                                    className="text-slate-400 hover:text-primary disabled:opacity-30 cursor-pointer"
                                    title="Move up"
                                  >
                                    <Icon name="arrow_upward" size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={lIdx === section.lessons.length - 1}
                                    onClick={() => moveLesson(section.id, lIdx, 'down')}
                                    className="text-slate-400 hover:text-primary disabled:opacity-30 cursor-pointer"
                                    title="Move down"
                                  >
                                    <Icon name="arrow_downward" size={14} />
                                  </button>
                                </div>

                                {/* Number Badge: 1.1, 1.2, 2.1 */}
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs shrink-0 shadow-2xs">
                                  {lessonCode}
                                </span>

                                {/* Inline Lesson Title Input */}
                                <input
                                  type="text"
                                  value={les.title}
                                  onChange={(e) =>
                                    handleUpdateLessonInline(section.id, les.id, { title: e.target.value })
                                  }
                                  placeholder={`${lessonCode} Lesson Title`}
                                  className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none transition-colors"
                                />

                                {/* Lesson Type Selector */}
                                <select
                                  value={les.type}
                                  onChange={(e) =>
                                    handleUpdateLessonInline(section.id, les.id, {
                                      type: e.target.value as any
                                    })
                                  }
                                  className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                                >
                                  <option value="VIDEO">🎬 Video</option>
                                  <option value="TEXT">📄 Article</option>
                                  <option value="PDF">📑 PDF</option>
                                  <option value="QUIZ">❓ Quiz</option>
                                </select>

                                {/* Duration Input */}
                                <input
                                  type="text"
                                  value={les.duration || '10:00'}
                                  onChange={(e) =>
                                    handleUpdateLessonInline(section.id, les.id, { duration: e.target.value })
                                  }
                                  placeholder="10:00"
                                  title="Duration (mm:ss)"
                                  className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono text-center text-slate-700 focus:outline-none focus:border-indigo-600"
                                />
                              </div>

                              {/* Action Buttons on Lesson 1.1 */}
                              <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center shrink-0">
                                {/* + Add Sub-Category (1.1.1 / 2.1.1) Button */}
                                <button
                                  type="button"
                                  onClick={() => handleAddSubLesson(section.id, les.id)}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                  title={`Add Sub-Topic ${nextSubCode} inside ${lessonCode}`}
                                >
                                  <Icon name="subdirectory_arrow_right" size={14} />
                                  <span>+ Add {nextSubCode}</span>
                                </button>

                                {isVideo && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setVideoModalTarget({
                                        sectionId: section.id,
                                        lessonId: les.id,
                                        title: les.title
                                      })
                                    }
                                    className="px-2.5 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary rounded-xl font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Icon name="cloud_upload" size={14} />
                                    <span>{les.videoUrl ? 'Replace Video' : 'Upload Video'}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setEditingLesson({ sectionId: section.id, lesson: les })}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Icon name="tune" size={14} />
                                  <span>Details / Content</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteLesson(section.id, les.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                  title="Delete Lesson"
                                >
                                  <Icon name="delete" size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Inline Lesson Description + Media URL Row */}
                            <div className="pl-0 sm:pl-16 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              <input
                                type="text"
                                value={les.description || ''}
                                onChange={(e) =>
                                  handleUpdateLessonInline(section.id, les.id, {
                                    description: e.target.value
                                  })
                                }
                                placeholder={`Description / summary for ${lessonCode} (optional)...`}
                                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
                              />

                              {isVideo && (
                                <input
                                  type="text"
                                  value={les.videoUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateLessonInline(section.id, les.id, {
                                      videoUrl: e.target.value
                                    })
                                  }
                                  placeholder={`Video URL for ${lessonCode} (YouTube, Vimeo, MP4 link, or click Upload Video)`}
                                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none"
                                />
                              )}

                              {isPdf && (
                                <input
                                  type="text"
                                  value={les.pdfUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateLessonInline(section.id, les.id, {
                                      pdfUrl: e.target.value
                                    })
                                  }
                                  placeholder={`PDF Document URL for ${lessonCode}...`}
                                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none"
                                />
                              )}

                              {isText && (
                                <input
                                  type="text"
                                  value={les.content || ''}
                                  onChange={(e) =>
                                    handleUpdateLessonInline(section.id, les.id, {
                                      content: e.target.value
                                    })
                                  }
                                  placeholder={`Article / reading text for ${lessonCode} (or click Details / Content for full editor)...`}
                                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
                                />
                              )}
                            </div>
                          </div>

                          {/* Sub-Topics / Sub-Categories List (e.g. 1.1.1, 1.1.2, 2.1.1) */}
                          {subLessons.length > 0 && (
                            <div className="bg-indigo-50/40 border-t border-indigo-100 px-4 sm:px-6 py-3.5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                                  <Icon name="account_tree" size={14} className="text-indigo-600" />
                                  <span>
                                    Sub-Categories / Sub-Topics under {lessonCode} ({subLessons.length})
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddSubLesson(section.id, les.id)}
                                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                                >
                                  <Icon name="add_circle" size={14} />
                                  <span>+ Add {nextSubCode}</span>
                                </button>
                              </div>

                              <div className="space-y-2 pl-3 sm:pl-5 border-l-2 border-indigo-300">
                                {subLessons.map((sub, subIdx) => {
                                  const subCode = `${lessonCode}.${subIdx + 1}`;

                                  return (
                                    <div
                                      key={sub.id}
                                      className="p-3 rounded-xl bg-white border border-indigo-200/80 shadow-2xs space-y-2"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-0.5">
                                          <button
                                            type="button"
                                            disabled={subIdx === 0}
                                            onClick={() => moveSubLesson(section.id, les.id, subIdx, 'up')}
                                            className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                                            title="Move sub-topic up"
                                          >
                                            <Icon name="arrow_upward" size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={subIdx === subLessons.length - 1}
                                            onClick={() => moveSubLesson(section.id, les.id, subIdx, 'down')}
                                            className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                                            title="Move sub-topic down"
                                          >
                                            <Icon name="arrow_downward" size={13} />
                                          </button>
                                        </div>

                                        {/* Sub-Topic Code Badge: 1.1.1, 1.1.2, 2.1.1 */}
                                        <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-300 font-mono font-black text-[11px] shrink-0">
                                          {subCode}
                                        </span>

                                        {/* Sub-Topic Title */}
                                        <input
                                          type="text"
                                          value={sub.title}
                                          onChange={(e) =>
                                            handleUpdateSubLesson(section.id, les.id, sub.id, {
                                              title: e.target.value,
                                              code: subCode
                                            })
                                          }
                                          placeholder={`${subCode} Sub-Topic Title...`}
                                          className="flex-1 min-w-[180px] bg-slate-50 focus:bg-white border border-slate-200 focus:border-violet-600 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                                        />

                                        {/* Sub-Topic Content Type */}
                                        <select
                                          value={sub.type || 'VIDEO'}
                                          onChange={(e) =>
                                            handleUpdateSubLesson(section.id, les.id, sub.id, {
                                              type: e.target.value as any
                                            })
                                          }
                                          className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                                        >
                                          <option value="VIDEO">🎬 Video</option>
                                          <option value="TEXT">📄 Text / Notes</option>
                                          <option value="PDF">📑 PDF</option>
                                        </select>

                                        {/* Sub-Topic Duration */}
                                        <input
                                          type="text"
                                          value={sub.duration || '05:00'}
                                          onChange={(e) =>
                                            handleUpdateSubLesson(section.id, les.id, sub.id, {
                                              duration: e.target.value
                                            })
                                          }
                                          placeholder="05:00"
                                          className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono text-center text-slate-700 focus:outline-none"
                                        />

                                        {sub.type === 'VIDEO' && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setVideoModalTarget({
                                                sectionId: section.id,
                                                lessonId: les.id,
                                                subLessonId: sub.id,
                                                title: sub.title
                                              })
                                            }
                                            className="px-2.5 py-1 bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white border border-violet-200 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                          >
                                            <Icon name="cloud_upload" size={13} />
                                            <span>{sub.videoUrl ? 'Replace Video' : 'Upload Video'}</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSubLesson(section.id, les.id, sub.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                          title={`Remove ${subCode}`}
                                        >
                                          <Icon name="close" size={15} />
                                        </button>
                                      </div>

                                      {/* Sub-Topic Description & Media URL */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                                        <input
                                          type="text"
                                          value={sub.description || ''}
                                          onChange={(e) =>
                                            handleUpdateSubLesson(section.id, les.id, sub.id, {
                                              description: e.target.value
                                            })
                                          }
                                          placeholder={`Sub-topic ${subCode} description or key notes...`}
                                          className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-violet-500 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none"
                                        />

                                        {sub.type === 'VIDEO' && (
                                          <input
                                            type="text"
                                            value={sub.videoUrl || ''}
                                            onChange={(e) =>
                                              handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                videoUrl: e.target.value
                                              })
                                            }
                                            placeholder={`Video URL for ${subCode} (or click Upload Video)...`}
                                            className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-violet-500 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 placeholder-slate-400 focus:outline-none"
                                          />
                                        )}

                                        {sub.type === 'TEXT' && (
                                          <input
                                            type="text"
                                            value={sub.content || ''}
                                            onChange={(e) =>
                                              handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                content: e.target.value
                                              })
                                            }
                                            placeholder={`Reading content / notes for ${subCode}...`}
                                            className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-violet-500 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none"
                                          />
                                        )}

                                        {sub.type === 'PDF' && (
                                          <input
                                            type="text"
                                            value={sub.pdfUrl || ''}
                                            onChange={(e) =>
                                              handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                pdfUrl: e.target.value
                                              })
                                            }
                                            placeholder={`PDF URL for ${subCode}...`}
                                            className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-violet-500 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 placeholder-slate-400 focus:outline-none"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Quick Footer Button to Add Next Lesson in Module */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(section.id, 'VIDEO', false)}
                      className="px-4 py-2 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Icon name="add_circle" size={16} />
                      <span>
                        + Add Lesson {moduleNum}.{section.lessons.length + 1} to Module {moduleNum}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Section Modal */}
      <Modal
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        maxWidth="md"
        title={editingSectionId ? 'Edit Module Details' : 'Add New Curriculum Module'}
        subtitle="Set the module title and description"
      >
        <form onSubmit={handleAddSection} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Module Title *
            </label>
            <input
              type="text"
              required
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="e.g. Module 2: Digital Assessment & Student Engagement"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Module Description
            </label>
            <textarea
              rows={3}
              value={newSectionDescription}
              onChange={(e) => setNewSectionDescription(e.target.value)}
              placeholder="Describe what students will learn in this module..."
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-xs text-on-surface focus:outline-none focus:border-primary font-medium resize-y"
            />
          </div>

          <div className="pt-3 border-t border-outline-variant/60 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddSectionOpen(false)}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs cursor-pointer"
            >
              {editingSectionId ? 'Save Module' : 'Create Module'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lesson Studio Editor Modal */}
      {editingLesson && (
        <LessonStudioModal
          isOpen={true}
          lesson={editingLesson.lesson}
          onClose={() => setEditingLesson(null)}
          onSave={handleSaveLessonEdit}
        />
      )}

      {/* Video Upload & Attachment Modal */}
      {videoModalTarget && (
        <VideoUploadModal
          isOpen={true}
          onClose={() => setVideoModalTarget(null)}
          lessonId={videoModalTarget.subLessonId || videoModalTarget.lessonId}
          lessonTitle={videoModalTarget.title}
          onSuccess={(videoUrl, duration) => {
            if (videoModalTarget.subLessonId) {
              handleUpdateSubLesson(
                videoModalTarget.sectionId,
                videoModalTarget.lessonId,
                videoModalTarget.subLessonId,
                { videoUrl, duration: duration || '05:00' }
              );
            } else {
              handleUpdateLessonInline(videoModalTarget.sectionId, videoModalTarget.lessonId, {
                videoUrl,
                duration: duration || '10:00'
              });
            }
          }}
        />
      )}

      {/* AI Course Generator Studio Modal */}
      <AiCourseGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onImportCurriculum={handleImportAiCurriculum}
      />
    </div>
  );
};

/* ==========================================================
   LESSON STUDIO MODAL COMPONENT (Video, Text, PDF, Quiz)
   ========================================================== */
interface LessonStudioModalProps {
  isOpen: boolean;
  lesson: BuilderLesson;
  onClose: () => void;
  onSave: (lesson: BuilderLesson) => void;
}

const LessonStudioModal: React.FC<LessonStudioModalProps> = ({
  isOpen,
  lesson,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<BuilderLesson>({
    ...lesson,
    quizData:
      typeof lesson.quizData === 'string'
        ? (() => {
            try {
              return JSON.parse(lesson.quizData as string);
            } catch {
              return { questions: [], passingScore: 70, attemptLimit: 0 };
            }
          })()
        : lesson.quizData || { questions: [], passingScore: 70, attemptLimit: 0 }
  });

  const parsedQuiz = (formData.quizData as QuizConfig) || { questions: [], passingScore: 70, attemptLimit: 0 };

  const handleAddQuizQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      question: 'Enter question text here...',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      explanation: 'Explanation of why this answer is correct.',
      points: 1
    };

    setFormData({
      ...formData,
      quizData: {
        ...parsedQuiz,
        questions: [...parsedQuiz.questions, newQ]
      }
    });
  };

  const handleUpdateQuizQuestion = (qIndex: number, field: string, val: any) => {
    const questions = [...parsedQuiz.questions];
    questions[qIndex] = { ...questions[qIndex], [field]: val };
    setFormData({
      ...formData,
      quizData: {
        ...parsedQuiz,
        questions
      }
    });
  };

  const handleRemoveQuizQuestion = (qIndex: number) => {
    const questions = [...parsedQuiz.questions];
    questions.splice(qIndex, 1);
    setFormData({
      ...formData,
      quizData: {
        ...parsedQuiz,
        questions
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={`Edit Lecture: "${formData.title}"`}
      subtitle={`Type: ${formData.type} • Order: ${formData.order}`}
    >
      <div className="space-y-6">
        {/* Lesson Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { type: 'VIDEO', icon: 'movie', label: 'Video Lesson' },
            { type: 'TEXT', icon: 'article', label: 'Rich Text Article' },
            { type: 'PDF', icon: 'picture_as_pdf', label: 'PDF Document' },
            { type: 'QUIZ', icon: 'quiz', label: 'Knowledge Quiz' }
          ].map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setFormData({ ...formData, type: t.type as any })}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                formData.type === t.type
                  ? 'bg-primary/10 border-primary shadow-xs'
                  : 'bg-surface border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              <Icon
                name={t.icon}
                size={20}
                className={formData.type === t.type ? 'text-primary mb-1' : 'text-outline mb-1'}
              />
              <p className="text-xs font-bold text-on-surface">{t.label}</p>
            </button>
          ))}
        </div>

        {/* Title & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Lesson Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Duration (mm:ss)
            </label>
            <input
              type="text"
              value={formData.duration || '10:00'}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="12:00"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Lesson Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
            Lesson Description / Overview
          </label>
          <textarea
            rows={2}
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Summarize what this lesson covers..."
            className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        {/* TYPE 1: VIDEO LESSON */}
        {formData.type === 'VIDEO' && (
          <div className="space-y-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Video Stream / Cloud CDN URL
            </label>
            <input
              type="text"
              value={formData.videoUrl || ''}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="e.g. /uploads/videos/... or YouTube or Vimeo or CDN stream"
              className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* TYPE 2: TEXT ARTICLE LESSON */}
        {formData.type === 'TEXT' && (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Article Content (Markdown / Rich Text)
            </label>
            <textarea
              rows={8}
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="# Lesson Overview&#10;&#10;Explain core concepts here..."
              className="w-full bg-surface border border-outline-variant rounded-2xl p-4 text-xs font-mono leading-relaxed text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* TYPE 3: PDF / RESOURCE LESSON */}
        {formData.type === 'PDF' && (
          <div className="space-y-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              PDF Document File URL
            </label>
            <input
              type="text"
              value={formData.pdfUrl || ''}
              onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
              placeholder="https://cdn.morenateach.com/cheatsheet.pdf or /uploads/..."
              className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* TYPE 4: QUIZ BUILDER */}
        {formData.type === 'QUIZ' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-on-surface">
                    Passing Grade (%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={parsedQuiz.passingScore || 70}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quizData: { ...parsedQuiz, passingScore: Number(e.target.value) }
                      })
                    }
                    className="w-20 bg-surface border border-outline-variant rounded-lg p-1 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddQuizQuestion}
                className="px-3.5 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="add" size={14} />
                <span>Add Question</span>
              </button>
            </div>

            {/* Questions List */}
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {parsedQuiz.questions.map((q, qIdx) => (
                <div
                  key={q.id || qIdx}
                  className="p-4 bg-surface rounded-2xl border border-outline-variant space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary font-mono">
                      Question {qIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuizQuestion(qIdx)}
                      className="text-outline hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => handleUpdateQuizQuestion(qIdx, 'question', e.target.value)}
                    placeholder="Enter question prompt..."
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface font-semibold focus:outline-none focus:border-primary"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = q.correctIndex === oIdx;
                      return (
                        <div
                          key={oIdx}
                          className={`flex items-center gap-2 p-2 rounded-xl border ${
                            isCorrect ? 'border-emerald-500 bg-emerald-50/50' : 'border-outline-variant bg-surface'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.id || qIdx}`}
                            checked={isCorrect}
                            onChange={() => handleUpdateQuizQuestion(qIdx, 'correctIndex', oIdx)}
                            className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[oIdx] = e.target.value;
                              handleUpdateQuizQuestion(qIdx, 'options', newOpts);
                            }}
                            className="flex-1 bg-transparent border-0 text-xs text-on-surface focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => handleUpdateQuizQuestion(qIdx, 'explanation', e.target.value)}
                    placeholder="Rationale / explanation shown after answer submission..."
                    className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl p-2 text-[11px] text-on-surface-variant focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Free Preview Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/60">
          <div>
            <p className="text-xs font-bold text-on-surface">Free Preview Lecture</p>
            <p className="text-[11px] text-on-surface-variant">
              Allow visitors and unregistered students to view this lecture without purchasing.
            </p>
          </div>
          <input
            type="checkbox"
            checked={!!formData.isFree}
            onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
            className="w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-outline-variant/60 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(formData)}
            className="px-6 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs cursor-pointer"
          >
            Save Lecture Content
          </button>
        </div>
      </div>
    </Modal>
  );
};
