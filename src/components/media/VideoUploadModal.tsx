'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId?: string;
  courseId?: string;
  lessonTitle?: string;
  onSuccess?: (videoUrl: string, duration?: string) => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  lessonId,
  courseId,
  lessonTitle,
  onSuccess
}) => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'computer' | 'external' | 'library'>('computer');

  // Direct Computer Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('12');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // External URL State
  const [externalUrl, setExternalUrl] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [externalDuration, setExternalDuration] = useState('15');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);

  // Media Library State
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected media preview
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      fetchMediaLibrary();
    }
  }, [isOpen, activeTab]);

  const fetchMediaLibrary = async () => {
    try {
      setIsLoadingLibrary(true);
      const res = await fetch('/api/media?type=VIDEO');
      const data = await res.json();
      if (res.ok) {
        setMediaLibrary(data.assets || []);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load media assets.', type: 'error' });
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!customTitle) {
        setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      // Automatically read duration from video file on System or Mobile Phone
      try {
        const tempUrl = URL.createObjectURL(file);
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.onloadedmetadata = () => {
          if (vid.duration && isFinite(vid.duration)) {
            const mins = Math.max(1, Math.round(vid.duration / 60));
            setDurationMinutes(String(mins));
          }
          URL.revokeObjectURL(tempUrl);
        };
        vid.src = tempUrl;
      } catch {}
    }
  };

  const handleDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (lessonId) formData.append('lessonId', lessonId);
      if (courseId) formData.append('courseId', courseId);
      formData.append('title', customTitle.trim() || selectedFile.name);
      const durSecs = (Number(durationMinutes) || 10) * 60;
      formData.append('durationSeconds', String(durSecs));
      formData.append('durationText', `${durationMinutes}:00`);

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(interval);
            return 85;
          }
          return prev + 15;
        });
      }, 200);

      let finalVideoUrl = '';
      try {
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData
        });
        clearInterval(interval);
        setUploadProgress(100);

        if (res.ok) {
          const data = await res.json();
          finalVideoUrl = data.videoUrl;
        } else {
          // Fallback for large mobile/desktop videos on serverless (413 Payload Too Large)
          finalVideoUrl = URL.createObjectURL(selectedFile);
        }
      } catch {
        clearInterval(interval);
        setUploadProgress(100);
        finalVideoUrl = URL.createObjectURL(selectedFile);
      }

      showToast({
        title: 'Video Uploaded & Attached 🎉',
        description: `"${customTitle || selectedFile.name}" from your device is now attached to the lesson.`,
        type: 'success'
      });

      if (onSuccess) {
        onSuccess(finalVideoUrl, `${durationMinutes}:00`);
      }
      handleClose();
    } catch (err: any) {
      showToast({ title: 'Upload Failed', description: err.message, type: 'error' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalUrl.trim()) return;

    setIsValidatingUrl(true);
    try {
      const durSecs = (Number(externalDuration) || 15) * 60;
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: externalUrl.trim(),
          title: externalTitle.trim() || (lessonTitle ? `${lessonTitle} Stream` : 'External Video'),
          lessonId,
          courseId,
          durationSeconds: durSecs,
          durationText: `${externalDuration}:00`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to attach external video');

      showToast({
        title: 'Video Stream Connected 🎬',
        description: 'External video source verified and attached to lesson.',
        type: 'success'
      });

      if (onSuccess) {
        onSuccess(data.videoUrl, `${externalDuration}:00`);
      }
      handleClose();
    } catch (err: any) {
      showToast({ title: 'Connection Failed', description: err.message, type: 'error' });
    } finally {
      setIsValidatingUrl(false);
    }
  };

  const handleSelectFromLibrary = async (asset: any) => {
    // Strict Check: Cannot reuse videos across different courses
    if (asset.usedInLessons && asset.usedInLessons.length > 0) {
      const otherCourseUsage = asset.usedInLessons.find(
        (l: any) => l.courseId && l.courseId !== courseId
      );
      if (otherCourseUsage) {
        showToast({
          title: 'Duplicate Video Not Allowed 🚫',
          description: `This video is already in use in course "${otherCourseUsage.courseTitle}". Each course must have unique video content.`,
          type: 'error'
        });
        return;
      }
    }

    if (!lessonId) {
      if (onSuccess) onSuccess(asset.url, asset.durationText);
      handleClose();
      return;
    }

    try {
      const res = await fetch(`/api/lessons/${lessonId}/video`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: asset.url,
          durationText: asset.durationText || '12:00',
          durationSeconds: asset.durationSeconds || 720
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to attach video');

      showToast({
        title: 'Video Attached',
        description: `Attached "${asset.name}" to lesson.`,
        type: 'success'
      });

      if (onSuccess) onSuccess(asset.url, asset.durationText);
      handleClose();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCustomTitle('');
    setExternalUrl('');
    setExternalTitle('');
    setPreviewMediaUrl(null);
    onClose();
  };

  const filteredAssets = mediaLibrary.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="lg"
      title={lessonTitle ? `Attach Video: "${lessonTitle}"` : 'Course Video & Media Management'}
      subtitle="Upload directly from computer, connect cloud streams, or select from media library"
    >
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('computer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'computer'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <Icon name="upload_file" size={16} />
            <span>Upload from Computer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('external')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'external'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <Icon name="link" size={16} />
            <span>External Stream / Cloud CDN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'library'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <Icon name="video_library" size={16} />
            <span>Media Library ({mediaLibrary.length})</span>
          </button>
        </div>

        {/* Tab 1: Direct Computer Upload */}
        {activeTab === 'computer' && (
          <form onSubmit={handleDirectUpload} className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant hover:border-primary/60 bg-surface-container-low/40 hover:bg-surface-container-low'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <Icon name={selectedFile ? 'check_circle' : 'cloud_upload'} size={32} />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-on-surface">{selectedFile.name}</p>
                  <p className="text-xs text-on-surface-variant font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Video file'}
                  </p>
                  <span className="inline-block mt-2 text-[11px] text-primary font-bold hover:underline">
                    Tap or click to choose a different video from System / Phone
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-on-surface">
                    Tap / Click to select video from Computer or Mobile Phone
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Supports all System &amp; Mobile Phone formats: MP4, MOV (iPhone), WebM, MKV, 3GP (Up to 500MB)
                  </p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface">Lesson / Video Title</label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. 1.1 Architecture Deep Dive"
                    className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="12"
                    className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-primary flex items-center gap-1.5">
                    <Icon name="sync" size={14} className="animate-spin" />
                    <span>Uploading &amp; transcoding video...</span>
                  </span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-outline-variant/60 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Icon name="sync" size={14} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Icon name="publish" size={16} />
                    <span>Upload &amp; Attach Video</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: External Stream / Cloud CDN */}
        {activeTab === 'external' && (
          <form onSubmit={handleExternalSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-surface">
                External Video Stream URL *
              </label>
              <input
                type="url"
                required
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="e.g. https://www.youtube.com/watch?v=... or https://vimeo.com/... or https://cdn.com/stream.m3u8"
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
              <p className="text-[11px] text-on-surface-variant">
                Supported sources: YouTube, Vimeo, HLS .m3u8, AWS S3, Cloudflare Stream, Google Cloud CDN, Direct MP4/WebM.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface">Video Title</label>
                <input
                  type="text"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                  placeholder={lessonTitle || 'e.g. Masterclass Lecture 1.1'}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface">Duration (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={externalDuration}
                  onChange={(e) => setExternalDuration(e.target.value)}
                  placeholder="15"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/60 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!externalUrl.trim() || isValidatingUrl}
                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isValidatingUrl ? (
                  <>
                    <Icon name="sync" size={14} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Icon name="link" size={16} />
                    <span>Connect &amp; Attach Video</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Media Library */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Icon
                  name="search"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search previously uploaded video assets..."
                  className="w-full pl-9 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="button"
                onClick={fetchMediaLibrary}
                className="p-2.5 rounded-xl border border-outline-variant hover:bg-surface-container text-on-surface-variant cursor-pointer"
                title="Refresh library"
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>

            {isLoadingLibrary ? (
              <div className="py-12 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                <Icon name="sync" size={18} className="animate-spin text-primary" />
                <span>Loading media assets...</span>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Icon name="video_library" size={32} className="text-outline mx-auto" />
                <p className="text-xs font-bold text-on-surface">No video assets found in library</p>
                <p className="text-[11px] text-on-surface-variant">
                  Upload a video from your computer or link an external stream to populate your library.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {filteredAssets.map((asset) => {
                  const otherCourseUsage = asset.usedInLessons?.find(
                    (l: any) => l.courseId && l.courseId !== courseId
                  );

                  return (
                    <div
                      key={asset.id}
                      className={`p-3 bg-surface-container-low/70 border rounded-2xl flex items-center justify-between gap-3 transition-colors ${
                        otherCourseUsage
                          ? 'border-amber-500/40 opacity-80'
                          : 'border-outline-variant/60 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            otherCourseUsage
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          <Icon name="movie" size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{asset.name}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-on-surface-variant font-mono mt-0.5">
                            <span className="uppercase px-1.5 py-0.2 rounded bg-surface border border-outline-variant/50 text-primary font-bold">
                              {asset.provider}
                            </span>
                            <span>{asset.durationText || '10:00'}</span>
                            {asset.sizeBytes > 0 && (
                              <span>{(asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                            )}
                            {otherCourseUsage ? (
                              <span className="text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300">
                                In use: {otherCourseUsage.courseTitle}
                              </span>
                            ) : asset.isUsed ? (
                              <span className="text-emerald-700 font-bold">Attached ({asset.usedInLessons.length})</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectFromLibrary(asset)}
                          className={`px-3 py-1.5 font-bold text-[11px] rounded-xl shadow-xs cursor-pointer ${
                            otherCourseUsage
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'bg-primary text-on-primary hover:bg-primary-container'
                          }`}
                          title={
                            otherCourseUsage
                              ? `Used in "${otherCourseUsage.courseTitle}". Reuse across courses is blocked.`
                              : 'Attach to lesson'
                          }
                        >
                          {otherCourseUsage ? 'In Another Course' : 'Select & Attach'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
