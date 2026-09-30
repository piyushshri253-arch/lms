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

  // Handle Post Discussion Question
  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !courseId) return;

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
      if (res.ok) {
        showToast({ title: 'Question Posted', description: 'Faculty and peers can now reply.', type: 'success' });
        setNewQuestionTitle('');
        setNewQuestionText('');
        fetchDiscussions();
      }
    } catch {}
  };

  // Handle Post Reply
  const handlePostReply = async (discussionId: string) => {
    const text = replyTextMap[discussionId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch(`/api/discussions/${discussionId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() })
      });
      if (res.ok) {
        showToast({ title: 'Reply Added', type: 'success' });
        setReplyTextMap({ ...replyTextMap, [discussionId]: '' });
        fetchDiscussions();
      }
    } catch {}
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
              <h3 className="font-extrabold text-base text-[#2d2f31]">
                What you'll learn
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parsedWhatYouWillLearn.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <Icon name="check" size={16} className="text-[#2d2f31] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* D. Requirements */}
          {parsedRequirements.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-base text-[#2d2f31]">
                Requirements
              </h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {parsedRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* E. Target Audience */}
          {parsedTargetAudience.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-base text-[#2d2f31]">
                Who this course is for:
              </h3>
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
          <form onSubmit={handlePostQuestion} className="space-y-3 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">Ask a question or share thoughts</h4>
            <input
              type="text"
              value={newQuestionTitle}
              onChange={(e) => setNewQuestionTitle(e.target.value)}
              placeholder="Question summary / topic..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2.5 text-xs focus:outline-none focus:border-primary"
            />
            <textarea
              rows={3}
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Elaborate on what you're trying to achieve..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 text-xs focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-container transition-colors cursor-pointer"
              >
                Post Question
              </button>
            </div>
          </form>

          {/* Discussion Threads */}
          <div className="space-y-4">
            {discussions.map((d) => (
              <div key={d.id} className="p-5 bg-surface-container-lowest border border-outline-variant rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <UserAvatar avatar={d.userAvatar} name={d.userName} size="md" className="w-10 h-10 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-on-surface">{d.userName}</span>
                      {d.userRole === 'INSTRUCTOR' && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Faculty</span>
                      )}
                    </div>
                    <h5 className="font-bold text-xs sm:text-sm text-on-surface mt-1">{d.title}</h5>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{d.text}</p>
                  </div>
                </div>

                {/* Replies */}
                {d.replies && d.replies.length > 0 && (
                  <div className="pl-6 border-l-2 border-outline-variant/60 space-y-3 pt-2">
                    {d.replies.map((r: any) => (
                      <div key={r.id} className="flex items-start gap-2.5 text-xs">
                        <UserAvatar avatar={r.userAvatar} name={r.userName} size="sm" className="w-7 h-7 shrink-0" />
                        <div>
                          <span className="font-bold text-on-surface">{r.userName}</span>
                          {r.userRole === 'INSTRUCTOR' && (
                            <span className="ml-2 px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">Instructor</span>
                          )}
                          <p className="text-on-surface-variant mt-0.5">{r.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/40">
                  <input
                    type="text"
                    value={replyTextMap[d.id] || ''}
                    onChange={(e) => setReplyTextMap({ ...replyTextMap, [d.id]: e.target.value })}
                    placeholder="Reply to this thread..."
                    className="flex-1 px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs"
                  />
                  <button
                    onClick={() => handlePostReply(d.id)}
                    className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))}
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
          <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Icon name="description" size={24} />
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">Curriculum Source Code &amp; Cheatsheets</p>
                <p className="text-xs text-on-surface-variant">Complete Project Assets (.zip)</p>
              </div>
            </div>
            <button
              onClick={() => showToast({ title: 'Download Started', description: 'Curriculum assets downloading...', type: 'info' })}
              className="px-4 py-2 bg-surface text-primary border border-outline-variant font-bold text-xs rounded-lg hover:bg-surface-container cursor-pointer"
            >
              Download (.zip)
            </button>
          </div>
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
