'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Modal } from '@/components/ui/Modal';
import { AppHeader } from '@/components/layout/AppHeader';

interface CourseAuthored {
  id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  price: number;
  status: string;
  level: string;
  studentsCount: number;
  rating: number;
}

export default function InstructorDashboardPage() {
  const { currentUser, showToast } = useApp();
  const [courses, setCourses] = useState<CourseAuthored[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('149');
  const [newCategory, setNewCategory] = useState('Engineering');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInstructorCourses = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/courses?limit=50');
      const data = await res.json();
      if (res.ok && data.courses) {
        // Filter authored courses if instructor
        const myCourses = data.courses.filter(
          (c: any) => c.instructor?.id === currentUser?.id || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'
        );
        setCourses(myCourses.length > 0 ? myCourses : data.courses);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load authored courses.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructorCourses();
  }, [currentUser]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          price: Number(newPrice) || 99,
          category: newCategory,
          level: 'INTERMEDIATE',
          description: 'Comprehensive masterclass created by verified faculty.'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create course');

      showToast({
        title: 'Course Created 🎉',
        description: `"${newTitle}" has been initialized in your instructor catalog.`,
        type: 'success'
      });

      setIsCreateOpen(false);
      setNewTitle('');
      fetchInstructorCourses();
    } catch (err: any) {
      showToast({ title: 'Creation Failed', description: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalStudents = courses.reduce((acc, c) => acc + (c.studentsCount || 0), 0);
  const totalRevenue = courses.reduce((acc, c) => acc + (c.price * (c.studentsCount || 0)), 0);

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              avatar={currentUser?.avatar}
              name={currentUser?.name || 'Instructor'}
              size="2xl"
              className="w-16 h-16 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-on-surface">
                  Instructor Studio: {currentUser?.name || 'Faculty Lead'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-xs font-black uppercase">
                  Faculty
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Manage your masterclasses, student enrollments, curriculum sections, and live lecture ratings.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs px-5 py-3 rounded-2xl hover:bg-primary-container shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
          >
            <Icon name="add" size={18} />
            <span>Create New Course</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-on-surface-variant font-bold">Authored Courses</p>
              <h3 className="text-2xl font-black text-on-surface mt-1">{courses.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="menu_book" size={24} />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-on-surface-variant font-bold">Total Active Learners</p>
              <h3 className="text-2xl font-black text-on-surface mt-1">{totalStudents}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center">
              <Icon name="groups" size={24} />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-on-surface-variant font-bold">Catalog Gross Value</p>
              <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1">${totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <Icon name="payments" size={24} />
            </div>
          </div>
        </div>

        {/* Courses Table / Cards */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-on-surface">Your Authored Masterclasses</h2>
              <p className="text-xs text-on-surface-variant">Live curriculum modules and student enrollment stats</p>
            </div>
            <span className="text-xs font-mono font-bold text-outline">{courses.length} courses</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <Icon name="sync" size={20} className="animate-spin text-primary" />
              <span>Loading authored courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Icon name="school" size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">No courses authored yet</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Click below to publish your first deep-tech masterclass.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-sm cursor-pointer"
              >
                Create Your First Course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-surface-container-low/60 border border-outline-variant/70 hover:border-primary/50 rounded-2xl p-5 flex flex-col justify-between transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-bold text-[10px] uppercase">
                        {course.status}
                      </span>
                      <span className="font-mono text-sm font-black text-on-surface">${course.price}</span>
                    </div>

                    <h3 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                  </div>

                  <div className="pt-4 mt-4 border-t border-outline-variant/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <Icon name="person" size={14} />
                      <span>{course.studentsCount || 0} enrolled</span>
                    </div>

                    <Link
                      href={`/courses/${course.slug || course.id}`}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>View Course</span>
                      <Icon name="arrow_forward" size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Course Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="md"
        title="Initialize New Masterclass"
        subtitle="Add a new verified course to your instructor profile"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">Course Title *</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Distributed Systems Architecture & Raft Consensus"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">Price ($ USD) *</label>
              <input
                type="number"
                required
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">Category *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="Engineering">Engineering</option>
                <option value="AI & Machine Learning">AI & Machine Learning</option>
                <option value="System Design">System Design</option>
                <option value="Cloud Architecture">Cloud Architecture</option>
                <option value="Security">Security & Cryptography</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/60 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Icon name="sync" size={14} className="animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Publish Course</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
