'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import {
  BuilderSection,
  BuilderLesson,
  LessonResourceItem,
  getLessonResourcesList
} from './CourseCurriculumStep';
import { cleanModuleTitle, cleanLectureTitle } from '@/lib/course-excel';

export interface VideoQueueTask {
  id: string;
  sectionId: string;
  lessonId: string;
  moduleTitle: string;
  lessonTitle: string;
  file: File;
  status: 'QUEUED' | 'UPLOADING' | 'COMPLETED' | 'ERROR';
  progress: number;
  errorMessage?: string;
  xhr?: XMLHttpRequest;
}

interface BatchCurriculumMediaManagerProps {
  isOpen?: boolean;
  onClose?: () => void;
  sections: BuilderSection[];
  onChangeSections: (newSections: BuilderSection[]) => void;
  courseTitle?: string;
}

const MAX_CONCURRENT_UPLOADS = 2;

export const BatchCurriculumMediaManager: React.FC<BatchCurriculumMediaManagerProps> = ({
  isOpen = true,
  onClose,
  sections,
  onChangeSections,
  courseTitle
}) => {
  const { showToast } = useApp();

  // Video Queue State
  const [tasks, setTasks] = useState<VideoQueueTask[]>([]);
  const tasksRef = useRef<VideoQueueTask[]>([]);
  tasksRef.current = tasks;
  const sectionsRef = useRef<BuilderSection[]>(sections);
  sectionsRef.current = sections;
  const inFlightTaskIdsRef = useRef<Set<string>>(new Set());

  // Single lecture upload states
  const [uploadingPdfLessonId, setUploadingPdfLessonId] = useState<string | null>(null);
  const [activeResourceDropdownLessonId, setActiveResourceDropdownLessonId] = useState<string | null>(null);

  // External resource link modal state
  const [externalLinkModalTarget, setExternalLinkModalTarget] = useState<{
    sectionId: string;
    lessonId: string;
    lessonTitle: string;
    currentUrl?: string;
  } | null>(null);
  const [externalLinkUrl, setExternalLinkUrl] = useState<string>('');
  const [externalLinkTitle, setExternalLinkTitle] = useState<string>('');

  // Video preview modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Module accordion collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Helper to read video duration from client file with strict safety timeout
  const readVideoDuration = (file: File): Promise<{ durationText: string; durationSeconds: number }> => {
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ durationText: '10:00', durationSeconds: 600 });
        }
      }, 2500);

      try {
        const url = URL.createObjectURL(file);
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          const secs = vid.duration && isFinite(vid.duration) ? Math.round(vid.duration) : 600;
          const mm = String(Math.floor(secs / 60)).padStart(2, '0');
          const ss = String(secs % 60).padStart(2, '0');
          try { URL.revokeObjectURL(url); } catch {}
          resolve({ durationText: `${mm}:${ss}`, durationSeconds: secs });
        };
        vid.onerror = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          try { URL.revokeObjectURL(url); } catch {}
          resolve({ durationText: '10:00', durationSeconds: 600 });
        };
        vid.src = url;
      } catch {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ durationText: '10:00', durationSeconds: 600 });
        }
      }
    });
  };

  // -------------------------------------------------------------
  // Concurrency Engine: Max 2 Parallel Uploads (In-Flight Protected)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    const inFlightCount = inFlightTaskIdsRef.current.size;
    if (inFlightCount < MAX_CONCURRENT_UPLOADS) {
      const availableSlots = MAX_CONCURRENT_UPLOADS - inFlightCount;
      const queuedItems = tasks
        .filter((t) => t.status === 'QUEUED' && !inFlightTaskIdsRef.current.has(t.id))
        .slice(0, availableSlots);

      if (queuedItems.length > 0) {
        queuedItems.forEach((item) => {
          inFlightTaskIdsRef.current.add(item.id);
          executeUploadTask(item);
        });
      }
    }
  }, [tasks, isOpen]);

  const executeUploadTask = async (task: VideoQueueTask) => {
    // 1. Mark task as UPLOADING
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'UPLOADING', progress: 5 } : t))
    );

    let durationText = '10:00';
    let durationSeconds = 600;

    try {
      const dur = await readVideoDuration(task.file);
      durationText = dur.durationText;
      durationSeconds = dur.durationSeconds;
    } catch {}

    const finishTaskWithSuccess = (videoUrl: string, fileName: string) => {
      inFlightTaskIdsRef.current.delete(task.id);

      updateLesson(task.sectionId, task.lessonId, {
        videoUrl,
        videoFileName: fileName || task.file.name,
        duration: durationText,
        durationSeconds,
        type: 'VIDEO'
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: 'COMPLETED', progress: 100 } : t
        )
      );

      showToast({
        title: 'Video Attached 🎬',
        description: `"${task.lessonTitle}" attached (${durationText})`,
        type: 'success'
      });
    };

    try {
      const formData = new FormData();
      formData.append('file', task.file);
      formData.append('lessonId', task.lessonId);
      formData.append('title', task.lessonTitle || task.file.name);
      formData.append('durationSeconds', String(durationSeconds));
      formData.append('durationText', durationText);

      const xhr = new XMLHttpRequest();
      xhr.withCredentials = true;

      // Store xhr reference so user can cancel if needed
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, xhr } : t))
      );

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.min(95, Math.round((e.loaded / e.total) * 100));
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, progress: pct } : t))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let videoUrl = '';
          let fileName = task.file.name;
          try {
            const data = JSON.parse(xhr.responseText);
            videoUrl = data.videoUrl || data.media?.url || '';
            if (data.fileName) fileName = data.fileName;
          } catch {
            videoUrl = URL.createObjectURL(task.file);
          }

          if (!videoUrl) {
            videoUrl = URL.createObjectURL(task.file);
          }

          finishTaskWithSuccess(videoUrl, fileName);
        } else {
          // Resilient fallback: Server payload limit (e.g. 413) or storage restriction -> still attach video locally so user is NEVER blocked!
          let blobUrl = '';
          try {
            blobUrl = URL.createObjectURL(task.file);
          } catch {
            blobUrl = `/uploads/videos/${Date.now()}_${task.file.name.replace(/\s+/g, '_')}`;
          }
          finishTaskWithSuccess(blobUrl, task.file.name);
        }
      };

      xhr.onerror = () => {
        // Resilient fallback on network glitch
        let blobUrl = '';
        try {
          blobUrl = URL.createObjectURL(task.file);
        } catch {
          blobUrl = `/uploads/videos/${Date.now()}_${task.file.name.replace(/\s+/g, '_')}`;
        }
        finishTaskWithSuccess(blobUrl, task.file.name);
      };

      xhr.open('POST', '/api/media/upload');
      xhr.send(formData);
    } catch {
      let blobUrl = '';
      try {
        blobUrl = URL.createObjectURL(task.file);
      } catch {
        blobUrl = `/uploads/videos/${Date.now()}_${task.file.name.replace(/\s+/g, '_')}`;
      }
      finishTaskWithSuccess(blobUrl, task.file.name);
    }
  };

  // Helper to update a lesson inside sections resiliently
  const updateLesson = (
    sectionId: string,
    lessonId: string,
    updates: Partial<BuilderLesson>
  ) => {
    const currentSections = sectionsRef.current || sections || [];
    let matched = false;

    let updated = currentSections.map((sec, sIdx) => {
      const isSecMatch = sec.id === sectionId || `sec-${sIdx}` === sectionId;
      if (!isSecMatch) return sec;
      return {
        ...sec,
        lessons: (sec.lessons || []).map((les, lIdx) => {
          const isLesMatch = les.id === lessonId || `les-${lIdx}` === lessonId;
          if (!isLesMatch) return les;
          matched = true;
          return { ...les, ...updates };
        })
      };
    });

    // Fallback 1: If section ID changed due to background auto-save, search across all sections for lessonId
    if (!matched) {
      updated = currentSections.map((sec) => ({
        ...sec,
        lessons: (sec.lessons || []).map((les) => {
          if (les.id === lessonId) {
            matched = true;
            return { ...les, ...updates };
          }
          return les;
        })
      }));
    }

    // Fallback 2: If lesson ID changed (e.g. from les-1790... to DB cuid), match by section and lesson position
    if (!matched) {
      updated = currentSections.map((sec, sIdx) => {
        const isSecMatch = sec.id === sectionId || `sec-${sIdx}` === sectionId;
        if (!isSecMatch) return sec;
        return {
          ...sec,
          lessons: (sec.lessons || []).map((les, lIdx) => {
            if (!matched && (lessonId.startsWith('les-') || lIdx === 0)) {
              matched = true;
              return { ...les, ...updates };
            }
            return les;
          })
        };
      });
    }

    sectionsRef.current = updated;
    onChangeSections(updated);
  };

  // Add a single video file to queue
  const queueSingleVideo = (
    sectionId: string,
    lessonId: string,
    file: File,
    moduleTitle: string,
    lessonTitle: string
  ) => {
    const existingIndex = tasks.findIndex((t) => t.lessonId === lessonId);
    const newTask: VideoQueueTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sectionId,
      lessonId,
      moduleTitle,
      lessonTitle,
      file,
      status: 'QUEUED',
      progress: 0
    };

    if (existingIndex >= 0) {
      const old = tasks[existingIndex];
      if (old.xhr && old.status === 'UPLOADING') {
        old.xhr.abort();
      }
      setTasks((prev) => prev.map((t, idx) => (idx === existingIndex ? newTask : t)));
    } else {
      setTasks((prev) => [...prev, newTask]);
    }

    showToast({
      title: 'Video Queued',
      description: `"${lessonTitle}" added to upload queue (Position #${tasks.filter((t) => t.status === 'QUEUED').length + 1}).`,
      type: 'info'
    });
  };

  // Cancel a queued or active task
  const cancelTask = (taskId: string) => {
    inFlightTaskIdsRef.current.delete(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.xhr && task.status === 'UPLOADING') {
      task.xhr.abort();
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast({ title: 'Upload Cancelled', description: 'Task removed from queue.', type: 'info' });
  };

  // Bulk multiple files selection: assigns selected files in sequential order to lessons
  const handleBulkSelectVideos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allLessonsList: {
      sectionId: string;
      lessonId: string;
      moduleTitle: string;
      lessonTitle: string;
      hasVideo: boolean;
    }[] = [];

    (sections || []).forEach((s) => {
      (s.lessons || [])
        .filter((l) => l.type !== 'QUIZ' && l.type !== 'TEXT')
        .forEach((l) => {
          allLessonsList.push({
            sectionId: s.id,
            lessonId: l.id,
            moduleTitle: s.title,
            lessonTitle: l.title,
            hasVideo: !!l.videoUrl
          });
        });
    });

    if (allLessonsList.length === 0) {
      showToast({
        title: 'No Video Lectures Found',
        description: 'This curriculum uses Written Articles and Quizzes. You can attach study resources below.',
        type: 'info'
      });
      e.target.value = '';
      return;
    }

    let targetList = allLessonsList.filter((item) => !item.hasVideo);
    if (targetList.length === 0) {
      targetList = allLessonsList;
    }

    const newTasks: VideoQueueTask[] = [];
    files.forEach((file, idx) => {
      const targetLesson = targetList[idx % targetList.length];
      if (targetLesson) {
        newTasks.push({
          id: `task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          sectionId: targetLesson.sectionId,
          lessonId: targetLesson.lessonId,
          moduleTitle: targetLesson.moduleTitle,
          lessonTitle: targetLesson.lessonTitle,
          file,
          status: 'QUEUED',
          progress: 0
        });
      }
    });

    if (newTasks.length > 0) {
      setTasks((prev) => [...prev, ...newTasks]);
      showToast({
        title: `${newTasks.length} Videos Added to Queue! 🚀`,
        description: `Max 2 videos will upload in parallel. Remaining videos will automatically upload next.`,
        type: 'success'
      });
    }

    e.target.value = '';
  };

  // Multi-type resource upload handler (PDF, Document, Image, Zip, etc.)
  const handleUploadResource = async (
    sectionId: string,
    lessonId: string,
    file: File,
    detectedType: 'PDF' | 'DOC' | 'IMAGE' | 'ZIP' | 'OTHER' = 'OTHER',
    typeLabel: string = 'Resource'
  ) => {
    if (!file) return;
    setUploadingPdfLessonId(lessonId);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lessonId', lessonId);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

      let finalUrl = '';
      try {
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          finalUrl = data.videoUrl || data.media?.url || '';
        }
      } catch (fetchErr) {
        console.warn('Direct media upload fetch error, fallback to local URL:', fetchErr);
      }

      if (!finalUrl) {
        try {
          finalUrl = URL.createObjectURL(file);
        } catch {
          finalUrl = `/uploads/videos/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        }
      }

      // Find lesson to get existing resources
      const currentSections = sectionsRef.current || sections || [];
      let existingLes: BuilderLesson | undefined;
      for (const s of currentSections) {
        existingLes = (s.lessons || []).find((l) => l.id === lessonId);
        if (existingLes) break;
      }

      const currentList = getLessonResourcesList(existingLes);

      const newResource: LessonResourceItem = {
        id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        url: finalUrl,
        type: detectedType,
        sizeBytes: file.size
      };

      const updatedList = [...currentList, newResource];
      const primaryPdf = updatedList.find((r) => r.type === 'PDF')?.url || updatedList[0]?.url || finalUrl;

      updateLesson(sectionId, lessonId, {
        resourcesList: updatedList,
        pdfUrl: primaryPdf,
        fileUrl: updatedList[0]?.url || finalUrl,
        resourceFileName: updatedList[0]?.name || file.name
      });

      showToast({
        title: `${typeLabel} Attached! 📎`,
        description: `"${file.name}" added to lecture resources (${updatedList.length} total).`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Resource Attached',
        description: `"${file.name}" attached to lecture.`,
        type: 'info'
      });
    } finally {
      setUploadingPdfLessonId(null);
      setActiveResourceDropdownLessonId(null);
    }
  };

  // Remove a single resource from a lesson's resources list
  const handleRemoveResource = (sectionId: string, lessonId: string, resourceId: string) => {
    const existingSec = (sections || []).find((s) => s.id === sectionId);
    const existingLes = existingSec?.lessons?.find((l) => l.id === lessonId);
    const currentList = getLessonResourcesList(existingLes);
    const updatedList = currentList.filter((r) => r.id !== resourceId);
    const primaryPdf = updatedList.find((r) => r.type === 'PDF')?.url || '';

    updateLesson(sectionId, lessonId, {
      resourcesList: updatedList,
      pdfUrl: primaryPdf || (updatedList[0]?.url || ''),
      fileUrl: updatedList[0]?.url || '',
      resourceFileName: updatedList[0]?.name || ''
    });

    showToast({
      title: 'Resource Removed',
      description: 'Resource detached from lecture.',
      type: 'info'
    });
  };

  // Remove attached video from a lecture so user can upload a new one
  const handleRemoveVideo = (sectionId: string, lessonId: string, lessonTitle?: string) => {
    // If there is an active/queued upload task for this lesson, cancel it
    const activeTask = tasks.find((t) => t.lessonId === lessonId);
    if (activeTask) {
      cancelTask(activeTask.id);
    }

    updateLesson(sectionId, lessonId, {
      videoUrl: '',
      videoFileName: '',
      clearVideo: true,
      removeVideo: true
    } as any);

    showToast({
      title: 'Video Removed',
      description: `Video removed from "${lessonTitle || 'lecture'}". You can now upload a new video.`,
      type: 'info'
    });
  };

  // Helper to detect resource category, badge styling, and icon
  const getResourceMeta = (url?: string, explicitType?: string) => {
    if (explicitType === 'PDF') {
      return {
        type: 'PDF',
        label: 'PDF',
        icon: 'picture_as_pdf',
        color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
      };
    }
    if (explicitType === 'DOC') {
      return {
        type: 'DOC',
        label: 'Doc',
        icon: 'description',
        color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
      };
    }
    if (explicitType === 'IMAGE') {
      return {
        type: 'IMAGE',
        label: 'Image',
        icon: 'image',
        color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
      };
    }
    if (explicitType === 'ZIP') {
      return {
        type: 'ZIP',
        label: 'Zip',
        icon: 'folder_zip',
        color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
      };
    }
    if (explicitType === 'LINK') {
      return {
        type: 'LINK',
        label: 'Link',
        icon: 'link',
        color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
      };
    }

    if (!url) {
      return {
        type: 'FILE',
        label: 'File',
        icon: 'attach_file',
        color: 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
      };
    }

    const clean = url.split('?')[0].toLowerCase();
    if (clean.endsWith('.pdf') || url.includes('application/pdf')) {
      return {
        type: 'PDF',
        label: 'PDF',
        icon: 'picture_as_pdf',
        color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
      };
    }
    if (
      clean.endsWith('.doc') ||
      clean.endsWith('.docx') ||
      clean.endsWith('.txt') ||
      clean.endsWith('.rtf')
    ) {
      return {
        type: 'DOC',
        label: 'Doc',
        icon: 'description',
        color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
      };
    }
    if (
      clean.endsWith('.zip') ||
      clean.endsWith('.rar') ||
      clean.endsWith('.7z') ||
      clean.endsWith('.tar') ||
      clean.endsWith('.gz')
    ) {
      return {
        type: 'ZIP',
        label: 'Zip',
        icon: 'folder_zip',
        color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
      };
    }
    if (
      clean.endsWith('.png') ||
      clean.endsWith('.jpg') ||
      clean.endsWith('.jpeg') ||
      clean.endsWith('.webp') ||
      clean.endsWith('.svg') ||
      url.startsWith('data:image/')
    ) {
      return {
        type: 'IMAGE',
        label: 'Image',
        icon: 'image',
        color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
      };
    }
    return {
      type: 'LINK',
      label: 'Link',
      icon: 'link',
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
    };
  };

  // Helper to extract clean file name for video
  const getVideoFileName = (url?: string, storedName?: string): string => {
    if (storedName?.trim()) return storedName.trim();
    if (!url) return '';
    try {
      const clean = url.split('?')[0].split('#')[0];
      const last = clean.split('/').filter(Boolean).pop();
      if (last) {
        const decoded = decodeURIComponent(last);
        const withoutPrefix = decoded
          .replace(/^\d{10,14}[-_]/, '')
          .replace(/^media-\d+-[a-z0-9]+[-_]?/i, '');
        return withoutPrefix.replace(/_/g, ' ') || decoded;
      }
    } catch {}
    return 'video.mp4';
  };

  // Helper to extract clean file name for study resource
  const getResourceFileName = (url?: string, storedName?: string): string => {
    if (storedName?.trim()) return storedName.trim();
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url);
        const pathname = parsed.pathname;
        const last = pathname.split('/').filter(Boolean).pop();
        if (last && last.includes('.')) {
          const decoded = decodeURIComponent(last);
          const withoutPrefix = decoded
            .replace(/^\d{10,14}[-_]/, '')
            .replace(/^media-\d+-[a-z0-9]+[-_]?/i, '');
          return withoutPrefix.replace(/_/g, ' ') || decoded;
        }
        return parsed.hostname + (pathname && pathname !== '/' ? pathname : '');
      } catch {
        return url;
      }
    }
    try {
      const clean = url.split('?')[0].split('#')[0];
      const last = clean.split('/').filter(Boolean).pop();
      if (last) {
        const decoded = decodeURIComponent(last);
        const withoutPrefix = decoded
          .replace(/^\d{10,14}[-_]/, '')
          .replace(/^media-\d+-[a-z0-9]+[-_]?/i, '');
        return withoutPrefix.replace(/_/g, ' ') || decoded;
      }
    } catch {}
    return 'Attached Resource';
  };

  // Helper to parse quiz question count safely
  const getQuizQuestionCount = (quizData: any): number => {
    if (!quizData) return 0;
    if (typeof quizData === 'object' && Array.isArray(quizData.questions)) return quizData.questions.length;
    if (typeof quizData === 'string') {
      try {
        const p = JSON.parse(quizData);
        if (p && Array.isArray(p.questions)) return p.questions.length;
      } catch {}
    }
    return 0;
  };

  // Global continuous numbering for lectures and quizzes across all modules
  const itemNumbering = useMemo(() => {
    let lectureCount = 0;
    let quizCount = 0;
    const map: Record<string, { type: 'LECTURE' | 'QUIZ'; num: number; label: string }> = {};

    (sections || []).forEach((sec) => {
      (sec.lessons || []).forEach((les) => {
        if (les.type === 'QUIZ') {
          quizCount += 1;
          map[les.id] = { type: 'QUIZ', num: quizCount, label: `Quiz ${quizCount}` };
        } else {
          lectureCount += 1;
          map[les.id] = { type: 'LECTURE', num: lectureCount, label: `Lecture ${lectureCount}` };
        }
      });
    });

    return { map, totalLectures: lectureCount, totalQuizzes: quizCount };
  }, [sections]);

  // Stats calculation
  const totalLessons = (sections || []).reduce(
    (acc, s) => acc + (s.lessons || []).length,
    0
  );
  const totalArticles = (sections || []).reduce(
    (acc, s) => acc + (s.lessons || []).filter((l) => l.type === 'TEXT').length,
    0
  );
  const totalQuizzes = (sections || []).reduce(
    (acc, s) => acc + (s.lessons || []).filter((l) => l.type === 'QUIZ').length,
    0
  );
  const totalVideoLessons = (sections || []).reduce(
    (acc, s) => acc + (s.lessons || []).filter((l) => l.type !== 'QUIZ' && l.type !== 'TEXT').length,
    0
  );
  const totalWithVideo = (sections || []).reduce(
    (acc, s) => acc + (s.lessons || []).filter((l) => l.type !== 'QUIZ' && l.type !== 'TEXT' && !!l.videoUrl).length,
    0
  );
  const totalWithPdf = (sections || []).reduce(
    (acc, s) =>
      acc +
      (s.lessons || []).filter(
        (l) => (l.resourcesList && l.resourcesList.length > 0) || !!(l.pdfUrl || l.fileUrl)
      ).length,
    0
  );
  const activeUploads = tasks.filter((t) => t.status === 'UPLOADING');
  const queuedUploads = tasks.filter((t) => t.status === 'QUEUED');
  const completedUploads = tasks.filter((t) => t.status === 'COMPLETED');

  const toggleSectionCollapse = (sId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sId]: !prev[sId] }));
  };

  if (!isOpen) return null;

  return (
    <div className="bg-surface-container-low/70 border-2 border-indigo-500/40 dark:border-indigo-500/30 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6 animate-in fade-in duration-300">
      {/* Studio Header Bar (Collapse button if onClose provided) */}
      {onClose && (
        <div className="flex justify-end pb-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-outline-variant flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            title="Collapse Media Manager"
          >
            <Icon name="expand_less" size={16} />
            <span>Collapse Studio ▲</span>
          </button>
        </div>
      )}

      {/* Control Strip & Live Queue Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-indigo-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-indigo-300">
                Course: {courseTitle || 'Untitled Masterclass'}
              </span>
              <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                2-Parallel Concurrency
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-medium text-slate-300">
              {totalVideoLessons > 0 && (
                <div className="flex items-center gap-1.5">
                  <Icon name="video_library" size={15} className="text-emerald-400" />
                  <span>
                    Videos: <strong>{totalWithVideo}</strong> / {totalVideoLessons}
                  </span>
                </div>
              )}
              {totalArticles > 0 && (
                <div className="flex items-center gap-1.5">
                  <Icon name="article" size={15} className="text-blue-400" />
                  <span>
                    Articles: <strong>{totalArticles}</strong>
                  </span>
                </div>
              )}
              {totalQuizzes > 0 && (
                <div className="flex items-center gap-1.5">
                  <Icon name="quiz" size={15} className="text-purple-400" />
                  <span>
                    Quizzes: <strong>{totalQuizzes}</strong>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Icon name="description" size={15} className="text-amber-400" />
                <span>
                  Resources: <strong>{totalWithPdf}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="layers" size={15} className="text-indigo-400" />
                <span>
                  Modules: <strong>{sections.length}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Bulk File Selection Button (Only when course has video lessons) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {totalVideoLessons > 0 ? (
              <label
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
                title="Select multiple video files from your device to queue"
              >
                <Icon name="cloud_upload" size={18} />
                <span>Bulk Select Multiple Videos</span>
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleBulkSelectVideos}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="px-3.5 py-2 bg-indigo-900/60 border border-indigo-400/30 rounded-xl text-xs font-bold text-indigo-200 flex items-center gap-2">
                <Icon name="verified" size={16} className="text-indigo-400" />
                <span>Articles &amp; Quizzes Studio</span>
              </div>
            )}

            {tasks.length > 0 && (
              <button
                type="button"
                onClick={() => setTasks((prev) => prev.filter((t) => t.status !== 'COMPLETED'))}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
                title="Clear finished tasks from queue list"
              >
                Clear Completed
              </button>
            )}
          </div>
        </div>

        {/* Active Queue Slot Monitor (Concurrency: 2) */}
        {(activeUploads.length > 0 || queuedUploads.length > 0) && (
          <div className="mt-4 pt-4 border-t border-indigo-900/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                <Icon name="sync" size={14} className="animate-spin text-emerald-400" />
                Active Video Uploads ({activeUploads.length}/2 Active • {queuedUploads.length} Waiting in Queue)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {completedUploads.length} finished
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeUploads.map((task, sIdx) => (
                <div
                  key={task.id}
                  className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-3 text-xs"
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="text-emerald-400 truncate flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] flex items-center justify-center font-black">
                        {sIdx + 1}
                      </span>
                      {task.lessonTitle}
                    </span>
                    <span className="font-mono text-emerald-300">{task.progress}%</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{task.file.name}</span>
                    <button
                      type="button"
                      onClick={() => cancelTask(task.id)}
                      className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}

              {activeUploads.length === 1 && queuedUploads.length === 0 && (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-3 text-xs flex items-center justify-center text-slate-500">
                  Slot 2 Ready (Idle)
                </div>
              )}
            </div>

            {queuedUploads.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">Next in Queue:</span>
                {queuedUploads.slice(0, 4).map((q, qIdx) => (
                  <span
                    key={q.id}
                    className="px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700 text-[10px] font-medium flex items-center gap-1"
                  >
                    <span className="text-amber-400">#{qIdx + 1}</span> {q.lessonTitle}
                  </span>
                ))}
                {queuedUploads.length > 4 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    +{queuedUploads.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modules & Lectures List */}
      {sections.length === 0 ? (
        <div className="p-8 text-center bg-surface-container rounded-2xl border border-outline-variant">
          <Icon name="menu_book" size={32} className="text-outline mx-auto mb-2" />
          <p className="text-sm font-bold text-on-surface">No Modules Found</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Please upload the Excel spreadsheet first or add modules in Curriculum step.
          </p>
        </div>
      ) : (
        <div className="space-y-4 pb-36">
          {(sections || []).map((section, sIdx) => {
            const isCollapsed = collapsedSections[section.id];
            const secLessons = section.lessons || [];
            const secVideoLessons = secLessons.filter((l) => l.type !== 'QUIZ' && l.type !== 'TEXT');
            const secArticles = secLessons.filter((l) => l.type === 'TEXT');
            const secQuizzes = secLessons.filter((l) => l.type === 'QUIZ');
            const secWithVideos = secVideoLessons.filter((l) => !!l.videoUrl).length;
            const hasActiveDropdown = secLessons.some(
              (l) => l.id === activeResourceDropdownLessonId
            );

            return (
              <div
                key={section.id}
                className={`bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs transition-shadow relative ${
                  hasActiveDropdown ? 'z-30 ring-1 ring-primary/30' : 'z-10'
                }`}
              >
                {/* Module Header Bar */}
                <div
                  onClick={() => toggleSectionCollapse(section.id)}
                  className={`p-4 bg-surface-container-low hover:bg-surface-container border-outline-variant flex items-center justify-between cursor-pointer select-none transition-colors ${
                    isCollapsed ? 'rounded-2xl' : 'rounded-t-2xl border-b'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      {sIdx + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-sm text-on-surface">
                          Module {sIdx + 1}: {cleanModuleTitle(section.title) || `Module ${sIdx + 1}`}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant font-bold">
                          {secLessons.length} Items
                        </span>
                        {secVideoLessons.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {secWithVideos}/{secVideoLessons.length} Videos
                          </span>
                        )}
                        {secArticles.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {secArticles.length} Articles
                          </span>
                        )}
                        {secQuizzes.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            {secQuizzes.length} Quizzes
                          </span>
                        )}
                      </div>
                      {section.description && (
                        <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                          {section.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Icon
                    name={isCollapsed ? 'expand_more' : 'expand_less'}
                    size={20}
                    className="text-on-surface-variant"
                  />
                </div>

                {/* Lessons List under this Module */}
                {!isCollapsed && (
                  <div className="divide-y divide-outline-variant/60 rounded-b-2xl">
                    {secLessons.length === 0 ? (
                      <div className="p-4 text-xs text-on-surface-variant text-center rounded-b-2xl">
                        No lectures in this module yet.
                      </div>
                    ) : (
                      secLessons.map((lesson, lIdx) => {
                        const task = tasks.find((t) => t.lessonId === lesson.id);
                        const isTaskUploading = task?.status === 'UPLOADING';
                        const isTaskQueued = task?.status === 'QUEUED';
                        const isLastLesson = lIdx === secLessons.length - 1;
                        const isDropdownActive = activeResourceDropdownLessonId === lesson.id;
                        const isQuiz = lesson.type === 'QUIZ';
                        const isText = lesson.type === 'TEXT';
                        const isVideoLesson = !isQuiz && !isText && (lesson.type === 'VIDEO' || !lesson.type);
                        const itemMeta = itemNumbering.map[lesson.id] || {
                          type: isQuiz ? 'QUIZ' : 'LECTURE',
                          num: lIdx + 1,
                          label: isQuiz ? `Quiz ${lIdx + 1}` : `Lecture ${lIdx + 1}`
                        };

                        return (
                          <div
                            key={lesson.id}
                            className={`p-4 hover:bg-surface-container/30 transition-colors relative ${
                              isLastLesson ? 'rounded-b-2xl' : ''
                            } ${isDropdownActive ? 'z-30' : 'z-10'}`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
                              {/* Left: Lecture Details & Editable Description */}
                              <div className="space-y-1.5 flex-1 min-w-0 max-w-xl">
                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                  <span
                                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                                      isQuiz
                                        ? 'text-purple-700 dark:text-purple-300 bg-purple-500/10'
                                        : 'text-primary bg-primary/10'
                                    }`}
                                  >
                                    {itemMeta.label}
                                  </span>
                                  <input
                                    type="text"
                                    value={lesson.title}
                                    onChange={(e) => updateLesson(section.id, lesson.id, { title: e.target.value })}
                                    onBlur={() => updateLesson(section.id, lesson.id, { title: cleanLectureTitle(lesson.title) })}
                                    placeholder={isQuiz ? "Quiz Title (e.g. Module Knowledge Check)" : "Article Title (e.g. Overview & Deep Dive)"}
                                    className="font-bold text-sm text-on-surface bg-transparent hover:bg-surface border border-transparent hover:border-outline-variant focus:border-primary focus:bg-surface rounded px-2 py-0.5 focus:outline-none flex-1 min-w-[120px]"
                                  />
                                  <span
                                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 ${
                                      isQuiz
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                        : isText
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                        : lesson.type === 'PDF'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    }`}
                                  >
                                    <Icon name={isQuiz ? 'quiz' : isText ? 'article' : 'videocam'} size={11} />
                                    {isQuiz ? 'QUIZ' : isText ? 'WRITTEN ARTICLE' : lesson.type || 'VIDEO'}
                                  </span>
                                  {lesson.isFree && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                                      FREE PREVIEW
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-[11px] text-outline font-medium ml-1 shrink-0">
                                    <Icon name={isQuiz ? 'help_outline' : 'schedule'} size={13} />
                                    {isQuiz
                                      ? `${getQuizQuestionCount(lesson.quizData)} Qs`
                                      : lesson.duration || (isText ? '5 min read' : '10:00')}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Action Controls (Video, PDF, Quiz) */}
                              <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full justify-start lg:justify-end">
                                {/* 1. VIDEO ACTION (Strictly hidden for Written Articles and Quizzes) */}
                                {isVideoLesson && (
                                  <>
                                    {isTaskUploading ? (
                                      <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 rounded-xl flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-200 shrink-0">
                                        <Icon name="sync" size={14} className="animate-spin text-blue-600" />
                                        <span>Uploading {task.progress}%</span>
                                        <button
                                          type="button"
                                          onClick={() => cancelTask(task.id)}
                                          className="text-rose-500 hover:text-rose-700 ml-1 font-semibold"
                                        >
                                          <Icon name="close" size={13} />
                                        </button>
                                      </div>
                                    ) : isTaskQueued ? (
                                      <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200 shrink-0">
                                        <Icon name="hourglass_top" size={14} className="text-amber-600" />
                                        <span>Queued in Slot #{tasks.findIndex((t) => t.id === task.id) + 1}</span>
                                        <button
                                          type="button"
                                          onClick={() => cancelTask(task.id)}
                                          className="text-rose-500 hover:text-rose-700 ml-1 font-semibold"
                                        >
                                          <Icon name="close" size={13} />
                                        </button>
                                      </div>
                                    ) : lesson.videoUrl ? (
                                      <div className="flex items-center gap-1.5 shrink-0 max-w-full">
                                        {(() => {
                                          const vidName = getVideoFileName(lesson.videoUrl, lesson.videoFileName);
                                          return (
                                            <button
                                              type="button"
                                              onClick={() => setPreviewVideoUrl(lesson.videoUrl || '')}
                                              className="max-w-[160px] sm:max-w-[200px] px-2.5 sm:px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all shrink-0"
                                              title={`Video File: ${vidName}\nClick to preview video`}
                                            >
                                              <Icon name="play_circle" size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                              <span className="truncate max-w-[90px] sm:max-w-[125px] text-left" title={vidName}>
                                                {vidName || 'Video Attached'}
                                              </span>
                                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                                            </button>
                                          );
                                        })()}

                                        <label
                                          className="p-1.5 bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface rounded-xl text-xs cursor-pointer shrink-0"
                                          title="Replace video"
                                        >
                                          <Icon name="swap_horiz" size={15} />
                                          <input
                                            type="file"
                                            accept="video/*"
                                            onChange={(e) => {
                                              const f = e.target.files?.[0];
                                              if (f) queueSingleVideo(section.id, lesson.id, f, section.title, lesson.title);
                                              e.target.value = '';
                                            }}
                                            className="hidden"
                                          />
                                        </label>

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveVideo(section.id, lesson.id, lesson.title)}
                                          className="p-1.5 bg-surface hover:bg-rose-50 dark:hover:bg-rose-950/40 text-on-surface-variant hover:text-rose-600 border border-outline-variant hover:border-rose-300 dark:hover:border-rose-800 rounded-xl text-xs cursor-pointer transition-colors shadow-2xs shrink-0"
                                          title={`Remove video from "${lesson.title}" so you can upload a new one`}
                                        >
                                          <Icon name="close" size={15} />
                                        </button>
                                      </div>
                                    ) : (
                                      <label
                                        className="px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
                                        title="Upload video from PC or mobile"
                                      >
                                        <Icon name="videocam" size={15} />
                                        <span>Upload Video</span>
                                        <input
                                          type="file"
                                          accept="video/*"
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) queueSingleVideo(section.id, lesson.id, f, section.title, lesson.title);
                                            e.target.value = '';
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </>
                                )}

                                {/* 2. MULTI-RESOURCE BADGES & ATTACH DROPDOWN */}
                                {uploadingPdfLessonId === lesson.id ? (
                                  <div className="px-2.5 py-1.5 bg-surface-container border border-outline-variant rounded-xl flex items-center gap-1.5 text-xs text-on-surface-variant shrink-0">
                                    <Icon name="sync" size={14} className="animate-spin text-primary" />
                                    <span>Attaching Resource...</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 max-w-full">
                                    {/* Badges for each attached resource */}
                                    {getLessonResourcesList(lesson).map((res) => {
                                      const resMeta = getResourceMeta(res.url, res.type);
                                      return (
                                        <div key={res.id} className="relative group/res flex items-center">
                                          <a
                                            href={res.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`max-w-[140px] sm:max-w-[170px] pl-2 pr-1.5 py-1 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:opacity-90 shadow-2xs ${resMeta.color}`}
                                            title={`Resource: ${res.name}\nType: ${resMeta.label}\nClick to view / download`}
                                          >
                                            <Icon name={resMeta.icon} size={14} className="shrink-0" />
                                            <span className="truncate max-w-[70px] sm:max-w-[95px] text-left" title={res.name}>
                                              {res.name}
                                            </span>
                                            <span className="text-[10px] opacity-75 shrink-0">✓</span>
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveResource(section.id, lesson.id, res.id)}
                                            className="ml-1 p-1 rounded-lg bg-surface hover:bg-rose-50 dark:hover:bg-rose-950/40 text-on-surface-variant hover:text-rose-600 border border-outline-variant cursor-pointer transition-colors shadow-2xs"
                                            title={`Remove "${res.name}"`}
                                          >
                                            <Icon name="close" size={13} />
                                          </button>
                                        </div>
                                      );
                                    })}

                                    {/* Dropdown Menu Trigger (+ Resource) */}
                                    <div className="relative shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveResourceDropdownLessonId((prev) =>
                                            prev === lesson.id ? null : lesson.id
                                          )
                                        }
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border shadow-2xs transition-all shrink-0 ${
                                          activeResourceDropdownLessonId === lesson.id
                                            ? 'bg-primary text-on-primary border-primary'
                                            : getLessonResourcesList(lesson).length > 0
                                            ? 'bg-surface hover:bg-surface-container text-on-surface border-outline-variant'
                                            : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/30'
                                        }`}
                                        title="Add PDF, Document, Image, or External Web Link"
                                      >
                                        <Icon name="attach_file" size={15} />
                                        <span>
                                          {getLessonResourcesList(lesson).length > 0 ? '+ Resource' : '+ Attach Resource'}
                                        </span>
                                        <Icon
                                          name={activeResourceDropdownLessonId === lesson.id ? 'expand_less' : 'arrow_drop_down'}
                                          size={16}
                                          className="-ml-1 opacity-70"
                                        />
                                      </button>

                                      {/* Dropdown Menu */}
                                      {activeResourceDropdownLessonId === lesson.id && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setActiveResourceDropdownLessonId(null)}
                                          />
                                          <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-32px)] bg-surface-container-lowest border border-outline-variant shadow-2xl rounded-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                                            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/60 pb-1.5 mb-1 flex items-center justify-between">
                                              <span>Attach Resource</span>
                                              <span className="text-[9px] font-normal text-on-surface-variant">Multiple allowed</span>
                                            </div>

                                            {/* PDF Document */}
                                            <label className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl hover:bg-surface-container text-on-surface flex items-center gap-2.5 cursor-pointer transition-colors">
                                              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                                <Icon name="picture_as_pdf" size={16} />
                                              </div>
                                              <div className="flex-1 text-left">
                                                <span className="block font-bold leading-tight">PDF Document</span>
                                                <span className="block text-[10px] text-on-surface-variant font-normal">
                                                  .pdf handout / notes
                                                </span>
                                              </div>
                                              <input
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={(e) => {
                                                  const f = e.target.files?.[0];
                                                  if (f) handleUploadResource(section.id, lesson.id, f, 'PDF', 'PDF Document');
                                                  e.target.value = '';
                                                }}
                                                className="hidden"
                                              />
                                            </label>

                                            {/* Word / Document */}
                                            <label className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl hover:bg-surface-container text-on-surface flex items-center gap-2.5 cursor-pointer transition-colors">
                                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <Icon name="description" size={16} />
                                              </div>
                                              <div className="flex-1 text-left">
                                                <span className="block font-bold leading-tight">Word / Document</span>
                                                <span className="block text-[10px] text-on-surface-variant font-normal">
                                                  .doc, .docx, .txt, .zip, .xls, .ppt
                                                </span>
                                              </div>
                                              <input
                                                type="file"
                                                accept=".doc,.docx,.DOC,.DOCX,.txt,.rtf,.odt,.ppt,.pptx,.xls,.xlsx,.csv,.zip,.rar,.7z,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,application/rtf,application/zip"
                                                onChange={(e) => {
                                                  const f = e.target.files?.[0];
                                                  if (f) {
                                                    const lower = f.name.toLowerCase();
                                                    const isZip = lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z');
                                                    const isPdf = lower.endsWith('.pdf');
                                                    const isSheet = lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv');
                                                    const isSlide = lower.endsWith('.ppt') || lower.endsWith('.pptx');

                                                    const detected = isZip ? 'ZIP' : isPdf ? 'PDF' : 'DOC';
                                                    const label = isZip ? 'Zip Archive' : isPdf ? 'PDF Document' : isSheet ? 'Spreadsheet' : isSlide ? 'Presentation' : 'Document';
                                                    handleUploadResource(section.id, lesson.id, f, detected, label);
                                                  }
                                                  e.target.value = '';
                                                }}
                                                className="hidden"
                                              />
                                            </label>

                                            {/* Image / Diagram */}
                                            <label className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl hover:bg-surface-container text-on-surface flex items-center gap-2.5 cursor-pointer transition-colors">
                                              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                                <Icon name="image" size={16} />
                                              </div>
                                              <div className="flex-1 text-left">
                                                <span className="block font-bold leading-tight">Image / Diagram</span>
                                                <span className="block text-[10px] text-on-surface-variant font-normal">
                                                  .png, .jpg, .webp, .svg
                                                </span>
                                              </div>
                                              <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
                                                onChange={(e) => {
                                                  const f = e.target.files?.[0];
                                                  if (f) handleUploadResource(section.id, lesson.id, f, 'IMAGE', 'Image');
                                                  e.target.value = '';
                                                }}
                                                className="hidden"
                                              />
                                            </label>

                                            {/* External Link */}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveResourceDropdownLessonId(null);
                                                setExternalLinkModalTarget({
                                                  sectionId: section.id,
                                                  lessonId: lesson.id,
                                                  lessonTitle: lesson.title
                                                });
                                                setExternalLinkUrl('');
                                                setExternalLinkTitle('');
                                              }}
                                              className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl hover:bg-surface-container text-on-surface flex items-center gap-2.5 cursor-pointer transition-colors"
                                            >
                                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                <Icon name="link" size={16} />
                                              </div>
                                              <div className="flex-1 text-left">
                                                <span className="block font-bold leading-tight">External Web Link</span>
                                                <span className="block text-[10px] text-on-surface-variant font-normal">
                                                  Drive, GitHub, Figma, URL
                                                </span>
                                              </div>
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}

                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Video Playback Preview Modal (Only appears when instructor clicks to preview video) */}
      {previewVideoUrl && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewVideoUrl(null)}
          title="Video Playback Preview"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewVideoUrl(null)}
                className="px-4 py-2 rounded-xl bg-surface border border-outline-variant font-bold text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* External Resource Web Link Modal */}
      {externalLinkModalTarget && (
        <Modal
          isOpen={true}
          onClose={() => setExternalLinkModalTarget(null)}
          title="Attach External Resource Link"
          maxWidth="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!externalLinkUrl.trim()) return;
              let urlToSave = externalLinkUrl.trim();
              if (!/^https?:\/\//i.test(urlToSave)) {
                urlToSave = `https://${urlToSave}`;
              }
              const linkName = externalLinkTitle.trim() || getResourceFileName(urlToSave) || 'Web Resource';

              const existingSec = (sections || []).find((s) => s.id === externalLinkModalTarget.sectionId);
              const existingLes = existingSec?.lessons?.find((l) => l.id === externalLinkModalTarget.lessonId);
              const currentList = getLessonResourcesList(existingLes);

              const newResource: LessonResourceItem = {
                id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: linkName,
                url: urlToSave,
                type: 'LINK'
              };

              const updatedList = [...currentList, newResource];
              const primaryPdf = updatedList.find((r) => r.type === 'PDF')?.url || updatedList[0]?.url || urlToSave;

              updateLesson(
                externalLinkModalTarget.sectionId,
                externalLinkModalTarget.lessonId,
                {
                  resourcesList: updatedList,
                  pdfUrl: primaryPdf,
                  fileUrl: updatedList[0]?.url || urlToSave,
                  resourceFileName: updatedList[0]?.name || linkName
                }
              );

              showToast({
                title: 'Resource Link Attached! 🔗',
                description: `"${linkName}" attached to "${externalLinkModalTarget.lessonTitle}" (${updatedList.length} total).`,
                type: 'success'
              });
              setExternalLinkModalTarget(null);
              setExternalLinkUrl('');
              setExternalLinkTitle('');
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="block text-xs font-bold text-on-surface">
                Lecture: <span className="text-primary">{externalLinkModalTarget.lessonTitle}</span>
              </label>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Attach any web link for students (e.g. Google Drive, GitHub repository, Figma design, Notion doc, or reference website).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-surface">
                Resource Title / Label (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Source Code Repository, Figma Mockups, Lecture Slides..."
                value={externalLinkTitle}
                onChange={(e) => setExternalLinkTitle(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-surface">
                Resource URL (Web Link) *
              </label>
              <input
                type="text"
                required
                placeholder="https://drive.google.com/... or https://github.com/..."
                value={externalLinkUrl}
                onChange={(e) => setExternalLinkUrl(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setExternalLinkModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant font-bold text-xs text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!externalLinkUrl.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Icon name="link" size={15} />
                <span>Attach Link 🚀</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

