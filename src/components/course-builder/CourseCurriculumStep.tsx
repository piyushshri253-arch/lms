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
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const handleImportAiCurriculum = (curriculum: any) => {
    if (!curriculum.sections) return;
    const newSections: BuilderSection[] = curriculum.sections.map((s: any, sIdx: number) => ({
      id: `sec-${Date.now()}-${sIdx}`,
      title: s.title || `Module ${sIdx + 1}`,
      order: sections.length + sIdx,
      lessons: (s.lessons || []).map((l: any, lIdx: number) => ({
        id: `les-${Date.now()}-${sIdx}-${lIdx}`,
        title: l.title || `Lesson ${lIdx + 1}`,
        type: l.type || 'VIDEO',
        description: l.description || '',
        duration: l.duration || '10 mins',
        order: lIdx,
        isFree: lIdx === 0
      }))
    }));
    onChange([...sections, ...newSections]);
  };

  // Lesson modal state
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ sectionId: string; lesson: BuilderLesson } | null>(null);

  // Video Upload Modal State
  const [videoModalLesson, setVideoModalLesson] = useState<{ sectionId: string; lessonId: string; title: string } | null>(null);

  // Quiz Editor State inside Editing Lesson
  const [activeLessonTab, setActiveLessonTab] = useState<'content' | 'settings'>('content');

  // Add Section Handler
  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    if (editingSectionId) {
      const updated = sections.map((s) =>
        s.id === editingSectionId ? { ...s, title: newSectionTitle.trim() } : s
      );
      onChange(updated);
      setEditingSectionId(null);
      showToast({ title: 'Section Renamed', type: 'info' });
    } else {
      const newSec: BuilderSection = {
        id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: newSectionTitle.trim(),
        order: sections.length + 1,
        lessons: []
      };
      onChange([...sections, newSec]);
      showToast({ title: 'Section Added', type: 'success' });
    }

    setNewSectionTitle('');
    setIsAddSectionOpen(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section and all its lessons?')) return;
    onChange(sections.filter((s) => s.id !== sectionId));
    showToast({ title: 'Section Removed', type: 'info' });
  };

  // Add / Create Lesson
  const handleCreateLesson = (sectionId: string, type: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'DOWNLOAD') => {
    const targetSec = sections.find((s) => s.id === sectionId);
    if (!targetSec) return;

    const order = targetSec.lessons.length + 1;
    const defaultTitle =
      type === 'VIDEO'
        ? `Lesson ${order}: New Video Lecture`
        : type === 'TEXT'
        ? `Article ${order}: Core Concepts Guide`
        : type === 'PDF'
        ? `Resource ${order}: PDF Reference Guide`
        : type === 'QUIZ'
        ? `Quiz ${order}: Module Knowledge Check`
        : `Download ${order}: Source Code & Starter Kit`;

    let defaultQuiz: QuizConfig | undefined;
    if (type === 'QUIZ') {
      defaultQuiz = {
        passingScore: 70,
        attemptLimit: 0,
        questions: [
          {
            id: `q-${Date.now()}`,
            question: 'What is the primary architectural advantage of microservices?',
            options: [
              'Independent deployment and modular scalability',
              'Single monolithic shared memory address space',
              'Zero network latency across all transactions',
              'Reduced code repository count'
            ],
            correctIndex: 0,
            explanation: 'Microservices allow teams to deploy, scale, and maintain discrete business capabilities independently.',
            points: 1
          }
        ]
      };
    }

    const newLesson: BuilderLesson = {
      id: `les-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: defaultTitle,
      type,
      duration: type === 'VIDEO' ? '12:00' : '05:00',
      durationSeconds: type === 'VIDEO' ? 720 : 300,
      content: type === 'TEXT' ? '# Lesson Overview\n\nExplain core architectural concepts here.' : undefined,
      quizData: defaultQuiz,
      isFree: order === 1,
      isPublished: true,
      order
    };

    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
    );

    onChange(updated);
    setEditingLesson({ sectionId, lesson: newLesson });
    showToast({ title: `${type} Lesson Created`, description: `Configure ${defaultTitle}.`, type: 'success' });
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
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    const updated = sections.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          lessons: s.lessons.filter((l) => l.id !== lessonId)
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
          <h3 className="text-lg font-black text-on-surface">Curriculum &amp; Syllabus Builder</h3>
          <p className="text-xs text-on-surface-variant">
            Structure modules, add video lectures, rich text guides, PDF cheatsheets, and interactive quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
              setIsAddSectionOpen(true);
            }}
            className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
          >
            <Icon name="add" size={16} />
            <span>Add Section / Module</span>
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
            Start building your course by adding your first module section (e.g. &ldquo;Module 1: Getting Started&rdquo;).
          </p>
          <button
            type="button"
            onClick={() => {
              setNewSectionTitle('Module 1: Architecture Overview & Setup');
              setIsAddSectionOpen(true);
            }}
            className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs cursor-pointer"
          >
            Create First Section
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section, sIdx) => (
            <div
              key={section.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-3xl overflow-hidden shadow-xs"
            >
              {/* Section Header */}
              <div className="p-4 sm:p-5 bg-surface-container-low/60 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={sIdx === 0}
                      onClick={() => moveSection(sIdx, 'up')}
                      className="p-1 text-outline hover:text-primary disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <Icon name="arrow_upward" size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={sIdx === sections.length - 1}
                      onClick={() => moveSection(sIdx, 'down')}
                      className="p-1 text-outline hover:text-primary disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <Icon name="arrow_downward" size={16} />
                    </button>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold text-[10px] uppercase">
                    Section {sIdx + 1}
                  </span>

                  <h4 className="font-extrabold text-sm text-on-surface truncate">
                    {section.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Add Lesson Dropdown Button */}
                  <div className="flex items-center gap-1 bg-surface border border-outline-variant rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(section.id, 'VIDEO')}
                      className="px-2.5 py-1 text-[11px] font-bold text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-1 cursor-pointer"
                      title="Add Video Lecture"
                    >
                      <Icon name="movie" size={14} className="text-primary" />
                      <span>+ Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(section.id, 'TEXT')}
                      className="px-2.5 py-1 text-[11px] font-bold text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-1 cursor-pointer"
                      title="Add Text Guide"
                    >
                      <Icon name="article" size={14} className="text-secondary" />
                      <span>+ Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(section.id, 'PDF')}
                      className="px-2.5 py-1 text-[11px] font-bold text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-1 cursor-pointer"
                      title="Add PDF Resource"
                    >
                      <Icon name="picture_as_pdf" size={14} className="text-rose-600" />
                      <span>+ PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateLesson(section.id, 'QUIZ')}
                      className="px-2.5 py-1 text-[11px] font-bold text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-1 cursor-pointer"
                      title="Add Quiz"
                    >
                      <Icon name="quiz" size={14} className="text-amber-600" />
                      <span>+ Quiz</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingSectionId(section.id);
                      setNewSectionTitle(section.title);
                      setIsAddSectionOpen(true);
                    }}
                    className="p-1.5 text-outline hover:text-primary rounded-lg hover:bg-surface-container cursor-pointer"
                    title="Rename section"
                  >
                    <Icon name="edit" size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSection(section.id)}
                    className="p-1.5 text-outline hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="Delete section"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>

              {/* Lessons in Section */}
              <div className="divide-y divide-outline-variant/30 p-3 space-y-2">
                {section.lessons.length === 0 ? (
                  <div className="py-6 text-center text-xs text-on-surface-variant">
                    No lessons in this section. Click &ldquo;+ Video&rdquo;, &ldquo;+ Text&rdquo;, &ldquo;+ PDF&rdquo;, or &ldquo;+ Quiz&rdquo; above to add.
                  </div>
                ) : (
                  section.lessons.map((les, lIdx) => {
                    const isVideo = les.type === 'VIDEO';
                    const isText = les.type === 'TEXT';
                    const isPdf = les.type === 'PDF';
                    const isQuiz = les.type === 'QUIZ';

                    return (
                      <div
                        key={les.id}
                        className="p-3.5 bg-surface rounded-2xl border border-outline-variant/40 hover:border-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={lIdx === 0}
                              onClick={() => moveLesson(section.id, lIdx, 'up')}
                              className="text-outline hover:text-primary disabled:opacity-30 cursor-pointer"
                              title="Move up"
                            >
                              <Icon name="arrow_upward" size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={lIdx === section.lessons.length - 1}
                              onClick={() => moveLesson(section.id, lIdx, 'down')}
                              className="text-outline hover:text-primary disabled:opacity-30 cursor-pointer"
                              title="Move down"
                            >
                              <Icon name="arrow_downward" size={14} />
                            </button>
                          </div>

                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isVideo
                                ? 'bg-primary/10 text-primary'
                                : isText
                                ? 'bg-secondary/10 text-secondary'
                                : isPdf
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            <Icon
                              name={isVideo ? 'movie' : isText ? 'article' : isPdf ? 'picture_as_pdf' : 'quiz'}
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-on-surface truncate">{les.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono">
                              <span className="uppercase px-1.5 py-0.2 rounded bg-surface-container font-bold text-on-surface-variant">
                                {les.type}
                              </span>
                              <span className="text-on-surface-variant">{les.duration || '10:00'}</span>
                              {les.isFree && (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-200">
                                  Free Preview
                                </span>
                              )}
                              {isVideo && (
                                <span className={les.videoUrl ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                                  {les.videoUrl ? '● Video Ready' : '○ Video Pending'}
                                </span>
                              )}
                              {isText && (
                                <span className={les.content ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                                  {les.content ? '● Article Ready' : '○ Empty Content'}
                                </span>
                              )}
                              {isPdf && (
                                <span className={les.pdfUrl ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                                  {les.pdfUrl ? '● PDF Attached' : '○ PDF Pending'}
                                </span>
                              )}
                              {isQuiz && (
                                <span className="text-amber-700 font-bold">
                                  {typeof les.quizData === 'object'
                                    ? `● ${les.quizData.questions?.length || 0} Questions`
                                    : '● Quiz Configured'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {isVideo && (
                            <button
                              type="button"
                              onClick={() =>
                                setVideoModalLesson({
                                  sectionId: section.id,
                                  lessonId: les.id,
                                  title: les.title
                                })
                              }
                              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Icon name="cloud_upload" size={14} />
                              <span>{les.videoUrl ? 'Replace Video' : 'Upload Video'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingLesson({ sectionId: section.id, lesson: les })}
                            className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Icon name="tune" size={14} />
                            <span>Edit Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(section.id, les.id)}
                            className="p-1.5 text-outline hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Delete lesson"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Rename Section Modal */}
      <Modal
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        maxWidth="md"
        title={editingSectionId ? 'Rename Curriculum Section' : 'Add Curriculum Section'}
        subtitle="Organize lectures into logical modules and syllabus topics"
      >
        <form onSubmit={handleAddSection} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Section Title *
            </label>
            <input
              type="text"
              required
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="e.g. Module 2: Concurrency Patterns & Distributed Locks"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
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
              {editingSectionId ? 'Save Section Name' : 'Create Section'}
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
      {videoModalLesson && (
        <VideoUploadModal
          isOpen={true}
          onClose={() => setVideoModalLesson(null)}
          lessonId={videoModalLesson.lessonId}
          lessonTitle={videoModalLesson.title}
          onSuccess={(videoUrl, duration) => {
            const updatedSections = sections.map((s) => {
              if (s.id === videoModalLesson.sectionId) {
                return {
                  ...s,
                  lessons: s.lessons.map((l) =>
                    l.id === videoModalLesson.lessonId
                      ? { ...l, videoUrl, duration: duration || l.duration }
                      : l
                  )
                };
              }
              return s;
            });
            onChange(updatedSections);
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
            <p className="text-[11px] text-on-surface-variant">
              You can also click &ldquo;Upload Video&rdquo; on the curriculum item to upload direct MP4 files from your computer.
            </p>
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
              placeholder="# Introduction to Distributed Transactions&#10;&#10;In this article we break down the two-phase commit protocol..."
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

                  {/* 4 Multiple Choice Options */}
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

                  {/* Explanation */}
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
