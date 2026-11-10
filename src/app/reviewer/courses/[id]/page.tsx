'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuditorPortalShell } from '@/components/reviewer/AuditorPortalShell';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { notifyCoursesChanged } from '@/lib/courses-sync';
import {
  Check,
  X,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Eye,
  Save,
  ShieldCheck,
  Play,
  FileText,
  HelpCircle,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  MessageSquare,
  Paperclip
} from 'lucide-react';

type AuditStep = 1 | 2 | 3 | 4 | 5;
type VerdictAction = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

interface SectionAuditState {
  status: VerdictAction;
  feedback: string;
}

function parseQuizData(lesson: any) {
  let questions: any[] = [];
  let passingScore = 70;
  let attemptLimit = 0;
  let title = lesson?.title || 'Quiz';
  let description = lesson?.description || '';

  if (lesson?.quizData) {
    try {
      const parsed = typeof lesson.quizData === 'string' ? JSON.parse(lesson.quizData) : lesson.quizData;
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed && typeof parsed === 'object') {
        questions = Array.isArray(parsed.questions) ? parsed.questions : [];
        if (parsed.passingScore !== undefined) passingScore = Number(parsed.passingScore);
        if (parsed.attemptLimit !== undefined) attemptLimit = Number(parsed.attemptLimit);
        if (parsed.title) title = parsed.title;
        if (parsed.description) description = parsed.description;
      }
    } catch {
      // ignore parse error
    }
  }

  // Fallback to relational lesson.quiz
  if (questions.length === 0 && lesson?.quiz) {
    passingScore = lesson.quiz.passingScore ?? 70;
    attemptLimit = lesson.quiz.maxAttempts ?? 0;
    title = lesson.quiz.title || title;
    description = lesson.quiz.description || description;
    if (Array.isArray(lesson.quiz.questions)) {
      questions = lesson.quiz.questions.map((q: any, qIdx: number) => {
        let opts: string[] = [];
        let correctIdx = -1;
        if (Array.isArray(q.options)) {
          opts = q.options.map((o: any, idx: number) => {
            if (o.isCorrect) correctIdx = idx;
            return typeof o === 'string' ? o : o.text || `Option ${idx + 1}`;
          });
        }
        return {
          id: q.id || `q-${qIdx}`,
          question: q.question,
          options: opts.length > 0 ? opts : ['True', 'False'],
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
          explanation: q.explanation || '',
          points: 10
        };
      });
    }
  }

  return { title, description, questions, passingScore, attemptLimit };
}

