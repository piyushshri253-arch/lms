'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';

export interface CourseVersionHistoryItem {
  versionNumber: number;
  versionLabel: string;
  status?: string;
  publishedAt: string;
  approvedBy: string;
  creatorName?: string;
  changeSummary: string[];
  price: number;
  modulesCount: number;
  lessonsCount: number;
  lessonIds?: string[];
  isLive?: boolean;
}

interface CourseVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
}

export const CourseVersionHistoryModal: React.FC<CourseVersionHistoryModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<{
    liveVersionLabel: string;
    pendingVersionLabel?: string | null;
    stateStatus?: string;
    history: CourseVersionHistoryItem[];
    detectedChanges?: any[];
  } | null>(null);

  const [selectedVersionForPreview, setSelectedVersionForPreview] = useState<CourseVersionHistoryItem | null>(null);

  useEffect(() => {
    if (!isOpen || !courseId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/courses/${encodeURIComponent(courseId)}/version/history`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch version history');
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setHistoryData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load version history');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, courseId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Icon name="history" size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Version History</span>
                {historyData?.liveVersionLabel && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    Live: {historyData.liveVersionLabel}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                {courseTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <Icon name="sync" size={24} className="animate-spin mx-auto text-violet-600" />
              <p>Loading version records and audit trails...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <Icon name="error" size={18} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Active Draft or Pending Review Banner */}
              {historyData?.pendingVersionLabel && historyData?.stateStatus !== 'LIVE_SYNCED' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Draft {historyData.pendingVersionLabel} in Progress
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      {historyData.stateStatus === 'PENDING_REVIEW' ? 'Under Auditor Review' : 'Editable Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800">
                    {historyData.stateStatus === 'PENDING_REVIEW'
                      ? 'Proposed major updates have been submitted to the Course Auditor. Live version remains untouched until approved.'
                      : 'An update draft is currently open in the Course Builder. The live published version remains accessible to students.'}
                  </p>
                  {historyData.detectedChanges && historyData.detectedChanges.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/60">
                      <p className="text-[11px] font-bold text-amber-900 mb-1">Staged Changes:</p>
                      <ul className="text-[11px] text-amber-800 space-y-0.5 list-disc list-inside">
                        {historyData.detectedChanges.map((c: any, i: number) => (
                          <li key={i}>{c.summary}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Version Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Published Versions &amp; Audit Trail
                </h4>

                {(!historyData?.history || historyData.history.length === 0) ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    No version history recorded yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                    {historyData.history.map((ver, idx) => {
                      const isLive = ver.isLive || ver.versionNumber === Number(historyData?.liveVersionLabel.replace('v', ''));
                      const formattedDate = ver.publishedAt
                        ? new Date(ver.publishedAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Initial Release';

                      return (
                        <div key={idx} className="relative group">
                          {/* Circle bullet on timeline */}
                          <div
                            className={`absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white transition-all ${
                              isLive
                                ? 'border-emerald-600 ring-4 ring-emerald-100'
                                : 'border-slate-400 group-hover:border-violet-500'
                            }`}
                          />

                          <div
                            className={`p-4 rounded-2xl border transition-all ${
                              isLive
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-900">
                                  {ver.versionLabel}
                                </span>
                                {isLive ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white uppercase tracking-wider shadow-2xs">
                                    Current Live Version
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                    Superseded
                                  </span>
                                )}
                              </div>

                              <span className="text-[11px] font-medium text-slate-500">
                                {formattedDate}
                              </span>
                            </div>

                            {/* Metadata Pill Row */}
                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-medium">
                              <span className="inline-flex items-center gap-1">
                                <Icon name="account_circle" size={13} className="text-slate-400" />
                                <span>Approved by: <strong>{ver.approvedBy || 'System'}</strong></span>
                              </span>
                              <span>&bull;</span>
                              <span>Price: <strong>₹{Number(ver.price || 0).toLocaleString('en-IN')}</strong></span>
                              <span>&bull;</span>
                              <span>{ver.modulesCount || 0} Modules</span>
                              <span>&bull;</span>
                              <span>{ver.lessonsCount || 0} Lectures</span>
                            </div>

                            {/* Change summary bullet points */}
                            {ver.changeSummary && ver.changeSummary.length > 0 && (
                              <div className="mt-3 bg-white/80 rounded-xl p-3 border border-slate-200/70 space-y-1">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                  Version Changes:
                                </p>
                                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                                  {ver.changeSummary.map((item, cIdx) => (
                                    <li key={cIdx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Read-Only Preview Option for Superseded Versions */}
                            {!isLive && (
                              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                                <span className="text-[11px] text-slate-400 italic">
                                  Superseded versions are preserved for historical record.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedVersionForPreview(ver)}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Icon name="visibility" size={13} />
                                  <span>View Snapshot</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Read-Only Snapshot Modal Overlay */}
          {selectedVersionForPreview && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                  <Icon name="lock" size={14} className="text-indigo-600" />
                  Read-Only Snapshot: {selectedVersionForPreview.versionLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVersionForPreview(null)}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Close Snapshot
                </button>
              </div>
              <p className="text-xs text-indigo-800">
                This version was published on {new Date(selectedVersionForPreview.publishedAt).toLocaleDateString()} with {selectedVersionForPreview.modulesCount} modules and {selectedVersionForPreview.lessonsCount} lessons at ₹{selectedVersionForPreview.price}. Past versions cannot be edited or republished directly without creating a new revision draft.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
