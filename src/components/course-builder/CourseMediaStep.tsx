'use client';

import React, { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface CourseMediaProps {
  thumbnail: string;
  banner: string;
  onChange: (field: string, value: string) => void;
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

export const CourseMediaStep: React.FC<CourseMediaProps> = ({ thumbnail, banner, onChange }) => {
  const { showToast } = useApp();
  const thumbnailFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState<'thumbnail' | 'banner' | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'thumbnail' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast({ title: 'File Too Large', description: 'Please select an image under 20MB.', type: 'error' });
      return;
    }

    setIsCompressing(field);
    try {
      // Scale thumbnail to 960x540 (crisp 16:9 ~50KB), banner to 1280x720 (~100KB)
      const compressedBase64 = await compressImageFile(
        file,
        field === 'thumbnail' ? 960 : 1280,
        field === 'thumbnail' ? 540 : 720,
        field === 'thumbnail' ? 0.75 : 0.72
      );

      onChange(field, compressedBase64);
      showToast({
        title: 'Image Ready 🖼️',
        description: `${field === 'thumbnail' ? 'Course thumbnail' : 'Cover banner'} optimized and attached.`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({
        title: 'Upload Error',
        description: err?.message || 'Failed to process image file.',
        type: 'error'
      });
    } finally {
      setIsCompressing(null);
      if (field === 'thumbnail' && thumbnailFileRef.current) {
        thumbnailFileRef.current.value = '';
      }
      if (field === 'banner' && bannerFileRef.current) {
        bannerFileRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
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
          <div className="md:col-span-5 aspect-video bg-surface-container-low rounded-2xl border-2 border-dashed border-outline-variant relative overflow-hidden flex flex-col items-center justify-center text-center p-4">
            {thumbnail ? (
              <>
                <img src={thumbnail} alt="Course Thumbnail Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
              onChange={(e) => handleFileUpload(e, 'thumbnail')}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isCompressing !== null}
                onClick={() => thumbnailFileRef.current?.click()}
                className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name={isCompressing === 'thumbnail' ? 'sync' : 'cloud_upload'} size={16} className={isCompressing === 'thumbnail' ? 'animate-spin' : ''} />
                <span>{isCompressing === 'thumbnail' ? 'Optimizing & Attaching...' : 'Upload from Computer'}</span>
              </button>

              {thumbnail && (
                <button
                  type="button"
                  disabled={isCompressing !== null}
                  onClick={() => onChange('thumbnail', '')}
                  className="px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Clear Thumbnail
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface">
                Or Paste Image CDN / Cloud URL
              </label>
              <input
                type="url"
                value={thumbnail.startsWith('data:') ? '' : thumbnail}
                onChange={(e) => onChange('thumbnail', e.target.value)}
                placeholder="https://images.unsplash.com/photo-... or cloud CDN"
                className="w-full bg-surface border border-outline-variant rounded-2xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Course Header Banner (Cover) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-black text-on-surface">Course Header Cover Banner (Optional)</h3>
          <p className="text-xs text-on-surface-variant">
            Widescreen banner displayed behind the hero header on the student course landing page (21:9 or 1920x600px).
          </p>
        </div>

        <div className="space-y-4">
          <div className="h-36 sm:h-48 w-full bg-surface-container-low rounded-2xl border-2 border-dashed border-outline-variant relative overflow-hidden flex flex-col items-center justify-center text-center p-4">
            {banner ? (
              <>
                <img src={banner} alt="Course Cover Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => bannerFileRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-black font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Change Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange('banner', '')}
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2 select-none">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto">
                  <Icon name="landscape" size={24} />
                </div>
                <p className="text-xs font-bold text-on-surface">No hero banner uploaded</p>
                <p className="text-[11px] text-on-surface-variant">Optional widescreen banner for the course landing hero</p>
              </div>
            )}
          </div>

          <input
            ref={bannerFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => handleFileUpload(e, 'banner')}
            className="hidden"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isCompressing !== null}
              onClick={() => bannerFileRef.current?.click()}
              className="px-4 py-2 bg-surface text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:bg-surface-container shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name={isCompressing === 'banner' ? 'sync' : 'cloud_upload'} size={16} className={isCompressing === 'banner' ? 'animate-spin' : ''} />
              <span>{isCompressing === 'banner' ? 'Optimizing & Attaching...' : 'Upload Banner Image'}</span>
            </button>

            {banner && (
              <button
                type="button"
                disabled={isCompressing !== null}
                onClick={() => onChange('banner', '')}
                className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                Remove Banner
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
