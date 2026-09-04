'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Course, CourseCategory } from '@/types';
import { VideoUploadModal } from '@/components/media/VideoUploadModal';

export default function ContentManagementPage() {
  const { courses, createCourse, deleteCourse, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'courses' | 'videos' | 'certificates'>('courses');
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState<Course | null>(courses[0] || null);

  // New Course Modal State
  const [isNewCourseOpen, setIsNewCourseOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CourseCategory>('Engineering');
  const [newPrice, setNewPrice] = useState('129');
  const [newDesc, setNewDesc] = useState('');
  const [newLevel, setNewLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'ALL_LEVELS'>('INTERMEDIATE');

  // Add Module / Lesson Modal State
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDuration, setLessonDuration] = useState('18:45');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonIsFree, setLessonIsFree] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState('');

  // Video Upload Modal State for Lesson Attachment
  const [activeVideoModalLesson, setActiveVideoModalLesson] = useState<{ id: string; title: string } | null>(null);

  // Video Library Tab State
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');
  const [isGeneralUploadOpen, setIsGeneralUploadOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<any | null>(null);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseForEdit) {
      setSelectedCourseForEdit(courses[0]);
    }
  }, [courses]);

  useEffect(() => {
    if (activeTab === 'videos') {
      fetchMediaAssets();
    }
  }, [activeTab]);

  const fetchMediaAssets = async () => {
    try {
      setIsLoadingMedia(true);
      const res = await fetch('/api/media?type=VIDEO');
      const data = await res.json();
      if (res.ok) {
        setMediaAssets(data.assets || []);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load video library.', type: 'error' });
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createCourse({
        title: newTitle,
        category: newCategory,
        price: Number(newPrice),
        level: newLevel,
        description: newDesc
      });
      setIsNewCourseOpen(false);
      setNewTitle('');
      setNewDesc('');
      setSelectedCourseForEdit(created);
    } catch (err: any) {
      showToast({ title: 'Creation Error', description: err.message, type: 'error' });
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForEdit || !moduleTitle.trim()) return;

    try {
      const res = await fetch(`/api/courses/${selectedCourseForEdit.slug}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: moduleTitle.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add module');

      const currentModules = selectedCourseForEdit.modules || [];
      const newMod = {
        id: data.section.id,
        moduleNumber: currentModules.length + 1,
        title: moduleTitle.trim(),
        lessons: []
      };

      const updated: Course = {
        ...selectedCourseForEdit,
        modules: [...currentModules, newMod]
      };

      setSelectedCourseForEdit(updated);
      setIsAddModuleOpen(false);
      setModuleTitle('');
      showToast({ title: 'Module Added', description: `Added "${moduleTitle}".`, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForEdit || !lessonTitle.trim()) return;

    try {
      const res = await fetch(`/api/courses/${selectedCourseForEdit.slug}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: targetModuleId,
          title: lessonTitle.trim(),
          duration: lessonDuration,
          videoUrl: lessonVideoUrl || null,
          isFree: lessonIsFree
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add lesson');

      const currentModules = (selectedCourseForEdit.modules || []).map((m) => {
        if (m.id === targetModuleId || !targetModuleId) {
          const newLesson = {
            id: data.lesson.id,
            title: lessonTitle.trim(),
            duration: lessonDuration,
            type: 'video' as const,
            completed: false,
            locked: !lessonIsFree,
            videoUrl: data.lesson.videoUrl
          };
          return {
            ...m,
            lessons: [...m.lessons, newLesson]
          };
        }
        return m;
      });

      const updated: Course = {
        ...selectedCourseForEdit,
        modules: currentModules
      };

      setSelectedCourseForEdit(updated);
      setIsAddLessonOpen(false);
      setLessonTitle('');
      setLessonVideoUrl('');
      setLessonIsFree(false);
      showToast({ title: 'Lesson Added', description: `Added "${lessonTitle}".`, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (confirm('Are you sure you want to delete this course and its entire curriculum?')) {
      await deleteCourse(id);
      setSelectedCourseForEdit(courses.find((c) => c.id !== id) || null);
    }
  };

  const handleVideoAttachedToLesson = (lessonId: string, newVideoUrl: string, newDuration?: string) => {
    if (!selectedCourseForEdit) return;

    const currentModules = (selectedCourseForEdit.modules || []).map((m) => ({
      ...m,
      lessons: m.lessons.map((les) =>
        les.id === lessonId
          ? { ...les, videoUrl: newVideoUrl, duration: newDuration || les.duration }
          : les
      )
    }));

    setSelectedCourseForEdit({
      ...selectedCourseForEdit,
      modules: currentModules
    });
  };

  const handleDetachVideo = async (lessonId: string) => {
    if (!confirm('Are you sure you want to remove the video from this lesson?')) return;
    try {
      const res = await fetch(`/api/lessons/${lessonId}/video`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to detach video');

      handleVideoAttachedToLesson(lessonId, '');
      showToast({ title: 'Video Detached', type: 'info' });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const filteredMedia = mediaAssets.filter((a) =>
    a.name.toLowerCase().includes(mediaSearch.toLowerCase()) ||
    (a.provider && a.provider.toLowerCase().includes(mediaSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/60">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mb-1">
            Course &amp; Video Content Studio
          </h2>
          <p className="text-sm text-on-surface-variant">
            Full-stack curriculum builder. Upload direct video files, attach cloud streams, and manage masterclasses.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/courses/builder"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs sm:text-sm font-bold hover:bg-primary-container transition-all shadow-sm cursor-pointer"
          >
            <Icon name="add" size={18} />
            <span>Open Course Builder</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant flex gap-8">
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer ${
            activeTab === 'courses'
              ? 'text-primary border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Curriculum Builder ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer ${
            activeTab === 'videos'
              ? 'text-primary border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Video Library &amp; CDN ({mediaAssets.length})
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`pb-3 text-sm font-bold transition-colors cursor-pointer ${
            activeTab === 'certificates'
              ? 'text-primary border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Certificates
        </button>
      </div>

      {/* Curriculum Builder Tab */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Course Selector List (Span 4) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Your Published Courses
            </h3>
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {courses.map((c) => {
                const isSelected = selectedCourseForEdit?.id === c.id || selectedCourseForEdit?.slug === c.slug;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCourseForEdit(c)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-surface-container-lowest border-outline-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <h4 className="font-bold text-xs sm:text-sm text-on-surface truncate">
                        {c.title}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 font-mono">
                        ${c.price} • {c.category} • {c.modules?.length || 0} modules
                      </p>
                    </div>
                    <Icon
                      name="chevron_right"
                      size={18}
                      className={isSelected ? 'text-primary' : 'text-outline'}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Course Curriculum Editor (Span 8) */}
          <div className="lg:col-span-8">
            {selectedCourseForEdit ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                {/* Course Header & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-outline-variant">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                        {selectedCourseForEdit.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-on-surface">
                        ${selectedCourseForEdit.price}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-on-surface">
                      {selectedCourseForEdit.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/courses/builder?slug=${selectedCourseForEdit.slug || selectedCourseForEdit.id}`}
                      className="px-3.5 py-2 bg-surface text-primary border border-primary/30 text-xs font-bold rounded-xl hover:bg-primary hover:text-on-primary shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Icon name="tune" size={15} />
                      <span>Full Course Builder</span>
                    </Link>
                    <button
                      onClick={() => setIsAddModuleOpen(true)}
                      className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary-container shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Icon name="add" size={16} />
                      <span>Add Module</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(selectedCourseForEdit.id)}
                      className="px-3 py-2 text-error hover:bg-error-container/20 border border-error/20 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      title="Delete Course"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>

                {/* Modules & Lessons Accordion List */}
                <div className="space-y-4">
                  {(selectedCourseForEdit.modules || []).map((mod, modIdx) => (
                    <div
                      key={mod.id}
                      className="border border-outline-variant rounded-2xl overflow-hidden bg-surface"
                    >
                      <div className="p-4 bg-surface-container-low flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary font-mono">
                            Mod {modIdx + 1}:
                          </span>
                          <h4 className="font-bold text-sm text-on-surface">{mod.title}</h4>
                        </div>
                        <button
                          onClick={() => {
                            setTargetModuleId(mod.id);
                            setIsAddLessonOpen(true);
                          }}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Icon name="add" size={14} />
                          <span>Add Lesson</span>
                        </button>
                      </div>

                      <div className="divide-y divide-outline-variant/30 p-2 space-y-1">
                        {mod.lessons.map((les) => (
                          <div
                            key={les.id}
                            className="p-3 rounded-xl hover:bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                name={les.videoUrl ? 'play_circle' : 'videocam_off'}
                                size={18}
                                className={les.videoUrl ? 'text-primary' : 'text-outline'}
                              />
                              <div className="min-w-0">
                                <span className="font-semibold text-on-surface block truncate">
                                  {les.title}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-on-surface-variant text-[11px]">
                                    {les.duration}
                                  </span>
                                  {les.isFree && (
                                    <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">
                                      Free Preview
                                    </span>
                                  )}
                                  {les.videoUrl ? (
                                    <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                      Video Attached
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                      No Video Attached
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <button
                                onClick={() => setActiveVideoModalLesson({ id: les.id, title: les.title })}
                                className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/30 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Icon name="cloud_upload" size={14} />
                                <span>{les.videoUrl ? 'Replace Video' : 'Upload Video'}</span>
                              </button>

                              {les.videoUrl && (
                                <button
                                  onClick={() => handleDetachVideo(les.id)}
                                  title="Detach video from lesson"
                                  className="p-1.5 text-outline hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                >
                                  <Icon name="delete" size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-outline-variant rounded-3xl">
                <p className="text-sm text-on-surface-variant">Select or create a course to manage curriculum.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Library & CDN Assets Tab */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80">
            <div>
              <h3 className="text-lg font-black text-on-surface">Video Asset Library</h3>
              <p className="text-xs text-on-surface-variant">
                Upload direct MP4/WebM videos, connect YouTube/Vimeo streams, or select assets for lessons.
              </p>
            </div>

            <button
              onClick={() => setIsGeneralUploadOpen(true)}
              className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Icon name="cloud_upload" size={18} />
              <span>Upload New Video</span>
            </button>
          </div>

          <div className="relative max-w-md">
            <Icon
              name="search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              type="text"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder="Search video library by title or provider..."
              className="w-full pl-9 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {isLoadingMedia ? (
            <div className="py-16 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
              <Icon name="sync" size={20} className="animate-spin text-primary" />
              <span>Loading media library...</span>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-surface-container-lowest rounded-3xl border border-outline-variant/80">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Icon name="videocam" size={28} />
              </div>
              <p className="text-sm font-bold text-on-surface">No videos in library yet</p>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                Upload video lectures directly from your computer or link external YouTube / Vimeo streams.
              </p>
              <button
                onClick={() => setIsGeneralUploadOpen(true)}
                className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container cursor-pointer"
              >
                Upload Video
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredMedia.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-all group"
                >
                  <div>
                    <div
                      onClick={() => setPreviewAsset(asset)}
                      className="aspect-video w-full bg-slate-950 relative overflow-hidden flex items-center justify-center cursor-pointer select-none"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Icon name="play_arrow" fill size={28} className="ml-0.5" />
                      </div>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-bold">
                        {asset.durationText || '10:00'}
                      </span>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {asset.provider}
                        </span>
                        {asset.sizeBytes > 0 && (
                          <span className="text-[10px] text-outline font-mono">
                            {(asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        )}
                      </div>

                      <p className="font-bold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                        {asset.name}
                      </p>

                      {asset.isUsed ? (
                        <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <Icon name="check_circle" size={12} />
                          <span>Attached to {asset.usedInLessons.length} lesson(s)</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-outline font-medium">Unattached library asset</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-outline-variant/40 flex items-center justify-between mt-2">
                    <button
                      onClick={() => setPreviewAsset(asset)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name="visibility" size={14} />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certificates Tab */}
      {activeTab === 'certificates' && (
        <div className="p-8 bg-surface-container-lowest border border-outline-variant rounded-3xl text-center">
          <Icon name="workspace_premium" size={48} className="text-emerald-600 mx-auto mb-2" />
          <h3 className="font-bold text-base text-on-surface">Accredited Certificate Dispatcher</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto mt-1">
            Certificates are automatically generated and verifiable via SHA-256 code hash.
          </p>
        </div>
      )}

      {/* Modal: Lesson Video Upload & Attach */}
      <VideoUploadModal
        isOpen={!!activeVideoModalLesson}
        onClose={() => setActiveVideoModalLesson(null)}
        lessonId={activeVideoModalLesson?.id}
        courseId={selectedCourseForEdit?.id}
        lessonTitle={activeVideoModalLesson?.title}
        onSuccess={(newVideoUrl, duration) => {
          if (activeVideoModalLesson) {
            handleVideoAttachedToLesson(activeVideoModalLesson.id, newVideoUrl, duration);
          }
        }}
      />

      {/* Modal: General Video Upload to Library */}
      <VideoUploadModal
        isOpen={isGeneralUploadOpen}
        onClose={() => setIsGeneralUploadOpen(false)}
        courseId={selectedCourseForEdit?.id}
        onSuccess={() => fetchMediaAssets()}
      />

      {/* Video Preview Modal */}
      <Modal
        isOpen={!!previewAsset}
        onClose={() => setPreviewAsset(null)}
        maxWidth="lg"
        title={previewAsset?.name || 'Video Preview'}
        subtitle={`Provider: ${previewAsset?.provider} • Duration: ${previewAsset?.durationText}`}
      >
        {previewAsset && (
          <div className="space-y-4">
            <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-xl flex items-center justify-center">
              {previewAsset.url?.includes('youtube.com') || previewAsset.url?.includes('youtu.be') ? (
                <iframe
                  src={
                    previewAsset.url.includes('embed')
                      ? previewAsset.url
                      : `https://www.youtube.com/embed/${previewAsset.url.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1]}?autoplay=1`
                  }
                  title={previewAsset.name}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : previewAsset.url?.includes('vimeo.com') ? (
                <iframe
                  src={`https://player.vimeo.com/video/${previewAsset.url.match(/vimeo\.com\/(\d+)/)?.[1]}?autoplay=1`}
                  title={previewAsset.name}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={previewAsset.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60 text-xs font-mono">
              <span className="font-bold text-on-surface">URL: </span>
              <span className="text-on-surface-variant break-all">{previewAsset.url}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Create Course */}
      <Modal
        isOpen={isNewCourseOpen}
        onClose={() => setIsNewCourseOpen(false)}
        maxWidth="lg"
        title="Create New Master Course"
        subtitle="Set up course curriculum meta details and pricing in the database"
      >
        <form onSubmit={handleCreateCourse} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Course Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Distributed Cloud Architecture with Rust & Go"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as CourseCategory)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
              >
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Data Science">Data Science</option>
                <option value="Business">Business</option>
                <option value="Marketing">Marketing</option>
                <option value="Mobile Dev">Mobile Dev</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Skill Level
              </label>
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value as any)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
              >
                <option value="ALL_LEVELS">All Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="EXPERT">Expert / Advanced</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Price ($ USD)
              </label>
              <input
                type="number"
                required
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-mono font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Course Description &amp; Syllabus Overview
            </label>
            <textarea
              rows={4}
              required
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Provide a comprehensive breakdown of what students will master in this course..."
              className="w-full bg-surface border border-outline-variant rounded-xl p-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/50 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsNewCourseOpen(false)}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-md transition-all cursor-pointer"
            >
              Publish Master Course
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Module */}
      <Modal
        isOpen={isAddModuleOpen}
        onClose={() => setIsAddModuleOpen(false)}
        maxWidth="md"
        title="Add Curriculum Module"
        subtitle={`Add section to "${selectedCourseForEdit?.title}"`}
      >
        <form onSubmit={handleAddModule} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Module Title
            </label>
            <input
              type="text"
              required
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="e.g. Module 2: Concurrency & Distributed Lock Management"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModuleOpen(false)}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container cursor-pointer"
            >
              Add Module
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Lesson */}
      <Modal
        isOpen={isAddLessonOpen}
        onClose={() => setIsAddLessonOpen(false)}
        maxWidth="md"
        title="Add Video Lecture"
        subtitle="Add a lecture to this module"
      >
        <form onSubmit={handleAddLesson} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Lecture Title
            </label>
            <input
              type="text"
              required
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="e.g. 2.1 Implementing Distributed Mutex Locks with Redis"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Duration (mm:ss)
              </label>
              <input
                type="text"
                required
                value={lessonDuration}
                onChange={(e) => setLessonDuration(e.target.value)}
                placeholder="18:45"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={lessonIsFree}
                  onChange={(e) => setLessonIsFree(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-xs font-bold text-on-surface">Free Preview Lecture</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddLessonOpen(false)}
              className="px-4 py-2 text-sm rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container cursor-pointer"
            >
              Add Lesson
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
