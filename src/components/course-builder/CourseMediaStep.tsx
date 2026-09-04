'use client';

import React, { useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface CourseMediaProps {
  thumbnail: string;
  banner: string;
  onChange: (field: string, value: string) => void;
}

export const CourseMediaStep: React.FC<CourseMediaProps> = ({ thumbnail, banner, onChange }) => {
  const { showToast } = useApp();
  const thumbnailFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'thumbnail' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast({ title: 'File Too Large', description: 'Please select an image under 5MB.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onChange(field, base64);
      showToast({ title: 'Image Uploaded', description: `${field === 'thumbnail' ? 'Course thumbnail' : 'Cover banner'} updated.`, type: 'success' });
    };
    reader.readAsDataURL(file);
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
                onClick={() => thumbnailFileRef.current?.click()}
                className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Icon name="cloud_upload" size={16} />
                <span>Upload from Computer</span>
              </button>

              {thumbnail && (
                <button
                  type="button"
                  onClick={() => onChange('thumbnail', '')}
                  className="px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl cursor-pointer"
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
              onClick={() => bannerFileRef.current?.click()}
              className="px-4 py-2 bg-surface text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:bg-surface-container shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Icon name="cloud_upload" size={16} />
              <span>Upload Banner Image</span>
            </button>

            {banner && (
              <button
                type="button"
                onClick={() => onChange('banner', '')}
                className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container font-bold text-xs rounded-xl cursor-pointer"
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
