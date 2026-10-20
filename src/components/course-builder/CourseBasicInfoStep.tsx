'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { GrammarHintAssistant } from '@/components/ui/GrammarHintAssistant';
import { checkTitleMinorSpellingFix } from '@/lib/course-title-validator';

interface CourseBasicInfoProps {
  data: {
    id?: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string;
    category: string;
    categoryId?: string;
    level: string;
    language: string;
    durationHours: number;
    whatYouWillLearn: string[];
    requirements: string[];
    targetAudience: string[];
    seoTitle: string;
    seoDescription: string;
  };
  onChange: (field: string, value: any) => void;
  isMinorEditMode?: boolean;
  originalTitle?: string;
}

export const CourseBasicInfoStep: React.FC<CourseBasicInfoProps> = ({
  data,
  onChange,
  isMinorEditMode = false,
  originalTitle
}) => {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryName, setCustomCategoryName] = useState<string>('');

  const [newLearnPoint, setNewLearnPoint] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newAudience, setNewAudience] = useState('');

  // Fetch live categories from database
  useEffect(() => {
    fetch('/api/admin/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.categories?.length > 0) {
          setCategories(d.categories);
          if (!data.category) {
            onChange('category', d.categories[0].name);
            onChange('categoryId', d.categories[0].id);
          }
        } else {
          setCategories([
            { id: 'cat-eng', name: 'Engineering & Cloud Architecture' },
            { id: 'cat-ai', name: 'AI & Data Science' },
            { id: 'cat-design', name: 'UI/UX & Product Design' },
            { id: 'cat-business', name: 'Product Strategy & Business' },
            { id: 'cat-mobile', name: 'Mobile App Development' }
          ]);
        }
      })
      .catch(() => {
        setCategories([
          { id: 'cat-eng', name: 'Engineering & Cloud Architecture' },
          { id: 'cat-ai', name: 'AI & Data Science' },
          { id: 'cat-design', name: 'UI/UX & Product Design' },
          { id: 'cat-business', name: 'Product Strategy & Business' },
          { id: 'cat-mobile', name: 'Mobile App Development' }
        ]);
      });
  }, []);

  const handleCategorySelect = (val: string) => {
    if (val === '__CREATE_NEW__') {
      setIsCustomCategory(true);
      setCustomCategoryName('');
    } else {
      setIsCustomCategory(false);
      const found = categories.find((c) => c.name === val || c.id === val);
      onChange('category', found ? found.name : val);
      if (found) onChange('categoryId', found.id);
    }
  };

  const handleCustomCategoryBlur = () => {
    if (customCategoryName.trim()) {
      onChange('category', customCategoryName.trim());
      onChange('categoryId', undefined);
    }
  };

  const ensureArray = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return val.split(/[;\n\r]+/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const learnPoints = ensureArray(data.whatYouWillLearn);
  const requirementPoints = ensureArray(data.requirements);
  const audiencePoints = ensureArray(data.targetAudience);

  const addPoint = (
    field: 'whatYouWillLearn' | 'requirements' | 'targetAudience',
    val: string,
    setVal: (v: string) => void
  ) => {
    if (!val.trim()) return;
    const current = ensureArray(data[field]);
    onChange(field, [...current, val.trim()]);
    setVal('');
  };

  const removePoint = (
    field: 'whatYouWillLearn' | 'requirements' | 'targetAudience',
    index: number
  ) => {
    const current = [...ensureArray(data[field])];
    current.splice(index, 1);
    onChange(field, current);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Primary Info */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-black text-on-surface">Course Basics &amp; Classification</h3>
          <p className="text-xs text-on-surface-variant">
            Enter the essential identification, topic category, difficulty level, and core metadata.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Course Title *
              </label>
              <GrammarHintAssistant
                text={data.title}
                onApplyCorrection={(corrected) => {
                  onChange('title', corrected);
                  if (!data.slug || data.slug.startsWith('course-')) {
                    onChange(
                      'slug',
                      corrected.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    );
                  }
                }}
                fieldName="Course Title"
              />
            </div>
            <input
              type="text"
              required
              value={data.title}
              onChange={(e) => {
                onChange('title', e.target.value);
                if (!data.slug || data.slug.startsWith('course-')) {
                  onChange(
                    'slug',
                    e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                  );
                }
              }}
              placeholder="e.g. Master Artificial Intelligence &amp; Generative LLM Engineering"
              className="w-full bg-surface border border-outline-variant rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary font-medium"
            />

            {/* Quick Minor Edit: Title Spelling & Typo Restriction Indicator */}
            {isMinorEditMode && originalTitle && (() => {
              const titleStatus = checkTitleMinorSpellingFix(originalTitle, data.title);
              if (!titleStatus.isIdentical && titleStatus.isMinorFix) {
                return (
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2 font-medium">
                    <Icon name="check_circle" size={16} className="text-blue-600 shrink-0" />
                    <span>Minor spelling/typo fix detected ({Math.round(titleStatus.similarity * 100)}% match) ✓ Allowed for direct live publish.</span>
                  </div>
                );
              }
              if (!titleStatus.isMinorFix) {
                return (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
                    <Icon name="block" size={17} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-rose-900 dark:text-rose-100">Major Title Change Blocked in Quick Edit</div>
                      <p className="text-[11px] text-rose-800/90 dark:text-rose-200/90 leading-relaxed">
                        You cannot completely replace or overhaul the course title in Quick Minor Edit mode (Similarity: {Math.round(titleStatus.similarity * 100)}%). Only spelling or typo corrections are permitted. For complete title renaming, please use &quot;Update Version&quot; from My Courses.
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 flex items-center gap-1.5">
                  <Icon name="lock" size={13} className="text-blue-500" />
                  <span>Quick Minor Edit active: Only minor spelling &amp; typo fixes are permitted for the title.</span>
                </p>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                URL Slug / Identifier
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant font-mono">
                  /courses/
                </span>
                <input
                  type="text"
                  value={data.slug}
                  onChange={(e) => onChange('slug', e.target.value)}
                  placeholder="ai-llm-engineering"
                  className="w-full pl-24 pr-4 py-3 bg-surface border border-outline-variant rounded-2xl text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Category Selector with "+ Create New Category" */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Icon name={isCustomCategory ? 'list' : 'add'} size={14} />
                  <span>{isCustomCategory ? 'Select from list' : '+ Create New Category'}</span>
                </button>
              </div>

              {!isCustomCategory ? (
                <select
                  value={data.category || ''}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-2xl px-4 py-3 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="__CREATE_NEW__" className="text-primary font-bold">
                    + Create New Custom Category...
                  </option>
                </select>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customCategoryName || data.category}
                    onChange={(e) => {
                      setCustomCategoryName(e.target.value);
                      onChange('category', e.target.value);
                    }}
                    onBlur={handleCustomCategoryBlur}
                    placeholder="Enter custom category name (e.g. AI & Generative Agents)"
                    className="w-full bg-primary/5 border border-primary rounded-2xl px-4 py-3 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary font-mono px-2 py-0.5 bg-primary/10 rounded-full">
                    New Category
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Skill Level
              </label>
              <select
                value={data.level}
                onChange={(e) => onChange('level', e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-2xl px-4 py-3 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL_LEVELS">All Levels</option>
                <option value="BEGINNER">Foundational</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="EXPERT">Expert / Advanced</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Primary Language
              </label>
              <input
                type="text"
                value={data.language}
                onChange={(e) => onChange('language', e.target.value)}
                placeholder="English / Hindi"
                className="w-full bg-surface border border-outline-variant rounded-2xl px-4 py-3 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Estimated Duration (Hours)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={data.durationHours}
                onChange={(e) => onChange('durationHours', Number(e.target.value))}
                placeholder="16.5"
                className="w-full bg-surface border border-outline-variant rounded-2xl px-4 py-3 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Short Description / Subtitle
              </label>
              <GrammarHintAssistant
                text={data.shortDescription}
                onApplyCorrection={(corrected) => onChange('shortDescription', corrected)}
                fieldName="Short Description"
              />
            </div>
            <input
              type="text"
              value={data.shortDescription}
              onChange={(e) => onChange('shortDescription', e.target.value)}
              placeholder="Master high-concurrency event-driven backends, service meshes, and resilient cloud deployments."
              className="w-full bg-surface border border-outline-variant rounded-2xl px-4 py-3 text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Full Course Description &amp; Syllabus Overview *
              </label>
              <GrammarHintAssistant
                text={data.description}
                onApplyCorrection={(corrected) => onChange('description', corrected)}
                fieldName="Course Description"
              />
            </div>
            <textarea
              rows={5}
              required
              value={data.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Provide an in-depth breakdown of the concepts, architectural patterns, hands-on projects, and real-world skills taught in this masterclass..."
              className="w-full bg-surface border border-outline-variant rounded-2xl p-4 text-xs leading-relaxed text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Bullet Lists: Learning Outcomes, Requirements, Target Audience */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. What You Will Learn */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <Icon name="check_circle" size={16} className="text-primary" />
              <span>WHAT YOU’LL LEARN</span>
            </h4>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Key learning outcomes &amp; skills</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={newLearnPoint}
                onChange={(e) => setNewLearnPoint(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (e.preventDefault(), addPoint('whatYouWillLearn', newLearnPoint, setNewLearnPoint))
                }
                placeholder="Add key takeaway..."
                className="flex-1 bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => addPoint('whatYouWillLearn', newLearnPoint, setNewLearnPoint)}
                className="px-3 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl cursor-pointer"
              >
                Add
              </button>
            </div>
            {newLearnPoint.trim().length > 3 && (
              <div className="flex justify-end">
                <GrammarHintAssistant
                  text={newLearnPoint}
                  onApplyCorrection={(corrected) => setNewLearnPoint(corrected)}
                  fieldName="Learning Outcome"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {learnPoints.map((point, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-surface-container-low rounded-xl text-xs flex justify-between items-start gap-2"
              >
                <span className="text-on-surface font-medium leading-tight">{point}</span>
                <button
                  type="button"
                  onClick={() => removePoint('whatYouWillLearn', idx)}
                  className="text-outline hover:text-rose-600 cursor-pointer"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>


         {/* 2. Target Audience */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <Icon name="groups" size={16} className="text-tertiary" />
              <span>WHO THIS COURSE IS FOR</span>
            </h4>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Who can benefit from this course</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newAudience}
              onChange={(e) => setNewAudience(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                (e.preventDefault(), addPoint('targetAudience', newAudience, setNewAudience))}
              placeholder="e.g. Backend Engineers"
              className="flex-1 bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => addPoint('targetAudience', newAudience, setNewAudience)}
              className="px-3 py-2 bg-tertiary text-on-tertiary text-xs font-bold rounded-xl cursor-pointer"
            >
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {audiencePoints.map((aud, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-surface-container-low rounded-xl text-xs flex justify-between items-start gap-2"
              >
                <span className="text-on-surface font-medium leading-tight">{aud}</span>
                <button
                  type="button"
                  onClick={() => removePoint('targetAudience', idx)}
                  className="text-outline hover:text-rose-600 cursor-pointer"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Prerequisites & Requirements */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <Icon name="rule" size={16} className="text-secondary" />
              <span>BEFORE YOU BEGIN</span>
            </h4>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Knowledge or experience you may need</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                (e.preventDefault(), addPoint('requirements', newRequirement, setNewRequirement))
              }
              placeholder="e.g. Basic Docker knowledge"
              className="flex-1 bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => addPoint('requirements', newRequirement, setNewRequirement)}
              className="px-3 py-2 bg-primary text-on-secondary text-xs font-bold rounded-xl cursor-pointer"
            >
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {requirementPoints.map((req, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-surface-container-low rounded-xl text-xs flex justify-between items-start gap-2"
              >
                <span className="text-on-surface font-medium leading-tight">{req}</span>
                <button
                  type="button"
                  onClick={() => removePoint('requirements', idx)}
                  className="text-outline hover:text-rose-600 cursor-pointer"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

       
      </div>

      {/* SEO Metadata */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-on-surface">
            SEO &amp; Search Engine Optimization
          </h3>
          <p className="text-[11px] text-on-surface-variant">
            Optimize how this course appears in Google search engine snippets and social media previews.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface">
              SEO Title Tag
            </label>
            <input
              type="text"
              value={data.seoTitle}
              onChange={(e) => onChange('seoTitle', e.target.value)}
              placeholder="AI & Generative Agents Masterclass | MORENA TEACH"
              className="w-full bg-surface border border-outline-variant rounded-2xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface">
              SEO Meta Description
            </label>
            <input
              type="text"
              value={data.seoDescription}
              onChange={(e) => onChange('seoDescription', e.target.value)}
              placeholder="Learn modern AI agent workflows, embeddings, and RAG architectures."
              className="w-full bg-surface border border-outline-variant rounded-2xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

