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
  onOpenBatchMediaManager?: () => void;
}

export const CourseCurriculumStep: React.FC<CourseCurriculumStepProps> = ({
  sections,
  onChange,
  courseSlug,
  onOpenBatchMediaManager
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
  const [openContentDrawerId, setOpenContentDrawerId] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<
    Record<string, 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ'>
  >({});

  const toggleContentDrawer = (
    itemId: string,
    defaultTab?: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ'
  ) => {
    setOpenContentDrawerId((prev) => (prev === itemId ? null : itemId));
    if (defaultTab) {
      setActiveContentTab((prev) => ({ ...prev, [itemId]: defaultTab }));
    }
  };

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
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        finalPdfUrl = data.videoUrl || data.media?.url || '';
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Direct PDF upload failed on server.');
      }

      if (!finalPdfUrl || finalPdfUrl.startsWith('blob:')) {
        throw new Error('Server could not save PDF permanently. Please provide a direct link to the document.');
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
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        finalUrl = data.videoUrl;
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Direct video file upload failed on server.');
      }

      if (!finalUrl || finalUrl.startsWith('blob:')) {
        throw new Error('Server could not save video permanently. Please paste a direct YouTube, Vimeo, or MP4 cloud link.');
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
          title: l.title || `Lecture ${lIdx + 1}: Lesson Topic`,
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
            title: 'Introduction & Overview',
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

  // Add / Create Lesson (e.g., Lecture 1, 2 sequentially per module)
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
    const lessonCode = `${lessonNum}`;

    // Count existing quizzes in this module
    const existingQuizzesInModule = targetSec.lessons.filter((l) => l.type === 'QUIZ');
    const quizTitle =
      existingQuizzesInModule.length === 0
        ? `Quiz ${moduleNum}`
        : `Quiz ${moduleNum}.${existingQuizzesInModule.length + 1}`;

    const defaultTitle =
      type === 'VIDEO'
        ? `Video Lecture ${lessonCode}`
        : type === 'TEXT'
        ? `Reading Guide ${lessonCode}`
        : type === 'PDF'
        ? `Study Resource ${lessonCode}`
        : type === 'QUIZ'
        ? quizTitle
        : `Resource Material ${lessonCode}`;

    let defaultQuiz: QuizConfig | undefined;
    if (type === 'QUIZ') {
      defaultQuiz = {
        passingScore: 70,
        attemptLimit: 0,
        questions: [
          {
            id: `q-${Date.now()}`,
            question: `Assessment question for ${quizTitle}...`,
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
    if (openModal) {
      setEditingLesson({ sectionId, lesson: newLesson });
    } else if (type === 'QUIZ') {
      setOpenContentDrawerId(newLesson.id);
      setActiveContentTab((prev) => ({ ...prev, [newLesson.id]: 'QUIZ' }));
    }
    showToast({
      title: type === 'QUIZ' ? `Added ${defaultTitle}` : `Added Lecture ${lessonCode}`,
      description: `${defaultTitle} added to Module ${moduleNum}.`,
      type: 'success'
    });
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

    // Clean any temporary browser blob references
    const sanitizedLesson: BuilderLesson = {
      ...updatedLesson,
      videoUrl: updatedLesson.videoUrl?.startsWith('blob:') ? '' : updatedLesson.videoUrl,
      pdfUrl: updatedLesson.pdfUrl?.startsWith('blob:') ? '' : updatedLesson.pdfUrl
    };

    const updatedSections = sections.map((s) => {
      if (s.id === editingLesson.sectionId) {
        return {
          ...s,
          lessons: s.lessons.map((l) => (l.id === sanitizedLesson.id ? sanitizedLesson : l))
        };
      }
      return s;
    });

    onChange(updatedSections);
    setEditingLesson(null);
    showToast({ title: 'Lesson Saved', description: `Updated "${sanitizedLesson.title}".`, type: 'success' });
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
            Curriculum Builder (Modules &amp; Lectures)
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Organize your course into Modules and Lectures. Add Video, PDF resources, Reading Notes, and Practice Quizzes to each lecture.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            <span>Add Module</span>
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
                className="bg-[#f7f9fa] border border-[#d1d7dc] rounded-lg p-4 sm:p-5 space-y-4 shadow-2xs transition-all"
              >
                {/* Section Header (Udemy Style) */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={sIdx === 0}
                          onClick={() => moveSection(sIdx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Move Module Up"
                        >
                          <Icon name="arrow_upward" size={15} />
                        </button>
                        <button
                          type="button"
                          disabled={sIdx === sections.length - 1}
                          onClick={() => moveSection(sIdx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Move Module Down"
                        >
                          <Icon name="arrow_downward" size={15} />
                        </button>
                      </div>

                      {/* Module Title Label & Inline Input */}
                      <span className="font-extrabold text-sm text-slate-900 shrink-0 font-sans pt-1">
                        Module {moduleNum}:
                      </span>

                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => handleUpdateSectionField(section.id, 'title', e.target.value)}
                          placeholder={`Module ${moduleNum} Title (e.g. Introduction & Foundations)`}
                          className="w-full bg-white border border-[#d1d7dc] focus:border-[#2d2f31] rounded px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none transition-colors shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Delete Module"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Module Curriculum Items (Lectures & Sub-Topics) */}
                <div className="space-y-3 pt-1">
                  {section.lessons.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-[#d1d7dc] bg-white rounded-md">
                      No curriculum items in Module {moduleNum} yet.{' '}
                      <button
                        type="button"
                        onClick={() => handleCreateLesson(section.id, 'VIDEO', false)}
                        className="font-bold text-[#2d2f31] underline cursor-pointer hover:text-primary"
                      >
                        + Add Lecture 1
                      </button>
                    </div>
                  ) : (
                    section.lessons.map((les, lIdx) => {
                      const lessonCode = `${lIdx + 1}`;
                      const qConf = parseQuizConfig(les.quizData);
                      const qCount = qConf.questions.length;
                      const hasContent = !!(les.videoUrl || les.content || les.pdfUrl || qCount > 0);
                      const isDrawerOpen = openContentDrawerId === les.id;
                      const currentTab =
                        activeContentTab[les.id] ||
                        (les.type === 'QUIZ'
                          ? 'QUIZ'
                          : les.type === 'TEXT'
                          ? 'TEXT'
                          : les.type === 'PDF'
                          ? 'PDF'
                          : 'VIDEO');

                      return (
                        <div key={les.id} className="space-y-2">
                          {/* Udemy Lecture Card */}
                          <div className="border border-[#d1d7dc] bg-white rounded-md transition-all hover:border-slate-400 shadow-2xs overflow-hidden">
                            {/* Lecture Top Bar */}
                            <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {/* Up/Down buttons */}
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={lIdx === 0}
                                    onClick={() => moveLesson(section.id, lIdx, 'up')}
                                    className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                    title="Move Lecture Up"
                                  >
                                    <Icon name="arrow_upward" size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={lIdx === section.lessons.length - 1}
                                    onClick={() => moveLesson(section.id, lIdx, 'down')}
                                    className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                    title="Move Lecture Down"
                                  >
                                    <Icon name="arrow_downward" size={13} />
                                  </button>
                                </div>

                                {/* Checkmark Status Circle (Udemy Style) */}
                                {hasContent ? (
                                  <span
                                    className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs"
                                    title="Content is attached to this lecture"
                                  >
                                    ✓
                                  </span>
                                ) : (
                                  <span
                                    className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0"
                                    title="No content attached yet - click + Content below"
                                  />
                                )}

                                {/* Item Number Label */}
                                <span className="font-extrabold text-xs text-slate-900 shrink-0 font-sans min-w-[14px]">
                                  {lessonCode}.
                                </span>

                                {/* Inline Title Input */}
                                <div className="flex-1 min-w-[160px]">
                                  <input
                                    type="text"
                                    value={les.title}
                                    onChange={(e) =>
                                      handleUpdateLessonInline(section.id, les.id, { title: e.target.value })
                                    }
                                    placeholder={`Lesson ${lessonCode} Title`}
                                    className="w-full bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#2d2f31] rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none transition-colors"
                                  />
                                </div>

                                {/* Attached Content Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                  {les.videoUrl && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                      🎬 Video {les.duration ? `(${les.duration})` : ''}
                                    </span>
                                  )}
                                  {les.pdfUrl && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                                      📑 PDF
                                    </span>
                                  )}
                                  {les.content && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                      📝 Notes
                                    </span>
                                  )}
                                  {qCount > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                                      ❓ Quiz ({qCount})
                                    </span>
                                  )}
                                </div>

                                {/* Free Preview Checkbox */}
                                <label className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none shrink-0 pl-1">
                                  <input
                                    type="checkbox"
                                    checked={!!les.isFree}
                                    onChange={(e) =>
                                      handleUpdateLessonInline(section.id, les.id, {
                                        isFree: e.target.checked
                                      })
                                    }
                                    className="rounded border-slate-300 text-[#2d2f31] focus:ring-0"
                                  />
                                  <span>Free Preview</span>
                                </label>
                              </div>

                              {/* Action Buttons on Lecture: Delete */}
                              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLesson(section.id, les.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                                  title="Delete Lecture"
                                >
                                  <Icon name="delete" size={15} />
                                </button>
                              </div>
                            </div>

                            {/* UDEMY + CONTENT ⌄ INLINE DRAWER (for Lecture 1.1) */}
                            {isDrawerOpen && (
                              <div className="border-t border-[#d1d7dc] bg-[#f7f9fa] p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                                {/* Drawer Top Bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#d1d7dc]">
                                  <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                      Lecture {lessonCode} Content Manager
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                      Select content type to attach to this lecture. Video, PDF resources, study notes, and quiz questions can all be included.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setOpenContentDrawerId(null)}
                                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded bg-white self-start sm:self-auto cursor-pointer"
                                  >
                                    ✕ Close Content
                                  </button>
                                </div>

                                {/* Udemy-style 4 Content Tabs */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Tab 1: Video */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveContentTab((prev) => ({ ...prev, [les.id]: 'VIDEO' }));
                                      handleUpdateLessonInline(section.id, les.id, { type: 'VIDEO' });
                                    }}
                                    className={`px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                      currentTab === 'VIDEO'
                                        ? 'bg-[#2d2f31] text-white shadow-2xs'
                                        : 'bg-white text-slate-700 border border-[#d1d7dc] hover:bg-slate-100'
                                    }`}
                                  >
                                    <Icon name="movie" size={14} />
                                    <span>🎬 Video</span>
                                    {les.videoUrl && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />
                                    )}
                                  </button>

                                  {/* Tab 2: Notes / Article */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveContentTab((prev) => ({ ...prev, [les.id]: 'TEXT' }));
                                      handleUpdateLessonInline(section.id, les.id, { type: 'TEXT' });
                                    }}
                                    className={`px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                      currentTab === 'TEXT'
                                        ? 'bg-[#2d2f31] text-white shadow-2xs'
                                        : 'bg-white text-slate-700 border border-[#d1d7dc] hover:bg-slate-100'
                                    }`}
                                  >
                                    <Icon name="article" size={14} />
                                    <span>📝 Article / Notes</span>
                                    {les.content && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />
                                    )}
                                  </button>

                                  {/* Tab 3: PDF Resource */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveContentTab((prev) => ({ ...prev, [les.id]: 'PDF' }));
                                      handleUpdateLessonInline(section.id, les.id, { type: 'PDF' });
                                    }}
                                    className={`px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                      currentTab === 'PDF'
                                        ? 'bg-[#2d2f31] text-white shadow-2xs'
                                        : 'bg-white text-slate-700 border border-[#d1d7dc] hover:bg-slate-100'
                                    }`}
                                  >
                                    <Icon name="picture_as_pdf" size={14} />
                                    <span>📑 Downloadable PDF</span>
                                    {les.pdfUrl && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />
                                    )}
                                  </button>

                                  {/* Tab 4: Quick Quiz */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveContentTab((prev) => ({ ...prev, [les.id]: 'QUIZ' }));
                                      handleUpdateLessonInline(section.id, les.id, { type: 'QUIZ' });
                                    }}
                                    className={`px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                      currentTab === 'QUIZ'
                                        ? 'bg-[#2d2f31] text-white shadow-2xs'
                                        : 'bg-white text-slate-700 border border-[#d1d7dc] hover:bg-slate-100'
                                    }`}
                                  >
                                    <Icon name="quiz" size={14} />
                                    <span>❓ Quick Quiz Questions ({qCount})</span>
                                  </button>
                                </div>

                                {/* TAB 1 CONTENT: VIDEO (Upload PC/Phone + URL + Duration) */}
                                {currentTab === 'VIDEO' && (
                                  <div className="p-4 bg-white border border-[#d1d7dc] rounded-md space-y-4">
                                    <div className="flex flex-col md:flex-row gap-4 items-start">
                                      {/* Direct PC / Mobile Phone Video Upload */}
                                      <div className="w-full md:w-1/2 p-4 bg-slate-50 border-2 border-dashed border-[#d1d7dc] rounded-md text-center space-y-2">
                                        <div className="text-xs font-bold text-slate-800">
                                          Select Video from Computer or Phone
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                          Supports MP4, MOV, WEBM, MKV. Automatically calculates video duration.
                                        </p>
                                        <label
                                          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors shadow-2xs ${
                                            uploadingItemId === les.id
                                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                              : 'bg-[#2d2f31] hover:bg-black text-white'
                                          }`}
                                        >
                                          <Icon
                                            name={uploadingItemId === les.id ? 'sync' : 'upload_file'}
                                            size={16}
                                          />
                                          <span>
                                            {uploadingItemId === les.id
                                              ? 'Uploading Video... Please wait'
                                              : 'Select Video File (PC / Phone)'}
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
                                      </div>

                                      {/* Or Paste Video URL */}
                                      <div className="w-full md:w-1/2 space-y-3">
                                        <div className="space-y-1">
                                          <label className="block text-xs font-bold text-slate-700">
                                            Or Paste Video URL (YouTube, Vimeo, Cloud MP4)
                                          </label>
                                          <input
                                            type="text"
                                            value={les.videoUrl || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              handleUpdateLessonInline(section.id, les.id, {
                                                videoUrl: val,
                                                type: 'VIDEO'
                                              });
                                            }}
                                            placeholder="https://www.youtube.com/watch?v=... or direct MP4 link"
                                            className="w-full bg-slate-50 focus:bg-white border border-[#d1d7dc] focus:border-[#2d2f31] rounded px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none"
                                          />
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <div className="space-y-1">
                                            <label className="block text-[11px] font-bold text-slate-600">
                                              Video Duration (mm:ss)
                                            </label>
                                            <input
                                              type="text"
                                              value={les.duration || '10:00'}
                                              onChange={(e) =>
                                                handleUpdateLessonInline(section.id, les.id, {
                                                  duration: e.target.value
                                                })
                                              }
                                              placeholder="10:00"
                                              className="w-24 bg-slate-50 border border-[#d1d7dc] rounded px-2.5 py-1.5 text-xs font-mono text-center text-slate-800 focus:outline-none"
                                            />
                                          </div>

                                          {les.videoUrl && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleUpdateLessonInline(section.id, les.id, { videoUrl: '' })
                                              }
                                              className="mt-4 text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                                            >
                                              Remove Video
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Video Attached Status Banner & Live Embedded Player */}
                                    {les.videoUrl && (
                                      <div className="space-y-3 pt-1 border-t border-[#d1d7dc]/60">
                                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-emerald-700 font-bold text-xs">
                                              ✓ Video Attached:
                                            </span>
                                            <span className="text-xs font-mono text-slate-700 truncate max-w-sm">
                                              {les.videoUrl}
                                            </span>
                                          </div>
                                          <a
                                            href={les.videoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-bold text-[#2d2f31] hover:underline flex items-center gap-1"
                                          >
                                            <Icon name="open_in_new" size={13} />
                                            <span>Open In Tab</span>
                                          </a>
                                        </div>

                                        <div className="rounded-lg overflow-hidden border border-slate-300 bg-black aspect-video max-w-lg mx-auto shadow-xs relative flex items-center justify-center">
                                          {les.videoUrl.includes('youtube.com') || les.videoUrl.includes('youtu.be') ? (
                                            <iframe
                                              src={
                                                les.videoUrl.includes('embed')
                                                  ? les.videoUrl
                                                  : `https://www.youtube.com/embed/${les.videoUrl.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1]}?rel=0`
                                              }
                                              title="Video Preview"
                                              className="w-full h-full aspect-video border-0"
                                              allowFullScreen
                                            />
                                          ) : les.videoUrl.includes('vimeo.com') ? (
                                            <iframe
                                              src={`https://player.vimeo.com/video/${les.videoUrl.match(/vimeo\.com\/(\d+)/)?.[1]}`}
                                              title="Video Preview"
                                              className="w-full h-full aspect-video border-0"
                                              allowFullScreen
                                            />
                                          ) : (
                                            <video
                                              src={les.videoUrl}
                                              controls
                                              className="w-full h-full aspect-video object-contain"
                                            />
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* TAB 2 CONTENT: ARTICLE / STUDY NOTES */}
                                {currentTab === 'TEXT' && (
                                  <div className="p-4 bg-white border border-[#d1d7dc] rounded-md space-y-3">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-bold text-slate-800">
                                        Lecture Article &amp; Study Notes Content
                                      </label>
                                      <span className="text-[11px] text-slate-400">
                                        {(les.content || '').length} characters
                                      </span>
                                    </div>
                                    <textarea
                                      rows={6}
                                      value={les.content || ''}
                                      onChange={(e) =>
                                        handleUpdateLessonInline(section.id, les.id, {
                                          content: e.target.value,
                                          type: 'TEXT'
                                        })
                                      }
                                      placeholder="Write or paste your lecture article, markdown notes, code snippets, or key concepts for students to read..."
                                      className="w-full bg-slate-50 focus:bg-white border border-[#d1d7dc] focus:border-[#2d2f31] rounded p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors resize-y font-sans leading-relaxed"
                                    />
                                    {les.content && les.content.trim().length > 0 && (
                                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-emerald-700 font-bold text-xs">✓ Reading Notes Attached:</span>
                                          <span className="text-xs text-slate-700 font-medium">
                                            {les.content.length} characters • ~{Math.max(1, Math.ceil(les.content.length / 500))} min read
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                          Active In Player
                                        </span>
                                      </div>
                                    )}
                                    <p className="text-[11px] text-slate-500">
                                      💡 Students will be able to read this text directly in the course player while reviewing this lecture.
                                    </p>
                                  </div>
                                )}

                                {/* TAB 3 CONTENT: DOWNLOADABLE PDF RESOURCE */}
                                {currentTab === 'PDF' && (
                                  <div className="p-4 bg-white border border-[#d1d7dc] rounded-md space-y-4">
                                    <div className="flex flex-col md:flex-row gap-4 items-start">
                                      {/* Upload PDF, Doc, Image from PC/Phone */}
                                      <div className="w-full md:w-1/2 p-4 bg-slate-50 border-2 border-dashed border-[#d1d7dc] rounded-md text-center space-y-2">
                                        <div className="text-xs font-bold text-slate-800">
                                          Select PDF, Doc, or Image File
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                          Upload handouts (.pdf), notes (.doc, .docx), or diagrams (.png, .jpg).
                                        </p>
                                        <label
                                          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded font-bold text-xs cursor-pointer transition-colors shadow-2xs ${
                                            uploadingPdfItemId === les.id
                                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                                          }`}
                                        >
                                          <Icon
                                            name={
                                              uploadingPdfItemId === les.id ? 'sync' : 'attach_file'
                                            }
                                            size={16}
                                          />
                                          <span>
                                            {uploadingPdfItemId === les.id
                                              ? 'Uploading Resource... Please wait'
                                              : 'Select File (PDF, Doc, Image)'}
                                          </span>
                                          <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.txt,.zip,image/*"
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

                                      {/* Or Paste Resource / External URL */}
                                      <div className="w-full md:w-1/2 space-y-3">
                                        <div className="space-y-1">
                                          <label className="block text-xs font-bold text-slate-700">
                                            Or Paste Resource Link (Drive, GitHub, Web URL)
                                          </label>
                                          <input
                                            type="text"
                                            value={les.pdfUrl || ''}
                                            onChange={(e) =>
                                              handleUpdateLessonInline(section.id, les.id, {
                                                pdfUrl: e.target.value,
                                                type: 'PDF'
                                              })
                                            }
                                            placeholder="https://drive.google.com/... or https://..."
                                            className="w-full bg-slate-50 focus:bg-white border border-[#d1d7dc] focus:border-[#2d2f31] rounded px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none"
                                          />
                                        </div>

                                        {les.pdfUrl && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateLessonInline(section.id, les.id, { pdfUrl: '' })
                                            }
                                            className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                                          >
                                            Remove PDF
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* PDF Attached Banner */}
                                    {les.pdfUrl && (
                                      <div className="p-3 bg-rose-50 border border-rose-200 rounded flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-rose-700 font-bold text-xs">
                                            ✓ PDF Attached:
                                          </span>
                                          <span className="text-xs font-mono text-slate-700 truncate max-w-sm">
                                            {les.pdfUrl}
                                          </span>
                                        </div>
                                        <a
                                          href={les.pdfUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
                                        >
                                          <Icon name="open_in_new" size={13} />
                                          <span>Open PDF</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* TAB 4 CONTENT: QUICK QUIZ QUESTIONS */}
                                {currentTab === 'QUIZ' && (
                                  <div className="p-4 bg-white border border-[#d1d7dc] rounded-md space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#d1d7dc]/60">
                                      <div>
                                        <h5 className="text-xs font-bold text-slate-800">
                                          {les.title || `Practice Quiz / Quick Questions for Lecture ${lessonCode}`}
                                        </h5>
                                        <p className="text-[11px] text-slate-500">
                                          Students test their comprehension after completing this module item.
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextQ: QuizConfig = {
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
                                              quizData: nextQ,
                                              type: 'QUIZ'
                                            });
                                            showToast({
                                              title: 'Question Added',
                                              description: `Question ${nextQ.questions.length} added to ${les.title || 'Quiz'}.`,
                                              type: 'info'
                                            });
                                          }}
                                          className="px-3 py-1.5 bg-[#2d2f31] hover:bg-black text-white text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                        >
                                          <Icon name="add" size={14} />
                                          <span>Add Question</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateLessonInline(section.id, les.id, {
                                              quizData: qConf,
                                              type: 'QUIZ'
                                            });
                                            setOpenContentDrawerId(null);
                                            showToast({
                                              title: 'Quiz Saved Successfully! ✓',
                                              description: `"${les.title || 'Quiz'}" saved with ${qConf.questions.length} questions. You can now add the next quiz!`,
                                              type: 'success'
                                            });
                                          }}
                                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                          title="Save quiz questions and close editor"
                                        >
                                          <Icon name="check_circle" size={14} />
                                          <span>Save Quiz</span>
                                        </button>
                                      </div>
                                    </div>

                                    {qConf.questions.length === 0 ? (
                                      <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-[#d1d7dc] rounded bg-slate-50">
                                        No questions added yet. Click &ldquo;Add Question&rdquo; above to create practice questions for this lecture.
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {qConf.questions.map((q, qIdx) => (
                                          <div
                                            key={q.id || qIdx}
                                            className="p-3.5 bg-slate-50 border border-[#d1d7dc] rounded-md space-y-3"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-xs font-extrabold text-slate-800 font-mono">
                                                Question {qIdx + 1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextQuestions = qConf.questions.filter(
                                                    (_, idx) => idx !== qIdx
                                                  );
                                                  handleUpdateLessonInline(section.id, les.id, {
                                                    quizData: { ...qConf, questions: nextQuestions }
                                                  });
                                                }}
                                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                                title="Delete Question"
                                              >
                                                <Icon name="delete" size={15} />
                                              </button>
                                            </div>

                                            <input
                                              type="text"
                                              value={q.question}
                                              onChange={(e) => {
                                                const nextQ = [...qConf.questions];
                                                nextQ[qIdx] = { ...q, question: e.target.value };
                                                handleUpdateLessonInline(section.id, les.id, {
                                                  quizData: { ...qConf, questions: nextQ }
                                                });
                                              }}
                                              placeholder="Enter the question prompt here..."
                                              className="w-full bg-white border border-[#d1d7dc] focus:border-[#2d2f31] rounded px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                            />

                                            {/* 4 Choices */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {q.options.map((opt, oIdx) => {
                                                const isCorrect = q.correctIndex === oIdx;
                                                return (
                                                  <div
                                                    key={oIdx}
                                                    className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                                                      isCorrect
                                                        ? 'bg-emerald-50 border-emerald-400'
                                                        : 'bg-white border-[#d1d7dc]'
                                                    }`}
                                                  >
                                                    <input
                                                      type="radio"
                                                      name={`les-q-${les.id}-${qIdx}`}
                                                      checked={isCorrect}
                                                      onChange={() => {
                                                        const nextQ = [...qConf.questions];
                                                        nextQ[qIdx] = { ...q, correctIndex: oIdx };
                                                        handleUpdateLessonInline(section.id, les.id, {
                                                          quizData: { ...qConf, questions: nextQ }
                                                        });
                                                      }}
                                                      className="text-emerald-600 cursor-pointer"
                                                      title="Mark as correct answer"
                                                    />
                                                    <input
                                                      type="text"
                                                      value={opt}
                                                      onChange={(e) => {
                                                        const nextOpts = [...q.options];
                                                        nextOpts[oIdx] = e.target.value;
                                                        const nextQ = [...qConf.questions];
                                                        nextQ[qIdx] = { ...q, options: nextOpts };
                                                        handleUpdateLessonInline(section.id, les.id, {
                                                          quizData: { ...qConf, questions: nextQ }
                                                        });
                                                      }}
                                                      className="flex-1 bg-transparent border-0 text-xs text-slate-800 focus:outline-none"
                                                    />
                                                    {isCorrect && (
                                                      <span className="text-[10px] font-bold text-emerald-700">
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
                                                const nextQ = [...qConf.questions];
                                                nextQ[qIdx] = { ...q, explanation: e.target.value };
                                                handleUpdateLessonInline(section.id, les.id, {
                                                  quizData: { ...qConf, questions: nextQ }
                                                });
                                              }}
                                              placeholder="Explanation of correct answer (optional)..."
                                              className="w-full bg-white border border-[#d1d7dc] rounded px-2.5 py-1 text-[11px] text-slate-600 focus:outline-none"
                                            />
                                          </div>
                                        ))}

                                        {/* Bottom Action Bar for Quiz Questions */}
                                        <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#d1d7dc]/60">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nextQ: QuizConfig = {
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
                                                quizData: nextQ,
                                                type: 'QUIZ'
                                              });
                                              showToast({
                                                title: 'Question Added',
                                                description: `Question ${nextQ.questions.length} added.`,
                                                type: 'info'
                                              });
                                            }}
                                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-300"
                                          >
                                            <Icon name="add" size={14} />
                                            <span>Add Another Question</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleUpdateLessonInline(section.id, les.id, {
                                                quizData: qConf,
                                                type: 'QUIZ'
                                              });
                                              setOpenContentDrawerId(null);
                                              showToast({
                                                title: 'Quiz Saved Successfully! ✓',
                                                description: `"${les.title || 'Quiz'}" saved with ${qConf.questions.length} questions. You can now add the next quiz!`,
                                                type: 'success'
                                              });
                                            }}
                                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                            title="Save all questions and close quiz editor"
                                          >
                                            <Icon name="check_circle" size={14} />
                                            <span>Save &amp; Close Quiz</span>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          
                        </div>
                      );
                    })
                  )}

                  {/* CURRICULUM ITEM FOOTER BAR INSIDE MODULE */}
                  <div className="pt-3 border-t border-[#d1d7dc]/60 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                      + Add to Module {moduleNum}:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(section.id, 'VIDEO', false)}
                      className="px-3.5 py-1.5 bg-white border border-[#2d2f31] hover:bg-slate-100 text-[#2d2f31] font-bold text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Icon name="add" size={14} />
                      <span>Lecture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(section.id, 'QUIZ', false)}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Icon name="quiz" size={14} />
                      <span>Quiz</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* BOTTOM DASHED BUTTON: ADD MODULE */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setEditingSectionId(null);
                setNewSectionTitle(`Module ${sections.length + 1}: `);
                setNewSectionDescription('');
                setIsAddSectionOpen(true);
              }}
              className="w-full py-4 border-2 border-dashed border-[#2d2f31]/40 hover:border-[#2d2f31] bg-white hover:bg-slate-50 text-[#2d2f31] font-bold text-sm rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <Icon name="add_circle" size={18} />
              <span>Add Module</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Section Modal */}
      {(() => {
        const activeModNum = editingSectionId
          ? sections.findIndex((s) => s.id === editingSectionId) + 1
          : sections.length + 1;

        return (
          <Modal
            isOpen={isAddSectionOpen}
            onClose={() => setIsAddSectionOpen(false)}
            maxWidth="md"
            title={editingSectionId ? `Edit Module ${activeModNum}` : `Add Module ${activeModNum}`}
            subtitle={`Set the title for Module ${activeModNum} of your course`}
          >
            <form onSubmit={handleAddSection} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                  Module {activeModNum} Title *
                </label>
                <input
                  type="text"
                  required
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder={`e.g. Module ${activeModNum}: Foundations & Core Concepts`}
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary font-bold"
                  autoFocus
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
                  {editingSectionId ? 'Save Module' : `Create Module ${activeModNum}`}
                </button>
              </div>
            </form>
          </Modal>
        );
      })()}

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
  const { showToast } = useApp();
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
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
            <label className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              isUploadingVideo ? 'bg-primary/70 text-on-primary cursor-not-allowed' : 'bg-primary text-on-primary hover:bg-primary/90'
            }`}>
              <Icon name={isUploadingVideo ? 'sync' : 'upload_file'} size={16} className={isUploadingVideo ? 'animate-spin' : ''} />
              <span>{isUploadingVideo ? 'Uploading Video...' : 'Upload Video (PC / Mobile Phone)'}</span>
              <input
                type="file"
                disabled={isUploadingVideo}
                accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  e.target.value = '';

                  if (f.size > 4.5 * 1024 * 1024) {
                    showToast({
                      title: 'Large Video Notice (> 4.5MB)',
                      description: 'For longer HD lectures, please paste a YouTube, Vimeo, or Cloud MP4 link below, or upload a compressed video clip.',
                      type: 'info'
                    });
                  }

                  let detectedDur = '10:00';
                  try {
                    const tempPreview = URL.createObjectURL(f);
                    const tempVideo = document.createElement('video');
                    tempVideo.preload = 'metadata';
                    tempVideo.src = tempPreview;
                    await new Promise<void>((resolve) => {
                      tempVideo.onloadedmetadata = () => {
                        if (tempVideo.duration && isFinite(tempVideo.duration)) {
                          const mins = Math.floor(tempVideo.duration / 60);
                          const secs = Math.floor(tempVideo.duration % 60);
                          detectedDur = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                        }
                        URL.revokeObjectURL(tempPreview);
                        resolve();
                      };
                      tempVideo.onerror = () => {
                        URL.revokeObjectURL(tempPreview);
                        resolve();
                      };
                    });
                  } catch {}

                  setIsUploadingVideo(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', f);
                    const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
                    const data = await res.json();
                    if (res.ok && (data?.videoUrl || data?.media?.url)) {
                      const permanentUrl = data.videoUrl || data.media.url;
                      setFormData((prev) => ({
                        ...prev,
                        videoUrl: permanentUrl,
                        duration: detectedDur
                      }));
                      showToast({
                        title: 'Video Uploaded Successfully 🎉',
                        description: `"${f.name}" (${detectedDur}) is ready for student playback.`,
                        type: 'success'
                      });
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        videoUrl: prev.videoUrl?.startsWith('blob:') ? '' : prev.videoUrl
                      }));
                      showToast({
                        title: 'Video Upload Failed',
                        description: data?.error || 'Direct upload could not be saved to server. Please paste a direct YouTube / Vimeo / Cloud link.',
                        type: 'error'
                      });
                    }
                  } catch (err: any) {
                    setFormData((prev) => ({
                      ...prev,
                      videoUrl: prev.videoUrl?.startsWith('blob:') ? '' : prev.videoUrl
                    }));
                    showToast({
                      title: 'Upload Error',
                      description: err?.message || 'Network error during video upload. Please paste a video link.',
                      type: 'error'
                    });
                  } finally {
                    setIsUploadingVideo(false);
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

          {formData.videoUrl && !formData.videoUrl.startsWith('blob:') && (
            <div className="pt-1">
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mb-1.5">
                <Icon name="check_circle" size={14} />
                <span>Video Ready for Playback</span>
              </div>
              {(formData.videoUrl.startsWith('data:') ||
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
              📑 2. Study Resource / Handout (PDF, Doc, Image, or External Link)
            </label>
            <label className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              isUploadingPdf ? 'bg-rose-400 text-white cursor-not-allowed' : 'bg-rose-600 text-white hover:bg-rose-700'
            }`}>
              <Icon name={isUploadingPdf ? 'sync' : 'attach_file'} size={16} className={isUploadingPdf ? 'animate-spin' : ''} />
              <span>{isUploadingPdf ? 'Uploading...' : 'Upload File (PDF / Doc / Image)'}</span>
              <input
                type="file"
                disabled={isUploadingPdf}
                accept=".pdf,.doc,.docx,.txt,.zip,image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  e.target.value = '';

                  setIsUploadingPdf(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', f);
                    const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
                    const data = await res.json();
                    if (res.ok && (data?.videoUrl || data?.media?.url)) {
                      const permanentPdf = data.videoUrl || data.media.url;
                      setFormData((prev) => ({
                        ...prev,
                        pdfUrl: permanentPdf
                      }));
                      showToast({
                        title: 'Resource Attached 🎉',
                        description: `"${f.name}" attached successfully.`,
                        type: 'success'
                      });
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        pdfUrl: prev.pdfUrl?.startsWith('blob:') ? '' : prev.pdfUrl
                      }));
                      showToast({
                        title: 'Upload Failed',
                        description: data?.error || 'Could not upload resource file. You can also paste an external web link below.',
                        type: 'error'
                      });
                    }
                  } catch (err: any) {
                    setFormData((prev) => ({
                      ...prev,
                      pdfUrl: prev.pdfUrl?.startsWith('blob:') ? '' : prev.pdfUrl
                    }));
                    showToast({
                      title: 'Upload Error',
                      description: err?.message || 'Network error during upload.',
                      type: 'error'
                    });
                  } finally {
                    setIsUploadingPdf(false);
                  }
                }}
              />
            </label>
          </div>
          <input
            type="text"
            value={formData.pdfUrl || ''}
            onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
            placeholder="https://drive.google.com/... or https://github.com/... or click 'Upload File' above..."
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
            disabled={isUploadingVideo || isUploadingPdf}
            onClick={() => {
              if (isUploadingVideo) {
                showToast({
                  title: 'Upload in Progress',
                  description: 'Please wait for your video to finish uploading before saving.',
                  type: 'info'
                });
                return;
              }
              if (isUploadingPdf) {
                showToast({
                  title: 'Upload in Progress',
                  description: 'Please wait for your PDF to finish uploading before saving.',
                  type: 'info'
                });
                return;
              }
              if (formData.videoUrl?.startsWith('blob:')) {
                showToast({
                  title: 'Unsaved Video Asset',
                  description: 'Please re-upload your video or paste a YouTube / Vimeo / Cloud link before saving.',
                  type: 'error'
                });
                return;
              }
              if (formData.pdfUrl?.startsWith('blob:')) {
                showToast({
                  title: 'Unsaved PDF Asset',
                  description: 'Please re-upload your PDF or paste a direct document link before saving.',
                  type: 'error'
                });
                return;
              }
              onSave(formData);
            }}
            className="px-6 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isUploadingVideo ? 'Uploading Video...' : isUploadingPdf ? 'Uploading PDF...' : 'Save Lecture Content'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
