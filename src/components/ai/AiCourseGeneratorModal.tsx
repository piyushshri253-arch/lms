'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

interface AiCourseGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCurriculum: (curriculum: any) => void;
}

export const AiCourseGeneratorModal: React.FC<AiCourseGeneratorModalProps> = ({
  isOpen,
  onClose,
  onImportCurriculum
}) => {
  const { showToast } = useApp();
  const [topic, setTopic] = useState('Fullstack Next.js & AI SaaS Engineering');
  const [audience, setAudience] = useState('Beginner to Intermediate');
  const [duration, setDuration] = useState('6 weeks');
  const [language, setLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCurriculum, setGeneratedCurriculum] = useState<any>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      showToast({ title: 'Validation Warning', description: 'Course topic is required', type: 'info' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, duration, language })
      });

      const data = await res.json();
      if (res.ok && data.curriculum) {
        setGeneratedCurriculum(data.curriculum);
        showToast({ title: 'Success', description: 'AI Curriculum generated!', type: 'success' });
      } else {
        showToast({ title: 'Generation Failed', description: data.error || 'Failed to generate curriculum', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', description: 'Network error during generation', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (generatedCurriculum) {
      onImportCurriculum(generatedCurriculum);
      showToast({ title: 'Imported', description: 'Curriculum imported into course builder!', type: 'success' });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ AI Course & Syllabus Generator" maxWidth="xl">
      <div className="space-y-4 text-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Course Topic / Subject</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Master React Hooks and State Machines"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Target Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full bg-surface-container border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="All Levels">All Levels</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-surface-container border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Hinglish">Hinglish</option>
            </select>
          </div>
        </div>

        {generatedCurriculum && (
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 max-h-64 overflow-y-auto space-y-3 custom-scrollbar">
            <div className="border-b border-white/10 pb-2">
              <h4 className="font-bold text-sm text-primary">{generatedCurriculum.title}</h4>
              <p className="text-xs text-white/60">{generatedCurriculum.description}</p>
            </div>
            <div className="space-y-2">
              {generatedCurriculum.sections?.map((sec: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <div className="font-bold text-xs text-white/90 mb-1.5">{sec.title}</div>
                  <div className="space-y-1 pl-2 border-l border-primary/30">
                    {sec.lessons?.map((les: any, lIdx: number) => (
                      <div key={lIdx} className="text-[11px] text-white/60 flex items-center justify-between">
                        <span>• {les.title}</span>
                        <span className="text-[10px] text-white/40">{les.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-white/70 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-semibold border border-white/20"
          >
            {isLoading ? <Icon name="loader" size={14} className="animate-spin" /> : <Icon name="sparkles" size={14} />}
            <span>{generatedCurriculum ? 'Regenerate' : 'Generate Curriculum'}</span>
          </button>
          {generatedCurriculum && (
            <button
              type="button"
              onClick={handleImport}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-lg shadow-primary/20"
            >
              <Icon name="check" size={14} />
              <span>Import into Builder</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};