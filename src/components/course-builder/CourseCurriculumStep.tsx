'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { VideoUploadModal } from '@/components/media/VideoUploadModal';
import { AiCourseGeneratorModal } from '@/components/ai/AiCourseGeneratorModal';
import { useApp } from '@/context/AppContext';
import { cleanModuleTitle, cleanLectureTitle, cleanQuizTitle } from '@/lib/course-excel';
import { RichArticleEditor } from './RichArticleEditor';
import { GrammarHintAssistant } from '@/components/ui/GrammarHintAssistant';

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

export interface LessonResourceItem {
  id: string;
  name: string;
  url: string;
  type: 'PDF' | 'DOC' | 'IMAGE' | 'ZIP' | 'LINK' | 'OTHER';
  sizeBytes?: number;
}

export interface BuilderSubLesson {
  id: string;
  code?: string; // e.g. "1.1.1", "2.1.1"
  title: string;
  description?: string;
  type: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'DOWNLOAD';
  content?: string;
  videoUrl?: string;
  videoFileName?: string;
  pdfUrl?: string;
  resourceFileName?: string;
  resourcesList?: LessonResourceItem[];
  quizData?: QuizConfig | string;
  duration?: string;
  isFree?: boolean;
  isFinalAssignment?: boolean;
  order: number;
}

export interface BuilderLesson {
  id: string;
  clientKey?: string;
  tempId?: string;
  title: string;
  description?: string;
  type: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'DOWNLOAD';
  content?: string;
  videoUrl?: string;
  videoFileName?: string;
  pdfUrl?: string;
  fileUrl?: string;
  resourceFileName?: string;
  resourcesList?: LessonResourceItem[];
  quizData?: QuizConfig | string;
  subLessons?: BuilderSubLesson[];
  duration?: string;
  durationSeconds?: number;
  isFree?: boolean;
  isFinalAssignment?: boolean;
  isPublished?: boolean;
  order: number;
  clearVideo?: boolean;
  removeVideo?: boolean;
  clearPdf?: boolean;
  removePdf?: boolean;
}

export function getLessonResourcesList(lesson?: BuilderLesson | BuilderSubLesson | null): LessonResourceItem[] {
  if (!lesson) return [];
  if (Array.isArray(lesson.resourcesList) && lesson.resourcesList.length > 0) {
    return lesson.resourcesList;
  }
  const list: LessonResourceItem[] = [];
  if (lesson.pdfUrl) {
    const rawUrl = lesson.pdfUrl.split('?')[0].toLowerCase();
    let detectedType: 'PDF' | 'DOC' | 'IMAGE' | 'ZIP' | 'LINK' | 'OTHER' = 'PDF';
    if (rawUrl.endsWith('.doc') || rawUrl.endsWith('.docx') || rawUrl.endsWith('.txt')) detectedType = 'DOC';
    else if (rawUrl.endsWith('.zip')) detectedType = 'ZIP';
    else if (rawUrl.endsWith('.png') || rawUrl.endsWith('.jpg') || rawUrl.endsWith('.jpeg') || rawUrl.endsWith('.webp')) detectedType = 'IMAGE';
    else if (lesson.pdfUrl.startsWith('http://') || lesson.pdfUrl.startsWith('https://')) detectedType = 'LINK';

    list.push({
      id: `res-pdf-${lesson.id || '1'}`,
      name: (lesson as any).resourceFileName || (detectedType === 'PDF' ? 'Lecture Handout.pdf' : 'Attached Resource'),
      url: lesson.pdfUrl,
      type: detectedType
    });
  } else if ((lesson as any).fileUrl) {
    list.push({
      id: `res-file-${lesson.id || '1'}`,
      name: (lesson as any).resourceFileName || 'Resource File',
      url: (lesson as any).fileUrl,
      type: 'OTHER'
    });
  }
  return list;
}

export interface BuilderSection {
  id: string;
  clientKey?: string;
  tempId?: string;
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

