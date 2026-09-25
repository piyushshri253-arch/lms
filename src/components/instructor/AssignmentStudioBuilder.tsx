'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ClipboardList
} from 'lucide-react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';

const COMMON_FILE_TYPES = ['pdf', 'zip', 'docx', 'png', 'jpg', 'pptx', 'xlsx', 'py', 'js', 'txt'];

export default function AssignmentStudioBuilder({ assignmentId }: { assignmentId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams?.get('courseId') || '';
  const initialModuleId = searchParams?.get('moduleId') || '';
  const initialLessonId = searchParams?.get('lessonId') || '';

  const isEdit = Boolean(assignmentId);

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  // Assignment Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [courseId, setCourseId] = useState(initialCourseId);
  const [moduleId, setModuleId] = useState(initialModuleId);
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [maxMarks, setMaxMarks] = useState<number>(20);
  const [dueDate, setDueDate] = useState('');
  const [submissionType, setSubmissionType] = useState<
    'FILE_UPLOAD' | 'TEXT_SUBMISSION' | 'FILE_AND_TEXT'
  >('FILE_AND_TEXT');
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>([
    'pdf',
    'zip',
    'docx',
    'png',
    'jpg'
  ]);
  const [maxFileSizeMB, setMaxFileSizeMB] = useState<number>(10);
  const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(true);
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [lateSubmissionPolicy, setLateSubmissionPolicy] = useState<
    'ALLOWED' | 'ALLOWED_WITH_PENALTY' | 'NOT_ALLOWED'
  >('ALLOWED_WITH_PENALTY');
  const [latePenaltyPercentage, setLatePenaltyPercentage] = useState<number>(10);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const listRes = await fetch('/api/instructor/assignments');
        const listData = await listRes.json();
        if (listData.courses) {
          setCourses(listData.courses);
          if (!courseId && listData.courses.length > 0 && !isEdit) {
            const firstCourse = listData.courses[0];
            setCourseId(firstCourse.id);
            if (firstCourse.modules?.length > 0) {
              setModuleId(firstCourse.modules[0].id);
            }
          }
        }

        if (isEdit && assignmentId) {
          const res = await fetch(`/api/instructor/assignments/${assignmentId}`);
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error || 'Failed to load assignment.');
            return;
          }
          const a = data.assignment;
          setTitle(a.title || '');
          setDescription(a.description || '');
          setInstructions(a.instructions || a.description || '');
          setCourseId(a.courseId || '');
          setModuleId(a.moduleId || '');
          setLessonId(a.lessonId || '');
          setMaxMarks(Number(a.maxMarks || 20));
          setDueDate(a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 16) : '');
          setSubmissionType(a.submissionType || 'FILE_AND_TEXT');
          setAllowedFileTypes(
            Array.isArray(a.allowedFileTypes) ? a.allowedFileTypes : ['pdf', 'zip', 'docx']
          );
          setMaxFileSizeMB(Number(a.maxFileSizeMB || 10));
          setAllowMultipleSubmissions(a.allowMultipleSubmissions ?? true);
          setAllowResubmission(a.allowResubmission ?? true);
          setLateSubmissionPolicy(a.lateSubmissionPolicy || 'ALLOWED_WITH_PENALTY');
          setLatePenaltyPercentage(Number(a.latePenaltyPercentage ?? 10));
          setStatus(a.status || 'PUBLISHED');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to initialize assignment builder.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [assignmentId, isEdit]);

  const selectedCourseObj = courses.find((c) => c.id === courseId);
  const availableModules = selectedCourseObj?.modules || [];
  const selectedModuleObj = availableModules.find((m: any) => m.id === moduleId);
  const availableLessons = selectedModuleObj?.lessons || [];

  const toggleFileType = (ext: string) => {
    setAllowedFileTypes((prev) =>
      prev.includes(ext) ? prev.filter((x) => x !== ext) : [...prev, ext]
    );
  };

  const handleSave = async (targetStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!title.trim()) {
      setErrorMsg('Assignment Title is required.');
      return;
    }
    if (!description.trim() && !instructions.trim()) {
      setErrorMsg('Description and student instructions are required.');
      return;
    }
    if (!courseId) {
      setErrorMsg('Please select a Course owned by you.');
      return;
    }
    if (!maxMarks || Number(maxMarks) <= 0) {
      setErrorMsg('Maximum Marks must be greater than 0.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        description: description.trim() || instructions.trim(),
        instructions: instructions.trim() || description.trim(),
        courseId,
        moduleId,
        lessonId,
        maxMarks: Number(maxMarks),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        submissionType,
        allowedFileTypes,
        maxFileSizeMB: Number(maxFileSizeMB) || 10,
        allowMultipleSubmissions,
        allowResubmission,
        lateSubmissionPolicy,
        latePenaltyPercentage: Number(latePenaltyPercentage) || 0,
        status: targetStatus
      };

      const url = isEdit
        ? `/api/instructor/assignments/${assignmentId}`
        : '/api/instructor/assignments';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save assignment.');
        return;
      }

      setStatus(targetStatus);
      setSuccessMsg(data.message || 'Assignment saved successfully!');
      setTimeout(() => {
        router.push('/instructor/assignments');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <InstructorPortalShell
      title={isEdit ? `Edit Assignment: ${title || 'Project'}` : 'Create New Assignment'}
      subtitle="Full-Page Studio Assignment Builder — Configure deliverables, allowed file formats, late submission policy, and grading rubric"
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/instructor/assignments"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Assignments
            </Link>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
              Max Marks: {maxMarks} • {submissionType.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
                previewMode
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Eye className="w-4 h-4" />
              {previewMode ? 'Exit Student Preview' : 'Preview Assignment'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('DRAFT')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('PUBLISHED')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              <Send className="w-4 h-4" />
              {saving ? 'Saving...' : 'Publish Assignment'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {previewMode ? (
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                  STUDENT PREVIEW VIEW
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                  {title || 'Untitled Assignment'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Maximum Marks: <strong>{maxMarks}</strong> • Due Date:{' '}
                  <strong>{dueDate ? new Date(dueDate).toLocaleString() : 'No Deadline'}</strong> •
                  Late Policy: <strong>{lateSubmissionPolicy.replace(/_/g, ' ')}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Overview & Instructions</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                {instructions || description || 'No instructions entered yet.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/40 space-y-4">
              <div className="text-sm font-bold text-indigo-950">
                Student Submission Workspace ({submissionType.replace(/_/g, ' ')})
              </div>

              {(submissionType === 'FILE_UPLOAD' || submissionType === 'FILE_AND_TEXT') && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
                  <strong>File Upload Box:</strong> Allowed formats:{' '}
                  <code>{allowedFileTypes.join(', ')}</code> (Max {maxFileSizeMB} MB)
                </div>
              )}

              {(submissionType === 'TEXT_SUBMISSION' || submissionType === 'FILE_AND_TEXT') && (
                <textarea
                  rows={3}
                  disabled
                  placeholder="Student written response / repository link / explanation goes here..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Capstone Project: Build a Responsive E-Commerce Checkout Flow"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Short Summary / Description *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of the assignment goal..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Detailed Instructions & Grading Rubric *
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Step-by-step deliverable requirements, evaluation rubric, and submission guidelines..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                />
              </div>

              {/* Course / Module / Lesson Selectors */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Course (Owned by You) *
                </label>
                <select
                  value={courseId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setCourseId(nextId);
                    const c = courses.find((item) => item.id === nextId);
                    setModuleId(c?.modules?.[0]?.id || '');
                    setLessonId('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Module / Section *
                </label>
                <select
                  value={moduleId}
                  onChange={(e) => {
                    setModuleId(e.target.value);
                    setLessonId('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                >
                  <option value="">Select Module</option>
                  {availableModules.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Target Lesson (Optional — Auto-creates Assignment Lesson if blank)
                </label>
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                >
                  <option value="">+ Create Dedicated Assignment Lesson</option>
                  {availableLessons.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Maximum Marks *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Submission Type & File Restrictions */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Submission Type *
                </label>
                <select
                  value={submissionType}
                  onChange={(e) => setSubmissionType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                >
                  <option value="FILE_AND_TEXT">File Upload + Written Text Response</option>
                  <option value="FILE_UPLOAD">File Upload Only</option>
                  <option value="TEXT_SUBMISSION">Text Submission Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Maximum File Size (MB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxFileSizeMB}
                  onChange={(e) => setMaxFileSizeMB(Number(e.target.value) || 10)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  Allowed Educational File Formats
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_FILE_TYPES.map((ext) => {
                    const active = allowedFileTypes.includes(ext);
                    return (
                      <button
                        key={ext}
                        type="button"
                        onClick={() => toggleFileType(ext)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        .{ext}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Late Submission Policy & Resubmission Toggles */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Late Submission Policy (After Due Date)
                </label>
                <select
                  value={lateSubmissionPolicy}
                  onChange={(e) => setLateSubmissionPolicy(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                >
                  <option value="ALLOWED_WITH_PENALTY">
                    Allowed with Automatic Score Penalty (%)
                  </option>
                  <option value="ALLOWED">Allowed (Marked as LATE, No Score Penalty)</option>
                  <option value="NOT_ALLOWED">Not Allowed (Reject Submissions After Deadline)</option>
                </select>
              </div>

              {lateSubmissionPolicy === 'ALLOWED_WITH_PENALTY' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Server-Side Late Penalty Deduction (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={latePenaltyPercentage}
                    onChange={(e) => setLatePenaltyPercentage(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Automatically deducts {latePenaltyPercentage}% from raw marks and displays both
                    Original & Final marks.
                  </p>
                </div>
              )}

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowResubmission}
                    onChange={(e) => setAllowResubmission(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Allow Instructor Return for Resubmission (RETURNED)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Enables returning an assignment with feedback so the student can submit a new
                      version while preserving Submission 1, 2, 3 in history.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMultipleSubmissions}
                    onChange={(e) => setAllowMultipleSubmissions(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Allow Multiple Submissions Before Grading
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Students can upload updated versions prior to final grading; all versions are
                      logged with timestamps.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </InstructorPortalShell>
  );
}
