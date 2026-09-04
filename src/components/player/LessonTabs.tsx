'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';
import { useApp } from '@/context/AppContext';

interface LessonTabsProps {
  courseId?: string;
  lessonId?: string;
  lessonTitle: string;
  instructorName?: string;
  instructorRole?: string;
  instructorAvatar?: string | null;
  resources?: Array<{ name: string; url: string; size?: string }>;
  onSeekTimestamp?: (seconds: number) => void;
}

export const LessonTabs: React.FC<LessonTabsProps> = ({
  courseId,
  lessonId,
  lessonTitle,
  instructorName = 'Faculty Lead',
  instructorRole = 'Systems Architect & Instructor',
  instructorAvatar = null,
  resources = [],
  onSeekTimestamp
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'discussion' | 'notes' | 'bookmarks' | 'assignments' | 'resources'>('overview');
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

  useEffect(() => {
    fetchNotes();
    fetchBookmarks();
    fetchDiscussions();
    fetchAssignments();
  }, [lessonId, courseId]);

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
      <div className="flex border-b border-outline-variant mb-6 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'text-primary border-b-2 border-primary font-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-5 py-3 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'notes'
              ? 'text-primary border-b-2 border-primary font-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          My Notes ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`px-5 py-3 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'bookmarks'
              ? 'text-primary border-b-2 border-primary font-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Bookmarks ({bookmarks.length})
        </button>
        <button
          onClick={() => setActiveTab('discussion')}
          className={`px-5 py-3 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'discussion'
              ? 'text-primary border-b-2 border-primary font-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Q&amp;A Discussion ({discussions.length})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-5 py-3 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'assignments'
              ? 'text-primary border-b-2 border-primary font-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Assignments ({assignments.length})
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-5 py-3 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'resources'
              ? 'text-primary border-b-2 border-primary font-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Downloads &amp; Assets
        </button>
      </div>

      {/* Tab Content Panels */}
      {/* 1. Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-200">
          <div className="md:col-span-2 space-y-4 text-on-surface-variant text-sm leading-relaxed">
            <h3 className="text-lg font-bold text-on-surface">About this Lesson</h3>
            <p>
              In this module, you will master the fundamental concepts, real-world patterns, and production architectural standards.
            </p>
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-2 mt-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Learning Objectives</h4>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <Icon name="check_circle" size={16} className="text-emerald-700" />
                  <span>Master modular architectural patterns</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check_circle" size={16} className="text-emerald-700" />
                  <span>Write maintainable, battle-tested code</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
              <h4 className="text-xs font-bold text-on-surface mb-4 uppercase tracking-wider">Instructor</h4>
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatar={instructorAvatar}
                  name={instructorName}
                  size="lg"
                  className="w-12 h-12 shrink-0"
                />
                <div>
                  <p className="font-bold text-sm text-on-surface">{instructorName}</p>
                  <p className="text-xs text-secondary">{instructorRole}</p>
                </div>
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
    </div>
  );
};
