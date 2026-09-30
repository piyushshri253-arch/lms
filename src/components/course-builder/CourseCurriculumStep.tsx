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
  quizData?: QuizConfig | string;
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
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [uploadingPdfItemId, setUploadingPdfItemId] = useState<string | null>(null);
  const [expandedQuickQuizIds, setExpandedQuickQuizIds] = useState<Record<string, boolean>>({});

  const toggleQuickQuizPanel = (itemId: string) => {
    setExpandedQuickQuizIds((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const parseQuizConfig = (raw?: QuizConfig | string): QuizConfig => {
    if (!raw) return { questions: [], passingScore: 70, attemptLimit: 0 };
    if (typeof raw === 'object') {
      return {
        questions: Array.isArray(raw.questions) ? raw.questions : [],
        passingScore: raw.passingScore || 70,
        attemptLimit: raw.attemptLimit || 0
      };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        passingScore: parsed.passingScore || 70,
        attemptLimit: parsed.attemptLimit || 0
      };
    } catch {
      return { questions: [], passingScore: 70, attemptLimit: 0 };
    }
  };

  // Direct 1-Click PDF File Upload from System (PC/Laptop) or Mobile Phone
  const handleDirectPdfFileSelect = async (
    file: File,
    sectionId: string,
    lessonId: string,
    subLessonId?: string
  ) => {
    if (!file) return;
    const targetKey = subLessonId || lessonId;
    setUploadingPdfItemId(targetKey);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lessonId', targetKey);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

      let finalPdfUrl = '';
      try {
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          finalPdfUrl = data.videoUrl || data.media?.url || URL.createObjectURL(file);
        } else {
          finalPdfUrl = URL.createObjectURL(file);
        }
      } catch {
        finalPdfUrl = URL.createObjectURL(file);
      }

      if (subLessonId) {
        handleUpdateSubLesson(sectionId, lessonId, subLessonId, {
          pdfUrl: finalPdfUrl
        });
      } else {
        handleUpdateLessonInline(sectionId, lessonId, {
          pdfUrl: finalPdfUrl
        });
      }

      showToast({
        title: 'PDF Attached 🎉',
        description: `"${file.name}" uploaded successfully.`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'PDF Upload Error',
        description: err.message || 'Could not attach PDF file.',
        type: 'error'
      });
    } finally {
      setUploadingPdfItemId(null);
    }
  };

  // Direct 1-Click System / Mobile Phone Video & PDF Upload Handler
  const handleDirectDeviceFileSelect = async (
    file: File,
    sectionId: string,
    lessonId: string,
    subLessonId?: string
  ) => {
    if (!file) return;
    const targetKey = subLessonId || lessonId;
    setUploadingItemId(targetKey);

    // 1. Auto-detect video duration from file metadata on device/phone
    const detectDuration = (): Promise<{ durationText: string; durationSeconds: number }> =>
      new Promise((resolve) => {
        if (!file.type.startsWith('video/')) {
          resolve({ durationText: '05:00', durationSeconds: 300 });
          return;
        }
        try {
          const tempUrl = URL.createObjectURL(file);
          const vid = document.createElement('video');
          vid.preload = 'metadata';
          vid.onloadedmetadata = () => {
            const secs = vid.duration && isFinite(vid.duration) ? Math.round(vid.duration) : 600;
            const mm = String(Math.floor(secs / 60)).padStart(2, '0');
            const ss = String(secs % 60).padStart(2, '0');
            URL.revokeObjectURL(tempUrl);
            resolve({ durationText: `${mm}:${ss}`, durationSeconds: secs });
          };
          vid.onerror = () => {
            URL.revokeObjectURL(tempUrl);
            resolve({ durationText: '10:00', durationSeconds: 600 });
          };
          vid.src = tempUrl;
        } catch {
          resolve({ durationText: '10:00', durationSeconds: 600 });
        }
      });

    try {
      const { durationText, durationSeconds } = await detectDuration();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lessonId', targetKey);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('durationSeconds', String(durationSeconds));
      formData.append('durationText', durationText);

      let finalUrl = '';
      try {
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          finalUrl = data.videoUrl;
        } else {
          finalUrl = URL.createObjectURL(file);
        }
      } catch {
        finalUrl = URL.createObjectURL(file);
      }

      if (subLessonId) {
        handleUpdateSubLesson(sectionId, lessonId, subLessonId, {
          videoUrl: finalUrl,
          duration: durationText
        });
      } else {
        handleUpdateLessonInline(sectionId, lessonId, {
          videoUrl: finalUrl,
          duration: durationText,
          durationSeconds
        });
      }

      showToast({
        title: 'Video Uploaded from Device 🎉',
        description: `"${file.name}" (${durationText}) attached successfully.`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Upload Error',
        description: err.message || 'Could not attach video file.',
        type: 'error'
      });
    } finally {
      setUploadingItemId(null);
    }
  };

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

                                {/* Direct 1-Click Video Upload (PC / Phone) */}
                                <label
                                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                    uploadingItemId === les.id
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                      : les.videoUrl
                                      ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200'
                                      : 'bg-primary text-on-primary hover:bg-primary/90'
                                  }`}
                                  title="Directly select a video file from your Computer, Laptop, or Mobile Phone Gallery/Camera"
                                >
                                  <Icon
                                    name={
                                      uploadingItemId === les.id
                                        ? 'sync'
                                        : les.videoUrl
                                        ? 'check_circle'
                                        : 'upload_file'
                                    }
                                    size={14}
                                  />
                                  <span>
                                    {uploadingItemId === les.id
                                      ? 'Uploading Video...'
                                      : les.videoUrl
                                      ? '✓ Video (Change)'
                                      : 'Upload Video (PC/Phone)'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        handleDirectDeviceFileSelect(f, section.id, les.id);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </label>

                                {/* Direct 1-Click PDF Upload (PC / Phone) */}
                                <label
                                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                                    uploadingPdfItemId === les.id
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                      : les.pdfUrl
                                      ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200'
                                      : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200'
                                  }`}
                                  title="Directly upload a PDF document from your System or Mobile Phone"
                                >
                                  <Icon
                                    name={
                                      uploadingPdfItemId === les.id
                                        ? 'sync'
                                        : les.pdfUrl
                                        ? 'check_circle'
                                        : 'picture_as_pdf'
                                    }
                                    size={14}
                                  />
                                  <span>
                                    {uploadingPdfItemId === les.id
                                      ? 'Uploading PDF...'
                                      : les.pdfUrl
                                      ? '✓ PDF'
                                      : '+ Upload PDF'}
                                  </span>
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        handleDirectPdfFileSelect(f, section.id, les.id);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </label>

                                {/* Quick Questions Toggle Button */}
                                {(() => {
                                  const qConf = parseQuizConfig(les.quizData);
                                  const qCount = qConf.questions.length;
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (qCount === 0 && !expandedQuickQuizIds[les.id]) {
                                          const newQuiz: QuizConfig = {
                                            ...qConf,
                                            questions: [
                                              {
                                                id: `q-${Date.now()}`,
                                                question: '',
                                                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                                correctIndex: 0,
                                                explanation: '',
                                                points: 10
                                              }
                                            ]
                                          };
                                          handleUpdateLessonInline(section.id, les.id, { quizData: newQuiz });
                                        }
                                        toggleQuickQuizPanel(les.id);
                                      }}
                                      className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                                        qCount > 0
                                          ? 'bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-300'
                                          : 'bg-slate-100 hover:bg-amber-600 text-slate-700 hover:text-white'
                                      }`}
                                      title="Add or edit Quick Questions / Practice Quiz for this lesson"
                                    >
                                      <Icon name="quiz" size={14} />
                                      <span>
                                        {qCount > 0 ? `❓ Quick Questions (${qCount})` : '+ Quick Question'}
                                      </span>
                                    </button>
                                  );
                                })()}

                                <button
                                  type="button"
                                  onClick={() => setEditingLesson({ sectionId: section.id, lesson: les })}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Open Full Multi-Content Editor"
                                >
                                  <Icon name="tune" size={14} />
                                  <span>Full Editor</span>
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

                            {/* ALL-IN-ONE MULTI-CONTENT HUB FOR LESSON 1.1 (Video + PDF + Text Notes + Quick Questions) */}
                            <div className="pl-0 sm:pl-14 space-y-2.5 pt-1">
                              {/* Status Pills showing attached resources inside 1.1 */}
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                <span className="text-slate-400 uppercase tracking-wider mr-1">
                                  Included in {lessonCode}:
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md border ${
                                    les.videoUrl
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200'
                                  }`}
                                >
                                  🎬 Video {les.videoUrl ? '✓' : '(Optional)'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md border ${
                                    les.pdfUrl
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200'
                                  }`}
                                >
                                  📑 PDF {les.pdfUrl ? '✓' : '(Optional)'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md border ${
                                    les.content
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200'
                                  }`}
                                >
                                  📝 Text Notes {les.content ? '✓' : '(Optional)'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md border ${
                                    parseQuizConfig(les.quizData).questions.length > 0
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200'
                                  }`}
                                >
                                  ❓ Quick Questions ({parseQuizConfig(les.quizData).questions.length})
                                </span>
                              </div>

                              {/* Row 1: Video URL/Upload + PDF URL/Upload */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {/* 1. VIDEO INPUT */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-indigo-700 shrink-0 w-14">
                                    🎬 Video:
                                  </span>
                                  <input
                                    type="text"
                                    value={les.videoUrl || ''}
                                    onChange={(e) =>
                                      handleUpdateLessonInline(section.id, les.id, {
                                        videoUrl: e.target.value
                                      })
                                    }
                                    placeholder={`Video URL for ${lessonCode} or Upload →`}
                                    className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none"
                                  />
                                  <label
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                                    title="Upload Video from System (PC/Laptop) or Mobile Phone"
                                  >
                                    <Icon name="upload_file" size={13} />
                                    <span>Browse</span>
                                    <input
                                      type="file"
                                      accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                          handleDirectDeviceFileSelect(f, section.id, les.id);
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                  </label>
                                </div>

                                {/* 2. PDF INPUT */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-rose-700 shrink-0 w-14">
                                    📑 PDF:
                                  </span>
                                  <input
                                    type="text"
                                    value={les.pdfUrl || ''}
                                    onChange={(e) =>
                                      handleUpdateLessonInline(section.id, les.id, {
                                        pdfUrl: e.target.value
                                      })
                                    }
                                    placeholder={`PDF URL for ${lessonCode} or Upload PDF →`}
                                    className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-rose-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none"
                                  />
                                  <label
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                                    title="Upload PDF from System (PC/Laptop) or Mobile Phone"
                                  >
                                    <Icon name="picture_as_pdf" size={13} />
                                    <span>Browse</span>
                                    <input
                                      type="file"
                                      accept=".pdf,application/pdf"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                          handleDirectPdfFileSelect(f, section.id, les.id);
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Row 2: Text / Study Notes + Lesson Description */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {/* 3. TEXT / STUDY NOTES */}
                                <div className="flex items-start gap-1.5">
                                  <span className="text-[11px] font-bold text-emerald-700 shrink-0 w-14 pt-1.5">
                                    📝 Notes:
                                  </span>
                                  <textarea
                                    rows={2}
                                    value={les.content || ''}
                                    onChange={(e) =>
                                      handleUpdateLessonInline(section.id, les.id, {
                                        content: e.target.value
                                      })
                                    }
                                    placeholder={`Write Text / Study Notes / Article for ${lessonCode} here...`}
                                    className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none resize-y"
                                  />
                                </div>

                                {/* 4. LESSON OVERVIEW / DESCRIPTION */}
                                <div className="flex items-start gap-1.5">
                                  <span className="text-[11px] font-bold text-slate-600 shrink-0 w-14 pt-1.5">
                                    📌 Info:
                                  </span>
                                  <textarea
                                    rows={2}
                                    value={les.description || ''}
                                    onChange={(e) =>
                                      handleUpdateLessonInline(section.id, les.id, {
                                        description: e.target.value
                                      })
                                    }
                                    placeholder={`Short overview / summary for ${lessonCode} (optional)...`}
                                    className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none resize-y"
                                  />
                                </div>
                              </div>

                              {/* Row 3: Inline Quick Questions / Mini Quiz Builder for Lesson 1.1 */}
                              {(() => {
                                const qConf = parseQuizConfig(les.quizData);
                                const isExpanded =
                                  expandedQuickQuizIds[les.id] || qConf.questions.length > 0;
                                if (!isExpanded) return null;

                                return (
                                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                                        <Icon name="quiz" size={15} className="text-amber-600" />
                                        <span>
                                          Quick Questions / Practice Quiz for {lessonCode} (
                                          {qConf.questions.length})
                                        </span>
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated: QuizConfig = {
                                              ...qConf,
                                              questions: [
                                                ...qConf.questions,
                                                {
                                                  id: `q-${Date.now()}-${qConf.questions.length}`,
                                                  question: '',
                                                  options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                                  correctIndex: 0,
                                                  explanation: '',
                                                  points: 10
                                                }
                                              ]
                                            };
                                            handleUpdateLessonInline(section.id, les.id, {
                                              quizData: updated
                                            });
                                          }}
                                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                        >
                                          <Icon name="add" size={13} />
                                          <span>+ Add Question</span>
                                        </button>
                                      </div>
                                    </div>

                                    <div className="space-y-2.5">
                                      {qConf.questions.map((q, qIdx) => (
                                        <div
                                          key={q.id || qIdx}
                                          className="p-3 rounded-xl bg-white border border-amber-200 space-y-2 shadow-2xs"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-black text-amber-800 font-mono">
                                              Q{qIdx + 1} ({lessonCode})
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated: QuizConfig = {
                                                  ...qConf,
                                                  questions: qConf.questions.filter((_, idx) => idx !== qIdx)
                                                };
                                                handleUpdateLessonInline(section.id, les.id, {
                                                  quizData: updated
                                                });
                                              }}
                                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                              title="Delete Question"
                                            >
                                              <Icon name="delete" size={15} />
                                            </button>
                                          </div>

                                          <input
                                            type="text"
                                            value={q.question}
                                            onChange={(e) => {
                                              const nextQuestions = [...qConf.questions];
                                              nextQuestions[qIdx] = { ...q, question: e.target.value };
                                              handleUpdateLessonInline(section.id, les.id, {
                                                quizData: { ...qConf, questions: nextQuestions }
                                              });
                                            }}
                                            placeholder={`Type Question ${qIdx + 1} here...`}
                                            className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                                          />

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {q.options.map((opt, oIdx) => {
                                              const isCorrect = q.correctIndex === oIdx;
                                              return (
                                                <div
                                                  key={oIdx}
                                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
                                                    isCorrect
                                                      ? 'bg-emerald-50 border-emerald-500'
                                                      : 'bg-slate-50 border-slate-200'
                                                  }`}
                                                >
                                                  <input
                                                    type="radio"
                                                    name={`inline-q-${les.id}-${qIdx}`}
                                                    checked={isCorrect}
                                                    onChange={() => {
                                                      const nextQuestions = [...qConf.questions];
                                                      nextQuestions[qIdx] = { ...q, correctIndex: oIdx };
                                                      handleUpdateLessonInline(section.id, les.id, {
                                                        quizData: { ...qConf, questions: nextQuestions }
                                                      });
                                                    }}
                                                    className="text-emerald-600 cursor-pointer"
                                                    title="Mark as correct option"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                      const nextOpts = [...q.options];
                                                      nextOpts[oIdx] = e.target.value;
                                                      const nextQuestions = [...qConf.questions];
                                                      nextQuestions[qIdx] = { ...q, options: nextOpts };
                                                      handleUpdateLessonInline(section.id, les.id, {
                                                        quizData: { ...qConf, questions: nextQuestions }
                                                      });
                                                    }}
                                                    placeholder={`Option ${oIdx + 1}`}
                                                    className="flex-1 bg-transparent border-0 text-xs text-slate-800 focus:outline-none"
                                                  />
                                                  {isCorrect && (
                                                    <span className="text-[10px] font-extrabold text-emerald-700">
                                                      ✓ Correct
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>

                                          <input
                                            type="text"
                                            value={q.explanation || ''}
                                            onChange={(e) => {
                                              const nextQuestions = [...qConf.questions];
                                              nextQuestions[qIdx] = { ...q, explanation: e.target.value };
                                              handleUpdateLessonInline(section.id, les.id, {
                                                quizData: { ...qConf, questions: nextQuestions }
                                              });
                                            }}
                                            placeholder="Explanation / answer hint (optional)..."
                                            className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-600 focus:outline-none"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
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

                              <div className="space-y-2.5 pl-3 sm:pl-5 border-l-2 border-indigo-300">
                                {subLessons.map((sub, subIdx) => {
                                  const subCode = `${lessonCode}.${subIdx + 1}`;
                                  const subQuiz = parseQuizConfig(sub.quizData);

                                  return (
                                    <div
                                      key={sub.id}
                                      className="p-3 rounded-xl bg-white border border-indigo-200/80 shadow-2xs space-y-2.5"
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

                                        {/* Upload Video (PC/Phone) for Sub-Topic */}
                                        <label
                                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                                            uploadingItemId === sub.id
                                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                              : sub.videoUrl
                                              ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200'
                                              : 'bg-violet-600 hover:bg-violet-700 text-white'
                                          }`}
                                          title="Upload Video from System (PC/Laptop) or Mobile Phone"
                                        >
                                          <Icon
                                            name={
                                              uploadingItemId === sub.id
                                                ? 'sync'
                                                : sub.videoUrl
                                                ? 'check_circle'
                                                : 'upload_file'
                                            }
                                            size={13}
                                          />
                                          <span>
                                            {uploadingItemId === sub.id
                                              ? 'Uploading...'
                                              : sub.videoUrl
                                              ? '✓ Video'
                                              : '+ Video (PC/Phone)'}
                                          </span>
                                          <input
                                            type="file"
                                            accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp"
                                            className="hidden"
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) {
                                                handleDirectDeviceFileSelect(f, section.id, les.id, sub.id);
                                                e.target.value = '';
                                              }
                                            }}
                                          />
                                        </label>

                                        {/* Upload PDF (PC/Phone) for Sub-Topic */}
                                        <label
                                          className={`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                                            uploadingPdfItemId === sub.id
                                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                              : sub.pdfUrl
                                              ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200'
                                              : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200'
                                          }`}
                                          title="Upload PDF from PC or Mobile Phone"
                                        >
                                          <Icon name="picture_as_pdf" size={12} />
                                          <span>{sub.pdfUrl ? '✓ PDF' : '+ PDF'}</span>
                                          <input
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) {
                                                handleDirectPdfFileSelect(f, section.id, les.id, sub.id);
                                                e.target.value = '';
                                              }
                                            }}
                                          />
                                        </label>

                                        {/* Quick Question Button for Sub-Topic */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (subQuiz.questions.length === 0 && !expandedQuickQuizIds[sub.id]) {
                                              handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                quizData: {
                                                  ...subQuiz,
                                                  questions: [
                                                    {
                                                      id: `sq-${Date.now()}`,
                                                      question: '',
                                                      options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                                      correctIndex: 0,
                                                      explanation: '',
                                                      points: 10
                                                    }
                                                  ]
                                                }
                                              });
                                            }
                                            toggleQuickQuizPanel(sub.id);
                                          }}
                                          className={`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                                            subQuiz.questions.length > 0
                                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                              : 'bg-slate-100 hover:bg-amber-600 text-slate-700 hover:text-white'
                                          }`}
                                        >
                                          <Icon name="quiz" size={12} />
                                          <span>
                                            {subQuiz.questions.length > 0
                                              ? `❓ Questions (${subQuiz.questions.length})`
                                              : '+ Quick Question'}
                                          </span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSubLesson(section.id, les.id, sub.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                          title={`Remove ${subCode}`}
                                        >
                                          <Icon name="close" size={15} />
                                        </button>
                                      </div>

                                      {/* All-in-One Multi-Format Grid for Sub-Topic 1.1.1 */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                                        {/* Sub-Topic Video URL */}
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold text-violet-700 shrink-0 w-12">
                                            🎬 Video:
                                          </span>
                                          <input
                                            type="text"
                                            value={sub.videoUrl || ''}
                                            onChange={(e) =>
                                              handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                videoUrl: e.target.value
                                              })
                                            }
                                            placeholder={`Video URL for ${subCode} or click + Video...`}
                                            className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-violet-500 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 placeholder-slate-400 focus:outline-none"
                                          />
                                        </div>

                                        {/* Sub-Topic PDF URL */}
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold text-rose-700 shrink-0 w-12">
                                            📑 PDF:
                                          </span>
                                          <input
                                            type="text"
                                            value={sub.pdfUrl || ''}
                                            onChange={(e) =>
                                              handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                pdfUrl: e.target.value
                                              })
                                            }
                                            placeholder={`PDF URL for ${subCode} or click + PDF...`}
                                            className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-rose-500 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 placeholder-slate-400 focus:outline-none"
                                          />
                                        </div>

                                        {/* Sub-Topic Text Notes */}
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold text-emerald-700 shrink-0 w-12">
                                            📝 Notes:
                                          </span>
                                          <input
                                            type="text"
                                            value={sub.content || ''}
                                            onChange={(e) =>
                                              handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                content: e.target.value
                                              })
                                            }
                                            placeholder={`Text / study notes for ${subCode}...`}
                                            className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none"
                                          />
                                        </div>

                                        {/* Sub-Topic Description */}
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold text-slate-600 shrink-0 w-12">
                                            📌 Info:
                                          </span>
                                          <input
                                            type="text"
                                            value={sub.description || ''}
                                            onChange={(e) =>
                                              handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                description: e.target.value
                                              })
                                            }
                                            placeholder={`Sub-topic ${subCode} summary...`}
                                            className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-violet-500 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none"
                                          />
                                        </div>
                                      </div>

                                      {/* Sub-Topic Quick Questions Panel */}
                                      {(expandedQuickQuizIds[sub.id] || subQuiz.questions.length > 0) && (
                                        <div className="ml-6 p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-extrabold text-amber-900">
                                              ❓ Quick Questions for {subCode} ({subQuiz.questions.length})
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                  quizData: {
                                                    ...subQuiz,
                                                    questions: [
                                                      ...subQuiz.questions,
                                                      {
                                                        id: `sq-${Date.now()}`,
                                                        question: '',
                                                        options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                                        correctIndex: 0,
                                                        explanation: '',
                                                        points: 10
                                                      }
                                                    ]
                                                  }
                                                });
                                              }}
                                              className="px-2.5 py-0.5 bg-amber-600 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                            >
                                              + Add Question
                                            </button>
                                          </div>
                                          {subQuiz.questions.map((sq, sqIdx) => (
                                            <div
                                              key={sq.id || sqIdx}
                                              className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1.5"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-amber-800">
                                                  Q{sqIdx + 1}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                      quizData: {
                                                        ...subQuiz,
                                                        questions: subQuiz.questions.filter(
                                                          (_, idx) => idx !== sqIdx
                                                        )
                                                      }
                                                    });
                                                  }}
                                                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                                >
                                                  <Icon name="delete" size={13} />
                                                </button>
                                              </div>
                                              <input
                                                type="text"
                                                value={sq.question}
                                                onChange={(e) => {
                                                  const nextQ = [...subQuiz.questions];
                                                  nextQ[sqIdx] = { ...sq, question: e.target.value };
                                                  handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                    quizData: { ...subQuiz, questions: nextQ }
                                                  });
                                                }}
                                                placeholder="Enter quick question..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-[11px] font-bold"
                                              />
                                              <div className="grid grid-cols-2 gap-1.5">
                                                {sq.options.map((opt, oIdx) => (
                                                  <div
                                                    key={oIdx}
                                                    className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-200"
                                                  >
                                                    <input
                                                      type="radio"
                                                      name={`sub-q-${sub.id}-${sqIdx}`}
                                                      checked={sq.correctIndex === oIdx}
                                                      onChange={() => {
                                                        const nextQ = [...subQuiz.questions];
                                                        nextQ[sqIdx] = { ...sq, correctIndex: oIdx };
                                                        handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                          quizData: { ...subQuiz, questions: nextQ }
                                                        });
                                                      }}
                                                    />
                                                    <input
                                                      type="text"
                                                      value={opt}
                                                      onChange={(e) => {
                                                        const nextOpts = [...sq.options];
                                                        nextOpts[oIdx] = e.target.value;
                                                        const nextQ = [...subQuiz.questions];
                                                        nextQ[sqIdx] = { ...sq, options: nextOpts };
                                                        handleUpdateSubLesson(section.id, les.id, sub.id, {
                                                          quizData: { ...subQuiz, questions: nextQ }
                                                        });
                                                      }}
                                                      className="w-full bg-transparent text-[10px] focus:outline-none"
                                                    />
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
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

        {/* 1. VIDEO LECTURE SECTION (Always Available) */}
        <div className="space-y-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              🎬 1. Lesson Video (Upload from System / Phone OR Paste URL)
            </label>
            <label className="px-3.5 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all">
              <Icon name="upload_file" size={16} />
              <span>Upload Video (PC / Mobile Phone)</span>
              <input
                type="file"
                accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  e.target.value = '';
                  const localPreview = URL.createObjectURL(f);
                  const tempVideo = document.createElement('video');
                  tempVideo.preload = 'metadata';
                  tempVideo.src = localPreview;
                  tempVideo.onloadedmetadata = () => {
                    if (tempVideo.duration && isFinite(tempVideo.duration)) {
                      const mins = Math.floor(tempVideo.duration / 60);
                      const secs = Math.floor(tempVideo.duration % 60);
                      const dur = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                      setFormData((prev) => ({ ...prev, duration: dur }));
                    }
                  };
                  setFormData((prev) => ({ ...prev, videoUrl: localPreview }));
                  try {
                    const fd = new FormData();
                    fd.append('file', f);
                    const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
                    const data = await res.json();
                    if (res.ok && (data?.videoUrl || data?.media?.url)) {
                      setFormData((prev) => ({
                        ...prev,
                        videoUrl: data.videoUrl || data.media.url
                      }));
                    }
                  } catch {
                    // Keep localPreview
                  }
                }}
              />
            </label>
          </div>

          <input
            type="text"
            value={formData.videoUrl || ''}
            onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
            placeholder="Paste YouTube / Vimeo / MP4 URL or click 'Upload Video (PC / Mobile Phone)' above..."
            className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
          />

          {formData.videoUrl && (
            <div className="pt-1">
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mb-1.5">
                <Icon name="check_circle" size={14} />
                <span>Video Ready for Playback</span>
              </div>
              {(formData.videoUrl.startsWith('blob:') ||
                formData.videoUrl.startsWith('data:') ||
                formData.videoUrl.startsWith('/uploads/') ||
                formData.videoUrl.endsWith('.mp4') ||
                formData.videoUrl.endsWith('.webm') ||
                formData.videoUrl.endsWith('.mov')) && (
                <video
                  src={formData.videoUrl}
                  controls
                  className="w-full max-h-48 rounded-xl bg-black border border-outline-variant"
                />
              )}
            </div>
          )}
        </div>

        {/* 2. PDF / RESOURCE DOCUMENT SECTION (Always Available) */}
        <div className="space-y-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              📑 2. PDF Document / Study Material (Upload OR Paste URL)
            </label>
            <label className="px-3.5 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all">
              <Icon name="picture_as_pdf" size={16} />
              <span>Upload PDF (PC / Mobile Phone)</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  e.target.value = '';
                  const localPdf = URL.createObjectURL(f);
                  setFormData((prev) => ({ ...prev, pdfUrl: localPdf }));
                  try {
                    const fd = new FormData();
                    fd.append('file', f);
                    const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
                    const data = await res.json();
                    if (res.ok && (data?.videoUrl || data?.media?.url)) {
                      setFormData((prev) => ({
                        ...prev,
                        pdfUrl: data.videoUrl || data.media.url
                      }));
                    }
                  } catch {
                    // Keep localPdf
                  }
                }}
              />
            </label>
          </div>
          <input
            type="text"
            value={formData.pdfUrl || ''}
            onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
            placeholder="https://cdn.morenateach.com/notes.pdf or click 'Upload PDF' above..."
            className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        {/* 3. TEXT / STUDY NOTES SECTION (Always Available) */}
        <div className="space-y-2 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
          <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
            📝 3. Text / Study Notes / Article Content
          </label>
          <textarea
            rows={6}
            value={formData.content || ''}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="# Lesson Study Notes&#10;&#10;Write detailed study notes, key takeaways, formulas, or article content here..."
            className="w-full bg-surface border border-outline-variant rounded-2xl p-3.5 text-xs font-mono leading-relaxed text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        {/* 4. QUICK QUESTIONS / QUIZ BUILDER SECTION (Always Available) */}
        <div className="space-y-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                ❓ 4. Quick Questions / Practice Quiz ({parsedQuiz.questions.length})
              </label>
              <p className="text-[11px] text-on-surface-variant">
                Add quick multiple-choice check questions for this lesson.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddQuizQuestion}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="add" size={14} />
              <span>+ Add Quick Question</span>
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
