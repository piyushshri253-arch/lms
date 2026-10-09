'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import {
  BuilderSection,
  BuilderLesson
} from './CourseCurriculumStep';

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



  // Video preview modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Module accordion collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Helper to read video duration from client file
  const readVideoDuration = (file: File): Promise<{ durationText: string; durationSeconds: number }> => {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          const secs = vid.duration && isFinite(vid.duration) ? Math.round(vid.duration) : 600;
          const mm = String(Math.floor(secs / 60)).padStart(2, '0');
          const ss = String(secs % 60).padStart(2, '0');
          URL.revokeObjectURL(url);
          resolve({ durationText: `${mm}:${ss}`, durationSeconds: secs });
        };
        vid.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ durationText: '10:00', durationSeconds: 600 });
        };
        vid.src = url;
      } catch {
        resolve({ durationText: '10:00', durationSeconds: 600 });
      }
    });
  };

  // -------------------------------------------------------------
  // Concurrency Engine: Max 2 Parallel Uploads
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    const activeCount = tasks.filter((t) => t.status === 'UPLOADING').length;
    if (activeCount < MAX_CONCURRENT_UPLOADS) {
      const availableSlots = MAX_CONCURRENT_UPLOADS - activeCount;
      const queuedItems = tasks.filter((t) => t.status === 'QUEUED').slice(0, availableSlots);

      if (queuedItems.length > 0) {
        queuedItems.forEach((item) => {
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

    try {
      const { durationText, durationSeconds } = await readVideoDuration(task.file);

      const formData = new FormData();
      formData.append('file', task.file);
      formData.append('lessonId', task.lessonId);
      formData.append('title', task.lessonTitle || task.file.name);
      formData.append('durationSeconds', String(durationSeconds));
      formData.append('durationText', durationText);

      const xhr = new XMLHttpRequest();

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

          // Update sections state in parent
          updateLesson(task.sectionId, task.lessonId, {
            videoUrl,
            videoFileName: fileName || task.file.name,
            duration: durationText,
            durationSeconds,
            type: 'VIDEO'
          });

          // Mark task completed
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id ? { ...t, status: 'COMPLETED', progress: 100 } : t
            )
          );

          showToast({
            title: 'Video Attached ðŸŽ‰',
            description: `"${task.lessonTitle}" uploaded (${durationText})`,
            type: 'success'
          });
        } else {
          let errorMsg = 'Upload failed';
          try {
            const errJson = JSON.parse(xhr.responseText);
            errorMsg = errJson.error || errorMsg;
          } catch {}

          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, status: 'ERROR', errorMessage: errorMsg }
                : t
            )
          );
          showToast({
            title: 'Upload Error',
            description: `${task.lessonTitle}: ${errorMsg}`,
            type: 'error'
          });
        }
      };

      xhr.onerror = () => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: 'ERROR', errorMessage: 'Network connection failed' }
              : t
          )
        );
        showToast({
          title: 'Upload Failed',
          description: `Network error while uploading "${task.lessonTitle}"`,
          type: 'error'
        });
      };

      xhr.open('POST', '/api/media/upload');
      xhr.send(formData);
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: 'ERROR', errorMessage: err.message || 'Processing failed' }
            : t
        )
      );
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

    // Fallback: If section ID changed due to background auto-save, search across all sections for lessonId
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
      title: 'Video Queued â³',
      description: `"${lessonTitle}" added to upload queue (Position #${tasks.filter((t) => t.status === 'QUEUED').length + 1}).`,
      type: 'info'
    });
  };

  // Cancel a queued or active task
  const cancelTask = (taskId: string) => {
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
      (s.lessons || []).forEach((l) => {
        allLessonsList.push({
          sectionId: s.id,
          lessonId: l.id,
          moduleTitle: s.title,
          lessonTitle: l.title,
          hasVideo: !!l.videoUrl
        });
      });
    });

    let targetList = allLessonsList.filter((item) => !item.hasVideo);
    if (targetList.length < files.length) {
      targetList = allLessonsList;
    }

    const newTasks: VideoQueueTask[] = [];
    files.forEach((file, idx) => {
      const targetLesson = targetList[idx];
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
        title: `${newTasks.length} Videos Added to Queue! ðŸš€`,
        description: `Max 2 videos will upload in parallel. Remaining videos will automatically upload next.`,
        type: 'success'
      });
    }

    e.target.value = '';
  };

  // Multi-type resource upload handler (PDF, Document, Image)
  const handleUploadResource = async (
    sectionId: string,
    lessonId: string,
    file: File,
    typeLabel: string = 'Resource'
  ) => {
    if (!file) return;
    setUploadingPdfLessonId(lessonId);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lessonId', lessonId);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      let finalUrl = '';
      if (res.ok) {
        const data = await res.json();
        finalUrl = data.videoUrl || data.media?.url || '';
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${typeLabel} upload failed on server.`);
      }

      if (!finalUrl) {
        finalUrl = URL.createObjectURL(file);
      }

      updateLesson(sectionId, lessonId, {
        pdfUrl: finalUrl,
        fileUrl: finalUrl,
        resourceFileName: file.name
      });

      showToast({
        title: `${typeLabel} Attached! ðŸ“Ž`,
        description: `"${file.name}" attached successfully to lecture.`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Upload Error',
        description: err.message || `Could not upload ${typeLabel}.`,
        type: 'error'
      });
    } finally {
      setUploadingPdfLessonId(null);
      setActiveResourceDropdownLessonId(null);
    }
  };

  // Helper to detect resource category, badge styling, and icon
  const getResourceMeta = (url?: string) => {
    if (!url) return null;
    const clean = url.split('?')[0].toLowerCase();
    if (clean.endsWith('.pdf') || url.includes('application/pdf')) {
      return {
        type: 'PDF',
        label: 'PDF âœ“',
        icon: 'picture_as_pdf',
        color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
      };
    }
    if (
      clean.endsWith('.doc') ||
      clean.endsWith('.docx') ||
      clean.endsWith('.txt') ||
      clean.endsWith('.rtf') ||
      clean.endsWith('.zip')
    ) {
      return {
        type: 'DOC',
        label: 'Doc âœ“',
        icon: 'description',
        color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
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
        label: 'Image âœ“',
        icon: 'image',
        color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
      };
    }
    return {
      type: 'LINK',
      label: 'Link â†—',
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

  // Stats calculation
  const totalLessons = (sections || []).reduce((acc, s) => acc + (s.lessons?.length || 0), 0);
  const totalWithVideo = (sections || []).reduce(
    (acc, s) => acc + (s.lessons || []).filter((l) => !!l.videoUrl).length,
    0
  );
  const totalWithPdf = (sections || []).reduce(
    (acc, s) => acc + (s.lessons || []).filter((l) => !!(l.pdfUrl || l.fileUrl)).length,
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
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <Icon name="video_settings" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-on-surface">
                Curriculum Media &amp; Video Queue Studio âš¡
              </h2>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                Inline Studio
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              Upload lecture videos (2 parallel queue), attach multi-format resources (PDF, Doc, Image, or External Link), and configure quizzes inline.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-center px-4 py-2 bg-surface hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-outline-variant flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            title="Collapse Media Manager"
          >
            <Icon name="expand_less" size={16} />
            <span>Collapse Studio â–²</span>
          </button>
        )}
      </div>

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
              <div className="flex items-center gap-1.5">
                <Icon name="video_library" size={15} className="text-emerald-400" />
                <span>
                  Videos: <strong>{totalWithVideo}</strong> / {totalLessons}
                </span>
              </div>
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

          {/* Bulk File Selection Button */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
              title="Select multiple video files from your device to queue"
            >
              <Icon name="cloud_upload" size={18} />
              <span>Bulk Select Multiple Videos ðŸŽ¬</span>
              <input
                type="file"
                multiple
                accept="video/*"
                onChange={handleBulkSelectVideos}
                className="hidden"
              />
            </label>

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
                Active Video Uploads ({activeUploads.length}/2 Active â€¢ {queuedUploads.length} Waiting in Queue)
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
            const secWithVideos = secLessons.filter((l) => !!l.videoUrl).length;
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-on-surface">
                          {section.title}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant font-bold">
                          {secLessons.length} Lectures
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {secWithVideos}/{secLessons.length} Videos
                        </span>
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
                                  <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 shrink-0">
                                    {sIdx + 1}.{lIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={lesson.title}
                                    onChange={(e) => updateLesson(section.id, lesson.id, { title: e.target.value })}
                                    placeholder={`Lecture ${sIdx + 1}.${lIdx + 1} Title`}
                                    className="font-bold text-sm text-on-surface bg-transparent hover:bg-surface border border-transparent hover:border-outline-variant focus:border-primary focus:bg-surface rounded px-2 py-0.5 focus:outline-none flex-1 min-w-[120px]"
                                  />
                                  <span
                                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                      lesson.type === 'QUIZ'
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                        : lesson.type === 'PDF'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    }`}
                                  >
                                    {lesson.type}
                                  </span>
                                  {lesson.isFree && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                                      FREE PREVIEW
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-[11px] text-outline font-medium ml-1 shrink-0">
                                    <Icon name="schedule" size={13} />
                                    {lesson.duration || '10:00'}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Action Controls (Video, PDF, Quiz) */}
                              <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full justify-start lg:justify-end">
                                {/* 1. VIDEO ACTION */}
                                {isTaskUploading ? (
                                  <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 rounded-xl flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-200 shrink-0">
                                    <Icon name="sync" size={14} className="animate-spin text-blue-600" />
                                    <span>Uploading {task.progress}%</span>
                                    <button
                                      type="button"
                                      onClick={() => cancelTask(task.id)}
                                      className="text-rose-500 hover:text-rose-700 ml-1 font-semibold"
                                    >
                                      âœ•
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
                                      âœ•
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
                                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">âœ“</span>
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

                                {/* 2. RESOURCE DROPDOWN ACTION (PDF, DOC, IMAGE, EXTERNAL LINK) */}
                                {uploadingPdfLessonId === lesson.id ? (
                                  <div className="px-2.5 py-1.5 bg-surface-container border border-outline-variant rounded-xl flex items-center gap-1.5 text-xs text-on-surface-variant shrink-0">
                                    <Icon name="sync" size={14} className="animate-spin text-primary" />
                                    <span>Attaching Resource...</span>
                                  </div>
                                ) : lesson.pdfUrl ? (
                                  <div className="relative flex items-center gap-1 shrink-0 max-w-full">
                                    {(() => {
                                      const resMeta = getResourceMeta(lesson.pdfUrl)!;
                                      const resName = getResourceFileName(lesson.pdfUrl, lesson.resourceFileName);
                                      return (
                                        <>
                                          <a
                                            href={lesson.pdfUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`max-w-[150px] sm:max-w-[190px] px-2 sm:px-2.5 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:opacity-90 shadow-2xs shrink-0 ${resMeta.color}`}
                                            title={`Resource File: ${resName}\nType: ${resMeta.label}\nClick to view / download`}
                                          >
                                            <Icon name={resMeta.icon} size={14} className="shrink-0" />
                                            <span className="truncate max-w-[80px] sm:max-w-[110px] text-left" title={resName}>
                                              {resName || resMeta.label}
                                            </span>
                                            <span className="text-[10px] opacity-75 shrink-0">âœ“</span>
                                          </a>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              setActiveResourceDropdownLessonId((prev) =>
                                                prev === lesson.id ? null : lesson.id
                                              )
                                            }
                                            className="p-1.5 bg-surface hover:bg-surface-container border border-outline-variant rounded-xl text-xs text-on-surface-variant cursor-pointer transition-colors shadow-2xs"
                                            title="Change or replace resource"
                                          >
                                            <Icon name="swap_horiz" size={14} />
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              updateLesson(section.id, lesson.id, {
                                                pdfUrl: '',
                                                fileUrl: '',
                                                resourceFileName: ''
                                              });
                                              showToast({
                                                title: 'Resource Removed',
                                                description: 'Resource detached from lecture.',
                                                type: 'info'
                                              });
                                            }}
                                            className="p-1.5 bg-surface hover:bg-rose-50 dark:hover:bg-rose-950/40 text-on-surface-variant hover:text-rose-600 border border-outline-variant rounded-xl text-xs cursor-pointer transition-colors shadow-2xs"
                                            title="Remove attached resource"
                                          >
                                            <Icon name="close" size={14} />
                                          </button>
                                        </>
                                      );
                                    })()}

                                    {/* REPLACE RESOURCE DROPDOWN MENU */}
                                    {activeResourceDropdownLessonId === lesson.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-40"
                                          onClick={() => setActiveResourceDropdownLessonId(null)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-32px)] bg-surface-container-lowest border border-outline-variant shadow-2xl rounded-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                                          <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/60 pb-1.5 mb-1 flex items-center justify-between">
                                            <span>Replace Resource</span>
                                            <Icon name="tune" size={12} />
                                          </div>

                                          {/* PDF Document */}
                                          <label className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl hover:bg-surface-container text-on-surface flex items-center gap-2.5 cursor-pointer transition-colors">
                                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
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
                                                if (f) handleUploadResource(section.id, lesson.id, f, 'PDF Document');
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
                                                .doc, .docx, .txt, .zip
                                              </span>
                                            </div>
                                            <input
                                              type="file"
                                              accept=".doc,.docx,.txt,.rtf,.zip"
                                              onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleUploadResource(section.id, lesson.id, f, 'Document');
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
                                                if (f) handleUploadResource(section.id, lesson.id, f, 'Image');
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
                                                lessonTitle: lesson.title,
                                                currentUrl: lesson.pdfUrl || lesson.fileUrl || ''
                                              });
                                              setExternalLinkUrl(lesson.pdfUrl || lesson.fileUrl || '');
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

                                          <div className="pt-1.5 mt-1 border-t border-outline-variant/60">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                updateLesson(section.id, lesson.id, {
                                                  pdfUrl: '',
                                                  fileUrl: ''
                                                });
                                                setActiveResourceDropdownLessonId(null);
                                                showToast({
                                                  title: 'Resource Removed',
                                                  description: 'Resource detached from lecture.',
                                                  type: 'info'
                                                });
                                              }}
                                              className="w-full px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                                            >
                                              <Icon name="delete_outline" size={15} />
                                              <span>Remove Current Resource</span>
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveResourceDropdownLessonId((prev) =>
                                          prev === lesson.id ? null : lesson.id
                                        )
                                      }
                                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border shadow-2xs transition-all shrink-0 ${
                                        activeResourceDropdownLessonId === lesson.id
                                          ? 'bg-primary text-on-primary border-primary'
                                          : 'bg-surface hover:bg-surface-container text-on-surface border-outline-variant'
                                      }`}
                                      title="Attach PDF, Document, Image, or External Link"
                                    >
                                      <Icon name="attach_file" size={15} />
                                      <span>Resource</span>
                                      <Icon
                                        name={activeResourceDropdownLessonId === lesson.id ? 'expand_less' : 'arrow_drop_down'}
                                        size={16}
                                        className="-ml-1 opacity-70"
                                      />
                                    </button>

                                    {/* ATTACH RESOURCE DROPDOWN MENU */}
                                    {activeResourceDropdownLessonId === lesson.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-40"
                                          onClick={() => setActiveResourceDropdownLessonId(null)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-32px)] bg-surface-container-lowest border border-outline-variant shadow-2xl rounded-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                                          <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/60 pb-1.5 mb-1 flex items-center justify-between">
                                            <span>Attach Resource</span>
                                            <span className="text-[9px] font-normal text-on-surface-variant">Choose format</span>
                                          </div>

                                          {/* PDF Document */}
                                          <label className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl hover:bg-surface-container text-on-surface flex items-center gap-2.5 cursor-pointer transition-colors">
                                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
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
                                                if (f) handleUploadResource(section.id, lesson.id, f, 'PDF Document');
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
                                                .doc, .docx, .txt, .zip
                                              </span>
                                            </div>
                                            <input
                                              type="file"
                                              accept=".doc,.docx,.txt,.rtf,.zip"
                                              onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleUploadResource(section.id, lesson.id, f, 'Document');
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
                                                if (f) handleUploadResource(section.id, lesson.id, f, 'Image');
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
                                                lessonTitle: lesson.title,
                                                currentUrl: lesson.pdfUrl || lesson.fileUrl || ''
                                              });
                                              setExternalLinkUrl(lesson.pdfUrl || lesson.fileUrl || '');
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
              updateLesson(
                externalLinkModalTarget.sectionId,
                externalLinkModalTarget.lessonId,
                {
                  pdfUrl: urlToSave,
                  fileUrl: urlToSave,
                  resourceFileName: urlToSave.replace(/^https?:\/\//i, '')
                }
              );
              showToast({
                title: 'Resource Link Attached! 🔗',
                description: `External link attached to "${externalLinkModalTarget.lessonTitle}".`,
                type: 'success'
              });
              setExternalLinkModalTarget(null);
              setExternalLinkUrl('');
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
