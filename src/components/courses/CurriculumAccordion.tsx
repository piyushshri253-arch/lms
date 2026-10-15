'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CourseModule } from '@/types';
import { Icon } from '../ui/Icon';
import { cleanSectionTitle, generateCurriculumDisplayMap } from '@/lib/course-formatting';

interface CurriculumAccordionProps {
  modules: CourseModule[];
  courseSlug: string;
}

export const CurriculumAccordion: React.FC<CurriculumAccordionProps> = ({
  modules,
  courseSlug
}) => {
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([
    modules[0]?.id || 'mod-1'
  ]);

  const toggleModule = (id: string) => {
    setExpandedModuleIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const lessonDisplayMap = React.useMemo(() => generateCurriculumDisplayMap(modules), [modules]);

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Course Content</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {modules.length} sections • {totalLessons} lectures • 42h total length
          </p>
        </div>
        <button
          onClick={() => {
            if (expandedModuleIds.length === modules.length) {
              setExpandedModuleIds([]);
            } else {
              setExpandedModuleIds(modules.map((m) => m.id));
            }
          }}
          className="text-xs font-bold text-primary hover:underline"
        >
          {expandedModuleIds.length === modules.length ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="divide-y divide-outline-variant/60">
        {modules.map((mod) => {
          const isExpanded = expandedModuleIds.includes(mod.id);

          return (
            <div key={mod.id} className="transition-colors">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full px-6 py-4 flex justify-between items-center bg-surface-container-low/40 hover:bg-surface-container-low transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    name={isExpanded ? 'expand_less' : 'expand_more'}
                    size={20}
                    className="text-secondary"
                  />
                  <div>
                    <span className="text-xs font-bold text-secondary block uppercase tracking-wider">
                      Module {mod.moduleNumber}
                    </span>
                    <span className="text-sm font-bold text-on-surface">{cleanSectionTitle(mod.title, mod.moduleNumber)}</span>
                  </div>
                </div>
                <span className="text-xs text-on-surface-variant font-medium">
                  {mod.lessons.length} lessons
                </span>
              </button>

              {isExpanded && (
                <div className="divide-y divide-outline-variant/30 bg-surface-container-lowest">
                  {mod.lessons.map((lesson) => {
                    const itemInfo = lessonDisplayMap.get(lesson.id);
                    const isArticle = itemInfo?.isArticle || (lesson as any).type === 'TEXT';
                    const isQuiz = itemInfo?.isQuiz || (lesson as any).type === 'QUIZ';
                    const iconName = lesson.completed
                      ? 'check_circle'
                      : lesson.locked
                      ? 'lock'
                      : isArticle
                      ? 'article'
                      : isQuiz
                      ? 'quiz'
                      : 'play_circle';

                    return (
                      <div
                        key={lesson.id}
                        className="px-6 py-3.5 flex items-center justify-between hover:bg-surface-container-low/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            name={iconName}
                            fill={lesson.completed}
                            size={18}
                            className={
                              lesson.completed
                                ? 'text-primary'
                                : lesson.locked
                                ? 'text-outline'
                                : isArticle
                                ? 'text-amber-600'
                                : 'text-primary'
                            }
                          />
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              lesson.locked ? 'text-on-surface-variant' : 'text-on-surface'
                            }`}
                          >
                            {itemInfo?.sidebarTitle || lesson.title}
                          </span>
                          {(lesson as any).versionLocked && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[9px] uppercase tracking-wide flex items-center gap-0.5 shrink-0">
                              <span>🔒</span>
                              <span>{(lesson as any).requiredVersionLabel || 'v2.0'}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-on-surface-variant font-mono">
                            {lesson.duration || (isArticle ? 'Article' : isQuiz ? 'Quiz' : '10:00')}
                          </span>
                          {!lesson.locked && (
                            <Link
                              href={`/learn/${courseSlug}`}
                              className="text-xs font-bold text-primary hover:underline"
                            >
                              Preview
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
