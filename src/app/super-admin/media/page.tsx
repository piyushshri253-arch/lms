'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { VideoUploadModal } from '@/components/media/VideoUploadModal';

export default function SuperAdminMediaPage() {
  const { showToast } = useApp();
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<any | null>(null);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/media?type=${filterType}`);
      if (res.ok) {
        const d = await res.json();
        setAssets(d.assets || []);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load media assets.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [filterType]);

  const handleDelete = async (id: string, isUsed: boolean) => {
    if (isUsed) {
      if (!confirm('This asset is currently attached to one or more course lessons. Deleting it will detach the media. Proceed?')) {
        return;
      }
    } else if (!confirm('Are you sure you want to permanently delete this media asset?')) {
      return;
    }

    try {
      const res = await fetch(`/api/media?id=${id}&force=true`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete asset');

      showToast({ title: 'Asset Deleted', description: data.message, type: 'info' });
      await fetchMedia();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.provider && a.provider.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Media &amp; Video Asset Engine</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Curriculum Media Library &amp; Video Streams
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage uploaded lecture videos, external streams (YouTube, Vimeo, HLS), thumbnails, and course assets.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-5 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Icon name="cloud_upload" size={18} />
          <span>Upload / Connect Video</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/70">
        <div className="relative w-full sm:w-80">
          <Icon
            name="search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by asset title or provider..."
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'VIDEO', 'IMAGE', 'PDF'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {t === 'ALL' ? 'All Formats' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Media Assets Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
          <Icon name="sync" size={20} className="animate-spin text-primary" />
          <span>Loading media assets...</span>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-surface-container-lowest rounded-3xl border border-outline-variant/80">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Icon name="video_library" size={28} />
          </div>
          <p className="text-sm font-bold text-on-surface">No media assets found</p>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Click &ldquo;Upload / Connect Video&rdquo; above to add videos from your computer, YouTube, Vimeo, or cloud streams.
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs cursor-pointer"
          >
            Upload First Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredAssets.map((a) => (
            <div
              key={a.id}
              className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-all group"
            >
              <div>
                <div
                  onClick={() => setPreviewAsset(a)}
                  className="aspect-video w-full bg-slate-950 relative overflow-hidden flex items-center justify-center cursor-pointer group/vid select-none"
                >
                  {a.type === 'IMAGE' ? (
                    a.url ? (
                      <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="image" size={32} className="text-outline" />
                    )
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                        <Icon name="play_arrow" fill size={28} className="ml-0.5" />
                      </div>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-bold">
                        {a.durationText || '10:00'}
                      </span>
                    </>
                  )}
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {a.provider || a.type}
                    </span>
                    {a.sizeBytes > 0 && (
                      <span className="text-[10px] text-outline font-mono">
                        {(a.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                    {a.name}
                  </p>

                  {a.isUsed ? (
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Icon name="check_circle" size={12} />
                      <span>Attached to {a.usedInLessons.length} lesson(s)</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-outline font-medium">Unattached library asset</p>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-outline-variant/40 flex items-center justify-between mt-2">
                <button
                  onClick={() => setPreviewAsset(a)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="visibility" size={14} />
                  <span>Preview</span>
                </button>

                <button
                  onClick={() => handleDelete(a.id, a.isUsed)}
                  className="text-outline hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Media Asset"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Multi-Source Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => fetchMedia()}
      />

      {/* Video Preview Modal */}
      <Modal
        isOpen={!!previewAsset}
        onClose={() => setPreviewAsset(null)}
        maxWidth="lg"
        title={previewAsset?.name || 'Media Asset Preview'}
        subtitle={`Provider: ${previewAsset?.provider || 'Stream'} • Format: ${previewAsset?.format || 'mp4'}`}
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

            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60 text-xs space-y-1 font-mono">
              <p className="text-on-surface font-bold">Stream Reference URL:</p>
              <p className="text-on-surface-variant break-all select-all">{previewAsset.url}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