  // Continuous global item numbering across modules:
  // - Module 1: Lecture 1, 2, 3... Article 1... Quiz 1...
  // - Module 2: Lecture 4, 5... Article 2... Quiz 2...
  // - Top bar badges display overall course totals: totalLectures, totalArticles, totalQuizzes
  const itemNumbering = useMemo(() => {
    let totalLectures = 0;
    let totalArticles = 0;
    let totalQuizzes = 0;
    const map: Record<string, { type: 'LECTURE' | 'ARTICLE' | 'QUIZ'; num: number; label: string; moduleNum: number }> = {};

    (sections || []).forEach((sec, sIdx) => {
      const moduleNum = sIdx + 1;

      (sec.lessons || []).forEach((les) => {
        if (les.type === 'QUIZ') {
          totalQuizzes += 1;
          const isFinal = les.isFinalAssignment || /final\s+assignment/i.test(les.title || '');
          const label = isFinal ? 'Final Assignment' : `Quiz ${totalQuizzes}`;
          const entry = { type: 'QUIZ' as const, num: totalQuizzes, label, moduleNum };
          map[les.id] = entry;
          if (les.clientKey) map[les.clientKey] = entry;
          if (les.tempId) map[les.tempId] = entry;
        } else if (les.type === 'TEXT') {
          totalArticles += 1;
          const entry = { type: 'ARTICLE' as const, num: totalArticles, label: `Article ${totalArticles}`, moduleNum };
          map[les.id] = entry;
          if (les.clientKey) map[les.clientKey] = entry;
          if (les.tempId) map[les.tempId] = entry;
        } else {
          totalLectures += 1;
          const entry = { type: 'LECTURE' as const, num: totalLectures, label: `Lecture ${totalLectures}`, moduleNum };
          map[les.id] = entry;
          if (les.clientKey) map[les.clientKey] = entry;
          if (les.tempId) map[les.tempId] = entry;
        }
      });
    });

    return { map, totalLectures, totalArticles, totalQuizzes };
  }, [sections]);

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
      const sId = `sec-${Date.now()}-${sIdx}`;
      return {
        id: sId,
        clientKey: sId,
        tempId: sId,
        title: s.title ? cleanModuleTitle(s.title) : 'Overview & Fundamentals',
        description: s.description || '',
        order: mNum,
        lessons: (s.lessons || []).map((l: any, lIdx: number) => {
          const lId = `les-${Date.now()}-${sIdx}-${lIdx}`;
          return {
            id: lId,
            clientKey: lId,
            tempId: lId,
            title: l.title ? cleanLectureTitle(l.title) : 'Lesson Topic',
            type: l.type || 'VIDEO',
            description: l.description || '',
            duration: l.duration || '10:00',
            subLessons: [],
            order: lIdx + 1,
            isFree: lIdx === 0
          };
        })
      };
    });
    onChange([...sections, ...newSections]);
  };

  // Add / Edit Section Handler
  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    const cleanedTitle = cleanModuleTitle(newSectionTitle.trim()) || newSectionTitle.trim();

    if (editingSectionId) {
      const updated = sections.map((s) =>
        s.id === editingSectionId || s.clientKey === editingSectionId || s.tempId === editingSectionId
          ? { ...s, title: cleanedTitle, description: newSectionDescription.trim() }
          : s
      );
      onChange(updated);
      setEditingSectionId(null);
      showToast({ title: 'Module Updated', type: 'info' });
    } else {
      const newId = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newSec: BuilderSection = {
        id: newId,
        clientKey: newId,
        tempId: newId,
        title: cleanedTitle,
        description: newSectionDescription.trim(),
        order: sections.length + 1,
        lessons: []
      };
      onChange([...sections, newSec]);
      showToast({ title: 'Module Added', description: `Created Module ${newSec.order}: ${newSec.title}`, type: 'success' });
    }

    setNewSectionTitle('');
    setNewSectionDescription('');
    setIsAddSectionOpen(false);
  };

  // Update Module field inline (Title or Description)
  const handleUpdateSectionField = (sectionId: string, field: 'title' | 'description', value: string) => {
    onChange(
      sections.map((s) => (s.id === sectionId || s.clientKey === sectionId || s.tempId === sectionId ? { ...s, [field]: value } : s))
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this module and all its lessons?')) return;
    onChange(sections.filter((s) => s.id !== sectionId && s.clientKey !== sectionId && s.tempId !== sectionId).map((s, idx) => ({ ...s, order: idx + 1 })));
    showToast({ title: 'Module Removed', type: 'info' });
  };

  // Add / Create Lesson or Quiz (Per-module numbering: Lecture 1, 2... Quiz 1, 2...)
  const handleCreateLesson = (
    sectionId: string,
    type: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'DOWNLOAD',
    openModal = false
  ) => {
    const sIdx = sections.findIndex((s) => s.id === sectionId || s.clientKey === sectionId || s.tempId === sectionId);
    if (sIdx === -1) return;
    const targetSec = sections[sIdx];
    const moduleNum = sIdx + 1;

    // Count preceding and module items for continuous sequential numbering
    let precedingLectures = 0;
    let precedingArticles = 0;
    let precedingQuizzes = 0;
    for (let i = 0; i < sIdx; i++) {
      precedingLectures += (sections[i].lessons || []).filter((l) => l.type !== 'QUIZ' && l.type !== 'TEXT').length;
      precedingArticles += (sections[i].lessons || []).filter((l) => l.type === 'TEXT').length;
      precedingQuizzes += (sections[i].lessons || []).filter((l) => l.type === 'QUIZ').length;
    }

    const moduleLecturesCount = (targetSec.lessons || []).filter((l) => l.type !== 'QUIZ' && l.type !== 'TEXT').length;
    const moduleArticlesCount = (targetSec.lessons || []).filter((l) => l.type === 'TEXT').length;
    const moduleQuizzesCount = (targetSec.lessons || []).filter((l) => l.type === 'QUIZ').length;

    const nextLectureNum = precedingLectures + moduleLecturesCount + 1;
    const nextArticleNum = precedingArticles + moduleArticlesCount + 1;
    const nextQuizNum = precedingQuizzes + moduleQuizzesCount + 1;
    const quizTitle = `Quiz ${nextQuizNum}`;
    const articleTitle = `Article ${nextArticleNum}`;
    const lectureTitle = `Lecture ${nextLectureNum}`;

    const defaultTitle = '';

    let defaultQuiz: QuizConfig | undefined;
    if (type === 'QUIZ') {
      defaultQuiz = {
        passingScore: 70,
        attemptLimit: 0,
        questions: [
          {
            id: `q-${Date.now()}-1`,
            question: `Assessment question 1 for ${quizTitle}...`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
            explanation: 'Explanation for correct answer to question 1.',
            points: 10
          },
          {
            id: `q-${Date.now()}-2`,
            question: `Assessment question 2 for ${quizTitle}...`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
            explanation: 'Explanation for correct answer to question 2.',
            points: 10
          }
        ]
      };
    }

    const newId = `les-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newLesson: BuilderLesson = {
      id: newId,
      clientKey: newId,
      tempId: newId,
      title: defaultTitle,
      description: '',
      type,
      duration: type === 'VIDEO' ? '10:00' : '05:00',
      durationSeconds: type === 'VIDEO' ? 600 : 300,
      content:
        type === 'TEXT'
          ? `# ${articleTitle}\n\nWelcome to this written lecture. Here we break down the key concepts with structured explanations, headings, and examples.\n\n## 1. Core Principles\n\nExplain the foundational theory or architecture here:\n- Key principle A\n- Key principle B\n\n> 💡 **Instructor Tip:** Highlight critical best practices, edge cases, or industry standards for students.\n\n## 2. Practical Examples & Implementation\n\nDetail the exact workflow or implementation steps:\n1. Step 1: Initial setup\n2. Step 2: Implementation details\n3. Step 3: Verification\n\n---\n\n## Summary\n\nSummarize the key takeaways and preview what comes next in the curriculum.`
          : undefined,
      quizData: defaultQuiz,
      subLessons: [],
      isFree: type !== 'QUIZ' && nextLectureNum === 1 && moduleNum === 1,
      isPublished: true,
      order: targetSec.lessons.length + 1
    };

    const updated = sections.map((s) =>
      s.id === sectionId || s.clientKey === sectionId || s.tempId === sectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
    );

    onChange(updated);
    if (openModal) {
      setEditingLesson({ sectionId, lesson: newLesson });
    } else if (type === 'QUIZ') {
      const targetDrawerKey = newLesson.clientKey || newLesson.id;
      setOpenContentDrawerId(targetDrawerKey);
      setActiveContentTab((prev) => ({ ...prev, [targetDrawerKey]: 'QUIZ', [newLesson.id]: 'QUIZ' }));
    }

    const itemLabel =
      type === 'QUIZ'
        ? quizTitle
        : type === 'TEXT'
        ? articleTitle
        : lectureTitle;

    showToast({
      title: `Added ${itemLabel}`,
      description: `${defaultTitle || itemLabel} added to Module ${moduleNum}.`,
      type: 'success'
    });
  };

  const hasFinalAssignment = useMemo(() => {
    return sections.some((s) =>
      s.lessons?.some((l) =>
        Boolean(l.isFinalAssignment) ||
        (l.type === 'QUIZ' && /final\s+assignment/i.test(l.title || ''))
      )
    );
  }, [sections]);

  const handleCreateFinalAssignment = (sectionId?: string) => {
    let targetSectionId = sectionId;
    if (!targetSectionId) {
      if (sections.length === 0) {
        showToast({
          title: 'Add a Module First',
          description: 'Please add a module first before adding the Final Assignment.',
          type: 'info'
        });
        return;
      }
      targetSectionId = sections[sections.length - 1].id;
    }

    const sIdx = sections.findIndex((s) => s.id === targetSectionId || s.clientKey === targetSectionId || s.tempId === targetSectionId);
    if (sIdx === -1) return;
    const targetSec = sections[sIdx];
    const moduleNum = sIdx + 1;

    const defaultQuiz: QuizConfig = {
      passingScore: 70,
      attemptLimit: 0,
      questions: [
        {
          id: `q-${Date.now()}-1`,
          question: 'Final comprehensive assessment question 1...',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: 0,
          explanation: 'Comprehensive explanation for correct answer to question 1.',
          points: 10
        },
        {
          id: `q-${Date.now()}-2`,
          question: 'Final comprehensive assessment question 2...',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: 0,
          explanation: 'Comprehensive explanation for correct answer to question 2.',
          points: 10
        }
      ]
    };

    const newId = `les-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newLesson: BuilderLesson = {
      id: newId,
      clientKey: newId,
      tempId: newId,
      title: 'Final Assignment',
      description: 'Mandatory final assessment required to complete the course and unlock the verified Certificate of Completion.',
      type: 'QUIZ',
      duration: '15:00',
      durationSeconds: 900,
      quizData: defaultQuiz,
      isFinalAssignment: true,
      subLessons: [],
      isFree: false,
      isPublished: true,
      order: targetSec.lessons.length + 1
    };

    const updated = sections.map((s) =>
      s.id === targetSectionId || s.clientKey === targetSectionId || s.tempId === targetSectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
    );

    onChange(updated);
    const targetDrawerKey = newLesson.clientKey || newLesson.id;
    setOpenContentDrawerId(targetDrawerKey);
    setActiveContentTab((prev) => ({ ...prev, [targetDrawerKey]: 'QUIZ', [newLesson.id]: 'QUIZ' }));

    showToast({
      title: 'Final Assignment Created 🎓',
      description: `Added to Module ${moduleNum}. Students must pass this to unlock their certificate.`,
      type: 'success'
    });
  };

  // Update Lesson inline
  const handleUpdateLessonInline = (sectionId: string, lessonId: string, patch: Partial<BuilderLesson>) => {
    onChange(
      sections.map((s) => {
        const isMatchSec = s.id === sectionId || s.clientKey === sectionId || s.tempId === sectionId;
        if (!isMatchSec) return s;
        return {
          ...s,
          lessons: s.lessons.map((l) => {
            const isMatchLes = l.id === lessonId || l.clientKey === lessonId || l.tempId === lessonId;
            return isMatchLes ? { ...l, ...patch } : l;
          })
        };
      })
    );
  };

  // Add Sub-Lesson / Sub-Category (e.g., 1.1.1, 1.1.2, 2.1.1)
  const handleAddSubLesson = (sectionId: string, lessonId: string) => {
    const sIdx = sections.findIndex((s) => s.id === sectionId || s.clientKey === sectionId || s.tempId === sectionId);
    if (sIdx === -1) return;
    const section = sections[sIdx];
    const lIdx = section.lessons.findIndex((l) => l.id === lessonId || l.clientKey === lessonId || l.tempId === lessonId);
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
      type: 'TEXT',
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
        if (s.id !== sectionId && s.clientKey !== sectionId && s.tempId !== sectionId) return s;
        return {
          ...s,
          lessons: s.lessons.map((l) => {
            if (l.id !== lessonId && l.clientKey !== lessonId && l.tempId !== lessonId) return l;
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
        if (s.id !== sectionId && s.clientKey !== sectionId && s.tempId !== sectionId) return s;
        return {
          ...s,
          lessons: s.lessons.map((l, lIdx) => {
            if (l.id !== lessonId && l.clientKey !== lessonId && l.tempId !== lessonId) return l;
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
    const sIdx = sections.findIndex((s) => s.id === sectionId || s.clientKey === sectionId || s.tempId === sectionId);
    if (sIdx === -1) return;
    const lIdx = sections[sIdx].lessons.findIndex((l) => l.id === lessonId || l.clientKey === lessonId || l.tempId === lessonId);
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

    const targetSecId = editingLesson.sectionId;
    const targetLesId = sanitizedLesson.id;
    const origLesId = editingLesson.lesson?.id;
    const targetOrder = editingLesson.lesson?.order;

    const updatedSections = sections.map((s) => {
      const isMatchSec = s.id === targetSecId || s.clientKey === targetSecId || (s as any).tempId === targetSecId;
      if (!isMatchSec) return s;

      let matchedIdx = s.lessons.findIndex(
        (l) =>
          l.id === targetLesId ||
          l.clientKey === targetLesId ||
          (origLesId && (l.id === origLesId || l.clientKey === origLesId)) ||
          (l as any).tempId === targetLesId ||
          (origLesId && (l as any).tempId === origLesId)
      );

      if (matchedIdx === -1 && typeof targetOrder === 'number') {
        matchedIdx = s.lessons.findIndex((l) => l.order === targetOrder);
      }

      if (matchedIdx !== -1) {
        const nextLessons = [...s.lessons];
        nextLessons[matchedIdx] = {
          ...nextLessons[matchedIdx],
          ...sanitizedLesson,
          id: nextLessons[matchedIdx].id, // Preserve latest ID (server CUID or local ID)
          clientKey: nextLessons[matchedIdx].clientKey || sanitizedLesson.clientKey || nextLessons[matchedIdx].id,
          tempId: nextLessons[matchedIdx].tempId || sanitizedLesson.tempId
        };
        return { ...s, lessons: nextLessons };
      }

      return { ...s, lessons: [...s.lessons, sanitizedLesson] };
    });

    onChange(updatedSections);
    setEditingLesson(null);
    showToast({ title: 'Lesson Saved', description: `Updated "${sanitizedLesson.title}".`, type: 'success' });
  };

  const handleDeleteLesson = (sectionId: string, lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson and its sub-topics?')) return;

    const updated = sections.map((s) => {
      const isMatchSec = s.id === sectionId || s.clientKey === sectionId || s.tempId === sectionId;
      if (isMatchSec) {
        return {
          ...s,
          lessons: s.lessons
            .filter((l) => l.id !== lessonId && l.clientKey !== lessonId && l.tempId !== lessonId)
            .map((l, idx) => ({ ...l, order: idx + 1 }))
        };
      }
      return s;
    });

    onChange(updated);
    if (editingLesson?.lesson.id === lessonId || editingLesson?.lesson.clientKey === lessonId || editingLesson?.lesson.tempId === lessonId) {
      setEditingLesson(null);
    }
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
    const sec = sections.find((s) => s.id === sectionId || s.clientKey === sectionId || s.tempId === sectionId);
    if (!sec) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= sec.lessons.length) return;

    const lessonsCopy = [...sec.lessons];
    const [moved] = lessonsCopy.splice(index, 1);
    lessonsCopy.splice(newIdx, 0, moved);

    const updated = sections.map((s) =>
      s.id === sectionId || s.clientKey === sectionId || s.tempId === sectionId
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
            Curriculum Builder (Modules &amp; Lessons)
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Organize your course into Modules, continuous Lectures, and Quizzes.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
              📁 {sections.length} {sections.length === 1 ? 'Module' : 'Modules'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full border border-blue-200">
              🎥 {itemNumbering.totalLectures} {itemNumbering.totalLectures === 1 ? 'Lecture' : 'Lectures'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
              📝 {itemNumbering.totalArticles} {itemNumbering.totalArticles === 1 ? 'Article' : 'Articles'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
              ❓ {itemNumbering.totalQuizzes} {itemNumbering.totalQuizzes === 1 ? 'Quiz' : 'Quizzes'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setEditingSectionId(null);
              setNewSectionTitle('');
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
            Start building your course by adding your first module (e.g. &ldquo;Foundations &amp; Core Concepts&rdquo;).
          </p>
          <button
            type="button"
            onClick={() => {
              setNewSectionTitle('Foundations & Core Concepts');
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
            const secKey = section.clientKey || section.tempId || section.id;

            return (
              <div
                key={secKey}
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
                          onChange={(e) => handleUpdateSectionField(secKey, 'title', e.target.value)}
                          onBlur={() => handleUpdateSectionField(secKey, 'title', cleanModuleTitle(section.title))}
                          placeholder="Module Title (e.g. Foundations & Architecture)"
                          className="w-full bg-white border border-[#d1d7dc] focus:border-[#2d2f31] rounded px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none transition-colors shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(secKey)}
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
                  {section.lessons.map((les, lIdx) => {
                      const itemKey = les.clientKey || les.tempId || les.id;
                      const isQuizItem = les.type === 'QUIZ';
                      const isArticleItem = les.type === 'TEXT';
                      const isLectureItem = !isQuizItem && !isArticleItem;
                      const itemMeta =
                        itemNumbering.map[itemKey] ||
                        itemNumbering.map[les.id] || {
                          type: isQuizItem ? 'QUIZ' : isArticleItem ? 'ARTICLE' : 'LECTURE',
                          num: lIdx + 1,
                          label: isQuizItem ? `Quiz ${lIdx + 1}` : isArticleItem ? `Article ${lIdx + 1}` : `Lecture ${lIdx + 1}`
                        };
                      const qConf = parseQuizConfig(les.quizData);
                      const qCount = qConf.questions.length;
                      const hasContent = isQuizItem
                        ? qCount > 0
                        : !!(les.videoUrl || les.content || les.pdfUrl);
                      const isDrawerOpen =
                        openContentDrawerId === les.id ||
                        (Boolean(les.clientKey) && openContentDrawerId === les.clientKey) ||
                        (Boolean(les.tempId) && openContentDrawerId === les.tempId);
                      const currentTab =
                        (les.clientKey && activeContentTab[les.clientKey]) ||
                        activeContentTab[les.id] ||
                        (les.type === 'TEXT' ? 'TEXT' : les.type === 'PDF' ? 'PDF' : 'VIDEO');

                      // 1. DEDICATED QUIZ ROW & EDITOR (Purple Theme, Clear "Edit Quiz" Button)
                      if (isQuizItem) {
                        return (
                          <div key={itemKey} className="space-y-2">
                            <div className="border border-purple-200 bg-purple-50/25 hover:border-purple-300 rounded-md transition-all shadow-2xs overflow-hidden">
                              {/* Quiz Top Bar */}
                              <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {/* Up/Down buttons */}
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      disabled={lIdx === 0}
                                      onClick={() => moveLesson(secKey, lIdx, 'up')}
                                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                      title="Move Quiz Up"
                                    >
                                      <Icon name="arrow_upward" size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={lIdx === section.lessons.length - 1}
                                      onClick={() => moveLesson(secKey, lIdx, 'down')}
                                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                      title="Move Quiz Down"
                                    >
                                      <Icon name="arrow_downward" size={13} />
                                    </button>
                                  </div>

                                  {/* Quiz Status Badge */}
                                  {qCount > 0 ? (
                                    <span
                                      className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs"
                                      title={`${qCount} question(s) attached`}
                                    >
                                      ✓
                                    </span>
                                  ) : (
                                    <span
                                      className="w-5 h-5 rounded-full border-2 border-dashed border-purple-300 flex items-center justify-center text-[10px] text-purple-500 font-bold shrink-0"
                                      title="No questions added yet. Click Edit Quiz."
                                    >
                                      !
                                    </span>
                                  )}

                                  {/* Quiz Badge Label */}
                                  {les.isFinalAssignment || /final\s+assignment/i.test(les.title || '') ? (
                                    <span className="font-extrabold text-xs text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded shrink-0 font-sans tracking-wide flex items-center gap-1 shadow-2xs">
                                      <Icon name="workspace_premium" size={13} className="text-amber-700" fill />
                                      <span>FINAL ASSIGNMENT:</span>
                                    </span>
                                  ) : (
                                    <span className="font-extrabold text-xs text-purple-800 bg-purple-100 px-2 py-0.5 rounded shrink-0 font-sans tracking-wide">
                                      Quiz {itemMeta.num}:
                                    </span>
                                  )}

                                  {/* Inline Title Input */}
                                  <div className="flex-1 min-w-[160px]">
                                    <input
                                      type="text"
                                      value={les.title}
                                      onChange={(e) =>
                                        handleUpdateLessonInline(secKey, itemKey, { title: e.target.value })
                                      }
                                      onBlur={() => {
                                        if (les.isFinalAssignment || /final\s+assignment/i.test(les.title || '')) {
                                          handleUpdateLessonInline(secKey, itemKey, { title: les.title.trim() || 'Final Assignment' });
                                        } else {
                                          handleUpdateLessonInline(secKey, itemKey, { title: cleanQuizTitle(les.title) });
                                        }
                                      }}
                                      placeholder={les.isFinalAssignment ? "Final Assignment (Certification Exam)" : "Quiz Title (e.g. Knowledge Assessment)"}
                                      className={`w-full bg-white border rounded px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none transition-colors ${
                                        les.isFinalAssignment
                                          ? 'border-amber-300 focus:border-amber-600 hover:bg-amber-50/40'
                                          : 'border-purple-200 focus:border-purple-600 hover:bg-purple-50/50'
                                      }`}
                                    />
                                  </div>

                                  {/* Quiz Info Badges */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded border border-purple-200">
                                      <Icon name="quiz" size={12} />
                                      <span>
                                        {qCount} {qCount === 1 ? 'Question' : 'Questions'}
                                      </span>
                                    </span>
                                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white text-purple-900 px-2 py-0.5 rounded border border-purple-200 shadow-2xs">
                                      <Icon name="verified" size={13} className="text-purple-600" />
                                      <span>Passing:</span>
                                      <input
                                        type="number"
                                        min={10}
                                        max={100}
                                        value={qConf.passingScore ?? 70}
                                        onChange={(e) => {
                                          const val = Math.min(100, Math.max(10, Number(e.target.value) || 70));
                                          handleUpdateLessonInline(secKey, itemKey, {
                                            quizData: { ...qConf, passingScore: val }
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-11 px-1 py-0.5 bg-purple-50 text-center font-extrabold rounded border border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-600 text-xs text-purple-950"
                                        title="Passing percentage required for student to pass and auto-advance"
                                      />
                                      <span>%</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons: Edit Quiz & Delete */}
                                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isDrawerOpen) {
                                        setOpenContentDrawerId(null);
                                      } else {
                                        toggleContentDrawer(itemKey, 'QUIZ');
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
                                      isDrawerOpen
                                        ? 'bg-purple-900 text-white'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                                    }`}
                                    title="Edit Quiz Questions and Passing Score"
                                  >
                                    <Icon name={isDrawerOpen ? 'close' : 'edit'} size={13} />
                                    <span>{isDrawerOpen ? 'Close Editor' : 'Edit Quiz'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLesson(secKey, itemKey)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                                    title="Delete Quiz"
                                  >
                                    <Icon name="delete" size={15} />
                                  </button>
                                </div>
                              </div>

                              {/* INLINE QUIZ QUESTIONS EDITOR DRAWER */}
                              {isDrawerOpen && (
                                <div className="border-t border-purple-200 bg-white p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                                  {/* Drawer Top Bar */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        {les.isFinalAssignment || /final\s+assignment/i.test(les.title || '') ? (
                                          <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                            <Icon name="workspace_premium" size={13} fill />
                                            <span>Final Assignment (Certificate Gate)</span>
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded bg-purple-600 text-white text-[11px] font-black uppercase tracking-wider">
                                            Quiz {itemMeta.num}
                                          </span>
                                        )}
                                        <h4 className="text-xs font-bold text-slate-800">
                                          {les.title || (les.isFinalAssignment ? 'Final Assignment' : `Quiz ${itemMeta.num}`)} Question Editor
                                        </h4>
                                      </div>
                                      <p className="text-[11px] text-slate-500">
                                        {les.isFinalAssignment || /final\s+assignment/i.test(les.title || '')
                                          ? 'Configure final exam questions and passing percentage. Students must achieve this score to unlock their verified course completion certificate.'
                                          : 'Add multiple-choice questions, choose correct options, and configure the passing threshold.'}
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5">
                                      {/* Total Marks Summary Badge */}
                                      {(() => {
                                        const totalQuizMarks = qConf.questions.reduce((sum, q) => sum + (Number(q.points) || 10), 0);
                                        const isEvenQuestions = qConf.questions.length >= 2 && qConf.questions.length % 2 === 0;

                                        return (
                                          <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">
                                              Total: {totalQuizMarks} Marks
                                            </span>

                                            {/* Even vs Odd Badge */}
                                            {isEvenQuestions ? (
                                              <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                                <Icon name="check_circle" size={13} className="text-emerald-600" />
                                                <span>✓ Even Count ({qConf.questions.length} Qs)</span>
                                              </span>
                                            ) : (
                                              <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs animate-pulse">
                                                <Icon name="warning" size={13} className="text-rose-600" />
                                                <span>⚠️ Odd Count ({qConf.questions.length} Qs) — Even Required</span>
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}

                                      {/* Passing Score Input */}
                                      <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 shadow-2xs">
                                        <div className="flex items-center gap-1 text-[11px] font-extrabold text-purple-950">
                                          <Icon name="verified" size={14} className="text-purple-600" />
                                          <span>Passing:</span>
                                        </div>
                                        <input
                                          type="number"
                                          min={10}
                                          max={100}
                                          value={qConf.passingScore ?? 70}
                                          onChange={(e) => {
                                            const val = Math.min(100, Math.max(10, Number(e.target.value) || 70));
                                            handleUpdateLessonInline(section.id, les.id, {
                                              quizData: { ...qConf, passingScore: val }
                                            });
                                          }}
                                          className="w-12 px-1 py-0.5 bg-white border border-purple-300 rounded text-center text-xs font-black text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-600 shadow-2xs"
                                        />
                                        <span className="text-xs font-bold text-purple-900">%</span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (qConf.questions.length > 0 && qConf.questions.length % 2 !== 0) {
                                            showToast({
                                              title: 'Even Count Reminder ⚠️',
                                              description: `Quiz has ${qConf.questions.length} question(s). Only EVEN question counts (2, 4, 6, 8, 10) are accepted when publishing.`,
                                              type: 'info'
                                            });
                                          }
                                          setOpenContentDrawerId(null);
                                        }}
                                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded bg-white cursor-pointer"
                                      >
                                        ✕ Close
                                      </button>
                                    </div>
                                  </div>

                                  {/* Passing Rule & Even Count Note */}
                                  <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200/80 text-[11px] text-purple-900 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Icon name="info" size={15} className="text-purple-600 shrink-0" />
                                      <span>
                                        <strong>Rules:</strong> Each question carries custom marks (default 10). Quizzes must contain an <strong>EVEN number of questions (2, 4, 6, 8, 10)</strong>. Odd question counts cannot be saved. Passing score is <strong>{qConf.passingScore ?? 70}%</strong>.
                                      </span>
                                    </div>
                                  </div>

                                  {/* Questions List */}
                                  {qConf.questions.length === 0 ? (
                                    <div className="p-8 text-center bg-purple-50/40 border border-dashed border-purple-200 rounded-lg space-y-2">
                                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                                        <Icon name="quiz" size={20} />
                                      </div>
                                      <p className="text-xs font-bold text-slate-700">
                                        No questions added yet to Quiz {itemMeta.num}
                                      </p>
                                      <p className="text-[11px] text-slate-500">
                                        Quizzes require an even number of questions (2, 4, 6, 8...) with individual marks per question.
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextQ: QuizConfig = {
                                            ...qConf,
                                            questions: [
                                              {
                                                id: `q-${Date.now()}-1`,
                                                question: '',
                                                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                                correctIndex: 0,
                                                explanation: '',
                                                points: 10
                                              },
                                              {
                                                id: `q-${Date.now()}-2`,
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
                                            title: '2 Questions Initialized (Even Count) ✓',
                                            description: 'Added Question 1 and Question 2 with 10 marks each.',
                                            type: 'success'
                                          });
                                        }}
                                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                      >
                                        <Icon name="add" size={14} />
                                        <span>+ Add Initial Questions (2 Questions - Even Count)</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {qConf.questions.map((q, qIdx) => (
                                        <div
                                          key={q.id || qIdx}
                                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[11px] font-black flex items-center justify-center">
                                                {qIdx + 1}
                                              </span>
                                              <span className="text-xs font-extrabold text-slate-800">
                                                Question {qIdx + 1}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-purple-200 rounded-lg shadow-2xs">
                                                <span className="text-[11px] font-black text-purple-900">Marks:</span>
                                                <input
                                                  type="number"
                                                  min={1}
                                                  value={q.points ?? 10}
                                                  onChange={(e) => {
                                                    const nextQ = [...qConf.questions];
                                                    nextQ[qIdx] = { ...q, points: Math.max(1, Number(e.target.value) || 1) };
                                                    handleUpdateLessonInline(section.id, les.id, {
                                                      quizData: { ...qConf, questions: nextQ }
                                                    });
                                                  }}
                                                  className="w-12 px-1 text-center text-xs font-black text-purple-900 border-b border-purple-400 focus:outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-purple-700">pts</span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextQuestions = qConf.questions.filter(
                                                    (_, idx) => idx !== qIdx
                                                  );
                                                  handleUpdateLessonInline(secKey, itemKey, {
                                                    quizData: { ...qConf, questions: nextQuestions }
                                                  });
                                                  if (nextQuestions.length > 0 && nextQuestions.length % 2 !== 0) {
                                                    showToast({
                                                      title: 'Odd Questions Count ⚠️',
                                                      description: `Quiz now has ${nextQuestions.length} question(s). Remember: quizzes must have an EVEN number of questions (2, 4, 6, 8) to save.`,
                                                      type: 'info'
                                                    });
                                                  }
                                                }}
                                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                                title="Delete Question"
                                              >
                                                <Icon name="delete" size={15} />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Question Text */}
                                          <input
                                            type="text"
                                            value={q.question}
                                            onChange={(e) => {
                                              const nextQ = [...qConf.questions];
                                              nextQ[qIdx] = { ...q, question: e.target.value };
                                              handleUpdateLessonInline(secKey, itemKey, {
                                                quizData: { ...qConf, questions: nextQ }
                                              });
                                            }}
                                            placeholder={`Enter question ${qIdx + 1} prompt here...`}
                                            className="w-full bg-white border border-[#d1d7dc] focus:border-purple-600 rounded px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
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
                                                      ? 'bg-purple-50/80 border-purple-400 ring-1 ring-purple-300'
                                                      : 'bg-white border-[#d1d7dc] hover:border-slate-400'
                                                  }`}
                                                >
                                                  <input
                                                    type="radio"
                                                    name={`les-q-${itemKey}-${qIdx}`}
                                                    checked={isCorrect}
                                                    onChange={() => {
                                                      const nextQ = [...qConf.questions];
                                                      nextQ[qIdx] = { ...q, correctIndex: oIdx };
                                                      handleUpdateLessonInline(secKey, itemKey, {
                                                        quizData: { ...qConf, questions: nextQ }
                                                      });
                                                    }}
                                                    className="text-purple-600 cursor-pointer accent-purple-600"
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
                                                      handleUpdateLessonInline(secKey, itemKey, {
                                                        quizData: { ...qConf, questions: nextQ }
                                                      });
                                                    }}
                                                    className="flex-1 bg-transparent border-0 text-xs text-slate-800 focus:outline-none"
                                                  />
                                                  {isCorrect && (
                                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                                      ✓ Correct
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>

                                          {/* Explanation */}
                                          <input
                                            type="text"
                                            value={q.explanation || ''}
                                            onChange={(e) => {
                                              const nextQ = [...qConf.questions];
                                              nextQ[qIdx] = { ...q, explanation: e.target.value };
                                              handleUpdateLessonInline(secKey, itemKey, {
                                                quizData: { ...qConf, questions: nextQ }
                                              });
                                            }}
                                            placeholder="Explanation of correct answer (optional)..."
                                            className="w-full bg-white border border-[#d1d7dc] focus:border-purple-600 rounded px-2.5 py-1 text-[11px] text-slate-600 focus:outline-none"
                                          />
                                        </div>
                                      ))}

                                      {/* Quiz Actions Footer */}
                                      <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-purple-100">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextQ: QuizConfig = {
                                              ...qConf,
                                              questions: [
                                                ...qConf.questions,
                                                {
                                                  id: `q-${Date.now()}-${qConf.questions.length + 1}`,
                                                  question: '',
                                                  options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                                  correctIndex: 0,
                                                  explanation: '',
                                                  points: 10
                                                }
                                              ]
                                            };
                                            handleUpdateLessonInline(secKey, itemKey, {
                                              quizData: nextQ,
                                              type: 'QUIZ'
                                            });
                                            showToast({
                                              title: 'Question Added',
                                              description: `Question ${nextQ.questions.length} added to ${les.title || `Quiz ${itemMeta.num}`}.`,
                                              type: 'info'
                                            });
                                          }}
                                          className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors border border-purple-200"
                                        >
                                          <Icon name="add" size={14} />
                                          <span>+ Add 1 Question</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const baseLen = qConf.questions.length;
                                            const nextQ: QuizConfig = {
                                              ...qConf,
                                              questions: [
                                                ...qConf.questions,
                                                {
                                                  id: `q-${Date.now()}-${baseLen + 1}`,
                                                  question: '',
                                                  options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                                  correctIndex: 0,
                                                  explanation: '',
                                                  points: 10
                                                },
                                                {
                                                  id: `q-${Date.now()}-${baseLen + 2}`,
                                                  question: '',
                                                  options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                                  correctIndex: 0,
                                                  explanation: '',
                                                  points: 10
                                                }
                                              ]
                                            };
                                            handleUpdateLessonInline(secKey, itemKey, {
                                              quizData: nextQ,
                                              type: 'QUIZ'
                                            });
                                            showToast({
                                              title: 'Added 2 Questions (Even Pair) ✓',
                                              description: `Added questions ${baseLen + 1} & ${baseLen + 2} with 10 marks each. Total: ${nextQ.questions.length} questions.`,
                                              type: 'success'
                                            });
                                          }}
                                          className="px-3.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-extrabold rounded flex items-center gap-1.5 cursor-pointer transition-colors border border-purple-300"
                                        >
                                          <Icon name="library_add" size={14} />
                                          <span>+ Add 2 Questions (Even Pair)</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (qConf.questions.length === 0) {
                                              showToast({
                                                title: 'No Questions in Quiz ⚠️',
                                                description: 'Please add at least 2 questions to this quiz.',
                                                type: 'error'
                                              });
                                              return;
                                            }
                                            if (qConf.questions.length % 2 !== 0) {
                                              showToast({
                                                title: 'Even Number of Questions Required! ⚠️',
                                                description: `Quiz has ${qConf.questions.length} question(s). Odd numbers (like 1, 3, 5) are NOT accepted. Quizzes must contain an EVEN number of questions (e.g., 2, 4, 6, 8, 10). Please add or remove a question.`,
                                                type: 'error'
                                              });
                                              return;
                                            }
                                            const totalQuizMarks = qConf.questions.reduce((sum, q) => sum + (Number(q.points) || 10), 0);
                                            handleUpdateLessonInline(secKey, itemKey, {
                                              quizData: qConf,
                                              type: 'QUIZ'
                                            });
                                            setOpenContentDrawerId(null);
                                            showToast({
                                              title: 'Quiz Saved Successfully! ✓',
                                              description: `"${les.title || `Quiz ${itemMeta.num}`}" saved with ${qConf.questions.length} questions (${totalQuizMarks} total marks).`,
                                              type: 'success'
                                            });
                                          }}
                                          className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
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
                          </div>
                        );
                      }

                      // 2. STANDARD LECTURE ROW (Lecture {num}, Title input, Free Preview, Delete - No Edit button!)
                      if (isLectureItem) {
                        return (
                          <div key={itemKey} className="space-y-2">
                            <div className="border border-[#d1d7dc] bg-white rounded-md transition-all hover:border-slate-400 shadow-2xs overflow-hidden">
                              {/* Lecture Top Bar */}
                              <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {/* Up/Down buttons */}
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      disabled={lIdx === 0}
                                      onClick={() => moveLesson(secKey, lIdx, 'up')}
                                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                      title="Move Lecture Up"
                                    >
                                      <Icon name="arrow_upward" size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={lIdx === section.lessons.length - 1}
                                      onClick={() => moveLesson(secKey, lIdx, 'down')}
                                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                      title="Move Lecture Down"
                                    >
                                      <Icon name="arrow_downward" size={13} />
                                    </button>
                                  </div>

                                  {/* Checkmark Status Circle */}
                                  {hasContent ? (
                                    <span
                                      className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs"
                                      title="Media or content attached"
                                    >
                                      ✓
                                    </span>
                                  ) : (
                                    <span
                                      className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0"
                                      title="Lecture item"
                                    />
                                  )}

                                  {/* Continuous Lecture Number Label across modules */}
                                  <span className="font-extrabold text-xs text-slate-900 shrink-0 font-sans min-w-[14px]">
                                    Lecture {itemMeta.num}.
                                  </span>

                                  {/* Inline Title Input */}
                                  <div className="flex-1 min-w-[160px] flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={les.title}
                                      onChange={(e) =>
                                        handleUpdateLessonInline(secKey, itemKey, { title: e.target.value })
                                      }
                                      onBlur={() =>
                                        handleUpdateLessonInline(secKey, itemKey, { title: cleanLectureTitle(les.title) })
                                      }
                                      placeholder="Lecture Title (e.g. Overview & Deep Dive)"
                                      className="w-full bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#2d2f31] rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none transition-colors"
                                    />
                                    {les.title && les.title.trim().length > 3 && (
                                      <GrammarHintAssistant
                                        text={les.title}
                                        onApplyCorrection={(corrected) =>
                                          handleUpdateLessonInline(secKey, itemKey, { title: cleanLectureTitle(corrected) })
                                        }
                                        fieldName="Lecture Title"
                                        compact
                                      />
                                    )}
                                  </div>

                                  {/* Attached Video Badge (Only if video already uploaded via Media Studio) */}
                                  {les.videoUrl && (
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-blue-50 text-blue-950 px-2 py-0.5 rounded border border-blue-300 shadow-2xs">
                                        <Icon name="play_circle" size={13} className="text-blue-600" />
                                        <span className="truncate max-w-[130px]">
                                          {les.videoFileName || 'Video Attached'}
                                        </span>
                                        <span className="text-[10px] text-blue-700 font-semibold">
                                          ({les.duration || '10:00'})
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdateLessonInline(secKey, itemKey, {
                                              videoUrl: '',
                                              videoFileName: '',
                                              clearVideo: true,
                                              removeVideo: true
                                            } as any)
                                          }
                                          className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                          title="Remove attached video"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Free Preview Checkbox */}
                                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none shrink-0 pl-1">
                                    <input
                                      type="checkbox"
                                      checked={!!les.isFree}
                                      onChange={(e) =>
                                        handleUpdateLessonInline(secKey, itemKey, {
                                          isFree: e.target.checked
                                        })
                                      }
                                      className="rounded border-slate-300 text-[#2d2f31] focus:ring-0"
                                    />
                                    <span>Free Preview</span>
                                  </label>
                                </div>

                                {/* Delete button on Lecture */}
                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLesson(secKey, itemKey)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                                    title="Delete Lecture"
                                  >
                                    <Icon name="delete" size={15} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 3. WRITTEN ARTICLE ROW (Article {num}, Title input, Badge, Free Preview, Edit Article button & Delete)
                      return (
                        <div key={itemKey} className="space-y-2">
                          <div className="border border-[#d1d7dc] bg-white rounded-md transition-all hover:border-slate-400 shadow-2xs overflow-hidden">
                            {/* Article Top Bar */}
                            <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {/* Up/Down buttons */}
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={lIdx === 0}
                                    onClick={() => moveLesson(secKey, lIdx, 'up')}
                                    className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                    title="Move Article Up"
                                  >
                                    <Icon name="arrow_upward" size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={lIdx === section.lessons.length - 1}
                                    onClick={() => moveLesson(secKey, lIdx, 'down')}
                                    className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                    title="Move Article Down"
                                  >
                                    <Icon name="arrow_downward" size={13} />
                                  </button>
                                </div>

                                {/* Checkmark Status Circle */}
                                {hasContent ? (
                                  <span
                                    className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs"
                                    title="Content is written for this article"
                                  >
                                    ✓
                                  </span>
                                ) : (
                                  <span
                                    className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0"
                                    title="Article content"
                                  />
                                )}

                                {/* Continuous Article Number Label across modules */}
                                <span className="font-extrabold text-xs text-slate-900 shrink-0 font-sans min-w-[14px]">
                                  Article {itemMeta.num}.
                                </span>

                                {/* Inline Title Input */}
                                <div className="flex-1 min-w-[160px]">
                                  <input
                                    type="text"
                                    value={les.title}
                                    onChange={(e) =>
                                      handleUpdateLessonInline(secKey, itemKey, { title: e.target.value })
                                    }
                                    onBlur={() =>
                                      handleUpdateLessonInline(secKey, itemKey, { title: cleanLectureTitle(les.title) })
                                    }
                                    placeholder="Article Title (e.g. Introduction & Key Concepts)"
                                    className="w-full bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#2d2f31] rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none transition-colors"
                                  />
                                </div>

                                {/* Attached Content Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setEditingLesson({ sectionId: secKey, lesson: les })}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300 cursor-pointer transition-colors"
                                    title="Click to edit article headings & text"
                                  >
                                    📝 Written Article {les.duration ? `(${les.duration})` : ''}
                                  </button>
                                  {les.pdfUrl && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                                      📑 PDF Handout
                                    </span>
                                  )}
                                </div>

                                {/* Free Preview Checkbox */}
                                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none shrink-0 pl-1">
                                  <input
                                    type="checkbox"
                                    checked={!!les.isFree}
                                    onChange={(e) =>
                                      handleUpdateLessonInline(secKey, itemKey, {
                                        isFree: e.target.checked
                                      })
                                    }
                                    className="rounded border-slate-300 text-[#2d2f31] focus:ring-0"
                                  />
                                  <span>Free Preview</span>
                                </label>
                              </div>

                              {/* Action Buttons on Article: Edit Article & Delete */}
                              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingLesson({ sectionId: secKey, lesson: les })}
                                  className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-black bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="Edit article headings, formatted content, or attached handouts"
                                >
                                  <Icon name="edit" size={13} />
                                  <span>Edit Article</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLesson(secKey, itemKey)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                                  title="Delete Article"
                                >
                                  <Icon name="delete" size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* CURRICULUM ITEM FOOTER BAR INSIDE MODULE */}
                  <div className={`flex flex-wrap items-center gap-2 ${section.lessons.length > 0 ? 'pt-3 border-t border-[#d1d7dc]/60' : 'pt-0.5'}`}>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                      + Add to Module {moduleNum}:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(secKey, 'VIDEO', false)}
                      className="px-3.5 py-2 bg-blue-50 border border-blue-400 hover:bg-blue-100 text-blue-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Add a lecture"
                    >
                      <Icon name="videocam" size={15} />
                      <span>+ Add Lecture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(secKey, 'TEXT', true)}
                      className="px-3.5 py-2 bg-amber-50 border border-amber-400 hover:bg-amber-100 text-amber-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Add a written article with headings and paragraphs"
                    >
                      <Icon name="article" size={15} />
                      <span>+ Add Article</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(secKey, 'QUIZ', false)}
                      className="px-3.5 py-2 bg-purple-50 border border-purple-400 hover:bg-purple-100 text-purple-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Add a knowledge quiz"
                    >
                      <Icon name="quiz" size={15} />
                      <span>+ Add Quiz</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateFinalAssignment(secKey)}
                      className={`px-3.5 py-2 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        hasFinalAssignment
                          ? 'bg-amber-50/70 border border-amber-300 text-amber-900 hover:bg-amber-100'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-extrabold shadow-sm'
                      }`}
                      title="Add mandatory Final Assignment required for certificate and approval"
                    >
                      <Icon name="workspace_premium" size={15} fill />
                      <span>{hasFinalAssignment ? '+ Final Assignment' : '+ Final Assignment (Required)'}</span>
                    </button>
                    <span className="text-[11px] font-medium text-slate-500 ml-auto hidden sm:inline flex items-center gap-1">
                      <Icon name="all_inclusive" size={14} className="text-primary" />
                      <span>Unlimited items per module</span>
                    </span>
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
                setNewSectionTitle('');
                setNewSectionDescription('');
                setIsAddSectionOpen(true);
              }}
              className="w-full py-4 border-2 border-dashed border-[#2d2f31]/40 hover:border-[#2d2f31] bg-white hover:bg-slate-50 text-[#2d2f31] font-bold text-sm rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <Icon name="add_circle" size={18} />
              <span>Add Module</span>
            </button>
          </div>

          {/* MANDATORY FINAL ASSIGNMENT STATUS / CALLOUT BANNER */}
          <div className="pt-2">
            {hasFinalAssignment ? (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 shadow-sm flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <span>Mandatory Final Assignment Configured</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] uppercase font-bold tracking-wide">
                        Certificate Gate Ready
                      </span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Your course contains the required Final Assignment. Students must pass this assignment to unlock their completion certificate.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-2 border-amber-400 shadow-md flex items-center justify-between gap-4 flex-wrap animate-in fade-in">
                <div className="flex items-start gap-3 max-w-xl">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                    🎓
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-2">
                      <span>Mandatory Requirement: Final Assignment Missing</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] uppercase font-bold tracking-wider">
                        Required for Approval
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                      Every course must have a <strong>Final Assignment</strong> (Certificate Gate) before it can be submitted for review. It acts as the final qualification exam: students must pass it with your chosen passing score to claim their course certificate.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateFinalAssignment()}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer transform hover:scale-[1.02]"
                >
                  <Icon name="workspace_premium" size={16} fill />
                  <span>+ Add Mandatory Final Assignment</span>
                </button>
              </div>
            )}
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
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                    Module {activeModNum} Title *
                  </label>
                  <GrammarHintAssistant
                    text={newSectionTitle}
                    onApplyCorrection={(corrected) => setNewSectionTitle(corrected)}
                    fieldName="Module Title"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. Foundations & Core Concepts"
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={`Edit Article: "${formData.title || 'Untitled'}"`}
      subtitle={`Lecture Order: ${formData.order} • Written Content & Resources`}
    >
      <div className="space-y-6">

        {/* Title & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Article Title *
              </label>
              <GrammarHintAssistant
                text={formData.title}
                onApplyCorrection={(corrected) => setFormData((prev) => ({ ...prev, title: corrected }))}
                fieldName="Article Title"
              />
            </div>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Estimated Duration (mm:ss)
            </label>
            <input
              type="text"
              value={formData.duration || '05:00'}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="05:00"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Lesson Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Article Description / Overview
            </label>
            <GrammarHintAssistant
              text={formData.description || ''}
              onApplyCorrection={(corrected) => setFormData((prev) => ({ ...prev, description: corrected }))}
              fieldName="Article Description"
            />
          </div>
          <textarea
            rows={2}
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Summarize what this article covers..."
            className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        {/* 1. PRIMARY ARTICLE EDITOR */}
        <div className="space-y-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <span>📝</span>
                <span>Written Article Content &amp; Formatting</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold px-2 py-0.5 rounded-full">
                  Primary Content
                </span>
              </label>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Format your written article with Headings (H1, H2, H3), paragraphs, bullet points, callout tips, and code blocks.
              </p>
            </div>
          </div>

          <RichArticleEditor
            content={formData.content || ''}
            onChange={(newContent) => setFormData((prev) => ({ ...prev, content: newContent }))}
            onSetDuration={(dur) => setFormData((prev) => ({ ...prev, duration: dur }))}
            placeholder="# Key Concepts &amp; Lecture Guide&#10;&#10;Welcome to this article. Write your headings, detailed explanations, bullet points, callout notes, and code walkthrough here..."
            minHeight="380px"
          />
        </div>

        {/* 2. PDF / RESOURCE DOCUMENT SECTION */}
        <div className="space-y-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              📑 Study Resource / Handout (PDF, Doc, Image, or External Link)
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
            disabled={isUploadingPdf}
            onClick={() => {
              if (isUploadingPdf) {
                showToast({
                  title: 'Upload in Progress',
                  description: 'Please wait for your PDF to finish uploading before saving.',
                  type: 'info'
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
            {isUploadingPdf ? 'Uploading PDF...' : 'Save Article Content'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
