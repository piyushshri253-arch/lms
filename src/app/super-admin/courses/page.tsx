'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function SuperAdminCoursesPage() {
  const { showToast } = useApp();
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Create Course State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPrice, setCreatePrice] = useState('149.99');
  const [createCategoryId, setCreateCategoryId] = useState('');
  const [createInstructorId, setCreateInstructorId] = useState('');
  const [createLevel, setCreateLevel] = useState('ALL_LEVELS');
  const [createStatus, setCreateStatus] = useState('PUBLISHED');

  // Edit / Curriculum Builder State
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newLessonSectionId, setNewLessonSectionId] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState('15:00');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  );
  const [newLessonIsFree, setNewLessonIsFree] = useState(false);

  const fetchCoursesAndMetadata = async () => {
    setIsLoading(true);
    try {
      const [crRes, catRes, instRes] = await Promise.all([
        fetch(`/api/super-admin/courses?q=${encodeURIComponent(search)}&status=${statusFilter}`),
        fetch('/api/super-admin/categories'),
        fetch('/api/super-admin/instructors')
      ]);

      if (crRes.ok) {
        const d = await crRes.json();
        setCourses(d.courses || []);
      }
      if (catRes.ok) {
        const c = await catRes.json();
        setCategories(c.categories || []);
        if (c.categories?.length > 0 && !createCategoryId) {
          setCreateCategoryId(c.categories[0].id);
        }
      }
      if (instRes.ok) {
        const i = await instRes.json();
        setInstructors(i.instructors || []);
        if (i.instructors?.length > 0 && !createInstructorId) {
          setCreateInstructorId(i.instructors[0].id);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesAndMetadata();
  }, [search, statusFilter]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createTitle,
          description: createDesc,
          price: createPrice,
          categoryId: createCategoryId,
          instructorId: createInstructorId,
          level: createLevel,
          status: createStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create course');

      showToast({ title: 'Master Course Initialized', description: data.message, type: 'success' });
      setIsCreateOpen(false);
      setCreateTitle('');
      setCreateDesc('');
      await fetchCoursesAndMetadata();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      const res = await fetch('/api/super-admin/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedCourse)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update course');

      showToast({ title: 'Course Settings Saved', description: data.message, type: 'success' });
      setIsEditOpen(false);
      await fetchCoursesAndMetadata();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (
      !confirm(
        `🚨 WARNING: Are you sure you want to permanently delete "${title}"? This will delete all its sections, lessons, and progress data.`
      )
    )
      return;

    try {
      const res = await fetch(`/api/super-admin/courses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete course');

      showToast({ title: 'Course Deleted', description: data.message, type: 'info' });
      await fetchCoursesAndMetadata();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  // Curriculum Handlers
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newSectionTitle.trim()) return;

    try {
      const res = await fetch('/api/super-admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SECTION',
          courseId: selectedCourse.id,
          title: newSectionTitle
        })
      });
      if (res.ok) {
        setNewSectionTitle('');
        await fetchCoursesAndMetadata();
        // Update selected course view
        const updated = await (await fetch(`/api/super-admin/courses?q=${selectedCourse.title}`)).json();
        const found = updated.courses?.find((c: any) => c.id === selectedCourse.id);
        if (found) setSelectedCourse(found);
      }
    } catch {}
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonSectionId || !newLessonTitle.trim()) return;

    try {
      const res = await fetch('/api/super-admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'LESSON',
          sectionId: newLessonSectionId,
          title: newLessonTitle,
          duration: newLessonDuration,
          videoUrl: newLessonVideoUrl,
          isFree: newLessonIsFree
        })
      });
      if (res.ok) {
        setNewLessonTitle('');
        await fetchCoursesAndMetadata();
        const updated = await (await fetch(`/api/super-admin/courses?q=${selectedCourse.title}`)).json();
        const found = updated.courses?.find((c: any) => c.id === selectedCourse.id);
        if (found) setSelectedCourse(found);
      }
    } catch {}
  };

  const handleDeleteCurriculumItem = async (type: 'SECTION' | 'LESSON', id: string) => {
    if (!confirm(`Delete this ${type.toLowerCase()}?`)) return;
    try {
      const res = await fetch(`/api/super-admin/curriculum?type=${type}&id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchCoursesAndMetadata();
        const updated = await (await fetch(`/api/super-admin/courses?q=${selectedCourse.title}`)).json();
        const found = updated.courses?.find((c: any) => c.id === selectedCourse.id);
        if (found) setSelectedCourse(found);
      }
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Courses</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Master Curricula &amp; Course Builder
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Full authority over course publishing, instructors, pricing, video lectures, and curriculum hierarchy
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Icon name="add" size={18} />
          <span>New Master Course</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Icon
            name="search"
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, instructor..."
            className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/80 text-outline hover:text-on-surface'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((c) => (
          <div
            key={c.id}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-all"
          >
            <div>
              <div className="relative aspect-video w-full overflow-hidden bg-surface-container flex items-center justify-center">
                {c.thumbnail ? (
                  <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <Icon name="school" size={40} className="text-outline" />
                )}
                <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  {c.category}
                </div>
                <div className="absolute top-2.5 right-2.5">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      c.status === 'PUBLISHED'
                        ? 'bg-emerald-500 text-white'
                        : c.status === 'ARCHIVED'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface line-clamp-2">{c.title}</h3>
                  <p className="text-[11px] text-outline mt-0.5">Faculty Lead: {c.instructor?.name}</p>
                </div>

                <div className="p-3 bg-surface-container-low rounded-2xl grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-outline uppercase block">Tuition</span>
                    <span className="font-extrabold text-primary text-sm">${c.price}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase block">Curriculum</span>
                    <span className="font-bold text-on-surface">
                      {c.sectionsCount} Sec • {c.lessonsCount} Lect
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase block">Enrollments</span>
                    <span className="font-bold text-on-surface">{c.enrollmentCount} Learners</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase block">Gross Inflow</span>
                    <span className="font-bold text-emerald-800">${c.revenue}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="p-4 pt-0 border-t border-outline-variant/40 flex items-center justify-between gap-2 mt-2">
              <button
                onClick={() => {
                  setSelectedCourse(c);
                  setIsCurriculumOpen(true);
                  if (c.sections?.length > 0) {
                    setNewLessonSectionId(c.sections[0].id);
                  }
                }}
                className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Icon name="account_tree" size={16} />
                <span>Curriculum Builder</span>
              </button>

              <button
                onClick={() => {
                  setSelectedCourse(c);
                  setIsEditOpen(true);
                }}
                className="p-2 border border-outline-variant hover:border-primary text-outline hover:text-primary rounded-xl cursor-pointer"
                title="Edit Course Details"
              >
                <Icon name="tune" size={16} />
              </button>

              <button
                onClick={() => handleDeleteCourse(c.id, c.title)}
                className="p-2 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                title="Delete Course"
              >
                <Icon name="delete" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Course Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="lg"
        title="Initialize Master Course Curriculum"
        subtitle="Create a new course entry in the database"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Course Title
            </label>
            <input
              type="text"
              required
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="e.g. Distributed Cloud Architecture with Rust & Kubernetes"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Course Description
            </label>
            <textarea
              rows={3}
              required
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="Master fault-tolerant microservices, Kafka event streams, and database sharding..."
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Price ($ USD)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={createPrice}
                onChange={(e) => setCreatePrice(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Category
              </label>
              <select
                value={createCategoryId}
                onChange={(e) => setCreateCategoryId(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Faculty Instructor
              </label>
              <select
                value={createInstructorId}
                onChange={(e) => setCreateInstructorId(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
              >
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Experience Level
              </label>
              <select
                value={createLevel}
                onChange={(e) => setCreateLevel(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL_LEVELS">All Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Publish Status
              </label>
              <select
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs cursor-pointer"
            >
              Create Master Course
            </button>
          </div>
        </form>
      </Modal>

      {/* Curriculum Builder Modal */}
      <Modal
        isOpen={isCurriculumOpen}
        onClose={() => setIsCurriculumOpen(false)}
        maxWidth="lg"
        title="Interactive Curriculum Builder"
        subtitle={`Managing sections and video lectures for: ${selectedCourse?.title}`}
      >
        {selectedCourse && (
          <div className="space-y-6">
            {/* Add New Section Form */}
            <form onSubmit={handleAddSection} className="flex gap-2 p-3 bg-surface-container-low rounded-2xl">
              <input
                type="text"
                required
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="New Section Title (e.g. Module 3: Redis Caching & Locks)..."
                className="flex-1 bg-surface border border-outline-variant rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs cursor-pointer shrink-0"
              >
                Add Section
              </button>
            </form>

            {/* Sections & Lessons Hierarchy */}
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {selectedCourse.sections?.map((sec: any, sIdx: number) => (
                <div key={sec.id} className="border border-outline-variant/80 rounded-2xl overflow-hidden bg-surface-container-lowest">
                  <div className="p-3.5 bg-surface-container-low/70 border-b border-outline-variant/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-extrabold uppercase text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                        Section {sIdx + 1}
                      </span>
                      <h4 className="font-extrabold text-xs text-on-surface">{sec.title}</h4>
                    </div>
                    <button
                      onClick={() => handleDeleteCurriculumItem('SECTION', sec.id)}
                      className="text-outline hover:text-rose-600 p-1 cursor-pointer"
                      title="Delete Section"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>

                  <div className="p-3 space-y-2">
                    {sec.lessons?.map((lesson: any) => (
                      <div
                        key={lesson.id}
                        className="p-2.5 bg-surface border border-outline-variant/60 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon name="play_circle" size={16} className="text-primary shrink-0" />
                          <div>
                            <p className="font-bold text-on-surface">{lesson.title}</p>
                            <span className="text-[10px] font-mono text-outline">
                              Duration: {lesson.duration || '10:00'} • {lesson.isFree ? 'Free Preview' : 'Enrollment Required'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteCurriculumItem('LESSON', lesson.id)}
                          className="text-outline hover:text-rose-600 p-1 cursor-pointer"
                          title="Delete Lesson"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Add Lesson Form for this Section */}
                    <div className="pt-2">
                      <button
                        onClick={() => setNewLessonSectionId(sec.id)}
                        className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 cursor-pointer ${
                          newLessonSectionId === sec.id
                            ? 'bg-primary text-on-primary border-primary'
                            : 'border-outline-variant text-outline hover:text-on-surface'
                        }`}
                      >
                        <Icon name="add" size={14} />
                        <span>Add Lecture to Section {sIdx + 1}</span>
                      </button>

                      {newLessonSectionId === sec.id && (
                        <form onSubmit={handleAddLesson} className="mt-2 p-3 bg-surface-container-low rounded-xl space-y-2">
                          <input
                            type="text"
                            required
                            value={newLessonTitle}
                            onChange={(e) => setNewLessonTitle(e.target.value)}
                            placeholder="Lesson Title (e.g. 2.1 Implementing Distributed Locks)..."
                            className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-primary"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newLessonDuration}
                              onChange={(e) => setNewLessonDuration(e.target.value)}
                              placeholder="Duration (e.g. 15:00)"
                              className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
                            />
                            <div className="flex items-center gap-2 px-2">
                              <input
                                type="checkbox"
                                id={`free-${sec.id}`}
                                checked={newLessonIsFree}
                                onChange={(e) => setNewLessonIsFree(e.target.checked)}
                                className="rounded text-primary cursor-pointer"
                              />
                              <label htmlFor={`free-${sec.id}`} className="text-xs font-bold text-on-surface cursor-pointer">
                                Free Preview
                              </label>
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-xs cursor-pointer"
                          >
                            Save Lesson
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
