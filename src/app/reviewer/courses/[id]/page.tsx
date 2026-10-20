'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuditorPortalShell } from '@/components/reviewer/AuditorPortalShell';
import { Icon } from '@/components/ui/Icon';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { cleanSectionTitle, generateCurriculumDisplayMap } from '@/lib/course-formatting';
import { notifyCoursesChanged } from '@/lib/courses-sync';

interface SectionIssue {
  id: string;
  section: 'Curriculum' | 'Video' | 'PDF' | 'Quiz' | 'Pricing' | 'Learning Outcomes' | 'SEO';
  lessonRef?: string;
  issue: string;
  comment: string;
  createdAt: string;
}

function getLessonResources(lesson: any): Array<{ id: string; name: string; url: string; type: string }> {
  if (!lesson) return [];
  const list: Array<{ id: string; name: string; url: string; type: string }> = [];

  if (Array.isArray(lesson.resourcesList) && lesson.resourcesList.length > 0) {
    lesson.resourcesList.forEach((r: any, idx: number) => {
      if (r?.url) list.push({ id: r.id || `res_${idx}`, name: r.name || 'Resource', url: r.url, type: r.type || 'DOC' });
    });
  }

  if (lesson.resources) {
    try {
      const parsed = typeof lesson.resources === 'string' ? JSON.parse(lesson.resources) : lesson.resources;
      if (Array.isArray(parsed)) {
        parsed.forEach((r: any, idx: number) => {
          if (r?.url && !list.some((existing) => existing.url === r.url)) {
            list.push({ id: r.id || `db_res_${idx}`, name: r.name || 'Resource', url: r.url, type: r.type || 'DOC' });
          }
        });
      }
    } catch {}
  }

  if (lesson.pdfUrl && !list.some((existing) => existing.url === lesson.pdfUrl)) {
    const isDoc = lesson.pdfUrl.toLowerCase().endsWith('.doc') || lesson.pdfUrl.toLowerCase().endsWith('.docx');
    list.push({
      id: `pdf_${lesson.id || '1'}`,
      name: lesson.resourceFileName || (isDoc ? 'Attached Document.doc' : 'Attached Document.pdf'),
      url: lesson.pdfUrl,
      type: isDoc ? 'DOC' : 'PDF'
    });
  }
  if (lesson.fileUrl && !list.some((existing) => existing.url === lesson.fileUrl)) {
    list.push({
      id: `file_${lesson.id || '1'}`,
      name: lesson.resourceFileName || 'Study Resource',
      url: lesson.fileUrl,
      type: 'DOC'
    });
  }

  return list;
}

