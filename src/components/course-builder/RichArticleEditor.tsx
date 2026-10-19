'use client';

import React, { useState, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ArticleContentRenderer } from '@/components/player/ArticleContentRenderer';
import { GrammarHintAssistant } from '@/components/ui/GrammarHintAssistant';

interface RichArticleEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  onSetDuration?: (estimatedDuration: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichArticleEditor: React.FC<RichArticleEditorProps> = ({
  content,
  onChange,
  onSetDuration,
  placeholder = 'Write your rich lecture notes, headings, key concepts, formulas, and code walkthrough here...',
  minHeight = '320px'
}) => {
  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW' | 'SPLIT'>('EDIT');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Word count and reading time
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedMinutes = Math.max(1, Math.ceil(words / 150));
  const formattedDuration = `${String(estimatedMinutes).padStart(2, '0')}:00`;

  // Helper to insert or wrap markdown syntax at cursor position
  const insertFormatting = (prefix: string, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${content}\n${prefix}${defaultText}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${defaultText}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    onChange(newContent);

    // Re-focus and set selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selectedText
        ? start + replacement.length
        : start + prefix.length + defaultText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const insertTemplate = (type: 'COMPLETE' | 'EXERCISE' | 'CHEATSHEET') => {
    let tpl = '';
    if (type === 'COMPLETE') {
      tpl = `# Lecture Overview\n\nWelcome to this lecture. In this written guide, we break down key concepts step-by-step with practical explanations and code patterns.\n\n## 1. Core Architecture & Theory\n\nStart by understanding the foundational problem we are solving:\n- Key concept point 1\n- Key concept point 2\n- Why this approach is optimal in production\n\n> 💡 **Instructor Tip:** Notice how server-side rendering reduces bundle size for mobile clients.\n\n## 2. Practical Implementation\n\nHere is how to structure this in your application:\n\n\`\`\`typescript\n// Example implementation\nexport async function handleDataPipeline() {\n  const res = await fetch('/api/data');\n  return res.json();\n}\n\`\`\`\n\n## 3. Key Takeaways & Best Practices\n\n1. Always validate input data before execution\n2. Maintain deterministic caching strategies\n3. Monitor latency thresholds in production\n\n---\n\n## Summary\n\nYou are now ready to implement these concepts. Review the attached resources or continue to the next lecture!`;
    } else if (type === 'EXERCISE') {
      tpl = `# Hands-On Practice Exercise\n\nPut what you have learned into practice with this structured challenge.\n\n## Objectives\n- [ ] Configure the project environment\n- [ ] Implement the core component\n- [ ] Verify test assertions\n\n## Step-by-Step Instructions\n\n### Step 1: Initial Setup\nBegin by cloning the starter repository or creating a clean directory.\n\n### Step 2: Implementation\nWrite the solution following the specifications discussed in the curriculum.\n\n> ⚠️ **Important:** Do not skip input sanitization, as this will trigger edge-case validation errors.\n\n## Solution Hint\nClick below to verify the expected output:\n\`\`\`bash\nnpm run test:verify\n\`\`\``;
    } else {
      tpl = `# Quick Reference & Cheat Sheet\n\nHigh-density reference guide for quick lookup.\n\n| Command / Concept | Syntax / Usage | Description |\n| :--- | :--- | :--- |\n| Initialization | \`npx create-app\` | Bootstrap project scaffolding |\n| Development | \`npm run dev\` | Start local hot-reloading server |\n| Production Build | \`npm run build\` | Compile optimized assets |\n\n## Key Rules of Thumb\n- **Never** expose server secrets in client bundles\n- **Always** use TypeScript strict mode\n- **Keep** components modular and reusable`;
    }

    if (content.trim() && !confirm('Replace current editor content with this starter template?')) {
      return;
    }
    onChange(tpl);
  };

  return (
    <div className="border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col">
      {/* 1. TOP HEADER & VIEW MODE BAR */}
      <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
            <span>📝</span>
            <span>Rich Article &amp; Lecture Editor</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold ml-1 hidden sm:inline-block">
            Student Headings &amp; Paragraphs Ready
          </span>
          <GrammarHintAssistant
            text={content}
            onApplyCorrection={onChange}
            fieldName="Article Content"
          />
        </div>

        {/* View Switcher: Write / Live Preview / Split */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('EDIT')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'EDIT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon name="edit" size={13} />
            <span>Write &amp; Format</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PREVIEW')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PREVIEW'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon name="visibility" size={13} />
            <span>Student Live Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SPLIT')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SPLIT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon name="splitscreen" size={13} />
            <span>Split View</span>
          </button>
        </div>
      </div>

      {/* 2. FORMATTING TOOLBAR (Always visible in EDIT and SPLIT mode) */}
      {(activeTab === 'EDIT' || activeTab === 'SPLIT') && (
        <div className="px-3 py-2 bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-1.5 text-slate-700 dark:text-slate-200 text-xs">
          {/* Headings */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => insertFormatting('# ', '', 'Main Heading 1')}
              className="px-2 py-1 font-black text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Heading 1 (Main Topic)"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('## ', '', 'Section Heading 2')}
              className="px-2 py-1 font-bold text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Heading 2 (Sub-topic)"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('### ', '', 'Minor Heading 3')}
              className="px-2 py-1 font-semibold text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Heading 3 (Minor section)"
            >
              H3
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('', '\n', 'Write regular paragraph text here...')}
              className="px-2 py-1 text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Normal Paragraph"
            >
              ¶ Body
            </button>
          </div>

          <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Inline Formats: Bold, Italic, Strike, Code */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => insertFormatting('**', '**', 'bold text')}
              className="w-7 h-7 flex items-center justify-center font-black hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Bold (**text**)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*', 'italic text')}
              className="w-7 h-7 flex items-center justify-center italic font-serif hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Italic (*text*)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('~~', '~~', 'strikethrough text')}
              className="w-7 h-7 flex items-center justify-center line-through hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Strikethrough (~~text~~)"
            >
              S
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`', '`', 'code')}
              className="px-2 h-7 font-mono text-[11px] font-bold flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Inline Code (`code`)"
            >
              &lt;&gt;
            </button>
          </div>

          <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Lists */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => insertFormatting('- ', '', 'Bullet item')}
              className="px-2 h-7 flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Bullet List (- item)"
            >
              <Icon name="format_list_bulleted" size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('1. ', '', 'Numbered item')}
              className="px-2 h-7 flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Numbered List (1. item)"
            >
              <Icon name="format_list_numbered" size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- [ ] ', '', 'Checklist task item')}
              className="px-2 h-7 flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Checklist task"
            >
              <Icon name="check_box" size={15} />
            </button>
          </div>

          <span className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Callout Boxes & Blocks */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => insertFormatting('> 💡 **Tip:** ', '\n', 'Share an important practical tip or best practice for students.')}
              className="px-2.5 h-7 flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Insert Tip Callout Box"
            >
              <span>💡 Tip</span>
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('> ⚠️ **Important:** ', '\n', 'Highlight a crucial warning, common pitfall, or requirement.')}
              className="px-2.5 h-7 flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Insert Warning Callout Box"
            >
              <span>⚠️ Note</span>
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('```typescript\n', '\n```', '// Paste code snippet here')}
              className="px-2 h-7 flex items-center gap-1 text-[11px] font-mono hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Code Block (```lang)"
            >
              <Icon name="code" size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\n| Feature | Description | Status |\n| :--- | :--- | :--- |\n| Item A | Overview note | Active |\n| Item B | Details note | Planned |\n')}
              className="px-2 h-7 flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Insert Table"
            >
              <Icon name="table_chart" size={15} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\n---\n')}
              className="px-2 h-7 flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 rounded transition-colors cursor-pointer"
              title="Divider (---)"
            >
              <Icon name="horizontal_rule" size={15} />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Starter Template Dropdown Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">Templates:</span>
              <button
                type="button"
                onClick={() => insertTemplate('COMPLETE')}
                className="px-2 py-1 rounded bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[10px] font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                title="Insert Full Lecture Guide Template with Headings, Paragraphs, Code, and Tips"
              >
                + Complete Guide
              </button>
              <button
                type="button"
                onClick={() => insertTemplate('CHEATSHEET')}
                className="px-2 py-1 rounded bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[10px] font-bold text-slate-800 dark:text-slate-100 cursor-pointer hidden sm:inline"
                title="Insert Quick Reference / Table Cheat Sheet"
              >
                + Cheatsheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN EDITOR / PREVIEW BODY */}
      <div className="relative flex-1 min-h-[300px]">
        {activeTab === 'EDIT' && (
          <textarea
            ref={textareaRef}
            rows={14}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full h-full p-4 sm:p-5 text-xs sm:text-sm font-mono leading-relaxed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-y"
          />
        )}

        {activeTab === 'PREVIEW' && (
          <div
            style={{ minHeight }}
            className="p-6 sm:p-8 overflow-y-auto max-h-[600px] bg-slate-50/50 dark:bg-slate-950/50 divide-y divide-slate-100 dark:divide-slate-800"
          >
            <div className="mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Student Classroom View Preview:
              </span>
              <span className="text-[11px] font-mono text-indigo-600 font-bold">
                {words} words • ~{estimatedMinutes} min read
              </span>
            </div>
            <ArticleContentRenderer content={content} />
          </div>
        )}

        {activeTab === 'SPLIT' && (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
            <textarea
              ref={textareaRef}
              rows={14}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              style={{ minHeight }}
              className="w-full h-full p-4 text-xs font-mono leading-relaxed bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-y"
            />
            <div
              style={{ minHeight }}
              className="p-4 sm:p-6 overflow-y-auto max-h-[600px] bg-slate-50/50 dark:bg-slate-950/50"
            >
              <ArticleContentRenderer content={content} />
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM STATUS BAR & WORD COUNTER */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span>Words: <strong className="text-slate-800 dark:text-slate-200">{words}</strong></span>
          <span>•</span>
          <span>Estimated Read Time: <strong className="text-slate-800 dark:text-slate-200">~{estimatedMinutes} min</strong></span>
        </div>

        {onSetDuration && (
          <button
            type="button"
            onClick={() => onSetDuration(formattedDuration)}
            className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-indigo-50 border border-slate-300 dark:border-slate-700 text-indigo-600 hover:text-indigo-800 rounded font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Auto-calculate and set lesson duration based on reading length"
          >
            <Icon name="timer" size={13} />
            <span>Set Lecture Duration ({formattedDuration})</span>
          </button>
        )}
      </div>
    </div>
  );
};
