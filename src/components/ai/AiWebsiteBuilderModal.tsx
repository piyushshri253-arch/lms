'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

interface AiWebsiteBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyGeneratedSite: (siteData: any) => void;
}

export const AiWebsiteBuilderModal: React.FC<AiWebsiteBuilderModalProps> = ({
  isOpen,
  onClose,
  onApplyGeneratedSite
}) => {
  const { showToast } = useApp();
  const [prompt, setPrompt] = useState('Create a modern, high-converting website for our UI/UX and Fullstack Coding Academy. Include hero section with badges, benefits, featured courses, testimonials, pricing, and FAQ.');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast({ title: 'Validation Warning', description: 'Please describe your desired website', type: 'info' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/website/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, applyDirectly: false })
      });

      const data = await res.json();
      if (res.ok && data.website) {
        setGeneratedResult(data.website);
        showToast({ title: 'Success', description: 'Website structure generated with AI!', type: 'success' });
      } else {
        showToast({ title: 'Generation Failed', description: data.error || 'Failed to generate website', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', description: 'Network error during generation', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedResult) {
      onApplyGeneratedSite(generatedResult);
      showToast({ title: 'Applied', description: 'AI Website applied to draft editor!', type: 'success' });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ AI Website Builder & Designer" maxWidth="xl">
      <div className="space-y-5 text-white">
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-2">
            Describe your Academy & Website Vision
          </label>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Create a luxury, dark-themed website for a Data Science and AI Academy..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            'Luxury Dark UI/UX Design Academy',
            'Fullstack Web & Mobile Bootcamp',
            'Corporate Leadership & Executive Training',
            'Digital Marketing & Growth Masterclasses'
          ].map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt('Create a modern website for ' + p + '. Include hero, course highlights, social proof ratings, instructor bios, and FAQ.')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-primary/20 text-white/70 hover:text-white border border-white/10 transition-colors"
            >
              + {p}
            </button>
          ))}
        </div>

        {generatedResult && (
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <h4 className="font-bold text-sm text-primary">{generatedResult.title}</h4>
                <p className="text-xs text-white/60">{generatedResult.description}</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                {generatedResult.sections?.length || 0} Sections Generated
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {generatedResult.sections?.map((sec: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-1">
                  <span className="font-semibold text-white/90">{sec.type}</span>
                  <span className="text-[11px] text-white/50 truncate">{sec.title || sec.subtitle || 'Configured'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-white/70 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-semibold border border-white/20 transition-all"
          >
            {isLoading ? <Icon name="loader" size={14} className="animate-spin" /> : <Icon name="sparkles" size={14} />}
            <span>{generatedResult ? 'Regenerate' : 'Generate Website'}</span>
          </button>
          {generatedResult && (
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all"
            >
              <Icon name="check" size={14} />
              <span>Apply to Visual Builder</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};