export default function AuditorCourseReviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.id as string) || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; desc: string; status?: number } | null>(null);
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'CURRICULUM_MEDIA' | 'QUIZZES' | 'OUTCOMES' | 'VERSION_DIFF' | 'ISSUES_HISTORY'
  >('CURRICULUM_MEDIA');

  // Active Lesson in Curriculum Media Inspector
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [videoChecklist, setVideoChecklist] = useState({
    playable: true,
    audioWorking: true,
    correctContent: true,
    durationAccurate: true,
    drmProtected: true
  });

  // Section Statuses
  const [sectionStatuses, setSectionStatuses] = useState<{
    curriculum: 'PASSED' | 'ISSUE' | 'PENDING';
    video: 'PASSED' | 'ISSUE' | 'PENDING';
    pdf: 'PASSED' | 'ISSUE' | 'PENDING';
    quiz: 'PASSED' | 'ISSUE' | 'PENDING';
    pricing: 'PASSED' | 'ISSUE' | 'PENDING';
    learningOutcomes: 'PASSED' | 'ISSUE' | 'PENDING';
  }>({
    curriculum: 'PASSED',
    video: 'PASSED',
    pdf: 'PASSED',
    quiz: 'PASSED',
    pricing: 'PASSED',
    learningOutcomes: 'PASSED'
  });

  // Section-Wise Issues
  const [sectionIssues, setSectionIssues] = useState<SectionIssue[]>([]);
  const [newIssueSection, setNewIssueSection] = useState<SectionIssue['section']>('Video');
  const [newIssueLessonRef, setNewIssueLessonRef] = useState('');
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueComment, setNewIssueComment] = useState('');

  // Internal Auditor Notes (Hidden from Instructor)
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  // Modals for Approve / Request Changes / Reject
  const [decisionModal, setDecisionModal] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | null>(
    null
  );
  const [decisionNote, setDecisionNote] = useState('');
  const [confirmRejectCompliance, setConfirmRejectCompliance] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc?: string; type?: string } | null>(
    null
  );

  const showToast = (msg: { title: string; desc?: string; type?: string }) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const loadCourseAudit = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setData(json);
        if (json.auditMeta?.sectionStatuses) {
          setSectionStatuses(json.auditMeta.sectionStatuses);
        }
        if (Array.isArray(json.auditMeta?.sectionIssues)) {
          setSectionIssues(json.auditMeta.sectionIssues);
        }
        const firstLes = json.course?.sections?.[0]?.lessons?.[0];
        if (firstLes && !selectedLesson) {
          setSelectedLesson({
            ...firstLes,
            moduleTitle: json.course.sections[0].title
          });
        }
      } else {
        if (res.status === 401) {
          setError({
            title: 'Auditor Login Required (401)',
            desc: 'Your auditor session has expired or you are not signed in. Please sign in to the Course Auditor Studio.',
            status: 401
          });
        } else if (res.status === 403) {
          setError({
            title: 'Auditor Privileges Required (403)',
            desc: json.error || 'Your active account does not have Course Auditor / Reviewer permissions. Please sign in with an Auditor account.',
            status: 403
          });
        } else if (res.status === 404) {
          setError({
            title: 'Course Not Found (404)',
            desc: json.error || 'The requested course could not be found or has been removed.',
            status: 404
          });
        } else {
          setError({
            title: 'Unable to Load Course Audit',
            desc: json.error || 'An unexpected error occurred while fetching course audit data.',
            status: res.status
          });
        }
      }
    } catch (err: any) {
      setError({
        title: 'Connection / Network Error',
        desc: err.message || 'Unable to connect to the server. Please check your internet connection and try again.',
        status: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseAudit();
  }, [courseId]);

  const handleToggleSectionStatus = (key: keyof typeof sectionStatuses) => {
    setSectionStatuses((prev) => ({
      ...prev,
      [key]: prev[key] === 'PASSED' ? 'ISSUE' : 'PASSED'
    }));
  };

  const handleAddSectionIssue = () => {
    if (!newIssueTitle.trim() || !newIssueComment.trim()) {
      showToast({
        title: 'Missing Fields',
        desc: 'Please provide both the issue title and actionable comment for the instructor.',
        type: 'error'
      });
      return;
    }

    const added: SectionIssue = {
      id: `iss_${Date.now()}`,
      section: newIssueSection,
      lessonRef: newIssueLessonRef.trim() || undefined,
      issue: newIssueTitle.trim(),
      comment: newIssueComment.trim(),
      createdAt: new Date().toISOString()
    };

    const nextIssues = [added, ...sectionIssues];
    setSectionIssues(nextIssues);

    // Automatically mark that section as ISSUE
    const mapKey: Record<string, keyof typeof sectionStatuses> = {
      Curriculum: 'curriculum',
      Video: 'video',
      PDF: 'pdf',
      Quiz: 'quiz',
      Pricing: 'pricing',
      'Learning Outcomes': 'learningOutcomes'
    };
    if (mapKey[newIssueSection]) {
      setSectionStatuses((prev) => ({ ...prev, [mapKey[newIssueSection]]: 'ISSUE' }));
    }

    setNewIssueTitle('');
    setNewIssueComment('');
    setNewIssueLessonRef('');
    showToast({
      title: 'Section Issue Tagged ⚠️',
      desc: `Added issue under ${newIssueSection}.`,
      type: 'info'
    });
  };

  const handleRemoveIssue = (id: string) => {
    setSectionIssues(sectionIssues.filter((i) => i.id !== id));
  };

  const handleSaveAuditDraft = async (mediaReviewedType?: 'VIDEO' | 'PDF' | 'QUIZ') => {
    try {
      setSavingDraft(true);
      const res = await fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_AUDIT_DRAFT',
          internalNote: internalNoteInput.trim() || undefined,
          sectionStatuses,
          sectionIssues,
          mediaReviewedType
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save draft');

      setInternalNoteInput('');
      showToast({
        title: mediaReviewedType
          ? `${mediaReviewedType} Verification Logged ✓`
          : 'Auditor Notes & Checklist Saved ✓',
        desc: json.message
      });
      await loadCourseAudit();
    } catch (err: any) {
      showToast({ title: 'Error', desc: err.message, type: 'error' });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitDecision = async () => {
    if (!decisionModal) return;
    try {
      setSubmittingDecision(true);
      const res = await fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: decisionModal,
          note: decisionNote,
          sectionStatuses,
          sectionIssues,
          confirmNonCompliance: confirmRejectCompliance
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Decision failed');

      showToast({
        title:
          decisionModal === 'APPROVE'
            ? 'Course Approved ✅'
            : decisionModal === 'REQUEST_CHANGES'
            ? 'Changes Requested Sent ⚠️'
            : 'Course Rejected ❌',
        desc: json.message
      });

      notifyCoursesChanged();

      setDecisionModal(null);
      setDecisionNote('');
      await loadCourseAudit();
    } catch (err: any) {
      showToast({ title: 'Validation Error', desc: err.message, type: 'error' });
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (error) {
    return (
      <AuditorPortalShell title="Course Audit Studio">
        <div className="p-8 max-w-lg mx-auto bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4 my-8">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Icon name="error" size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">{error.title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{error.desc}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {error.status === 401 || error.status === 403 ? (
              <Link
                href={`/reviewer/login?callbackUrl=${encodeURIComponent(`/reviewer/courses/${courseId}`)}`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Log in as Course Auditor
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => loadCourseAudit()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Try Again
              </button>
            )}
            <Link
              href="/reviewer"
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Back to Audit Queue
            </Link>
          </div>
        </div>
      </AuditorPortalShell>
    );
  }

  if (loading || !data?.course) {
    return (
      <AuditorPortalShell title="Loading Course Audit Studio...">
        <div className="p-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs text-slate-700 font-bold">
            Loading curriculum tree, signed video streams, quizzes, and version diff...
          </div>
          <p className="text-[11px] text-slate-400">Please wait while the course audit data is compiled.</p>
        </div>
      </AuditorPortalShell>
    );
  }

  const { course, submissionType, versionLabel, versionState, versionDiff, securityPolicy, auditMeta } =
    data;

  const lessonDisplayMap = generateCurriculumDisplayMap(course.sections || []);

  const isStagedVersionReview =
    course.status === 'PUBLISHED' && Boolean(versionState?.stagedSnapshot);

  return (
    <AuditorPortalShell
      title={`Course Audit: ${course.title}`}
      subtitle={`Instructor: ${course.instructor?.name} (${course.instructor?.email}) • Course ID: ${course.id}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/reviewer/courses/${encodeURIComponent(course.id)}/preview`}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-xs"
          >
            <Icon name="visibility" size={16} />
            <span>Preview as Student</span>
          </Link>

          <button
            onClick={() => {
              setDecisionModal('APPROVE');
              setDecisionNote('');
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Icon name="check_circle" size={16} />
            <span>Approve Course ✅</span>
          </button>

          <button
            onClick={() => {
              setDecisionModal('REQUEST_CHANGES');
              if (sectionIssues.length > 0 && !decisionNote) {
                setDecisionNote(
                  sectionIssues
                    .map(
                      (i) =>
                        `[${i.section}${i.lessonRef ? ' - ' + i.lessonRef : ''}]: ${i.issue} — ${i.comment}`
                    )
                    .join('\n')
                );
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Icon name="warning" size={16} />
            <span>Request Changes ⚠️</span>
          </button>

          <button
            onClick={() => {
              setDecisionModal('REJECT');
              setDecisionNote('');
              setConfirmRejectCompliance(false);
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Icon name="cancel" size={16} />
            <span>Reject Course ❌</span>
          </button>
        </div>
      }
    >
      {toastMsg && (
        <div
          className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div>
            <span className="font-bold">{toastMsg.title}</span>
            {toastMsg.desc && <span className="ml-2 font-normal">{toastMsg.desc}</span>}
          </div>
          <button onClick={() => setToastMsg(null)}>✕</button>
        </div>
      )}

      <div className="space-y-6">
        {/* Top Metadata & Section-Wise Status Matrix Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold">
                Version: {versionLabel}
              </span>
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-bold">
                Submission Type: {submissionType}
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-mono text-xs font-bold">
                Current Status: {isStagedVersionReview ? 'VERSION_IN_REVIEW' : course.status}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Course ID: <strong className="text-slate-800">{course.id}</strong>
              </span>
            </div>

            <Link
              href={`/instructor/course/${course.id}/review`}
              target="_blank"
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Icon name="open_in_new" size={14} />
              <span>View Instructor Feedback Page</span>
            </Link>
          </div>

          {/* Interactive Section-Wise Status Toggles (Requirement #13) */}
          <div>
            <div className="text-[11px] font-mono font-bold uppercase text-slate-400 mb-2">
              Section-Wise Audit Checklist (Click to toggle ✅ Passed / ⚠️ Issue)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {(
                [
                  { key: 'curriculum', label: 'Curriculum' },
                  { key: 'video', label: 'Video Streams' },
                  { key: 'pdf', label: 'PDF / Docs' },
                  { key: 'quiz', label: 'Quizzes' },
                  { key: 'pricing', label: 'Pricing' },
                  { key: 'learningOutcomes', label: 'Learning Outcomes' }
                ] as const
              ).map((sec) => {
                const st = sectionStatuses[sec.key];
                return (
                  <button
                    key={sec.key}
                    onClick={() => handleToggleSectionStatus(sec.key)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      st === 'PASSED'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <span className="text-xs font-bold">{sec.label}</span>
                    <span className="text-[11px] font-extrabold">
                      {st === 'PASSED' ? '✅ Passed' : '⚠️ Issue'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6 Main Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {[
            { id: 'CURRICULUM_MEDIA', label: '1. Curriculum, Video & PDF Review' },
            { id: 'OVERVIEW', label: '2. Course Overview & Pricing' },
            { id: 'QUIZZES', label: '3. Quiz & Assessment Review' },
            { id: 'OUTCOMES', label: '4. Learning Outcomes Map' },
            { id: 'VERSION_DIFF', label: `5. Version Comparison (${versionLabel})` },
            {
              id: 'ISSUES_HISTORY',
              label: `6. Section Issues (${sectionIssues.length}), Internal Notes & History`
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: CURRICULUM, PROTECTED VIDEO & PDF REVIEW (Requirements #4, #5, #6) */}
        {activeTab === 'CURRICULUM_MEDIA' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Columns: Full Module & Lesson Tree */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 max-h-[760px] overflow-y-auto">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Course Curriculum Tree ({(course.sections || []).length} Modules)
                </h3>
                <p className="text-xs text-slate-500">
                  Select any Lesson, Video, PDF, or Quiz to inspect its live protected content.
                </p>
              </div>

              <div className="space-y-4">
                {(course.sections || []).map((sec: any, sIdx: number) => (
                  <div
                    key={sec.id}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 block">
                          Module {sIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{cleanSectionTitle(sec.title, sIdx + 1)}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {(sec.lessons || []).length} items
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {(sec.lessons || []).map((les: any, lIdx: number) => {
                        const isSelected = selectedLesson?.id === les.id;
                        return (
                          <button
                            key={les.id}
                            onClick={() =>
                              setSelectedLesson({
                                ...les,
                                moduleTitle: `Module ${sIdx + 1}: ${cleanSectionTitle(sec.title, sIdx + 1)}`,
                                lessonNumber: lessonDisplayMap.get(les.id)?.itemNumber || lIdx + 1
                              })
                            }
                            className={`w-full p-3 text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {lessonDisplayMap.get(les.id)?.typeLabel || les.type || 'VIDEO'}
                                </span>
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {lessonDisplayMap.get(les.id)?.sidebarTitle || les.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                                <span>Duration: {les.duration || '10:00'}</span>
                                <span>•</span>
                                <span>{les.isFree ? 'Free Preview' : '🔒 Protected Paid'}</span>
                              </div>
                            </div>

                            <span className="text-[11px] font-bold text-emerald-600 shrink-0">
                              Inspect →
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 7 Columns: Active Video / PDF / Content Inspector */}
            <div className="lg:col-span-7 space-y-6">
              {!selectedLesson ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
                  Select a lecture from the curriculum tree on the left to inspect its video stream or PDF.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-600">
                        {selectedLesson.moduleTitle}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                        {selectedLesson.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => {
                        setNewIssueSection(selectedLesson.type === 'PDF' ? 'PDF' : 'Video');
                        setNewIssueLessonRef(`${selectedLesson.moduleTitle} → ${selectedLesson.title}`);
                        setActiveTab('ISSUES_HISTORY');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                    >
                      ⚠️ Flag Issue on This Lecture
                    </button>
                  </div>

                  {/* 1. Protected Video Stream Inspector (Requirement #5) */}
                  {(selectedLesson.type === 'VIDEO' || selectedLesson.videoUrl || (!selectedLesson.type && !selectedLesson.pdfUrl && !selectedLesson.quiz)) && (
                    <div className="space-y-4">
                      {selectedLesson.videoUrl ? (
                        <VideoPlayer
                          key={selectedLesson.id}
                          title={selectedLesson.title}
                          videoUrl={selectedLesson.videoUrl}
                          lessonId={selectedLesson.id}
                          thumbnail={course.thumbnail}
                          duration={selectedLesson.duration}
                          isFree={true}
                        />
                      ) : (
                        <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                            <Icon name="movie" size={28} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">No Video Asset Uploaded Yet</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                              The instructor has created this lecture slot but has not uploaded or linked a video stream yet.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setNewIssueSection('Video');
                              setNewIssueLessonRef(`${selectedLesson.moduleTitle} → ${selectedLesson.title}`);
                              setNewIssueTitle('Missing Video Lecture Asset');
                              setNewIssueComment('Please upload or attach the video lecture for this topic.');
                              setActiveTab('ISSUES_HISTORY');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer inline-flex items-center gap-1.5"
                          >
                            ⚠️ Flag Missing Video
                          </button>
                        </div>
                      )}

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900">
                            Auditor Video Stream Verification Checklist
                          </span>
                          <button
                            onClick={() => handleSaveAuditDraft('VIDEO')}
                            disabled={savingDraft}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer hover:bg-emerald-700 transition-colors"
                          >
                            Log Video Reviewed ✓
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          {[
                            { key: 'playable', label: 'Video Playable?' },
                            { key: 'audioWorking', label: 'Audio Working?' },
                            { key: 'correctContent', label: 'Correct Lecture?' },
                            { key: 'durationAccurate', label: 'Duration Correct?' },
                            { key: 'drmProtected', label: 'Signed DRM Protected?' }
                          ].map((chk) => (
                            <label
                              key={chk.key}
                              className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300"
                            >
                              <input
                                type="checkbox"
                                checked={(videoChecklist as any)[chk.key]}
                                onChange={(e) =>
                                  setVideoChecklist({
                                    ...videoChecklist,
                                    [chk.key]: e.target.checked
                                  })
                                }
                                className="accent-emerald-600"
                              />
                              <span className="font-semibold text-slate-700">{chk.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Quiz / Assessment Inspector (if lecture is Quiz or has Quiz attached) */}
                  {(selectedLesson.type === 'QUIZ' || selectedLesson.quiz || selectedLesson.quizData) && (() => {
                    let questions: any[] = [];
                    if (selectedLesson.quiz?.questions && Array.isArray(selectedLesson.quiz.questions)) {
                      questions = selectedLesson.quiz.questions;
                    } else if (selectedLesson.quizData) {
                      try {
                        const parsed = typeof selectedLesson.quizData === 'string' ? JSON.parse(selectedLesson.quizData) : selectedLesson.quizData;
                        questions = parsed?.questions || [];
                      } catch {}
                    }
                    const qPassing = selectedLesson.quiz?.passingScore || 70;
                    const qTime = selectedLesson.quiz?.timeLimit || 15;

                    return (
                      <div className="space-y-4 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-indigo-700">
                              Quiz Assessment Verification
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                              {selectedLesson.quiz?.title || selectedLesson.title} ({questions.length} Questions)
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-white border border-indigo-200 text-indigo-800">
                              Pass: {qPassing}% • Limit: {qTime}m
                            </span>
                            <button
                              onClick={() => handleSaveAuditDraft('QUIZ')}
                              disabled={savingDraft}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                            >
                              Log Quiz Reviewed ✓
                            </button>
                          </div>
                        </div>

                        {questions.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3 text-center">
                            No quiz questions configured for this assessment yet.
                          </p>
                        ) : (
                          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                            {questions.map((q: any, qIdx: number) => {
                              let opts: string[] = [];
                              try {
                                opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options || [];
                              } catch {
                                opts = [];
                              }
                              return (
                                <div key={q.id || qIdx} className="p-3.5 rounded-xl bg-white border border-indigo-100 space-y-2 text-xs">
                                  <div className="font-bold text-slate-900">
                                    Q{qIdx + 1}: {q.question}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {opts.map((opt: string, oIdx: number) => {
                                      const isCorrect = String(q.correctAnswer) === String(opt) || String(q.correctAnswer) === String(oIdx);
                                      return (
                                        <div
                                          key={oIdx}
                                          className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                                            isCorrect
                                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                              : 'bg-slate-50 border-slate-200 text-slate-700'
                                          }`}
                                        >
                                          <span>{opt}</span>
                                          {isCorrect && (
                                            <span className="text-[10px] font-mono text-emerald-700 font-bold">
                                              Correct ✓
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {q.explanation && (
                                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                      <strong>Explanation:</strong> {q.explanation}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 3. Text Article / Lecture Content Inspector */}
                  {(selectedLesson.type === 'TEXT' || (selectedLesson.content && selectedLesson.type !== 'VIDEO')) && (
                    <div className="space-y-3 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-900">Lecture Text Notes &amp; Reading Material</span>
                        <span className="text-[10px] font-mono text-slate-500">Student Classroom View</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[380px] overflow-y-auto">
                        {selectedLesson.content || 'No text notes provided for this lecture.'}
                      </div>
                    </div>
                  )}

                  {/* 4. PDF Document Verification */}
                  {(selectedLesson.type === 'PDF' || selectedLesson.pdfUrl) && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-rose-900">
                            PDF Document Verification &amp; DRM Policy
                          </div>
                          <div className="text-[11px] text-rose-700">
                            Download Permission:{' '}
                            {securityPolicy?.allowPdfDownload
                              ? 'Download Allowed'
                              : 'View-Only (#toolbar=0)'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSaveAuditDraft('PDF')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors"
                        >
                          Log PDF Reviewed ✓
                        </button>
                      </div>

                      {selectedLesson.pdfUrl ? (
                        <div className="w-full h-[460px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                          <iframe
                            src={selectedLesson.pdfUrl}
                            title={selectedLesson.title}
                            className="w-full h-full border-0"
                          />
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                          No PDF URL attached to this lesson.
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. Attached Multi-Format Study Resources (PDF, Doc, Image, External Links) */}
                  {(() => {
                    const attachedResources = getLessonResources(selectedLesson);
                    if (attachedResources.length === 0) return null;

                    return (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📁</span>
                            <span className="text-xs font-extrabold text-slate-900">
                              Attached Study Resources ({attachedResources.length})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Multi-Format Lecture Downloads &amp; Reference Docs
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {attachedResources.map((res, rIdx) => (
                            <div
                              key={res.id || rIdx}
                              className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-indigo-300 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-base shrink-0">
                                  {res.type === 'PDF' ? '📄' : res.type === 'DOC' ? '📝' : res.type === 'IMAGE' ? '🖼️' : res.type === 'ZIP' ? '📦' : '🔗'}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 truncate" title={res.name}>
                                    {res.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 uppercase font-mono">
                                    {res.type} Document
                                  </div>
                                </div>
                              </div>

                              <a
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={res.type !== 'LINK'}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 shrink-0 transition-colors flex items-center gap-1"
                              >
                                <span>Inspect</span>
                                <span>↗</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: COURSE OVERVIEW & COMMERCIAL / PRICING REVIEW (Requirements #3, #9) */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                Course Overview & Metadata Summary
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Category</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {course.category?.name || 'General'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Difficulty Level</div>
                  <div className="font-bold text-slate-900 mt-0.5">{course.level}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Language</div>
                  <div className="font-bold text-slate-900 mt-0.5">{course.language}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Total Duration</div>
                  <div className="font-bold text-slate-900 mt-0.5">{course.durationHours} hrs</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 mb-1">Short Description</div>
                <p className="text-xs text-slate-600 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  {course.shortDescription || 'Not specified'}
                </p>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 mb-1">Full Course Description</div>
                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed p-4 rounded-xl bg-slate-50 border border-slate-200">
                  {course.description}
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Pricing & Commercial Review */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Pricing & Commercial Review
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    sectionStatuses.pricing === 'PASSED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {sectionStatuses.pricing === 'PASSED' ? '✅ Passed' : '⚠️ Flagged'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Commercial Tier</span>
                  <span className="font-bold text-slate-900">
                    {course.price > 0 ? 'PAID MASTERCLASS' : 'FREE COURSE'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Final Selling Price</span>
                  <span className="text-base font-black text-emerald-700">
                    ₹{Number(course.price || 0).toLocaleString('en-IN')} ({course.currency || 'INR'})
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Original / List Price</span>
                  <span className="font-bold text-slate-700">
                    {course.discountPrice ? `₹${course.discountPrice}` : 'No discount'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Student Access Window</span>
                  <span className="font-bold text-slate-900">
                    {course.accessType === 'LIMITED_DAYS'
                      ? `${course.accessDays} Days`
                      : 'Lifetime Access'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setNewIssueSection('Pricing');
                  setActiveTab('ISSUES_HISTORY');
                }}
                className="w-full py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold cursor-pointer"
              >
                ⚠️ Flag Suspicious / Incorrect Pricing
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: QUIZ & ASSESSMENT REVIEW (Requirement #7) */}
        {activeTab === 'QUIZZES' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">
                Course Quizzes & Question Key Verification ({(course.quizzes || []).length})
              </h3>

              {(course.quizzes || []).length === 0 ? (
                <p className="text-xs text-slate-500">No quizzes attached to this course yet.</p>
              ) : (
                <div className="space-y-6">
                  {course.quizzes.map((qz: any) => (
                    <div
                      key={qz.id}
                      className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{qz.title}</h4>
                          <p className="text-xs text-slate-500">{qz.description}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <span className="px-2.5 py-1 rounded bg-white border border-slate-200">
                            Passing Score: {qz.passingScore}%
                          </span>
                          <span className="px-2.5 py-1 rounded bg-white border border-slate-200">
                            Time Limit: {qz.timeLimit || 15} mins
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(qz.questions || []).map((q: any, qIdx: number) => {
                          let opts: string[] = [];
                          try {
                            opts = JSON.parse(q.options || '[]');
                          } catch {}
                          return (
                            <div
                              key={q.id}
                              className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs"
                            >
                              <div className="font-bold text-slate-900">
                                Question {qIdx + 1}: {q.question}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {opts.map((opt, oIdx) => {
                                  const isCorrect =
                                    String(q.correctAnswer) === String(opt) ||
                                    String(q.correctAnswer) === String(oIdx);
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`p-2 rounded-lg border flex items-center gap-2 ${
                                        isCorrect
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                          : 'bg-slate-50 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <span>{isCorrect ? '●' : '○'}</span>
                                      <span>{opt}</span>
                                      {isCorrect && (
                                        <span className="ml-auto text-[10px] font-mono text-emerald-700">
                                          Correct Answer ✓
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {q.explanation && (
                                <div className="text-[11px] text-slate-500 pt-1">
                                  <strong>Explanation:</strong> {q.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LEARNING OUTCOMES VS CURRICULUM MAPPING (Requirement #8) */}
        {activeTab === 'OUTCOMES' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Learning Outcomes → Related Curriculum Lessons Alignment
              </h3>
              <p className="text-xs text-slate-500">
                Verify that every promised learning outcome is backed by actual lectures in the syllabus.
              </p>
            </div>

            <div className="space-y-3">
              {(course.outcomeMappings || []).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-black">✓</span>
                    <span className="text-xs font-bold text-slate-900">{item.outcome}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 mr-1">
                      Related Lessons:
                    </span>
                    {(item.relatedLessons || []).map((rl: any) => (
                      <span
                        key={rl.id}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-indigo-700"
                      >
                        {rl.moduleTitle}: {rl.title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: VERSION COMPARISON DIFF (v1.0 LIVE VS v2.0 STAGED — Requirement #11 & #17) */}
        {activeTab === 'VERSION_DIFF' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  LIVE VERSION ({versionState?.liveVersionLabel || 'v1.0'}) vs STAGED VERSION (
                  {versionState?.pendingVersionLabel || 'v2.0'}) Diff View
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect exact curriculum, video, PDF, and pricing changes without re-auditing unchanged modules blindly.
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  LIVE: {versionState?.liveVersionLabel || 'v1.0'}
                </span>
                <span>→</span>
                <span className="px-3 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                  STAGED: {versionState?.pendingVersionLabel || 'v2.0'}
                </span>
              </div>
            </div>

            {!versionDiff || versionDiff.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                This course is currently at initial version <strong>v1.0</strong> (no pending v2.0 staged delta).
              </div>
            ) : (
              <div className="space-y-3">
                {versionDiff.map((diff: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800">
                        {diff.badge}
                      </span>
                      <div className="text-xs font-bold text-slate-900">{diff.title}</div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        v1.0: {diff.before}
                      </span>
                      <span>→</span>
                      <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        v2.0: {diff.after}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Archived Rollback Versions */}
            {Array.isArray(auditMeta?.archivedVersions) &&
              auditMeta.archivedVersions.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-800">
                    Preserved Archived Versions (Rollback History)
                  </h4>
                  {auditMeta.archivedVersions.map((arch: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono"
                    >
                      <span>
                        {arch.versionLabel} → <strong>{arch.status}</strong>
                      </span>
                      <span className="text-slate-500">
                        Archived: {new Date(arch.archivedAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* TAB 6: SECTION-WISE ISSUES, INTERNAL AUDITOR NOTES & REVIEW HISTORY (Requirements #12, #13, #21) */}
        {activeTab === 'ISSUES_HISTORY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Section-Wise Issues Builder */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Section-Wise Issues for Instructor ({sectionIssues.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Tag exact module/lesson issues so the instructor knows precisely what to fix on{' '}
                  <code>/instructor/course/{course.id}/review</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Section
                    </label>
                    <select
                      value={newIssueSection}
                      onChange={(e) => setNewIssueSection(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold bg-white"
                    >
                      <option value="Video">Video</option>
                      <option value="Curriculum">Curriculum</option>
                      <option value="PDF">PDF</option>
                      <option value="Quiz">Quiz</option>
                      <option value="Pricing">Pricing</option>
                      <option value="Learning Outcomes">Learning Outcomes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Module → Lesson Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={newIssueLessonRef}
                      onChange={(e) => setNewIssueLessonRef(e.target.value)}
                      placeholder="e.g. Module 3 → Lesson 4"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Issue Summary
                  </label>
                  <input
                    type="text"
                    value={newIssueTitle}
                    onChange={(e) => setNewIssueTitle(e.target.value)}
                    placeholder="e.g. Video quality is poor / Audio out of sync"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Actionable Comment for Instructor
                  </label>
                  <textarea
                    rows={2}
                    value={newIssueComment}
                    onChange={(e) => setNewIssueComment(e.target.value)}
                    placeholder="e.g. Please replace the current video with a 1080p HD version."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleAddSectionIssue}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                  >
                    + Add Section Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveAuditDraft()}
                    disabled={savingDraft}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                  >
                    Save Issues Checklist
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {sectionIssues.map((iss) => (
                  <div
                    key={iss.id}
                    className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                          {iss.section}
                        </span>
                        {iss.lessonRef && (
                          <span className="font-mono font-bold text-rose-900">
                            {iss.lessonRef}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900">{iss.issue}</div>
                      <div className="text-slate-600">{iss.comment}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveIssue(iss.id)}
                      className="text-rose-500 hover:text-rose-800 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 Columns: Internal Auditor Notes (Hidden from Instructor) & Review History */}
            <div className="lg:col-span-5 space-y-6">
              {/* Internal Notes (Requirement #12) */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                      Confidential Auditor Workspace
                    </span>
                    <h3 className="text-sm font-extrabold">
                      Internal Review Notes (Hidden from Instructor)
                    </h3>
                  </div>
                  <Icon name="lock" size={18} className="text-emerald-400" />
                </div>

                <textarea
                  rows={3}
                  value={internalNoteInput}
                  onChange={(e) => setInternalNoteInput(e.target.value)}
                  placeholder="Add internal audit notes (e.g. Video 4 needs secondary DRM verification)..."
                  className="w-full rounded-xl bg-slate-950 border border-white/15 p-3 text-xs text-white"
                />

                <button
                  onClick={() => handleSaveAuditDraft()}
                  disabled={savingDraft || !internalNoteInput.trim()}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  Save Confidential Internal Note
                </button>

                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {(auditMeta?.internalNotes || []).map((n: any) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1"
                    >
                      <div className="flex justify-between text-[10px] font-mono text-emerald-300">
                        <span>{n.authorName}</span>
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-200">{n.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Review History (Requirement #21) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Complete Review History Timeline
                </h3>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {(auditMeta?.reviewHistory || []).length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Initial submission queued for review.
                    </p>
                  ) : (
                    auditMeta.reviewHistory.map((h: any) => (
                      <div
                        key={h.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                          <span>
                            {new Date(h.timestamp).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="font-bold text-indigo-600">{h.action}</span>
                        </div>
                        <div className="font-bold text-slate-800">
                          {h.actorRole}: {h.actorName} ({h.versionLabel})
                        </div>
                        {h.feedback && (
                          <p className="text-slate-600 italic">&quot;{h.feedback}&quot;</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DECISION MODALS: APPROVE / REQUEST_CHANGES / REJECT (Requirements #14, #15, #16, #17) */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {decisionModal === 'APPROVE'
                  ? isStagedVersionReview
                    ? `Approve & Promote ${versionLabel} to LIVE?`
                    : 'Approve Course?'
                  : decisionModal === 'REQUEST_CHANGES'
                  ? 'Request Course Changes ⚠️'
                  : 'Reject Course ❌'}
              </h3>
              <button onClick={() => setDecisionModal(null)} className="text-slate-400">
                ✕
              </button>
            </div>

            {decisionModal === 'APPROVE' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                {isStagedVersionReview ? (
                  <>
                    <div className="font-extrabold">
                      Staged Major Update ({versionLabel}) → LIVE Promotion
                    </div>
                    <p>
                      Approving <strong>{versionLabel}</strong> will apply the updated curriculum/media to the live course and preserve <strong>v1.0 as ARCHIVED</strong> for rollback.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="font-extrabold">Status: IN_REVIEW → APPROVED</div>
                    <p>
                      This course will become <strong>APPROVED</strong>. The instructor will be notified and can now publish it live in 1 click.
                    </p>
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {decisionModal === 'APPROVE'
                  ? 'Optional Approval Note for Instructor'
                  : decisionModal === 'REQUEST_CHANGES'
                  ? 'Critique / Feedback (Mandatory — Minimum 10 characters) *'
                  : 'Mandatory Rejection Reason (Minimum 10 characters) *'}
              </label>
              <textarea
                rows={4}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder={
                  decisionModal === 'APPROVE'
                    ? 'Great curriculum structure and clear HD video streams!'
                    : 'Please explain exactly what needs to be changed before approval...'
                }
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800"
              />
              {decisionModal !== 'APPROVE' && (
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Characters: {decisionNote.trim().length} / 10 minimum required
                </div>
              )}
            </div>

            {decisionModal === 'REJECT' && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmRejectCompliance}
                  onChange={(e) => setConfirmRejectCompliance(e.target.checked)}
                  className="mt-0.5 accent-rose-600"
                />
                <span className="font-semibold">
                  I confirm that the course does not meet the platform review requirements.
                </span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDecision}
                disabled={
                  submittingDecision ||
                  (decisionModal !== 'APPROVE' && decisionNote.trim().length < 10) ||
                  (decisionModal === 'REJECT' && !confirmRejectCompliance)
                }
                className={`px-5 py-2 rounded-xl text-white text-xs font-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  decisionModal === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : decisionModal === 'REQUEST_CHANGES'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingDecision
                  ? 'Submitting...'
                  : decisionModal === 'APPROVE'
                  ? 'Approve'
                  : decisionModal === 'REQUEST_CHANGES'
                  ? 'Submit Request Changes'
                  : 'Reject Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuditorPortalShell>
  );
}
