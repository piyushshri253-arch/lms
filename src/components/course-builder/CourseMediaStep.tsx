'use client';

import React, { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface CourseMediaProps {
  thumbnail: string;
  banner?: string;
  onChange: (field: string, value: string) => void;
  isMinorEditMode?: boolean;
}

// Client-side canvas compression to keep base64 payload under 200KB and avoid Vercel 413
async function compressImageFile(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      if (file.size > 800 * 1024) {
        reject(new Error('SVG file is too large. Please select a vector under 800KB.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas processing not supported in your browser.'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        let compressed = canvas.toDataURL('image/jpeg', quality);
        // If image is still larger than 400KB, downscale quality to keep it featherlight
        if (compressed.length > 500 * 1024) {
          compressed = canvas.toDataURL('image/jpeg', 0.6);
        }
        resolve(compressed);
      } catch (err: any) {
        reject(new Error('Failed to encode image: ' + (err.message || 'Unknown error')));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image. Please select a valid JPG, PNG, or WebP file.'));
    };

    img.src = objectUrl;
  });
}

export const CourseMediaStep: React.FC<CourseMediaProps> = ({
  thumbnail,
  onChange,
  isMinorEditMode = false
}) => {
  const { showToast } = useApp();
  const thumbnailFileRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isMinorEditMode) {
      showToast({
        title: 'Thumbnail Locked 🔒',
        description: 'Course thumbnail cannot be changed during Quick Minor Edit.',
        type: 'error'
      });
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast({ title: 'File Too Large', description: 'Please select an image under 20MB.', type: 'error' });
      return;
    }

    setIsCompressing(true);
    try {
      // Scale thumbnail to 960x540 (crisp 16:9 ~50KB)
      const compressedBase64 = await compressImageFile(file, 960, 540, 0.75);

      onChange('thumbnail', compressedBase64);
      showToast({
        title: 'Image Ready 🖼️',
        description: 'Course thumbnail optimized and attached.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Upload Error',
        description: err?.message || 'Failed to process image file.',
        type: 'error'
      });
    } finally {
      setIsCompressing(false);
      if (thumbnailFileRef.current) {
        thumbnailFileRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Quick Minor Edit Mode Banner */}
      {isMinorEditMode && (
        <div className="border-2 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/20 text-blue-700 dark:text-blue-400">
            <Icon name="lock" size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <span>Thumbnail &amp; Media Locked (Quick Minor Edit)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500 text-white">Protected</span>
            </h4>
            <p className="text-xs text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
              In Quick Minor Edit mode, course thumbnail and media are permanently locked to preserve existing student visual branding. To replace media or rebrand, please use &quot;Update Version&quot; from My Courses.
            </p>
          </div>
        </div>
      )}

      {/* 1. Course Thumbnail */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-black text-on-surface">Course Thumbnail</h3>
          <p className="text-xs text-on-surface-variant">
            Displayed on the explore page, course catalog, search results, and student dashboard. Recommended 16:9 ratio (1280x720px).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Thumbnail Preview Canvas */}
          <div className="md:col-span-5 aspect-video bg-neutral-950 rounded-2xl border-2 border-dashed border-outline-variant relative overflow-hidden flex flex-col items-center justify-center text-center p-0">
            {thumbnail ? (
              <>
                <img
                  src={thumbnail}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none"
                />
                <img
                  src={thumbnail}
                  alt="Course Thumbnail Preview"
                  className="relative z-10 w-full h-full object-contain"
                />
                {!isMinorEditMode && (
                  <div className="absolute inset-0 z-20 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => thumbnailFileRef.current?.click()}
                      className="px-3 py-1.5 bg-white text-black font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange('thumbnail', '')}
                      className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {isMinorEditMode && (
                  <div className="absolute bottom-2.5 right-2.5 z-20 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 border border-white/20 select-none">
                    <Icon name="lock" size={12} />
                    <span>Locked</span>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2 select-none">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Icon name="image" size={24} />
                </div>
                <p className="text-xs font-bold text-on-surface">No thumbnail uploaded</p>
                <p className="text-[11px] text-on-surface-variant">Upload an image to represent this masterclass</p>
              </div>
            )}
          </div>

          {/* Upload Controls & URL input */}
          <div className="md:col-span-7 space-y-4">
            <input
              ref={thumbnailFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isMinorEditMode}
            />

            <div className="flex flex-wrap items-center gap-2.5">
              {isMinorEditMode ? (
                <button
                  type="button"
                  disabled={true}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-not-allowed shadow-2xs opacity-80"
                  title="Thumbnail cannot be modified in Quick Minor Edit mode"
                >
                  <Icon name="lock" size={16} className="text-slate-400" />
                  <span>Thumbnail Locked (Quick Edit)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => thumbnailFileRef.current?.click()}
                  className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Icon name={isCompressing ? 'sync' : 'cloud_upload'} size={16} className={isCompressing ? 'animate-spin' : ''} />
                  <span>{isCompressing ? 'Optimizing & Attaching...' : 'Upload from Device (PC / Phone)'}</span>
                </button>
              )}

              {thumbnail && !isMinorEditMode && (
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => onChange('thumbnail', '')}
                  className="px-4 py-2.5 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Clear Thumbnail
                </button>
              )}
            </div>

            <p className="text-[11px] text-on-surface-variant">
              {isMinorEditMode
                ? 'Course thumbnail is protected from edits during quick minor text fixes.'
                : 'Upload directly from your PC, laptop, or mobile phone. Supports JPG, PNG, WebP, or SVG (Max 20MB). Automatically optimized for high-speed page loading.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
