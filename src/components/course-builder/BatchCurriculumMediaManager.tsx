'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import {
  BuilderSection,
  BuilderLesson,
  QuizConfig,
  QuizQuestion
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
  isOpen: boolean;
  onClose: () => void;
  sections: BuilderSection[];
  onChangeSections: (newSections: BuilderSection[]) => void;
  courseTitle?: string;
}

const MAX_CONCURRENT_UPLOADS = 2;

export const BatchCurriculumMediaManager: React.FC<BatchCurriculumMediaManagerProps> = ({
  isOpen,
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

  // Single lecture upload states
  const [uploadingPdfLessonId, setUploadingPdfLessonId] = useState<string | null>(null);

  // Active quiz editor drawer state
  const [activeQuizLessonId, setActiveQuizLessonId] = useState<string | null>(null);

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
          try {
            const data = JSON.parse(xhr.responseText);
            videoUrl = data.videoUrl || data.media?.url || '';
          } catch {
            videoUrl = URL.createObjectURL(task.file);
          }

          if (!videoUrl) {
            videoUrl = URL.createObjectURL(task.file);
          }

          // Update sections state in parent
          updateLesson(task.sectionId, task.lessonId, {
            videoUrl,
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
            title: 'Video Attached 🎉',
            description: `"${task.lessonTitle}" uploaded (${durationText})`,
            type: 'success'
          });
        } else {
          // If server upload failed, fallback to local object URL for preview and show error
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

  // Helper to update a lesson inside sections
  const updateLesson = (
    sectionId: string,
    lessonId: string,
    updates: Partial<BuilderLesson>
  ) => {
    const updated = sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        lessons: sec.lessons.map((les) => {
          if (les.id !== lessonId) return les;
          return { ...les, ...updates };
        })
      };
    });
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
    // Check if task already exists for this lesson
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
      // Cancel previous xhr if running
      const old = tasks[existingIndex];
      if (old.xhr && old.status === 'UPLOADING') {
        old.xhr.abort();
      }
      setTasks((prev) => prev.map((t, idx) => (idx === existingIndex ? newTask : t)));
    } else {
      setTasks((prev) => [...prev, newTask]);
    }

    showToast({
      title: 'Video Queued ⏳',
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

  // Bulk multiple files selection: assigns selected files in sequential order to lessons that don't have video
  const handleBulkSelectVideos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Collect all lessons across modules that don't have videoUrl, or sequential
    const allLessonsList: {
      sectionId: string;
      lessonId: string;
      moduleTitle: string;
      lessonTitle: string;
      hasVideo: boolean;
    }[] = [];

    sections.forEach((s) => {
      s.lessons.forEach((l) => {
        allLessonsList.push({
          sectionId: s.id,
          lessonId: l.id,
          moduleTitle: s.title,
          lessonTitle: l.title,
          hasVideo: !!l.videoUrl
        });
      });
    });

    // Prefer lessons without video first, or sequential
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
        title: `${newTasks.length} Videos Added to Queue! 🚀`,
        description: `Max 2 videos will upload in parallel. Remaining videos will automatically upload next.`,
        type: 'success'
      });
    }

    e.target.value = '';
  };

  // Direct 1-Click PDF file upload for a lesson
  const handleUploadPdf = async (sectionId: string, lessonId: string, file: File) => {
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

      let finalPdfUrl = '';
      if (res.ok) {
        const data = await res.json();
        finalPdfUrl = data.videoUrl || data.media?.url || '';
      } else {
        throw new Error('PDF upload failed on server.');
      }

      if (!finalPdfUrl) {
        finalPdfUrl = URL.createObjectURL(file);
      }

      updateLesson(sectionId, lessonId, {
        pdfUrl: finalPdfUrl
      });

      showToast({
        title: 'Resource Attached 🎉',
        description: `"${file.name}" attached to lesson.`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Upload Error',
        description: err.message || 'Could not upload PDF resource.',
        type: 'error'
      });
    } finally {
      setUploadingPdfLessonId(null);
    }
  };

  // Stats calculation
  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);
  const totalWithVideo = sections.reduce(
    (acc, s) => acc + s.lessons.filter((l) => !!l.videoUrl).length,
    0
  );
  const totalWithPdf = sections.reduce(
    (acc, s) => acc + s.lessons.filter((l) => !!l.pdfUrl).length,
    0
  );
  const activeUploads = tasks.filter((t) => t.status === 'UPLOADING');
  const queuedUploads = tasks.filter((t) => t.status === 'QUEUED');
  const completedUploads = tasks.filter((t) => t.status === 'COMPLETED');

  const toggleSectionCollapse = (sId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sId]: !prev[sId] }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="6xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center shrink-0 shadow-md">
            <Icon name="video_settings" size={22} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              Curriculum Media &amp; Video Queue Manager ⚡
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Auto-filled modules &amp; lectures. Upload videos with 2-parallel concurrent queue, attach PDF notes, and configure quizzes.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Top Control Bar & Live Queue Summary */}
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
                <span>Bulk Select Multiple Videos 🎬</span>
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

                {/* If slot 2 is idle and queue is empty */}
                {activeUploads.length === 1 && queuedUploads.length === 0 && (
                  <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-3 text-xs flex items-center justify-center text-slate-500">
                    Slot 2 Ready (Idle)
                  </div>
                )}
              </div>

              {/* Waiting Queued List Preview */}
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
          <div className="space-y-4">
            {sections.map((section, sIdx) => {
              const isCollapsed = collapsedSections[section.id];
              const secWithVideos = section.lessons.filter((l) => !!l.videoUrl).length;

              return (
                <div
                  key={section.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs overflow-hidden"
                >
                  {/* Module Header Bar */}
                  <div
                    onClick={() => toggleSectionCollapse(section.id)}
                    className="p-4 bg-surface-container-low hover:bg-surface-container border-b border-outline-variant flex items-center justify-between cursor-pointer select-none transition-colors"
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
                            {section.lessons.length} Lectures
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {secWithVideos}/{section.lessons.length} Videos
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
                    <div className="divide-y divide-outline-variant/60">
                      {section.lessons.length === 0 ? (
                        <div className="p-4 text-xs text-on-surface-variant text-center">
                          No lectures in this module yet.
                        </div>
                      ) : (
                        section.lessons.map((lesson, lIdx) => {
                          const task = tasks.find((t) => t.lessonId === lesson.id);
                          const isTaskUploading = task?.status === 'UPLOADING';
                          const isTaskQueued = task?.status === 'QUEUED';
                          const isTaskError = task?.status === 'ERROR';

                          const quizConfig: QuizConfig =
                            typeof lesson.quizData === 'string'
                              ? (() => {
                                  try {
                                    return JSON.parse(lesson.quizData);
                                  } catch {
                                    return { questions: [] };
                                  }
                                })()
                              : lesson.quizData || { questions: [] };
                          const quizQuestionsCount = quizConfig.questions?.length || 0;

                          const isQuizOpen = activeQuizLessonId === lesson.id;

                          return (
                            <div key={lesson.id} className="p-4 hover:bg-surface-container/30 transition-colors">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                {/* Left: Lecture Details */}
                                <div className="space-y-1 max-w-md">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                                      {sIdx + 1}.{lIdx + 1}
                                    </span>
                                    <h4 className="font-bold text-sm text-on-surface">
                                      {lesson.title}
                                    </h4>
                                    <span
                                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
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
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                        FREE PREVIEW
                                      </span>
                                    )}
                                  </div>
                                  {lesson.description && (
                                    <p className="text-xs text-on-surface-variant line-clamp-2">
                                      {lesson.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 text-[11px] text-outline font-medium">
                                    <span className="flex items-center gap-1">
                                      <Icon name="schedule" size={13} />
                                      {lesson.duration || '10:00'}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Action Controls (Video, PDF, Quiz) */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* 1. VIDEO ACTION */}
                                  {isTaskUploading ? (
                                    <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 rounded-xl flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-200">
                                      <Icon name="sync" size={14} className="animate-spin text-blue-600" />
                                      <span>Uploading {task.progress}%</span>
                                      <button
                                        type="button"
                                        onClick={() => cancelTask(task.id)}
                                        className="text-rose-500 hover:text-rose-700 ml-1 font-semibold"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : isTaskQueued ? (
                                    <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                                      <Icon name="hourglass_top" size={14} className="text-amber-600" />
                                      <span>Queued in Slot #{tasks.findIndex((t) => t.id === task.id) + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => cancelTask(task.id)}
                                        className="text-rose-500 hover:text-rose-700 ml-1 font-semibold"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : lesson.videoUrl ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewVideoUrl(lesson.videoUrl || '')}
                                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                        title="Preview uploaded video"
                                      >
                                        <Icon name="play_circle" size={15} />
                                        <span>Video Attached ✓</span>
                                      </button>

                                      <label
                                        className="p-1.5 bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface rounded-xl text-xs cursor-pointer"
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
                                      className="px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
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

                                  {/* 2. RESOURCE / PDF ACTION */}
                                  {uploadingPdfLessonId === lesson.id ? (
                                    <div className="px-2.5 py-1.5 bg-surface-container border border-outline-variant rounded-xl flex items-center gap-1.5 text-xs text-on-surface-variant">
                                      <Icon name="sync" size={14} className="animate-spin text-primary" />
                                      <span>Saving PDF...</span>
                                    </div>
                                  ) : lesson.pdfUrl ? (
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={lesson.pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
                                        title="View attached PDF"
                                      >
                                        <Icon name="picture_as_pdf" size={14} />
                                        <span>PDF ✓</span>
                                      </a>
                                      <label
                                        className="p-1.5 bg-surface hover:bg-surface-container border border-outline-variant rounded-xl text-xs text-on-surface-variant cursor-pointer"
                                        title="Replace PDF"
                                      >
                                        <Icon name="swap_horiz" size={14} />
                                        <input
                                          type="file"
                                          accept=".pdf,.doc,.docx,.txt,.zip"
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleUploadPdf(section.id, lesson.id, f);
                                            e.target.value = '';
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <label
                                      className="px-2.5 py-1.5 bg-surface hover:bg-surface-container text-on-surface border border-outline-variant rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                      title="Attach PDF notes or downloadable resources"
                                    >
                                      <Icon name="attach_file" size={15} />
                                      <span>Resource / PDF</span>
                                      <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt,.zip"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) handleUploadPdf(section.id, lesson.id, f);
                                          e.target.value = '';
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                  )}

                                  {/* 3. QUIZ EDIT ACTION */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveQuizLessonId((prev) => (prev === lesson.id ? null : lesson.id))
                                    }
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${
                                      quizQuestionsCount > 0
                                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                        : 'bg-surface hover:bg-surface-container text-on-surface border-outline-variant shadow-2xs'
                                    }`}
                                    title="Add or edit MCQ questions for this lecture"
                                  >
                                    <Icon name="quiz" size={15} />
                                    <span>
                                      {quizQuestionsCount > 0
                                        ? `Quiz (${quizQuestionsCount} Qs)`
                                        : 'Edit Quiz'}
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {/* INLINE QUICK QUIZ DRAWER */}
                              {isQuizOpen && (
                                <InlineQuickQuizEditor
                                  lesson={lesson}
                                  sectionId={section.id}
                                  onSave={(updatedQuiz) => {
                                    updateLesson(section.id, lesson.id, {
                                      quizData: updatedQuiz,
                                      type: 'QUIZ'
                                    });
                                    setActiveQuizLessonId(null);
                                    showToast({
                                      title: 'Quiz Questions Saved! 📝',
                                      description: `${updatedQuiz.questions.length} questions attached to "${lesson.title}".`,
                                      type: 'success'
                                    });
                                  }}
                                  onCancel={() => setActiveQuizLessonId(null)}
                                />
                              )}
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
      </div>

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewVideoUrl(null)}
          title="Video Playback Preview"
          maxWidth="md"
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
                className="px-4 py-2 rounded-xl bg-surface border border-outline-variant font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

// -------------------------------------------------------------
// Inline Quick Quiz Component for easy quiz configuration right here!
// -------------------------------------------------------------
interface InlineQuickQuizEditorProps {
  lesson: BuilderLesson;
  sectionId: string;
  onSave: (quiz: QuizConfig) => void;
  onCancel: () => void;
}

const InlineQuickQuizEditor: React.FC<InlineQuickQuizEditorProps> = ({
  lesson,
  onSave,
  onCancel
}) => {
  const initialQuiz: QuizConfig =
    typeof lesson.quizData === 'string'
      ? (() => {
          try {
            return JSON.parse(lesson.quizData);
          } catch {
            return { questions: [], passingScore: 70, attemptLimit: 0 };
          }
        })()
      : lesson.quizData || { questions: [], passingScore: 70, attemptLimit: 0 };

  const [questions, setQuestions] = useState<QuizQuestion[]>(
    Array.isArray(initialQuiz.questions) ? initialQuiz.questions : []
  );
  const [passingScore, setPassingScore] = useState<number>(initialQuiz.passingScore || 70);

  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}-${questions.length + 1}`,
      question: '',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      explanation: '',
      points: 1
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQ = (idx: number, field: string, val: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: val } : q))
    );
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = [...q.options];
        newOpts[optIdx] = val;
        return { ...q, options: newOpts };
      })
    );
  };

  const handleRemoveQ = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="mt-3 p-4 bg-surface-container rounded-2xl border border-purple-300 dark:border-purple-900/60 space-y-4 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-sm text-purple-900 dark:text-purple-300 flex items-center gap-2">
            <Icon name="assignment" size={16} />
            Quiz &amp; MCQ Assessment: {lesson.title}
          </h4>
          <p className="text-xs text-on-surface-variant">
            Create questions for this lecture. Students will take this quiz to verify module mastery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <span>Pass Score:</span>
            <input
              type="number"
              min="10"
              max="100"
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value) || 70)}
              className="w-14 px-2 py-1 rounded-lg border border-outline-variant bg-surface text-center font-bold text-xs"
            />
            <span>%</span>
          </label>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="p-4 bg-surface rounded-xl border border-dashed border-outline-variant text-center">
          <p className="text-xs text-on-surface-variant">No questions yet.</p>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="mt-2 px-3 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
          >
            <Icon name="add" size={14} /> Add First MCQ Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, qIdx) => (
            <div
              key={q.id}
              className="p-3 bg-surface rounded-xl border border-outline-variant space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-primary font-mono">Q{qIdx + 1}.</span>
                <input
                  type="text"
                  placeholder="Enter Question text..."
                  value={q.question}
                  onChange={(e) => handleUpdateQ(qIdx, 'question', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container font-medium text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveQ(qIdx)}
                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                  title="Delete question"
                >
                  <Icon name="delete" size={15} />
                </button>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctIndex === oIdx}
                      onChange={() => handleUpdateQ(qIdx, 'correctIndex', oIdx)}
                      className="cursor-pointer text-primary"
                      title="Mark as correct answer"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleUpdateOption(qIdx, oIdx, e.target.value)}
                      className={`flex-1 px-2 py-1 rounded-md border text-xs ${
                        q.correctIndex === oIdx
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 font-bold'
                          : 'border-outline-variant bg-surface'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddQuestion}
            className="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-on-surface hover:bg-surface-container font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
          >
            <Icon name="add" size={14} /> Add Another Question
          </button>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200 dark:border-purple-900/60">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-on-surface text-xs font-bold cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave({ questions, passingScore, attemptLimit: 0 })}
          className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-black shadow-xs cursor-pointer"
        >
          Save Quiz Questions ✓
        </button>
      </div>
    </div>
  );
};