function parseResourcesData(lesson: any): Array<{ title: string; url: string; size?: string; type?: string }> {
  const items: Array<{ title: string; url: string; size?: string; type?: string }> = [];

  if (lesson?.fileUrl) {
    items.push({
      title: `${lesson.title} - Downloadable Attachment`,
      url: lesson.fileUrl,
      type: 'Direct File Download'
    });
  }
  if (lesson?.pdfUrl) {
    items.push({
      title: `${lesson.title} - PDF Document`,
      url: lesson.pdfUrl,
      type: 'PDF Document'
    });
  }
  if (lesson?.resources) {
    try {
      const parsed = typeof lesson.resources === 'string' ? JSON.parse(lesson.resources) : lesson.resources;
      if (Array.isArray(parsed)) {
        parsed.forEach((r: any) => {
          if (r && (r.url || r.fileUrl || typeof r === 'string')) {
            const url = r.url || r.fileUrl || r;
            items.push({
              title: r.title || r.name || 'Resource File',
              url: typeof url === 'string' ? url : '#',
              size: r.size,
              type: r.type || 'Attachment'
            });
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        const fileArr = Array.isArray(parsed.files)
          ? parsed.files
          : Array.isArray(parsed.resources)
          ? parsed.resources
          : Array.isArray(parsed.subLessons)
          ? parsed.subLessons
          : [];
        fileArr.forEach((r: any) => {
          if (r && (r.url || r.fileUrl)) {
            items.push({
              title: r.title || r.name || 'Resource File',
              url: r.url || r.fileUrl,
              size: r.size,
              type: r.type || 'Attachment'
            });
          }
        });
      }
    } catch {
      // ignore
    }
  }
  return items;
}

export default function AuditorCourseInspectPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.id as string) || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stepped Review Navigation (1 to 5) - Pricing & Access omitted as requested
  const [currentStep, setCurrentStep] = useState<AuditStep>(1);

  // Section Audits state
  const [sectionAudits, setSectionAudits] = useState<Record<string, SectionAuditState>>({
    basics: { status: 'APPROVED', feedback: '' },
    outcomes: { status: 'APPROVED', feedback: '' },
    seo: { status: 'APPROVED', feedback: '' },
    curriculum: { status: 'APPROVED', feedback: '' },
    media: { status: 'APPROVED', feedback: '' },
    assessment: { status: 'APPROVED', feedback: '' }
  });

  // Specific item issues (e.g. video lecture, PDF, quiz)
  const [itemIssues, setItemIssues] = useState<
    Record<string, { status: VerdictAction; feedback: string; title: string; type: string }>
  >({});

  // Active video in curriculum player
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title: string;
    videoUrl?: string;
    duration?: string;
    moduleTitle?: string;
  } | null>(null);

  // Submitting final verdict
  const [submittingVerdict, setSubmittingVerdict] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [overallComments, setOverallComments] = useState('');
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [modalComment, setModalComment] = useState('');
  // Active inspection modal state (Quiz / Article / PDF / Resource)
  const [inspectModal, setInspectModal] = useState<{
    type: 'QUIZ' | 'ARTICLE' | 'PDF' | 'RESOURCE';
    lessonId: string;
    lessonTitle: string;
    moduleTitle: string;
    itemType: string;
    data: any;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc?: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Step 4: Final Assessment sub-tab and quiz accordion state
  const [assessmentSubTab, setAssessmentSubTab] = useState<'FINAL' | 'MODULE_QUIZZES'>('FINAL');
  const [expandedQuizAccordion, setExpandedQuizAccordion] = useState<Record<string, boolean>>({});

  const showToast = (title: string, desc?: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load course details');

      setData(json);

      if (json.course?.reviewFeedback) {
        setOverallComments(json.course.reviewFeedback);
      }

      // Pre-select first video if available
      const firstSection = json.course?.sections?.[0];
      const firstVideoLesson = firstSection?.lessons?.find((l: any) => l.videoUrl || l.type === 'VIDEO');
      if (firstVideoLesson) {
        setActiveVideo({
          id: firstVideoLesson.id,
          title: firstVideoLesson.title,
          videoUrl: firstVideoLesson.videoUrl,
          duration: firstVideoLesson.duration,
          moduleTitle: firstSection.title
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error loading course details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId]);

  // Extract Final Assessment and Module Quizzes with 100% fallback reliability
  const { finalAssessment, moduleQuizzes } = React.useMemo(() => {
    let finalAss = data?.course?.finalAssessment || null;
    let allQuizzes: any[] = Array.isArray(data?.course?.quizzes) ? [...data.course.quizzes] : [];

    if (data?.course?.sections) {
      const allLessons = data.course.sections.flatMap((s: any) =>
        (s.lessons || []).map((l: any) => ({
          ...l,
          sectionTitle: s.title
        }))
      );

      const quizLessons = allLessons.filter(
        (l: any) => l.type === 'QUIZ' || l.quizData || (l.quiz && l.quiz.id)
      );

      if (!finalAss) {
        const finalCandidate =
          allLessons.find(
            (l: any) =>
              Boolean(l.isFinalAssignment) ||
              (l.type === 'QUIZ' && /final\s*(assessment|assignment|exam|test)/i.test(l.title || '')) ||
              /final\s*(assessment|assignment|exam|test)/i.test(l.title || '')
          ) || (quizLessons.length > 0 ? quizLessons[quizLessons.length - 1] : null);

        if (finalCandidate) {
          const qInfo = parseQuizData(finalCandidate);
          finalAss = {
            id: finalCandidate.id,
            lessonId: finalCandidate.id,
            sectionTitle: finalCandidate.sectionTitle || 'Course Final Module',
            title: qInfo.title || finalCandidate.title || 'Final Assessment',
            description: qInfo.description || finalCandidate.description || '',
            passingScore: qInfo.passingScore || 80,
            attemptLimit: qInfo.attemptLimit ?? 0,
            isFinalAssessment: true,
            questions: qInfo.questions || [],
            totalQuestions: qInfo.questions?.length || 0
          };
        }
      }

      // Populate any missing quiz lessons into allQuizzes
      quizLessons.forEach((ql: any) => {
        if (!allQuizzes.some((q) => q.id === ql.id || q.lessonId === ql.id)) {
          const qInfo = parseQuizData(ql);
          const isThisFinal = finalAss && (finalAss.id === ql.id || finalAss.lessonId === ql.id);
          allQuizzes.push({
            id: ql.id,
            lessonId: ql.id,
            sectionTitle: ql.sectionTitle || 'Module Quiz',
            title: qInfo.title || ql.title || (isThisFinal ? 'Final Assessment' : 'Quiz'),
            description: qInfo.description || ql.description || '',
            passingScore: qInfo.passingScore || (isThisFinal ? 80 : 70),
            attemptLimit: qInfo.attemptLimit ?? 0,
            isFinalAssessment: isThisFinal,
            questions: qInfo.questions || [],
            totalQuestions: qInfo.questions?.length || 0
          });
        }
      });
    }

    const modQuizzes = allQuizzes.filter((q) => {
      if (finalAss && (q.id === finalAss.id || q.lessonId === finalAss.lessonId || q.isFinalAssessment)) {
        return false;
      }
      return true;
    });

    return {
      finalAssessment: finalAss,
      moduleQuizzes: modQuizzes
    };
  }, [data]);

  const handleSetSectionStatus = (sectionKey: string, status: VerdictAction) => {
    setSectionAudits((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        status
      }
    }));
  };

  const handleSetSectionFeedback = (sectionKey: string, feedback: string) => {
    setSectionAudits((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        feedback
      }
    }));
  };

  const handleSetItemIssue = (
    itemId: string,
    title: string,
    type: string,
    status: VerdictAction,
    feedback: string
  ) => {
    setItemIssues((prev) => ({
      ...prev,
      [itemId]: { status, feedback, title, type }
    }));
  };

  // Compile combined feedback for instructor
  const getDiscrepanciesList = () => {
    const list: Array<{ target: string; status: VerdictAction; feedback: string }> = [];

    // Check main sections
    Object.entries(sectionAudits).forEach(([sec, val]) => {
      if (val.status !== 'APPROVED') {
        const labels: Record<string, string> = {
          basics: 'Course Basics & Classification',
          outcomes: 'Learning Outcomes & Prerequisites',
          seo: 'SEO & Search Engine Optimization',
          curriculum: 'Course Curriculum & Syllabus',
          media: 'Course Media & Promotional Thumbnail',
          assessment: 'Final Assessment & Quizzes'
        };
        list.push({
          target: labels[sec] || sec,
          status: val.status,
          feedback: val.feedback || (val.status === 'CHANGES_REQUESTED' ? 'Needs revision before publication.' : 'Non-compliant with platform standards.')
        });
      }
    });

    // Check specific lessons/items
    Object.entries(itemIssues).forEach(([id, item]) => {
      if (item.status !== 'APPROVED') {
        list.push({
          target: `${item.type}: "${item.title}"`,
          status: item.status,
          feedback: item.feedback || 'Discrepancy noted by auditor.'
        });
      }
    });

    return list;
  };

  // Submit Final Verdict (APPROVE / REQUEST_CHANGES / REJECT)
  const handleSubmitVerdict = async (action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT') => {
    if (action === 'REQUEST_CHANGES') {
      setModalComment(overallComments);
      setShowChangesModal(true);
      return;
    }

    const discrepancies = getDiscrepanciesList();

    if (action === 'APPROVE' && discrepancies.length > 0) {
      showToast(
        'Approval Blocked',
        `Approval is disabled because ${discrepancies.length} item(s) have requested changes or rejections. Please resolve all issues or click "Send Changes Request to Instructor".`,
        'error'
      );
      return;
    }

    try {
      setSubmittingVerdict(true);

      let finalNote = '';
      if (action === 'APPROVE') {
        finalNote = overallComments.trim() || 'Congratulations! Course curriculum, video playback, and syllabus verified and approved by Auditor.';
      } else {
        finalNote = overallComments.trim() || 'Course submission rejected: Content does not satisfy quality guidelines.';
      }

      const res = await fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: finalNote,
          confirmNonCompliance: true
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Review decision failed');

      showToast(
        action === 'APPROVE' ? 'Course Approved ✅' : 'Course Rejected ❌',
        action === 'APPROVE'
          ? 'Instructor has been notified and course is approved!'
          : 'Rejection decision sent to instructor.',
        'success'
      );

      notifyCoursesChanged();
      setTimeout(() => {
        router.push('/reviewer/inspect');
      }, 1500);
    } catch (err: any) {
      showToast('Verdict Submission Failed', err.message || 'Server error', 'error');
    } finally {
      setSubmittingVerdict(false);
    }
  };

  const executeSendChanges = async (instructions: string) => {
    const discrepancies = getDiscrepanciesList();

    try {
      setSubmittingVerdict(true);

      const parts: string[] = [];
      if (instructions && instructions.trim()) {
        parts.push(`📝 AUDITOR INSTRUCTIONS / CHANGES REQUIRED:\n${instructions.trim()}`);
      } else if (overallComments.trim()) {
        parts.push(`📝 AUDITOR INSTRUCTIONS / CHANGES REQUIRED:\n${overallComments.trim()}`);
      }

      if (discrepancies.length > 0) {
        parts.push('⚠️ FLAGGED SECTION & LESSON DISCREPANCIES:');
        discrepancies.forEach((d, idx) => {
          parts.push(`${idx + 1}. [${d.target}] (${d.status === 'CHANGES_REQUESTED' ? 'Revision Needed' : 'Issue'}): ${d.feedback}`);
        });
      }

      const finalNote = parts.join('\n\n') || 'Please review requested curriculum updates and resubmit.';

      const mappedSectionIssues = discrepancies.map((d, idx) => ({
        id: `iss_${Date.now()}_${idx}`,
        section: (d.target.includes('Video')
          ? 'Video'
          : d.target.includes('Quiz')
          ? 'Quiz'
          : d.target.includes('PDF')
          ? 'PDF'
          : d.target.includes('Curriculum') || d.target.includes('Module')
          ? 'Curriculum'
          : 'Learning Outcomes') as 'Video' | 'Quiz' | 'PDF' | 'Curriculum' | 'Learning Outcomes',
        lessonRef: d.target,
        issue: d.status === 'CHANGES_REQUESTED' ? 'Revision Requested' : 'Rejected',
        comment: d.feedback,
        resolved: false,
        createdAt: new Date().toISOString()
      }));

      const res = await fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_CHANGES',
          note: finalNote,
          sectionIssues: mappedSectionIssues,
          confirmNonCompliance: true
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit changes request');

      setShowChangesModal(false);
      showToast(
        'Changes Request Sent ⚠️',
        'Detailed critiques and required change instructions have been dispatched to the instructor.',
        'success'
      );

      notifyCoursesChanged();
      setTimeout(() => {
        router.push('/reviewer/inspect');
      }, 1500);
    } catch (err: any) {
      showToast('Submission Failed', err.message || 'Server error', 'error');
    } finally {
      setSubmittingVerdict(false);
    }
  };

  const renderSectionActionBar = (
    secKey: string,
    secName: string,
    nextStep?: AuditStep,
    nextLabel?: string
  ) => {
    const audit = sectionAudits[secKey] || { status: 'APPROVED', feedback: '' };

    return (
      <div className="bg-slate-50/90 border-t border-slate-200 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetSectionStatus(secKey, 'APPROVED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                audit.status === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Section</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetSectionStatus(secKey, 'REJECTED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                audit.status === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject Section</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetSectionStatus(secKey, 'CHANGES_REQUESTED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                audit.status === 'CHANGES_REQUESTED'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Request Changes</span>
            </button>
          </div>

          {nextStep && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(nextStep)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
              >
                <span>Next: {nextLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Comment field: Auditor instructions on required changes for instructor */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            audit.status === 'CHANGES_REQUESTED'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/30'
              : audit.status === 'REJECTED'
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/30'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              {audit.status === 'CHANGES_REQUESTED'
                ? `⚠️ Required Changes for ${secName} (Auditor Feedback for Instructor):`
                : audit.status === 'REJECTED'
                ? `❌ Rejection Reason / Critique for ${secName}:`
                : `💬 Auditor Feedback / Comments on ${secName} (Optional):`}
            </span>
            {audit.status === 'CHANGES_REQUESTED' && (
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                Changes Required
              </span>
            )}
          </div>
          <textarea
            rows={2}
            value={audit.feedback}
            onChange={(e) => handleSetSectionFeedback(secKey, e.target.value)}
            placeholder={
              audit.status === 'CHANGES_REQUESTED'
                ? `Specify what the instructor needs to modify or correct in ${secName} (e.g. clarify course title, add prerequisites)...`
                : `Enter auditor feedback or evaluation notes for ${secName}...`
            }
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium placeholder:text-slate-400"
          />
        </div>
      </div>
    );
  };

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      await fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_AUDIT_DRAFT',
          internalNote: 'Auditor draft progress saved.'
        })
      });
      showToast('Draft Saved 💾', 'Your current section reviews have been saved.');
    } catch (err: any) {
      showToast('Draft Error', err.message || 'Could not save draft', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  const course = data?.course;
  const discrepancies = getDiscrepanciesList();

  const stepLabels: Record<AuditStep, string> = {
    1: 'Basic Information',
    2: 'Course Curriculum',
    3: 'Media & Thumbnail',
    4: 'Final Assessment',
    5: 'Review & Submit'
  };

  return (
    <AuditorPortalShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-24">
        {/* Toast */}
        {toastMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
              toastMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : toastMsg.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div>
              <span className="font-bold">{toastMsg.title}</span>
              {toastMsg.desc && <span className="ml-2 font-normal">{toastMsg.desc}</span>}
            </div>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* 1. Header Banner: "AUDITOR PANEL / REVIEW MODE" matching image */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-6 py-1.5 rounded-2xl bg-gradient-to-r from-orange-100 via-rose-100 to-amber-100 border border-orange-200/80 shadow-2xs">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
              AUDITOR PANEL / REVIEW MODE
            </span>
          </div>
        </div>

        {/* Course Metadata Bar: Version, Submission Type, Status, Course ID */}
        {course && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900 text-white">
                  ID: {course.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {data?.versionLabel || 'v1.0'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {data?.submissionType === 'MAJOR_UPDATE'
                    ? 'Major Update (v2.0)'
                    : data?.submissionType === 'RESUBMISSION'
                    ? 'Resubmission'
                    : 'New Course (v1.0)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{course.status}</span>
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {course.title}
              </h1>
              <div className="text-xs text-slate-500">
                Instructor: <strong className="text-slate-800">{course.instructor?.name}</strong> ({course.instructor?.email})
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/reviewer/courses/${course.id}/preview`}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Student Preview</span>
              </Link>
              <Link
                href="/reviewer/inspect"
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Inspect List</span>
              </Link>
            </div>
          </div>
        )}

        {/* 2. Step Navigation Tabs matching image (Pricing & Access excluded) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto shadow-2xs">
          {[
            { step: 1 as AuditStep, num: '1', title: 'Basic Information', auditTag: true },
            { step: 2 as AuditStep, num: '2', title: 'Course Curriculum', auditTag: false },
            { step: 3 as AuditStep, num: '3', title: 'Media & Thumbnail', auditTag: false },
            { step: 4 as AuditStep, num: '4', title: 'Final Assessment', auditTag: false },
            { step: 5 as AuditStep, num: '5', title: 'Review & Submit', auditTag: false }
          ].map((tab) => {
            const isActive = currentStep === tab.step;
            const isCompleted = currentStep > tab.step;
            return (
              <button
                key={tab.step}
                type="button"
                onClick={() => setCurrentStep(tab.step)}
                className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isCompleted
                    ? 'bg-slate-100/90 text-slate-800 hover:bg-slate-200'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    isActive
                      ? 'bg-white text-blue-600'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? '✓' : tab.num}
                </span>
                <span>{tab.title}</span>
                {tab.auditTag && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Audit
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-xs font-bold text-slate-700">Loading Course Audit Data...</div>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-rose-200 space-y-3">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <div className="text-sm font-bold text-slate-900">{error}</div>
            <button
              onClick={() => loadCourseData()}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          <div>
            {/* =========================================================================
                STEP 1: BASIC INFORMATION (Matching user's screenshot layout)
               ========================================================================= */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* 1. Course Basics & Classification */}
                <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Course Basics &amp; Classification
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Verify the essential identification, topic category, difficulty level, and core metadata.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Course Title */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>COURSE TITLE *</span>
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Review label
                          </span>
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={course.title}
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 cursor-default"
                        />
                      </div>

                      {/* Slug & Category */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>URL SLUG / IDENTIFIER</span>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Review label
                            </span>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={`/courses/${course.slug}`}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-700 cursor-default"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>CATEGORY *</span>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Category
                            </span>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={course.category?.name || 'General'}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 cursor-default"
                          />
                        </div>
                      </div>

                      {/* Level, Language, Duration */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>SKILL LEVEL</span>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={course.level || 'All Levels'}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 cursor-default"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>PRIMARY LANGUAGE</span>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={course.language || 'English'}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 cursor-default"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>ESTIMATED DURATION</span>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={course.duration || '12 hours'}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 cursor-default"
                          />
                        </div>
                      </div>

                      {/* Subtitle */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>SHORT DESCRIPTION / SUBTITLE</span>
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={course.subtitle || 'Master high-concurrency event-driven backends, service meshes, and resilient cloud deployments.'}
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-default"
                        />
                      </div>

                      {/* Full Description */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>FULL COURSE DESCRIPTION &amp; SYLLABUS OVERVIEW *</span>
                        </div>
                        <textarea
                          readOnly
                          rows={4}
                          value={course.description || ''}
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-default leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Review Action Bar */}
                  {renderSectionActionBar('basics', 'Course Basics & Classification')}
                </div>

                {/* 2. What You'll Learn, Requirements & Target Audience */}
                <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* What You'll Learn */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WHAT YOU&apos;LL LEARN</span>
                        </div>
                        <ul className="text-xs space-y-1.5 text-slate-700 list-disc list-inside">
                          {course.learningOutcomes?.length ? (
                            course.learningOutcomes.map((item: string, idx: number) => (
                              <li key={idx} className="leading-snug">{item}</li>
                            ))
                          ) : (
                            <li className="text-slate-400 italic">No explicit outcomes declared.</li>
                          )}
                        </ul>
                      </div>

                      {/* Before You Begin */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>BEFORE YOU BEGIN</span>
                        </div>
                        <ul className="text-xs space-y-1.5 text-slate-700 list-disc list-inside">
                          {course.requirementsList?.length ? (
                            course.requirementsList.map((item: string, idx: number) => (
                              <li key={idx} className="leading-snug">{item}</li>
                            ))
                          ) : (
                            <li className="text-slate-400 italic">Basic knowledge of course topic.</li>
                          )}
                        </ul>
                      </div>

                      {/* Target Audience */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>WHO THIS COURSE IS FOR</span>
                        </div>
                        <ul className="text-xs space-y-1.5 text-slate-700 list-disc list-inside">
                          {course.audienceList?.length ? (
                            course.audienceList.map((item: string, idx: number) => (
                              <li key={idx} className="leading-snug">{item}</li>
                            ))
                          ) : (
                            <li className="text-slate-400 italic">Software engineers, developers, and students.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Section Review Action Bar */}
                  {renderSectionActionBar('outcomes', 'Outcomes & Prerequisites')}
                </div>

                {/* 3. SEO & Search Engine Optimization */}
                <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        SEO &amp; Search Engine Optimization
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Optimize how this course appears in Google search engine snippets and social media previews.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">SEO TITLE TAG</label>
                        <input
                          type="text"
                          readOnly
                          value={course.seoTitle || course.title}
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-default"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">SEO META DESCRIPTION</label>
                        <input
                          type="text"
                          readOnly
                          value={course.seoDescription || course.subtitle || course.description?.substring(0, 140)}
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-default"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Review Action Bar */}
                  {renderSectionActionBar('seo', 'SEO Metadata', 2, 'Course Curriculum')}
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 2: COURSE CURRICULUM (Videos, PDFs, Quizzes, Articles)
               ========================================================================= */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Active Video Player Inspector */}
                {activeVideo?.videoUrl && (
                  <div className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-xl p-4 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold text-slate-300">Auditor Video Player</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-extrabold text-white truncate max-w-md">
                          {activeVideo.moduleTitle} &gt; {activeVideo.title}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                        DRM Protected Playback
                      </span>
                    </div>

                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black max-h-[480px]">
                      <VideoPlayer
                        videoUrl={activeVideo.videoUrl}
                        title={activeVideo.title}
                        lessonId={activeVideo.id}
                      />
                    </div>
                  </div>
                )}

                {/* Modules & Lectures List */}
                <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Course Curriculum &amp; Lecture Inspection
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Inspect playable video lessons, study PDFs, quizzes, and resources. Approve or flag revisions item by item.
                      </p>
                    </div>

                    <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-700">
                      {course.sections?.length || 0} Modules Total
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {course.sections?.map((section: any, sIdx: number) => (
                      <div key={section.id || sIdx} className="p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                              {sIdx + 1}
                            </span>
                            <h3 className="text-sm font-black text-slate-900">
                              {section.title}
                            </h3>
                            <span className="text-xs text-slate-400 font-medium">
                              ({section.lessons?.length || 0} items)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSetItemIssue(section.id, section.title, 'Module', 'APPROVED', '')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                                itemIssues[section.id]?.status === 'APPROVED'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              ✓ Approve Module
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSetItemIssue(
                                  section.id,
                                  section.title,
                                  'Module',
                                  'CHANGES_REQUESTED',
                                  itemIssues[section.id]?.feedback || ''
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                                itemIssues[section.id]?.status === 'CHANGES_REQUESTED'
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                              }`}
                            >
                              ⚠️ Request Changes
                            </button>
                          </div>
                        </div>

                        {itemIssues[section.id]?.status === 'CHANGES_REQUESTED' && (
                          <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-xs font-bold text-amber-900 shrink-0 flex items-center gap-1.5">
                              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                              Required Changes for Module:
                            </span>
                            <input
                              type="text"
                              value={itemIssues[section.id]?.feedback || ''}
                              onChange={(e) =>
                                handleSetItemIssue(section.id, section.title, 'Module', 'CHANGES_REQUESTED', e.target.value)
                              }
                              placeholder="e.g. Reorganize lecture order or attach introductory overview..."
                              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                              autoFocus
                            />
                          </div>
                        )}

                        {/* Lessons inside Module */}
                        <div className="grid grid-cols-1 gap-2.5 pl-2 sm:pl-4">
                          {section.lessons?.map((lesson: any, lIdx: number) => {
                            const isVideo = lesson.type === 'VIDEO' || Boolean(lesson.videoUrl);
                            const isQuiz = lesson.type === 'QUIZ' || Boolean(lesson.quizData) || Boolean(lesson.quiz);
                            const isPdf = lesson.type === 'DOCUMENT' || lesson.type === 'PDF' || Boolean(lesson.pdfUrl);
                            const isArticle =
                              lesson.type === 'TEXT' ||
                              lesson.type === 'ARTICLE' ||
                              (!isVideo && !isPdf && !isQuiz && Boolean(lesson.content));
                            const resourcesList = parseResourcesData(lesson);
                            const quizInfo = isQuiz ? parseQuizData(lesson) : null;

                            const itemType = isVideo
                              ? 'Video'
                              : isQuiz
                              ? 'Quiz'
                              : isPdf
                              ? 'PDF'
                              : isArticle
                              ? 'Article'
                              : 'Lesson';

                            const issue = itemIssues[lesson.id];

                            return (
                              <div
                                key={lesson.id || lIdx}
                                className={`p-3.5 rounded-2xl border transition-all ${
                                  issue?.status === 'CHANGES_REQUESTED'
                                    ? 'bg-amber-50/60 border-amber-200'
                                    : issue?.status === 'REJECTED'
                                    ? 'bg-rose-50/60 border-rose-200'
                                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                        isVideo
                                          ? 'bg-blue-100 text-blue-700'
                                          : isPdf
                                          ? 'bg-rose-100 text-rose-700'
                                          : isQuiz
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      {isVideo ? (
                                        <Play className="w-4 h-4 fill-current" />
                                      ) : isPdf ? (
                                        <FileText className="w-4 h-4" />
                                      ) : isQuiz ? (
                                        <HelpCircle className="w-4 h-4" />
                                      ) : (
                                        <BookOpen className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-slate-900 truncate">
                                          {lIdx + 1}. {lesson.title}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                          {isVideo
                                            ? `Video • ${lesson.duration || '10:00'}`
                                            : isPdf
                                            ? 'PDF Notes'
                                            : isQuiz
                                            ? `Quiz • ${quizInfo?.questions?.length || 0} Qs`
                                            : 'Article'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    {/* Video Inspect Trigger */}
                                    {isVideo && lesson.videoUrl && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveVideo({
                                            id: lesson.id,
                                            title: lesson.title,
                                            videoUrl: lesson.videoUrl,
                                            duration: lesson.duration,
                                            moduleTitle: section.title
                                          })
                                        }
                                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                      >
                                        <Play className="w-3 h-3 fill-current" />
                                        <span>Play Video</span>
                                      </button>
                                    )}

                                    {/* Quiz Inspect Trigger */}
                                    {isQuiz && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setInspectModal({
                                            type: 'QUIZ',
                                            lessonId: lesson.id,
                                            lessonTitle: lesson.title,
                                            moduleTitle: section.title,
                                            itemType: 'Quiz',
                                            data: quizInfo
                                          })
                                        }
                                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                      >
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        <span>Inspect Quiz ({quizInfo?.questions?.length || 0} Qs)</span>
                                      </button>
                                    )}

                                    {/* Article Reader Trigger */}
                                    {isArticle && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setInspectModal({
                                            type: 'ARTICLE',
                                            lessonId: lesson.id,
                                            lessonTitle: lesson.title,
                                            moduleTitle: section.title,
                                            itemType: 'Article',
                                            data: { content: lesson.content || 'No article content found.' }
                                          })
                                        }
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                      >
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span>Read Article</span>
                                      </button>
                                    )}

                                    {/* PDF Inspect Trigger */}
                                    {isPdf && lesson.pdfUrl && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setInspectModal({
                                            type: 'PDF',
                                            lessonId: lesson.id,
                                            lessonTitle: lesson.title,
                                            moduleTitle: section.title,
                                            itemType: 'PDF Document',
                                            data: { pdfUrl: lesson.pdfUrl }
                                          })
                                        }
                                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Inspect PDF</span>
                                      </button>
                                    )}

                                    {/* Resources / Attachments Trigger */}
                                    {resourcesList.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setInspectModal({
                                            type: 'RESOURCE',
                                            lessonId: lesson.id,
                                            lessonTitle: lesson.title,
                                            moduleTitle: section.title,
                                            itemType: 'Resources',
                                            data: { resources: resourcesList }
                                          })
                                        }
                                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Paperclip className="w-3.5 h-3.5" />
                                        <span>Resources ({resourcesList.length})</span>
                                      </button>
                                    )}

                                    {/* Quick Issue / Status buttons for this item */}
                                    <button
                                      type="button"
                                      onClick={() => handleSetItemIssue(lesson.id, lesson.title, isVideo ? 'Video' : isPdf ? 'PDF' : isQuiz ? 'Quiz' : 'Article', 'APPROVED', '')}
                                      className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                                        issue?.status === 'APPROVED'
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                      }`}
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetItemIssue(
                                          lesson.id,
                                          lesson.title,
                                          isVideo ? 'Video' : isPdf ? 'PDF' : isQuiz ? 'Quiz' : 'Article',
                                          'CHANGES_REQUESTED',
                                          issue?.feedback || ''
                                        )
                                      }
                                      className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                        issue?.status === 'CHANGES_REQUESTED'
                                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                                      }`}
                                    >
                                      ⚠️ Request Changes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetItemIssue(
                                          lesson.id,
                                          lesson.title,
                                          isVideo ? 'Video' : isPdf ? 'PDF' : isQuiz ? 'Quiz' : 'Article',
                                          'REJECTED',
                                          issue?.feedback || ''
                                        )
                                      }
                                      className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                        issue?.status === 'REJECTED'
                                          ? 'bg-rose-600 text-white shadow-xs'
                                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                      }`}
                                    >
                                      ✕ Reject
                                    </button>
                                  </div>
                                </div>

                                {/* Inline Comment Field for Requested Changes */}
                                {issue?.status === 'CHANGES_REQUESTED' && (
                                  <div className="mt-2.5 pt-2.5 border-t border-amber-200/90 flex flex-col sm:flex-row sm:items-center gap-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 shrink-0">
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Required Changes for this {isVideo ? 'Video' : isPdf ? 'PDF' : isQuiz ? 'Quiz' : 'Lesson'}:</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={issue.feedback || ''}
                                      onChange={(e) =>
                                        handleSetItemIssue(
                                          lesson.id,
                                          lesson.title,
                                          isVideo ? 'Video' : isPdf ? 'PDF' : isQuiz ? 'Quiz' : 'Article',
                                          'CHANGES_REQUESTED',
                                          e.target.value
                                        )
                                      }
                                      placeholder={`e.g. ${
                                        isVideo
                                          ? 'Audio volume is too low, please re-record and upload with clean audio'
                                          : isPdf
                                          ? 'Add missing formula explanation on page 3'
                                          : isQuiz
                                          ? 'Verify correct answer key for Question 2'
                                          : 'Correct typos and format article text'
                                      }...`}
                                      className="flex-1 text-xs px-3.5 py-1.5 rounded-xl border border-amber-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                                      autoFocus
                                    />
                                  </div>
                                )}

                                {issue?.status === 'REJECTED' && (
                                  <div className="mt-2.5 pt-2.5 border-t border-rose-200/90 flex flex-col sm:flex-row sm:items-center gap-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 shrink-0">
                                      <X className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Rejection Reason:</span>
                                    </div>
                                    <input
                                      type="text"
                                      value={issue.feedback || ''}
                                      onChange={(e) =>
                                        handleSetItemIssue(
                                          lesson.id,
                                          lesson.title,
                                          isVideo ? 'Video' : isPdf ? 'PDF' : isQuiz ? 'Quiz' : 'Article',
                                          'REJECTED',
                                          e.target.value
                                        )
                                      }
                                      placeholder="Reason for rejecting this lesson..."
                                      className="flex-1 text-xs px-3.5 py-1.5 rounded-xl border border-rose-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                                      autoFocus
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Section Review Action Bar */}
                  {renderSectionActionBar('curriculum', 'Course Curriculum', 3, 'Media & Thumbnail')}
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 3: MEDIA & THUMBNAIL
               ========================================================================= */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Course Media &amp; Promotional Asset Verification
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Inspect thumbnail dimensions, aspect ratio, text readability, and promotional video preview.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Thumbnail Preview */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-700">Course Thumbnail (16:9)</div>
                        <div className="aspect-video w-full rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 shadow-md">
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                              <span className="text-3xl mb-1">🖼</span>
                              <span className="text-xs font-semibold">No Thumbnail Uploaded</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Promo Video */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-700">Promotional Trailer Video</div>
                        <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden border border-slate-800 shadow-md flex items-center justify-center">
                          {course.promotionalVideoUrl ? (
                            <VideoPlayer videoUrl={course.promotionalVideoUrl} title="Course Trailer" />
                          ) : (
                            <div className="text-center text-slate-500 p-4">
                              <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <div className="text-xs font-semibold">No Promotional Video Attached</div>
                              <div className="text-[11px] text-slate-600 mt-0.5">Optional for course approval</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Review Action Bar */}
                  {renderSectionActionBar('media', 'Course Media & Thumbnail', 4, 'Final Assessment')}
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 4: FINAL ASSESSMENT & QUIZZES (Certification Gate Studio)
               ========================================================================= */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* 1. Header Card with Certificate Gate Overview */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black text-sm">
                          🎓
                        </span>
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                          Final Assessment &amp; Certification Gate
                        </h2>
                        {finalAssessment ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Certification Exam Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Mandatory Exam Missing
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                        Verify that the certification exam contains accurate questions, validated answer keys, and appropriate passing criteria. Students must clear this assessment to unlock their verified Certificate of Completion.
                      </p>
                    </div>

                    {/* Sub-tab switcher if module quizzes exist */}
                    {moduleQuizzes.length > 0 && (
                      <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setAssessmentSubTab('FINAL')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            assessmentSubTab === 'FINAL'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Final Exam ({finalAssessment?.totalQuestions || 0} Qs)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssessmentSubTab('MODULE_QUIZZES')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            assessmentSubTab === 'MODULE_QUIZZES'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Module Quizzes ({moduleQuizzes.length})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Strip for Final Assessment */}
                  {finalAssessment && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Passing Threshold
                        </div>
                        <div className="text-xl font-black text-slate-900 mt-0.5">
                          {finalAssessment.passingScore || 80}%
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {finalAssessment.passingScore >= 80 ? '✓ Standard (80%)' : '⚠️ Below 80% standard'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Total Questions
                        </div>
                        <div className="text-xl font-black text-slate-900 mt-0.5">
                          {finalAssessment.totalQuestions} Questions
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {finalAssessment.totalQuestions % 2 === 0
                            ? '✓ Even count rule verified'
                            : '⚠️ Odd question count'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Exam Marks
                        </div>
                        <div className="text-xl font-black text-slate-900 mt-0.5">
                          {finalAssessment.totalQuestions * 10} Points
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          10 marks per question
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Retake Policy
                        </div>
                        <div className="text-xl font-black text-slate-900 mt-0.5">
                          {finalAssessment.attemptLimit === 0 ? 'Unlimited' : `${finalAssessment.attemptLimit} Attempts`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Student attempt limit
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Main Content View: Either Final Exam Questions or Module Quizzes */}
                {assessmentSubTab === 'FINAL' ? (
                  finalAssessment ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Certification Exam Questions ({finalAssessment.totalQuestions} Questions)
                        </h3>
                        <span className="text-xs font-semibold text-slate-500">
                          {finalAssessment.sectionTitle ? `Located in ${finalAssessment.sectionTitle}` : ''}
                        </span>
                      </div>

                      {/* Question Cards Grid / List */}
                      <div className="space-y-4">
                        {finalAssessment.questions.map((q: any, qIdx: number) => {
                          const options = Array.isArray(q.options) ? q.options : ['True', 'False'];
                          const correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
                          return (
                            <div
                              key={q.id || qIdx}
                              className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:border-slate-300"
                            >
                              {/* Question Header */}
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                      Question {qIdx + 1} of {finalAssessment.totalQuestions}
                                    </span>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                      {q.points || 10} Points
                                    </span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900 leading-snug">
                                    {q.question || q.title || `Question ${qIdx + 1}`}
                                  </p>
                                </div>
                              </div>

                              {/* Options List */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                                {options.map((opt: string, optIdx: number) => {
                                  const isCorrect = optIdx === correctIdx;
                                  const optLetter = String.fromCharCode(65 + optIdx);
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs transition-all ${
                                        isCorrect
                                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                                          : 'border-slate-200 bg-slate-50/50 text-slate-700 font-medium'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 pr-2">
                                        <span
                                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${
                                            isCorrect
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          {optLetter}
                                        </span>
                                        <span>{opt}</span>
                                      </div>
                                      {isCorrect && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                                          <Check className="w-3 h-3 stroke-[3]" />
                                          Correct Answer
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explanation / Solution Rationale */}
                              {q.explanation && (
                                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Explanation &amp; Solution Rationale</span>
                                  </div>
                                  <p className="font-normal text-amber-900/90 leading-relaxed">
                                    {q.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-dashed border-rose-200 rounded-3xl p-8 sm:p-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl font-black">
                        ⚠️
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        No Final Assessment Configured
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        This course does not currently have a dedicated Final Certification Exam attached to the curriculum. Course policy requires a final certification exam before approval.
                      </p>
                    </div>
                  )
                ) : (
                  /* Module Quizzes View */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Curriculum Module Quizzes ({moduleQuizzes.length} Quizzes)
                      </h3>
                      <span className="text-xs text-slate-500">
                        Regular progress checks throughout course modules
                      </span>
                    </div>

                    <div className="space-y-3">
                      {moduleQuizzes.map((quiz: any, qzIdx: number) => {
                        const isExpanded = Boolean(expandedQuizAccordion[quiz.id || quiz.lessonId || qzIdx]);
                        return (
                          <div
                            key={quiz.id || quiz.lessonId || qzIdx}
                            className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden transition-all"
                          >
                            <div
                              onClick={() =>
                                setExpandedQuizAccordion((prev) => ({
                                  ...prev,
                                  [quiz.id || quiz.lessonId || qzIdx]: !isExpanded
                                }))
                              }
                              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black text-sm shrink-0">
                                  📝
                                </div>
                                <div>
                                  <h4 className="text-sm font-extrabold text-slate-900">
                                    {quiz.title}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    {quiz.sectionTitle ? `${quiz.sectionTitle} • ` : ''}
                                    {quiz.totalQuestions} Questions • Passing: {quiz.passingScore}%
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                                  {quiz.totalQuestions} Questions
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            </div>

                            {/* Expanded questions list for module quiz */}
                            {isExpanded && (
                              <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3">
                                {quiz.questions?.map((q: any, idx: number) => {
                                  const opts = Array.isArray(q.options) ? q.options : ['True', 'False'];
                                  const correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
                                  return (
                                    <div
                                      key={q.id || idx}
                                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-slate-900">
                                          Q{idx + 1}: {q.question || q.title}
                                        </span>
                                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                          {q.points || 10} pts
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {opts.map((opt: string, optIdx: number) => {
                                          const isCorr = optIdx === correctIdx;
                                          return (
                                            <div
                                              key={optIdx}
                                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                                isCorr
                                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                                                  : 'border-slate-200 bg-white text-slate-700'
                                              }`}
                                            >
                                              <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                              {isCorr && <span className="text-[10px] text-emerald-700 font-black">✓ Correct</span>}
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {q.explanation && (
                                        <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                                          💡 {q.explanation}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section Review Action Bar */}
                <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
                  {renderSectionActionBar('assessment', 'Final Assessment & Quizzes', 5, 'Review & Submit')}
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 5: REVIEW & SUBMIT (Summary, Discrepancies Box & Instructor Notify)
               ========================================================================= */}
            {currentStep === 5 && (
              <div className="space-y-6">
                {/* 1. Audit Summary Matrix */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Course Audit Summary Matrix
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Overview of your verification decisions across all examined sections.
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                      {discrepancies.length === 0 ? '✓ All Sections Passed' : `${discrepancies.length} Revisions Flagged`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { key: 'basics', title: '1. Basic Information' },
                      { key: 'curriculum', title: '2. Course Curriculum' },
                      { key: 'media', title: '3. Media & Thumbnail' },
                      { key: 'assessment', title: '4. Final Assessment' }
                    ].map((sec) => {
                      const st = sectionAudits[sec.key]?.status || 'APPROVED';
                      return (
                        <div
                          key={sec.key}
                          className={`p-3.5 rounded-2xl border ${
                            st === 'APPROVED'
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                              : st === 'CHANGES_REQUESTED'
                              ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                              : 'bg-rose-50/60 border-rose-200 text-rose-900'
                          }`}
                        >
                          <div className="text-xs font-bold truncate">{sec.title}</div>
                          <div className="text-[11px] font-black mt-1 flex items-center gap-1">
                            {st === 'APPROVED' ? '✓ Passed' : st === 'CHANGES_REQUESTED' ? '⚠️ Changes Requested' : '✕ Rejected'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Discrepancies & Issues Box (Displays items where changes were requested) */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h2 className="text-base font-extrabold text-slate-900">
                        Itemized Discrepancies &amp; Feedback For Instructor
                      </h2>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">
                      Will be sent to instructor email &amp; dashboard
                    </span>
                  </div>

                  {discrepancies.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <div className="text-sm font-bold text-emerald-900">No Quality Issues Flagged!</div>
                      <p className="text-xs text-emerald-700">
                        This course complies with platform curriculum, video DRM, and syllabus standards. Ready for approval and live publishing.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {discrepancies.map((d, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex items-start gap-3"
                        >
                          <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-extrabold text-slate-900">
                              {d.target}{' '}
                              <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/60 text-amber-900">
                                {d.status === 'CHANGES_REQUESTED' ? 'Revision Needed' : 'Rejected'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                              {d.feedback}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Dedicated Auditor Comments & Change Instructions for Instructor */}
                <div className="bg-amber-50/80 border-2 border-amber-300 rounded-3xl p-6 sm:p-7 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">
                        💬
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          Auditor Instructions &amp; Change Requirements for Instructor
                        </h3>
                        <p className="text-xs text-slate-500">
                          These instructions will be dispatched directly to the instructor via in-app dashboard notification and review decision email.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-3 py-1 rounded-full shrink-0">
                      Instructor Notification
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={overallComments}
                    onChange={(e) => {
                      setOverallComments(e.target.value);
                      setModalComment(e.target.value);
                    }}
                    placeholder="Enter comprehensive review instructions detailing all updates required from the instructor before this course can be approved (e.g. re-record low volume lectures in Module 2, adjust passing threshold to 70%, expand prerequisite guidelines)..."
                    className="w-full text-xs sm:text-sm p-4 rounded-2xl border border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* 4. Final Decision Submission Bar */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-7 text-white space-y-4 shadow-xl border border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-base font-black text-white">
                        Submit Auditor Verdict &amp; Dispatch Notification
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Your decision will immediately update course status and notify instructor <strong className="text-white">{course.instructor?.name}</strong> ({course.instructor?.email}).
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-slate-200">
                      Logged in as Auditor
                    </span>
                  </div>

                  {/* Approval Readiness Banner */}
                  {discrepancies.length > 0 ? (
                    <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-extrabold text-amber-300 block">
                          Approval Disabled: {discrepancies.length} Item(s) Marked with Changes or Rejection
                        </span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed">
                          Course approval is locked because revision requests or rejections exist on curriculum items. You must either approve all sections and lessons or click <strong>&quot;Send Changes Request to Instructor&quot;</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-extrabold text-emerald-300 block">
                          All Requirements Verified &bull; Approval Enabled
                        </span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed">
                          Zero pending changes or rejections found. All course curriculum sections and materials are compliant. You can now approve and publish this course live.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    {/* Reject Button */}
                    <button
                      type="button"
                      disabled={submittingVerdict}
                      onClick={() => handleSubmitVerdict('REJECT')}
                      className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {submittingVerdict ? 'Submitting...' : '❌ Reject Course Submission'}
                    </button>

                    {/* Request Changes Button */}
                    <button
                      type="button"
                      disabled={submittingVerdict}
                      onClick={() => handleSubmitVerdict('REQUEST_CHANGES')}
                      className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-950" />
                      <span>{submittingVerdict ? 'Submitting...' : '⚠️ Send Changes Request to Instructor'}</span>
                    </button>

                    {/* Approve Button - strictly disabled when any changes/rejections exist */}
                    <button
                      type="button"
                      disabled={submittingVerdict || discrepancies.length > 0}
                      onClick={() => handleSubmitVerdict('APPROVE')}
                      className={`px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-md flex items-center gap-2 ${
                        discrepancies.length > 0 || submittingVerdict
                          ? 'bg-slate-700/60 text-slate-400 border border-slate-600/60 cursor-not-allowed opacity-60 shadow-none'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-900/30'
                      }`}
                      title={
                        discrepancies.length > 0
                          ? `Approval is disabled: ${discrepancies.length} item(s) have requested changes or rejections.`
                          : 'Approve and publish course'
                      }
                    >
                      <Check className="w-4 h-4" />
                      <span>{submittingVerdict ? 'Submitting...' : '✓ Approve & Publish Course'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Item Inspector Modal (Quiz, Article, PDF, Resources) */}
        {inspectModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
              {/* Modal Top Bar */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                      inspectModal.type === 'QUIZ'
                        ? 'bg-amber-500 text-slate-950'
                        : inspectModal.type === 'ARTICLE'
                        ? 'bg-emerald-600'
                        : inspectModal.type === 'PDF'
                        ? 'bg-rose-600'
                        : 'bg-indigo-600'
                    }`}
                  >
                    {inspectModal.type === 'QUIZ' ? (
                      <HelpCircle className="w-5 h-5 text-slate-950" />
                    ) : inspectModal.type === 'ARTICLE' ? (
                      <BookOpen className="w-5 h-5 text-white" />
                    ) : inspectModal.type === 'PDF' ? (
                      <FileText className="w-5 h-5 text-white" />
                    ) : (
                      <Paperclip className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          inspectModal.type === 'QUIZ'
                            ? 'bg-amber-100 text-amber-900'
                            : inspectModal.type === 'ARTICLE'
                            ? 'bg-emerald-100 text-emerald-900'
                            : inspectModal.type === 'PDF'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-indigo-100 text-indigo-900'
                        }`}
                      >
                        {inspectModal.type === 'QUIZ'
                          ? 'Quiz Inspection'
                          : inspectModal.type === 'ARTICLE'
                          ? 'Article Reader'
                          : inspectModal.type === 'PDF'
                          ? 'Document Inspection'
                          : 'Resources & Attachments'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {inspectModal.moduleTitle}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                      {inspectModal.lessonTitle}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* 1. QUIZ VIEW */}
                {inspectModal.type === 'QUIZ' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 p-3 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">Total Questions</span>
                        <span className="text-sm font-black text-slate-900">
                          {inspectModal.data?.questions?.length || 0} Questions
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">Passing Score</span>
                        <span className="text-sm font-black text-slate-900">
                          {inspectModal.data?.passingScore ?? 70}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">Attempt Limit</span>
                        <span className="text-sm font-black text-slate-900">
                          {inspectModal.data?.attemptLimit === 0
                            ? 'Unlimited'
                            : `${inspectModal.data?.attemptLimit || 3} Attempts`}
                        </span>
                      </div>
                    </div>

                    {inspectModal.data?.description && (
                      <p className="text-xs text-slate-600 italic px-1">{inspectModal.data.description}</p>
                    )}

                    {(!inspectModal.data?.questions || inspectModal.data.questions.length === 0) ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                        No quiz questions attached to this lesson.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {inspectModal.data.questions.map((q: any, qIdx: number) => {
                          const correctIdx =
                            q.correctIndex !== undefined ? q.correctIndex : q.correctOptionIndex ?? 0;

                          return (
                            <div
                              key={q.id || qIdx}
                              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    {qIdx + 1}
                                  </span>
                                  <span className="text-xs font-black text-slate-900 leading-snug">
                                    {q.question}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-600 shrink-0">
                                  {q.points || 10} Pts
                                </span>
                              </div>

                              {/* Options */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-8">
                                {q.options?.map((opt: any, optIdx: number) => {
                                  const optText =
                                    typeof opt === 'string' ? opt : opt.text || `Option ${optIdx + 1}`;
                                  const isCorrect = optIdx === correctIdx || opt.isCorrect === true;

                                  return (
                                    <div
                                      key={optIdx}
                                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                        isCorrect
                                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500/30'
                                          : 'bg-white border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                            isCorrect
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-100 text-slate-500'
                                          }`}
                                        >
                                          {String.fromCharCode(65 + optIdx)}
                                        </span>
                                        <span className="truncate">{optText}</span>
                                      </div>
                                      {isCorrect && (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                                          ✓ Correct
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {q.explanation && (
                                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 ml-8 leading-relaxed">
                                  <strong>💡 Explanation:</strong> {q.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ARTICLE / TEXT VIEW */}
                {inspectModal.type === 'ARTICLE' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Reading Time</span>
                        <span className="text-sm font-black text-slate-900">
                          {Math.max(1, Math.ceil((inspectModal.data?.content?.split(/\s+/).length || 0) / 180))} min read
                        </span>
                      </div>
                      <div className="border-l border-emerald-200 pl-4">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Word Count</span>
                        <span className="text-sm font-black text-slate-900">
                          {inspectModal.data?.content?.split(/\s+/).length || 0} words
                        </span>
                      </div>
                      <div className="border-l border-emerald-200 pl-4">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Format</span>
                        <span className="text-sm font-black text-slate-900">Article Text</span>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 leading-relaxed font-sans space-y-3 whitespace-pre-wrap">
                      {inspectModal.data?.content || 'No article content provided.'}
                    </div>
                  </div>
                )}

                {/* 3. PDF DOCUMENT VIEW */}
                {inspectModal.type === 'PDF' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-rose-50/60 rounded-2xl border border-rose-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-rose-800 uppercase block">Protected Document</span>
                        <span className="text-xs font-black text-slate-900 truncate max-w-sm block">
                          {inspectModal.data?.pdfUrl}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={inspectModal.data?.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Tab</span>
                        </a>
                        <a
                          href={inspectModal.data?.pdfUrl}
                          download
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </a>
                      </div>
                    </div>

                    {inspectModal.data?.pdfUrl ? (
                      <div className="w-full h-[450px] bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                        <iframe
                          src={inspectModal.data.pdfUrl}
                          className="w-full h-full"
                          title="PDF Document Viewer"
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-500 text-xs">
                        No PDF document attached.
                      </div>
                    )}
                  </div>
                )}

                {/* 4. RESOURCES VIEW */}
                {inspectModal.type === 'RESOURCE' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200 text-xs">
                      <span className="text-[10px] font-bold text-indigo-800 uppercase block">Downloadable Course Resources</span>
                      <span className="text-sm font-black text-slate-900">
                        {inspectModal.data?.resources?.length || 0} Files &amp; Attachments
                      </span>
                    </div>

                    <div className="space-y-2">
                      {inspectModal.data?.resources?.map((resItem: any, rIdx: number) => (
                        <div
                          key={rIdx}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                              <Paperclip className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {resItem.title}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {resItem.type || 'Attachment'} {resItem.size ? `• ${resItem.size}` : ''}
                              </div>
                            </div>
                          </div>

                          <a
                            href={resItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Bottom Quick Action Bar */}
              <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleSetItemIssue(inspectModal.lessonId, inspectModal.lessonTitle, inspectModal.itemType, 'APPROVED', '');
                      setInspectModal(null);
                      showToast('Approved', `"${inspectModal.lessonTitle}" marked approved.`);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve {inspectModal.itemType}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSetItemIssue(inspectModal.lessonId, inspectModal.lessonTitle, inspectModal.itemType, 'CHANGES_REQUESTED', itemIssues[inspectModal.lessonId]?.feedback || '');
                      setInspectModal(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Request Changes for this {inspectModal.itemType}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Changes Request Confirmation Modal */}
        {showChangesModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Request Changes from Instructor
                    </h3>
                    <p className="text-xs text-slate-500">
                      Instructor: <strong>{course?.instructor?.name}</strong> ({course?.instructor?.email})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangesModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                    Required Changes &amp; Feedback for Instructor *
                  </span>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Required
                  </span>
                </label>
                <textarea
                  rows={5}
                  value={modalComment}
                  onChange={(e) => {
                    setModalComment(e.target.value);
                    setOverallComments(e.target.value);
                  }}
                  placeholder="Specify what changes the instructor needs to make before this course can be published (e.g. replace Video #2 due to audio distortion, update quiz answer key, refine course overview)..."
                  className="w-full text-xs sm:text-sm p-4 rounded-2xl border border-amber-300 bg-amber-50/40 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium placeholder:text-slate-400"
                  autoFocus
                />

                {discrepancies.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Flagged Items Included in Email ({discrepancies.length}):
                    </span>
                    <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-0.5 max-h-32 overflow-y-auto">
                      {discrepancies.map((d, i) => (
                        <li key={i}>
                          <strong className="text-slate-800">{d.target}:</strong> {d.feedback}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangesModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingVerdict || (!modalComment.trim() && discrepancies.length === 0)}
                  onClick={() => executeSendChanges(modalComment)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
                  <span>{submittingVerdict ? 'Sending to Instructor...' : 'Send Changes Request to Instructor'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Sticky Bottom Navigation Bar matching user's screenshot */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-3.5 px-4 sm:px-8 shadow-lg flex items-center justify-between gap-4">
          <div>
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as AuditStep)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/reviewer/courses/${courseId}/preview`}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </Link>

            <button
              type="button"
              disabled={savingDraft}
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1) as AuditStep)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Next: {stepLabels[(currentStep + 1) as AuditStep]}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submittingVerdict || discrepancies.length > 0}
                onClick={() => handleSubmitVerdict('APPROVE')}
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
                  discrepancies.length > 0 || submittingVerdict
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
                title={
                  discrepancies.length > 0
                    ? `Approval is disabled: ${discrepancies.length} item(s) have requested changes or rejections.`
                    : 'Approve Course'
                }
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Course</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </AuditorPortalShell>
  );
}
