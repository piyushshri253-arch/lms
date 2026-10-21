'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ExcelValidationResult, ExcelValidationError } from '@/lib/course-excel-validator';
import { ParsedCourseData } from '@/lib/course-excel';

interface ExcelValidationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationResult: ExcelValidationResult | null;
  fileName: string;
  onConfirmImport: (parsedData: ParsedCourseData) => Promise<void> | void;
  isImporting?: boolean;
}

export const ExcelValidationReportModal: React.FC<ExcelValidationReportModalProps> = ({
  isOpen,
  onClose,
  validationResult,
  fileName,
  onConfirmImport,
  isImporting = false
}) => {
  const [filterText, setFilterText] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'REPORT' | 'PREVIEW'>('REPORT');

  // If valid by default, start on Preview tab
  React.useEffect(() => {
    if (validationResult?.isValid) {
      setActiveTab('PREVIEW');
    } else {
      setActiveTab('REPORT');
    }
  }, [validationResult?.isValid]);

  const errors = validationResult?.errors || [];
  const isValid = validationResult?.isValid ?? false;
  const blockingCount = validationResult?.blockingCount ?? errors.length;
  const summary = validationResult?.summary;

  const filteredErrors = useMemo(() => {
    if (!filterText.trim()) return errors;
    const q = filterText.toLowerCase();
    return errors.filter(
      (e) =>
        e.location.toLowerCase().includes(q) ||
        e.field.toLowerCase().includes(q) ||
        e.error.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
    );
  }, [errors, filterText]);

  const handleCopyReport = () => {
    if (errors.length === 0) return;
    const header = `| Location | Field | Error | Action |\n|---|---|---|---|`;
    const rows = errors
      .map((e) => `| ${e.location} | ${e.field} | ${e.error} | ${e.action} |`)
      .join('\n');
    const mdTable = `# Excel Validation Error Report - ${fileName}\n\n${header}\n${rows}\n`;
    navigator.clipboard.writeText(mdTable);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  if (!isOpen || !validationResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface rounded-2xl shadow-2xl border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isValid
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              <Icon name={isValid ? 'check_circle' : 'error'} size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-on-surface">
                  Excel Course Template Validation
                </h3>
                <span
                  className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isValid
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                  }`}
                >
                  {isValid ? '100% Valid' : `${blockingCount} Blocking Error${blockingCount > 1 ? 's' : ''}`}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <Icon name="description" size={14} className="text-on-surface-variant/70" />
                <span className="font-mono truncate max-w-md">{fileName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Tab switcher if valid */}
        {isValid && (
          <div className="flex border-b border-outline-variant px-6 bg-surface-container-lowest shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'PREVIEW'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name="visibility" size={16} />
              <span>Course Content Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('REPORT')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'REPORT'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name="fact_check" size={16} />
              <span>Validation Diagnostics</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Alert Banner */}
          {!isValid ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-rose-900 dark:text-rose-100">
              <Icon name="dangerous" size={20} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">
                  Import Rejected — {blockingCount} Blocking Validation Error{blockingCount > 1 ? 's' : ''} Detected
                </p>
                <p className="text-rose-800 dark:text-rose-200/90 leading-relaxed">
                  Morena Teach LMS enforces strict curriculum integrity. No partially valid data will be saved.
                  Please resolve all issues listed below in your Excel template and re-upload.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 text-emerald-900 dark:text-emerald-100">
              <Icon name="task_alt" size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">All Validation Checks Passed!</p>
                <p className="text-emerald-800 dark:text-emerald-200/90 leading-relaxed">
                  Workbook structure, mandatory course details, curriculum modules, even-question quiz rules, and
                  mandatory Final Assessment are 100% compliant. Ready for atomic import into draft.
                </p>
              </div>
            </div>
          )}

          {/* Metrics Summary Strip */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 text-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Modules</span>
                <span className="text-lg font-black text-on-surface mt-0.5 block">{summary.modulesCount}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 text-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Lectures</span>
                <span className="text-lg font-black text-on-surface mt-0.5 block">{summary.lecturesCount}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 text-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Articles</span>
                <span className="text-lg font-black text-on-surface mt-0.5 block">{summary.articlesCount}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 text-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Quizzes</span>
                <span className="text-lg font-black text-on-surface mt-0.5 block">{summary.quizzesCount}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 text-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">MCQ Questions</span>
                <span className="text-lg font-black text-on-surface mt-0.5 block">{summary.questionsCount}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 text-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Final Exam</span>
                <span className={`text-xs font-black mt-1.5 block ${summary.hasFinalAssignment ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {summary.hasFinalAssignment ? 'Configured ✓' : 'Missing ✗'}
                </span>
              </div>
            </div>
          )}

          {/* VIEW: Errors Table (if errors exist or tab is REPORT) */}
          {(!isValid || activeTab === 'REPORT') && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Icon
                    name="search"
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
                  />
                  <input
                    type="text"
                    placeholder="Search errors by location, field, or action..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-surface text-xs rounded-xl border border-outline-variant focus:outline-hidden focus:border-primary"
                  />
                </div>

                {errors.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-3 py-2 bg-surface text-on-surface text-xs font-bold rounded-xl border border-outline-variant hover:bg-surface-container flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <Icon name={copiedReport ? 'check' : 'content_copy'} size={15} />
                    <span>{copiedReport ? 'Copied to Clipboard!' : 'Copy Error Report'}</span>
                  </button>
                )}
              </div>

              {/* Error Report Table */}
              <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface shadow-2xs">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider sticky top-0 z-10">
                        <th className="py-2.5 px-3.5 w-1/4">Location</th>
                        <th className="py-2.5 px-3.5 w-1/5">Field</th>
                        <th className="py-2.5 px-3.5 w-1/4">Error</th>
                        <th className="py-2.5 px-3.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {filteredErrors.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-on-surface-variant text-xs">
                            {filterText ? 'No matching errors found for search term.' : 'Zero errors detected. All validation checks passed!'}
                          </td>
                        </tr>
                      ) : (
                        filteredErrors.map((err, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-surface-container-lowest transition-colors"
                          >
                            <td className="py-2.5 px-3.5 font-mono text-[11px] text-on-surface font-semibold align-top">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-surface-container text-on-surface border border-outline-variant/60">
                                {err.location}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 font-bold text-on-surface align-top">
                              {err.field}
                            </td>
                            <td className="py-2.5 px-3.5 text-rose-600 dark:text-rose-400 font-semibold align-top">
                              {err.error}
                            </td>
                            <td className="py-2.5 px-3.5 text-on-surface-variant leading-relaxed align-top">
                              {err.action}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                <Icon name="lightbulb" size={14} className="text-amber-500 shrink-0" />
                <span>
                  Update the flagged cells directly in your spreadsheet, save it as a <code className="font-mono bg-surface-container px-1 py-0.2 rounded">.xlsx</code> file, and upload again.
                </span>
              </p>
            </div>
          )}

          {/* VIEW: Course Preview (when valid) */}
          {isValid && activeTab === 'PREVIEW' && validationResult.parsedData && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary tracking-wider">
                      Course Title
                    </span>
                    <h4 className="text-sm font-bold text-on-surface mt-0.5">
                      {validationResult.parsedData.title}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                      Price
                    </span>
                    <p className="text-sm font-black text-on-surface mt-0.5">
                      {validationResult.parsedData.price === 0
                        ? 'Free'
                        : `₹${validationResult.parsedData.price}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 text-[11px] text-on-surface-variant border-t border-outline-variant/60">
                  <span className="px-2 py-0.5 rounded-md bg-surface border border-outline-variant/60">
                    Category: <b>{validationResult.parsedData.category}</b>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-surface border border-outline-variant/60">
                    Level: <b>{validationResult.parsedData.level}</b>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-surface border border-outline-variant/60">
                    Language: <b>{validationResult.parsedData.language}</b>
                  </span>
                </div>
              </div>

              {/* Modules breakdown */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="auto_stories" size={15} />
                  <span>Curriculum Breakdown ({validationResult.parsedData.sections?.length || 0} Modules)</span>
                </h5>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(validationResult.parsedData.sections || []).map((sec, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 bg-surface rounded-xl border border-outline-variant/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold text-on-surface">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                            {sIdx + 1}
                          </span>
                          <span>{sec.title}</span>
                        </span>
                        <span className="text-[11px] font-normal text-on-surface-variant">
                          {sec.lessons?.length || 0} items
                        </span>
                      </div>
                      <div className="pl-6 space-y-1 text-on-surface-variant text-[11px]">
                        {(sec.lessons || []).slice(0, 5).map((les, lIdx) => (
                          <div key={lIdx} className="flex items-center gap-2 truncate">
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-surface-container uppercase">
                              {les.type}
                            </span>
                            <span className="truncate">{les.title}</span>
                          </div>
                        ))}
                        {(sec.lessons?.length || 0) > 5 && (
                          <p className="text-[10px] text-primary italic">
                            + {(sec.lessons?.length || 0) - 5} more items in this module
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container-low shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors cursor-pointer"
          >
            {isValid ? 'Cancel' : 'Close & Fix Excel'}
          </button>

          <div className="flex items-center gap-3">
            {!isValid ? (
              <div
                title="Resolve all blocking errors to import this course"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface-variant/50 text-xs font-bold cursor-not-allowed border border-outline-variant/50 shadow-2xs select-none"
              >
                <Icon name="block" size={16} />
                <span>Import Disabled ({blockingCount} Errors)</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  if (validationResult.parsedData) {
                    onConfirmImport(validationResult.parsedData);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Icon name="progress_activity" size={16} className="animate-spin" />
                    <span>Importing Content...</span>
                  </>
                ) : (
                  <>
                    <Icon name="rocket_launch" size={16} />
                    <span>Confirm & Import Course 🚀</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
