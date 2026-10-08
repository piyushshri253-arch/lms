'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export type PlayerTab = 'overview' | 'notes' | 'bookmarks' | 'discussion' | 'assignments' | 'resources' | 'reviews' | 'announcements';

interface LessonTabsProps {
  courseId?: string;
  courseTitle?: string;
  courseSubtitle?: string;
  courseDescription?: string;
  whatYouWillLearn?: string[] | string;
  requirements?: string[] | string;
  targetAudience?: string[] | string;
  level?: string;
  totalLectures?: number;
  totalDuration?: string;
  lessonId?: string;
  lessonTitle: string;
  lessonDescription?: string;
  lessonContent?: string | null;
  instructorName?: string;
  instructorRole?: string;
  instructorAvatar?: string | null;
  instructorBio?: string | null;
  resources?: Array<{ name: string; url: string; size?: string }>;
  onSeekTimestamp?: (seconds: number) => void;
  activeTab?: PlayerTab;
  onTabChange?: (tab: PlayerTab) => void;
}

export const LessonTabs: React.FC<LessonTabsProps> = ({
  courseId,
  courseTitle,
  courseSubtitle,
  courseDescription,
  whatYouWillLearn = [],
  requirements = [],
  targetAudience = [],
  level = 'All Levels',
  totalLectures = 1,
  totalDuration = '1.5 hours',
  lessonId,
  lessonTitle,
  lessonDescription,
  lessonContent,
  instructorName = 'Faculty Lead',
  instructorRole = 'Expert Educator & Consultant',
  instructorAvatar = null,
  instructorBio = null,
  resources = [],
  onSeekTimestamp,
  activeTab: externalTab,
  onTabChange
}) => {
  // Parse arrays safely if passed as stringified JSON
  const parsedWhatYouWillLearn: string[] = React.useMemo(() => {
    if (Array.isArray(whatYouWillLearn)) return whatYouWillLearn;
    if (typeof whatYouWillLearn === 'string') {
      try {
        const parsed = JSON.parse(whatYouWillLearn);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return [whatYouWillLearn];
    }
    return [];
  }, [whatYouWillLearn]);

  const parsedRequirements: string[] = React.useMemo(() => {
    if (Array.isArray(requirements)) return requirements;
    if (typeof requirements === 'string') {
      try {
        const parsed = JSON.parse(requirements);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return [requirements];
    }
    return [];
  }, [requirements]);

  const parsedTargetAudience: string[] = React.useMemo(() => {
    if (Array.isArray(targetAudience)) return targetAudience;
    if (typeof targetAudience === 'string') {
      try {
        const parsed = JSON.parse(targetAudience);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return [targetAudience];
    }
    return [];
  }, [targetAudience]);
  const [internalTab, setInternalTab] = useState<PlayerTab>('overview');
  const activeTab = externalTab !== undefined ? externalTab : internalTab;
  const setActiveTab = (tab: PlayerTab) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Helper to download lecture notes as .doc Word document
  const downloadArticleAsDoc = (title: string, content: string) => {
    if (!content || !content.trim()) return;
    const cleanTitle = (title || 'Lecture Notes').trim();

    const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${cleanTitle}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { margin: 1in; size: A4; }
    body {
      font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 32px;
    }
    h1 {
      color: #0f172a;
      font-size: 20pt;
      font-weight: bold;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .meta {
      color: #64748b;
      font-size: 10pt;
      margin-bottom: 24px;
    }
    .content {
      font-size: 11.5pt;
      line-height: 1.75;
      color: #334155;
    }
  </style>
</head>
<body>
  <h1>${cleanTitle}</h1>
  <div class="meta">Lecture Study Notes &amp; Handout • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
  <div class="content">${content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')}</div>
</body>
</html>`;

    const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = cleanTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
    a.download = `${safeFilename || 'Lecture'}_Notes.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTimestamp, setNewNoteTimestamp] = useState<number>(0);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<{ [id: string]: string }>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionFile, setSubmissionFile] = useState<string>('');
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const { showToast, currentUser } = useApp();

  // 1. Fetch live Notes from Database
  const fetchNotes = async () => {
    if (!lessonId) return;
    try {
      const res = await fetch(`/api/notes?lessonId=${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {}
  };

  // 2. Fetch live Bookmarks from Database
  const fetchBookmarks = async () => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/bookmarks?courseId=${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data.bookmarks || []);
      }
    } catch {}
  };

  // 3. Fetch live Discussions from Database
  const fetchDiscussions = async () => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/discussions?courseId=${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setDiscussions(data.discussions || []);
      }
    } catch {}
  };

  // 4. Fetch live Assignments from Database
  const fetchAssignments = async () => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/assignments?courseId=${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch {}
  };

  // 5. Fetch live Reviews from Database
  const fetchReviews = async () => {
    if (!courseId) return;
    setIsLoadingReviews(true);
    try {
      const res = await fetch(`/api/reviews?courseId=${courseId}`);
      if (res.ok) {
        const data = await res.json();
        const revs = data.reviews || [];
        setReviews(revs);
        if (currentUser) {
          const myRev = revs.find((r: any) => r.userId === currentUser.id || r.user?.id === currentUser.id);
          if (myRev) {
            setReviewRating(myRev.rating);
            setReviewComment(myRev.comment);
          }
        }
      }
    } catch {} finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchBookmarks();
    fetchDiscussions();
    fetchAssignments();
    fetchReviews();
  }, [lessonId, courseId]);

  // Handle Submit / Update Review
  const handlePlayerReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !reviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          rating: reviewRating,
          comment: reviewComment.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      showToast({
        title: 'Review Submitted! ⭐',
        description: 'Thank you for your rating and feedback.',
        type: 'success'
      });
      await fetchReviews();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Save Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !lessonId) return;

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          content: newNoteContent.trim(),
          timestamp: newNoteTimestamp
        })
      });
      if (res.ok) {
        showToast({ title: 'Note Saved', description: 'Timestamped note stored securely in database.', type: 'success' });
        setNewNoteContent('');
        setNewNoteTimestamp(0);
        fetchNotes();
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to save note', type: 'error' });
    }
  };

  // Handle Delete Note
  const handleDeleteNote = async (id: string) => {
    try {
      await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      fetchNotes();
      showToast({ title: 'Note Deleted', type: 'info' });
    } catch {}
  };

  // Handle Add Bookmark
  const handleAddBookmark = async () => {
    if (!courseId || !lessonId) return;
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonId,
          timestamp: newNoteTimestamp,
          title: `Bookmark at ${formatSeconds(newNoteTimestamp)}`
        })
      });
      if (res.ok) {
        showToast({ title: 'Bookmark Added', type: 'success' });
        fetchBookmarks();
      }
    } catch {}
  };

  const [isPostingQuestion, setIsPostingQuestion] = useState(false);
  const [isPostingReply, setIsPostingReply] = useState<{ [id: string]: boolean }>({});
  const [isRefreshingDiscussions, setIsRefreshingDiscussions] = useState(false);

  // Auto-refresh discussions when Q&A tab becomes active
  useEffect(() => {
    if (activeTab === 'discussion' && courseId) {
      fetchDiscussions();
    }
  }, [activeTab, courseId]);

  // Handle Post Discussion Question
  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !courseId) return;

    setIsPostingQuestion(true);
    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonId,
          title: newQuestionTitle.trim() || 'Course Question',
          text: newQuestionText.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast({ title: 'Question Posted 🎉', description: 'Your question has been sent to the instructor.', type: 'success' });
        setNewQuestionTitle('');
        setNewQuestionText('');
        await fetchDiscussions();
      } else {
        showToast({ title: 'Could not post question', description: data.error || 'Please make sure you are enrolled in this course.', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', description: 'Network error while posting question.', type: 'error' });
    } finally {
      setIsPostingQuestion(false);
    }
  };

  // Handle Post Reply
  const handlePostReply = async (discussionId: string) => {
    const text = replyTextMap[discussionId];
    if (!text || !text.trim()) return;

    setIsPostingReply((prev) => ({ ...prev, [discussionId]: true }));
    try {
      const res = await fetch(`/api/discussions/${discussionId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast({ title: 'Reply Added', description: 'Your response was posted to the thread.', type: 'success' });
        setReplyTextMap({ ...replyTextMap, [discussionId]: '' });
        await fetchDiscussions();
      } else {
        showToast({ title: 'Reply Failed', description: data.error || 'Could not post reply.', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', description: 'Network error while posting reply.', type: 'error' });
    } finally {
      setIsPostingReply((prev) => ({ ...prev, [discussionId]: false }));
    }
  };

  // Handle Assignment Submission
  const handleSubmitAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: submissionFile || 'https://storage.morenalms.com/submissions/sample-code.zip',
          fileName: submissionFile ? submissionFile.split('/').pop() : 'assignment-solution.zip',
          notes: submissionNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast({ title: 'Assignment Submitted 🎉', description: 'Instructor has been notified for grading.', type: 'success' });
        setSubmittingAssignmentId(null);
        setSubmissionFile('');
        setSubmissionNotes('');
        fetchAssignments();
      } else {
        showToast({ title: 'Submission Failed', description: data.error, type: 'error' });
      }
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto mt-8">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-[#d1d7dc] mb-8 overflow-x-auto gap-4 sm:gap-8 scrollbar-none select-none">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'text-[#2d2f31] border-b-2 border-[#2d2f31] font-extrabold'
              : 'text-[#6a6f73] hover:text-[#2d2f31] font-bold'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('discussion')}
          className={`pb-3 text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'discussion'
              ? 'text-[#2d2f31] border-b-2 border-[#2d2f31] font-extrabold'
              : 'text-[#6a6f73] hover:text-[#2d2f31] font-bold'
          }`}
        >
          Q&A ({discussions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`pb-3 text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'notes'
              ? 'text-[#2d2f31] border-b-2 border-[#2d2f31] font-extrabold'
              : 'text-[#6a6f73] hover:text-[#2d2f31] font-bold'
          }`}
        >
          Notes ({notes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`pb-3 text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'announcements'
              ? 'text-[#2d2f31] border-b-2 border-[#2d2f31] font-extrabold'
              : 'text-[#6a6f73] hover:text-[#2d2f31] font-bold'
          }`}
        >
          Announcements
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reviews'
              ? 'text-[#2d2f31] border-b-2 border-[#2d2f31] font-extrabold'
              : 'text-[#6a6f73] hover:text-[#2d2f31] font-bold'
          }`}
        >
          <Icon name="star" fill size={14} className="text-amber-500" />
          <span>Reviews ({reviews.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`pb-3 text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'resources'
              ? 'text-[#2d2f31] border-b-2 border-[#2d2f31] font-extrabold'
              : 'text-[#6a6f73] hover:text-[#2d2f31] font-bold'
          }`}
        >
          Learning tools ({resources.length})
        </button>
      </div>

      {/* Tab Content Panels */}
      {/* 1. Overview Tab - Authentic Udemy Course Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-10 animate-in fade-in duration-200 text-[#2d2f31]">
          {/* Lecture Article / Reading Material (if attached by Instructor) */}
          {lessonContent && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-[#2d2f31] font-extrabold text-sm uppercase tracking-wider">
                  <Icon name="article" size={18} className="text-primary" />
                  <span>Lecture Notes &amp; Study Guide: {lessonTitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => downloadArticleAsDoc(lessonTitle, lessonContent)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  title="Download notes as an editable Microsoft Word document"
                >
                  <span className="text-sm">📝</span>
                  <span>Download Notes (.doc)</span>
                  <Icon name="download" size={14} className="text-slate-500" />
                </button>
              </div>
              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {lessonContent}
              </div>
            </div>
          )}

          {/* A. About this course header */}
          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold text-[#2d2f31] tracking-tight">
              About this course
            </h2>
            {courseSubtitle && (
              <p className="text-base text-slate-700 font-medium leading-relaxed">
                {courseSubtitle}
              </p>
            )}
            {courseDescription && (
              <p className="text-sm text-slate-600 leading-relaxed max-w-4xl whitespace-pre-line">
                {courseDescription}
              </p>
            )}
          </div>

          {/* B. By the numbers (Udemy key metrics card) */}
          <div className="border-t border-b border-[#d1d7dc] py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs text-slate-600">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Skill level</span>
              <span className="font-bold text-slate-900 text-sm">{level}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Lectures</span>
              <span className="font-bold text-slate-900 text-sm">{totalLectures} lectures</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Video</span>
              <span className="font-bold text-slate-900 text-sm">{totalDuration}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Certificate</span>
              <span className="font-bold text-emerald-700 text-sm flex items-center gap-1">
                <Icon name="workspace_premium" size={16} fill />
                Included
              </span>
            </div>
          </div>

          {/* C. What you'll learn (Udemy 2-column checklist) */}
          {parsedWhatYouWillLearn.length > 0 && (
            <div className="border border-[#d1d7dc] rounded-xl p-6 bg-[#f7f9fa]/60 space-y-4">
              <div>
                <h3 className="font-extrabold text-base text-[#2d2f31] flex items-center gap-2">
                  <Icon name="check_circle" size={18} className="text-emerald-600 shrink-0" />
                  <span>WHAT YOU’LL LEARN</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Key learning outcomes &amp; skills</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parsedWhatYouWillLearn.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <Icon name="check" size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* D. Requirements */}
          {parsedRequirements.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="font-extrabold text-base text-[#2d2f31] flex items-center gap-2">
                  <Icon name="rule" size={18} className="text-indigo-600 shrink-0" />
                  <span>BEFORE YOU BEGIN</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Knowledge or experience you may need</p>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {parsedRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* E. Target Audience */}
          {parsedTargetAudience.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="font-extrabold text-base text-[#2d2f31] flex items-center gap-2">
                  <Icon name="groups" size={18} className="text-purple-600 shrink-0" />
                  <span>WHO THIS COURSE IS FOR</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Who can benefit from this course</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedTargetAudience.map((aud, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium"
                  >
                    {aud}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* F. Instructor Card */}
          <div className="space-y-4 border-t border-[#d1d7dc] pt-8">
            <h3 className="font-extrabold text-base text-[#2d2f31]">
              Instructor
            </h3>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-lg shrink-0 shadow-sm">
                {instructorAvatar ? (
                  <img src={instructorAvatar} alt={instructorName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{instructorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
                )}
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-[#5022c3] hover:underline cursor-pointer">
                  {instructorName}
                </h4>
                <p className="text-xs text-slate-600 font-semibold">{instructorRole}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-bold text-slate-800">
                    <Icon name="star" size={13} fill className="text-amber-500" />
                    4.9 Instructor Rating
                  </span>
                  <span>•</span>
                  <span>120+ Students</span>
                  <span>•</span>
                  <span>Certified Faculty</span>
                </div>
                {instructorBio && (
                  <p className="text-xs text-slate-600 leading-relaxed pt-2 max-w-3xl">
                    {instructorBio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Notes with Timestamps */}
      {activeTab === 'notes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Note Form */}
          <form onSubmit={handleSaveNote} className="space-y-3 bg-surface-container-lowest border border-outline-variant p-5 rounded-2xl">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">Add Private Timestamped Note</h4>
              <button
                type="button"
                onClick={handleAddBookmark}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Icon name="bookmark" size={15} />
                <span>Bookmark this Lecture</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Type your notes here... (e.g. 'useEffect runs after painting DOM')"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:border-primary"
            />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant font-mono">Timestamp (seconds):</span>
                <input
                  type="number"
                  value={newNoteTimestamp}
                  onChange={(e) => setNewNoteTimestamp(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-surface-container-low border border-outline-variant rounded-lg text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                className="bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-container transition-all cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </form>

          {/* Notes List */}
          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-8">No notes yet for this lesson. Add one above!</p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    {n.timestamp > 0 && (
                      <button
                        onClick={() => onSeekTimestamp && onSeekTimestamp(n.timestamp)}
                        className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[11px] font-bold hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Icon name="play_arrow" size={12} />
                        <span>{formatSeconds(n.timestamp)}</span>
                      </button>
                    )}
                    <p className="text-xs sm:text-sm text-on-surface font-medium leading-relaxed">{n.content}</p>
                    <span className="text-[10px] text-on-surface-variant">{new Date(n.updatedAt).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    className="text-on-surface-variant hover:text-rose-500 p-1 cursor-pointer"
                    title="Delete Note"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {bookmarks.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-8">No bookmarks saved yet. Bookmark key timestamps to jump back anytime!</p>
          ) : (
            bookmarks.map((b) => (
              <div key={b.id} className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Icon name="bookmark" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-on-surface">{b.lessonTitle}</p>
                    <span className="font-mono text-xs text-primary font-bold">{b.formattedTimestamp}</span>
                  </div>
                </div>
                <button
                  onClick={() => onSeekTimestamp && onSeekTimestamp(b.timestamp)}
                  className="px-3.5 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary-container transition-all cursor-pointer flex items-center gap-1"
                >
                  <Icon name="play_circle" size={14} />
                  <span>Jump to {b.formattedTimestamp}</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Discussions & Q&A */}
      {activeTab === 'discussion' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Bar with Refresh */}
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-outline-variant/60">
            <div>
              <h3 className="text-base font-extrabold text-on-surface">Course Q&A ({discussions.length})</h3>
              <p className="text-xs text-on-surface-variant">Ask questions about this lecture directly to your instructor and get answers.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setIsRefreshingDiscussions(true);
                await fetchDiscussions();
                setIsRefreshingDiscussions(false);
                showToast({ title: 'Q&A Updated', description: 'Latest questions and instructor answers loaded.', type: 'info' });
              }}
              disabled={isRefreshingDiscussions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh questions and instructor replies"
            >
              <Icon name="refresh" size={14} className={isRefreshingDiscussions ? 'animate-spin' : ''} />
              <span>{isRefreshingDiscussions ? 'Refreshing...' : 'Refresh Q&A'}</span>
            </button>
          </div>

          {/* Ask Question Form */}
          <form onSubmit={handlePostQuestion} className="space-y-3 bg-surface-container-lowest border border-outline-variant p-4 sm:p-5 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Icon name="help" size={16} />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-on-surface">Ask a question or request guidance from the instructor</h4>
            </div>
            <input
              type="text"
              value={newQuestionTitle}
              onChange={(e) => setNewQuestionTitle(e.target.value)}
              placeholder="Question topic (e.g., How does responsive grid layout work in mobile view?)"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary font-medium text-on-surface"
              required
            />
            <textarea
              rows={3}
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Describe your query in detail. What have you tried, or what concept would you like clarified?"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary font-normal text-on-surface leading-relaxed"
              required
            />
            <div className="flex justify-between items-center pt-1">
              <span className="text-[11px] text-on-surface-variant font-medium">
                Your question will appear in the Instructor's Studio and course community.
              </span>
              <button
                type="submit"
                disabled={isPostingQuestion || !newQuestionText.trim()}
                className="bg-primary hover:bg-primary-container text-on-primary text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Icon name={isPostingQuestion ? 'sync' : 'send'} size={14} className={isPostingQuestion ? 'animate-spin' : ''} />
                <span>{isPostingQuestion ? 'Posting...' : 'Ask Instructor'}</span>
              </button>
            </div>
          </form>

          {/* Discussion Threads List */}
          <div className="space-y-4">
            {discussions.length === 0 ? (
              <div className="text-center py-12 px-4 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Icon name="question_answer" size={24} />
                </div>
                <h5 className="font-bold text-sm text-on-surface">No questions asked yet</h5>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                  Be the first to start a conversation! Ask any query about this lecture and your instructor will respond.
                </p>
              </div>
            ) : (
              discussions.map((d) => {
                const hasInstructorAnswer = d.replies?.some(
                  (r: any) => r.userRole === 'INSTRUCTOR' || r.isInstructor || r.isBestAnswer
                );

                return (
                  <div key={d.id} className="p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl space-y-4 shadow-2xs hover:border-outline transition-colors">
                    {/* Thread Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <UserAvatar avatar={d.userAvatar} name={d.userName} size="md" className="w-10 h-10 shrink-0" />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-on-surface">{d.userName}</span>
                            {d.userRole === 'INSTRUCTOR' && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-extrabold flex items-center gap-1">
                                <Icon name="school" size={11} />
                                Instructor
                              </span>
                            )}
                            <span className="text-[11px] text-on-surface-variant">
                              {d.createdAt ? new Date(d.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'}
                            </span>
                          </div>
                          <h5 className="font-bold text-sm sm:text-base text-on-surface mt-1">{d.title}</h5>
                          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed whitespace-pre-wrap">{d.text}</p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                        {d.isResolved && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 text-[10px] font-extrabold border border-emerald-500/30 flex items-center gap-1">
                            <Icon name="check_circle" size={12} />
                            Resolved
                          </span>
                        )}
                        {hasInstructorAnswer && (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-800 text-[10px] font-extrabold border border-indigo-500/30 flex items-center gap-1">
                            <Icon name="verified" size={12} />
                            Instructor Answered
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Replies List */}
                    {d.replies && d.replies.length > 0 && (
                      <div className="pl-4 sm:pl-6 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-3 pt-2">
                        {d.replies.map((r: any) => {
                          const isInst = r.userRole === 'INSTRUCTOR' || r.isInstructor;
                          const isOfficial = r.isBestAnswer;

                          return (
                            <div
                              key={r.id}
                              className={`p-3.5 rounded-xl text-xs space-y-1.5 transition-all ${
                                isInst || isOfficial
                                  ? 'bg-purple-500/10 border border-purple-500/30 shadow-2xs'
                                  : 'bg-surface-container-low border border-outline-variant/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <UserAvatar avatar={r.userAvatar} name={r.userName} size="sm" className="w-6 h-6 shrink-0" />
                                  <span className="font-extrabold text-on-surface">{r.userName}</span>
                                  {isInst && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-extrabold flex items-center gap-1 shadow-2xs">
                                      <Icon name="school" size={10} />
                                      Instructor Response
                                    </span>
                                  )}
                                  {isOfficial && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold flex items-center gap-1 shadow-2xs">
                                      <Icon name="verified" size={10} />
                                      Verified Solution
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  {r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface-variant pl-8 leading-relaxed whitespace-pre-wrap">{r.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Reply Form */}
                    <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/40">
                      <input
                        type="text"
                        value={replyTextMap[d.id] || ''}
                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [d.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handlePostReply(d.id);
                          }
                        }}
                        placeholder="Reply to instructor or add clarification..."
                        className="flex-1 px-3.5 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        disabled={isPostingReply[d.id] || !replyTextMap[d.id]?.trim()}
                        onClick={() => handlePostReply(d.id)}
                        className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                      >
                        <Icon name={isPostingReply[d.id] ? 'sync' : 'reply'} size={13} className={isPostingReply[d.id] ? 'animate-spin' : ''} />
                        <span>{isPostingReply[d.id] ? 'Replying...' : 'Reply'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {assignments.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-8">No assignments published for this course yet.</p>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">{a.title}</h4>
                    <p className="text-xs text-on-surface-variant mt-1">{a.description}</p>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-secondary mt-2">
                      <span>Max Score: {a.maxScore} pts</span>
                      <span>•</span>
                      <span>Allowed: {a.allowedFormats.join(', ')}</span>
                    </div>
                  </div>

                  {a.mySubmission ? (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                      a.mySubmission.status === 'GRADED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {a.mySubmission.status === 'GRADED'
                        ? `GRADED: ${a.mySubmission.score}/${a.maxScore}`
                        : 'SUBMITTED (UNDER REVIEW)'}
                    </span>
                  ) : (
                    <button
                      onClick={() => setSubmittingAssignmentId(a.id)}
                      className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Submit Solution
                    </button>
                  )}
                </div>

                {/* Graded Feedback Box */}
                {a.mySubmission?.feedback && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-400">Instructor Feedback:</span>
                    <p className="text-on-surface">{a.mySubmission.feedback}</p>
                  </div>
                )}

                {/* Submission Form Modal / Box */}
                {submittingAssignmentId === a.id && (
                  <div className="p-4 bg-surface-container-low border border-primary/30 rounded-xl space-y-3">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-primary">Upload Assignment Solution</h5>
                    <input
                      type="text"
                      value={submissionFile}
                      onChange={(e) => setSubmissionFile(e.target.value)}
                      placeholder="File URL or repository link (e.g. solution.zip / github repo)..."
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
                    />
                    <textarea
                      rows={2}
                      value={submissionNotes}
                      onChange={(e) => setSubmissionNotes(e.target.value)}
                      placeholder="Optional notes for instructor..."
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSubmittingAssignmentId(null)}
                        className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmitAssignment(a.id)}
                        className="px-4 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Submit Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 6. Resources & Downloads */}
      {activeTab === 'resources' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {lessonContent && (
            <div className="p-4 bg-white border border-[#d1d7dc] rounded-xl flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0 text-xl">
                  📝
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[#2d2f31] truncate">{lessonTitle} - Study Notes</p>
                  <p className="text-xs text-slate-500">Editable Microsoft Word Document (.doc)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => downloadArticleAsDoc(lessonTitle, lessonContent)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs shrink-0 flex items-center gap-1.5"
              >
                <Icon name="download" size={14} />
                <span>Download (.doc)</span>
              </button>
            </div>
          )}

          {Array.isArray(resources) && resources.length > 0 ? (
            resources.map((res: any, idx: number) => {
              if (res.isDocArticle) return null;
              return (
                <div key={idx} className="p-4 bg-white border border-[#d1d7dc] rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0 text-xl">
                      {res.name?.toLowerCase().includes('pdf') ? '📑' : '📦'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#2d2f31] truncate">{res.name}</p>
                      <p className="text-xs text-slate-500">{res.size || 'Downloadable attachment'}</p>
                    </div>
                  </div>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="px-4 py-2 bg-white text-[#2d2f31] hover:bg-slate-50 border border-[#d1d7dc] font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs shrink-0 flex items-center gap-1.5"
                  >
                    <Icon name="download" size={14} />
                    <span>Download</span>
                  </a>
                </div>
              );
            })
          ) : !lessonContent ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No attached download resources for this lecture.
            </div>
          ) : null}
        </div>
      )}

      {/* 7. Reviews & Ratings */}
      {activeTab === 'reviews' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Average Rating Summary Card */}
          <div className="p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center shrink-0">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
                  {reviews.length > 0
                    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                    : '5.0'}
                </span>
                <span className="text-[10px] font-bold text-amber-600/80 uppercase">out of 5</span>
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      fill={
                        reviews.length > 0
                          ? i < Math.round(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length)
                          : true
                      }
                      size={18}
                    />
                  ))}
                </div>
                <h3 className="font-bold text-sm text-on-surface">Course Rating &amp; Student Feedback</h3>
                <p className="text-xs text-on-surface-variant">
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} from verified enrolled students
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                <Icon name="verified" size={14} className="text-emerald-700" />
                <span>100% Verified Learners</span>
              </span>
            </div>
          </div>

          {/* Review Submission Form */}
          <form
            onSubmit={handlePlayerReviewSubmit}
            className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/80 space-y-4 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-outline-variant/40">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  {reviews.some((r) => r.userId === currentUser?.id || r.user?.id === currentUser?.id)
                    ? 'Update Your Rating & Review'
                    : 'Rate Your Learning Experience'}
                </h4>
                <p className="text-[11px] text-on-surface-variant">
                  {reviewRating === 5 ? '⭐⭐⭐⭐⭐ 5 Stars - Exceptional learning experience' :
                   reviewRating === 4 ? '⭐⭐⭐⭐ 4 Stars - Very good & clear content' :
                   reviewRating === 3 ? '⭐⭐⭐ 3 Stars - Average course' :
                   reviewRating === 2 ? '⭐⭐ 2 Stars - Needs improvement' :
                   '⭐ 1 Star - Poor experience'}
                </p>
              </div>

              <div className="flex gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="hover:scale-125 transition-transform cursor-pointer p-0.5"
                    title={`${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Icon name="star" fill={star <= reviewRating} size={22} />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="What did you learn from this course? Share your review with other students and instructors..."
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                <Icon name="verified_user" size={14} className="text-emerald-600" />
                <span>Reviews are public and visible on the course catalog</span>
              </span>

              <button
                type="submit"
                disabled={isSubmittingReview || !reviewComment.trim()}
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary-container shadow-xs disabled:opacity-50 cursor-pointer transition-all flex items-center gap-1.5 self-end sm:self-auto"
              >
                <Icon name="rate_review" size={16} />
                <span>
                  {isSubmittingReview
                    ? 'Posting...'
                    : reviews.some((r) => r.userId === currentUser?.id || r.user?.id === currentUser?.id)
                    ? 'Update Review'
                    : 'Submit Review'}
                </span>
              </button>
            </div>
          </form>

          {/* Reviews List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Student Reviews ({reviews.length})
            </h4>

            {isLoadingReviews ? (
              <div className="p-8 text-center text-xs text-on-surface-variant">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading reviews...</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-8 bg-surface-container-lowest border border-dashed border-outline-variant rounded-2xl text-center space-y-1">
                <Icon name="rate_review" size={32} className="text-on-surface-variant/40 mx-auto" />
                <p className="font-bold text-xs text-on-surface">No reviews yet</p>
                <p className="text-[11px] text-on-surface-variant">
                  Be the first to rate and review this course above!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/40 bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-5 space-y-4">
                {reviews.map((r: any) => {
                  const name = r.user?.name || (typeof r.user === 'string' ? r.user : 'Verified Student');
                  const avatar = r.user?.avatar || null;

                  return (
                    <div key={r.id} className="pt-4 first:pt-0 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            avatar={avatar}
                            name={name}
                            size="sm"
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-on-surface">{name}</span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded-sm flex items-center gap-0.5">
                                <Icon name="verified" size={10} className="text-emerald-700" />
                                <span>Verified Student</span>
                              </span>
                            </div>
                            {(r.createdAt || r.date) && (
                              <span className="text-[10px] text-on-surface-variant block mt-0.5">
                                {new Date(r.createdAt || r.date).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex text-amber-500">
                          {[...Array(r.rating || 5)].map((_, i) => (
                            <Icon key={i} name="star" fill size={14} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed pl-10.5">
                        {r.comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. Announcements */}
      {activeTab === 'announcements' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 bg-white border border-[#d1d7dc] rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {instructorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#2d2f31]">{instructorName}</h4>
                <p className="text-xs text-slate-500">Instructor Announcement • Course Welcome</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-700 leading-relaxed space-y-2">
              <p>
                Welcome to <strong>{courseTitle || 'this course'}</strong>! We are thrilled to guide you through this learning journey.
              </p>
              <p>
                Make sure to take notes at key timestamps, participate actively in the Q&amp;A tab, and complete each module sequentially for optimal retention.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
