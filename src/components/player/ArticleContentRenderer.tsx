'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface ArticleContentRendererProps {
  content?: string | null;
  className?: string;
}

export const ArticleContentRenderer: React.FC<ArticleContentRendererProps> = ({
  content,
  className = ''
}) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  if (!content || !content.trim()) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs italic">
        No written content has been added to this lecture yet.
      </div>
    );
  }

  // Parse lines into structured blocks
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  let blockKey = 0;

  const copyCode = (codeText: string, index: number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(codeText);
      setCopiedCodeIndex(index);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    }
  };

  const renderInlineFormatted = (text: string): React.ReactNode => {
    // Basic inline formatting: code, bold, italic, strikethrough, link
    const parts: React.ReactNode[] = [];
    // Tokenize for `code`, **bold**, *italic*, ~~strike~~
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const token = match[0];
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={`inline-code-${match.index}`}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-pink-600 font-mono text-[11px] font-semibold border border-slate-200"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={`bold-${match.index}`} className="font-extrabold text-slate-900">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={`italic-${match.index}`} className="italic text-slate-800">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('~~') && token.endsWith('~~')) {
        parts.push(
          <s key={`strike-${match.index}`} className="line-through text-slate-500">
            {token.slice(2, -2)}
          </s>
        );
      } else if (token.startsWith('[') && token.includes('](')) {
        const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
        if (linkMatch) {
          parts.push(
            <a
              key={`link-${match.index}`}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2"
            >
              {linkMatch[1]}
            </a>
          );
        } else {
          parts.push(token);
        }
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced Code Block: ```lang
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'code';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }

      const fullCode = codeLines.join('\n');
      const currentCodeIdx = blockKey++;
      elements.push(
        <div
          key={`code-${currentCodeIdx}`}
          className="my-5 rounded-2xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-lg text-slate-100 font-mono text-xs"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800 text-[11px] text-slate-400">
            <span className="font-bold uppercase tracking-wider text-indigo-400">{lang}</span>
            <button
              type="button"
              onClick={() => copyCode(fullCode, currentCodeIdx)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer text-[10px]"
            >
              <Icon name={copiedCodeIndex === currentCodeIdx ? 'check' : 'content_copy'} size={12} />
              <span>{copiedCodeIndex === currentCodeIdx ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
          <pre className="p-4 overflow-x-auto leading-relaxed select-text font-mono text-[12px]">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 3. Headings: #, ##, ###, ####
    if (trimmed.startsWith('# ') || trimmed === '#') {
      const titleText = trimmed.replace(/^#\s*/, '');
      elements.push(
        <h1
          key={`h1-${blockKey++}`}
          className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-8 mb-4 pb-2 border-b-2 border-indigo-100 flex items-center gap-2"
        >
          {renderInlineFormatted(titleText)}
        </h1>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ') || trimmed === '##') {
      const titleText = trimmed.replace(/^##\s*/, '');
      elements.push(
        <h2
          key={`h2-${blockKey++}`}
          className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-6 mb-3 flex items-center gap-2"
        >
          {renderInlineFormatted(titleText)}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('### ') || trimmed === '###') {
      const titleText = trimmed.replace(/^###\s*/, '');
      elements.push(
        <h3
          key={`h3-${blockKey++}`}
          className="text-base sm:text-lg font-bold text-slate-800 mt-5 mb-2 flex items-center gap-1.5"
        >
          {renderInlineFormatted(titleText)}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('#### ') || trimmed === '####') {
      const titleText = trimmed.replace(/^####\s*/, '');
      elements.push(
        <h4
          key={`h4-${blockKey++}`}
          className="text-sm font-bold text-slate-700 uppercase tracking-wider mt-4 mb-2"
        >
          {renderInlineFormatted(titleText)}
        </h4>
      );
      i++;
      continue;
    }

    // 4. Horizontal Rule: --- or ***
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={`hr-${blockKey++}`} className="my-8 border-t-2 border-slate-200/80" />
      );
      i++;
      continue;
    }

    // 5. Blockquote / Callout Alert Box (> 💡, > ⚠️, > [!NOTE], etc.)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }

      const quoteContent = quoteLines.join('\n');
      const isTip = /💡|tip|note|hint/i.test(quoteContent);
      const isWarning = /⚠️|warning|caution|important|alert/i.test(quoteContent);
      const isSuccess = /✅|success|pro tip/i.test(quoteContent);

      const boxStyles = isWarning
        ? 'bg-amber-50 border-amber-300 text-amber-950'
        : isSuccess
        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
        : isTip
        ? 'bg-indigo-50 border-indigo-300 text-indigo-950'
        : 'bg-slate-50 border-slate-300 text-slate-800';

      const iconName = isWarning
        ? 'warning'
        : isSuccess
        ? 'check_circle'
        : isTip
        ? 'lightbulb'
        : 'format_quote';

      elements.push(
        <div
          key={`quote-${blockKey++}`}
          className={`my-5 p-4 sm:p-5 rounded-2xl border-l-4 border shadow-xs space-y-1.5 ${boxStyles}`}
        >
          <div className="flex items-start gap-3">
            <Icon name={iconName} size={20} className="mt-0.5 shrink-0 opacity-80" />
            <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap flex-1">
              {renderInlineFormatted(quoteContent)}
            </div>
          </div>
        </div>
      );
      continue;
    }

    // 6. Bullet List (- item or * item)
    if (/^[\*\-]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\*\-]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[\*\-]\s+/, ''));
        i++;
      }

      elements.push(
        <ul key={`ul-${blockKey++}`} className="my-4 space-y-2 pl-2">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
              <div className="flex-1">{renderInlineFormatted(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Numbered List (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }

      elements.push(
        <ol key={`ol-${blockKey++}`} className="my-4 space-y-2.5 pl-1">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {lIdx + 1}
              </span>
              <div className="flex-1">{renderInlineFormatted(item)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Markdown Table (| Header | Header |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0].split('|').slice(1, -1).map((c) => c.trim());
        const dataRows = tableLines.slice(2).map((row) =>
          row.split('|').slice(1, -1).map((c) => c.trim())
        );

        elements.push(
          <div key={`table-${blockKey++}`} className="my-5 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-4 py-2.5">
                      {renderInlineFormatted(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2 text-slate-700">
                        {renderInlineFormatted(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 9. Standard Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('>') &&
      !/^[\*\-]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|'))
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }

    if (paraLines.length > 0) {
      elements.push(
        <p
          key={`p-${blockKey++}`}
          className="text-xs sm:text-sm text-slate-700 leading-relaxed sm:leading-7 my-3"
        >
          {renderInlineFormatted(paraLines.join(' '))}
        </p>
      );
    }
  }

  return <div className={`space-y-1 font-sans ${className}`}>{elements}</div>;
};
