'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';

interface AiLessonTutorDrawerProps {
  lessonId?: string;
  lessonTitle?: string;
  courseSlug?: string;
}

export const AiLessonTutorDrawer: React.FC<AiLessonTutorDrawerProps> = ({
  lessonId,
  lessonTitle,
  courseSlug
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello! I am your 1-on-1 Lesson Tutor. Ask me any questions about ' + (lessonTitle || 'this lesson') + ' in English, Hindi or Hinglish!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (customText?: string) => {
    const text = customText || input;
    if (!text.trim() || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          lessonId,
          courseSlug,
          history: messages.slice(-4)
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ ' + (data.error || 'Tutor is unavailable.') }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Connection error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-bold text-xs border border-primary/30 shadow-sm transition-all"
      >
        <Icon name="bot" size={15} />
        <span>Ask AI Tutor</span>
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#0c1022]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <Icon name="sparkles" size={16} />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">AI Academic Tutor</h3>
                <p className="text-[10px] text-white/50 truncate max-w-[180px]">{lessonTitle || 'Lesson Copilot'}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 text-white/50 hover:text-white rounded-lg">
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="p-2.5 bg-black/20 border-b border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              'Explain simply',
              'Key takeaways',
              'Explain in Hindi',
              'Give me a practice quiz'
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-white/5 hover:bg-primary/20 text-white/70 hover:text-white border border-white/10"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-white/5 border border-white/10 text-white/90 rounded-bl-none'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-white/50 text-xs py-1">
                <Icon name="loader" size={14} className="animate-spin text-primary" />
                <span>Tutor is formulating response...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 bg-black/40 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask tutor about this concept..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/80 disabled:opacity-50"
            >
              <Icon name="send" size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};