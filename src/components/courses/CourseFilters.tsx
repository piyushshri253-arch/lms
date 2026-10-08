'use client';

import React from 'react';
import { Icon } from '../ui/Icon';

interface CourseFiltersProps {
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  selectedRating: number;
  onRatingChange: (rating: number) => void;
  categoryCounts: Record<string, number>;
}

export const CourseFilters: React.FC<CourseFiltersProps> = ({
  selectedCategory,
  onCategoryChange,
  selectedLevel,
  onLevelChange,
  selectedRating,
  onRatingChange,
  categoryCounts
}) => {
  const categories = [
    { label: 'All Categories', value: 'all', count: Object.values(categoryCounts).reduce((a, b) => a + b, 0) },
    { label: 'Development', value: 'Engineering', count: categoryCounts['Engineering'] || 124 },
    { label: 'Business', value: 'Business', count: categoryCounts['Business'] || 89 },
    { label: 'Design', value: 'Design', count: categoryCounts['Design'] || 56 },
    { label: 'Marketing', value: 'Marketing', count: categoryCounts['Marketing'] || 42 },
    { label: 'Mobile Dev', value: 'Mobile Dev', count: categoryCounts['Mobile Dev'] || 30 }
  ];

  const levels = ['All Levels', 'Foundational', 'Intermediate', 'Expert'];

  return (
    <aside className="w-full md:w-[280px] bg-surface-container-lowest border-r border-outline-variant p-6 flex-shrink-0 sidebar-scroll overflow-y-auto">
      <div className="pb-4 border-b border-outline-variant/60 mb-6 flex items-center justify-between">
        <h2 className="font-bold text-xl text-on-surface">Filters</h2>
        {(selectedCategory !== 'all' || selectedLevel !== 'All Levels' || selectedRating > 0) && (
          <button
            onClick={() => {
              onCategoryChange('all');
              onLevelChange('All Levels');
              onRatingChange(0);
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Category Filter */}
        <div>
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Category
          </h3>
          <div className="space-y-2.5">
            {categories.map((cat) => (
              <label
                key={cat.value}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedCategory === cat.value}
                  onChange={() => onCategoryChange(selectedCategory === cat.value ? 'all' : cat.value)}
                  className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 bg-surface-container-lowest cursor-pointer"
                />
                <span className="text-sm text-on-surface group-hover:text-primary transition-colors">
                  {cat.label}
                </span>
                <span className="text-xs text-on-surface-variant ml-auto bg-surface-container px-2 py-0.5 rounded-full font-medium">
                  {cat.count}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Level Filter */}
        <div className="border-t border-outline-variant/40 pt-6">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Level
          </h3>
          <div className="space-y-2.5">
            {levels.map((lvl) => (
              <label
                key={lvl}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                <input
                  type="radio"
                  name="level"
                  checked={selectedLevel === lvl}
                  onChange={() => onLevelChange(lvl)}
                  className="border-outline-variant text-primary focus:ring-primary w-4 h-4 bg-surface-container-lowest cursor-pointer"
                />
                <span className="text-sm text-on-surface group-hover:text-primary transition-colors">
                  {lvl}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Rating Filter */}
        <div className="border-t border-outline-variant/40 pt-6">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Rating
          </h3>
          <div className="space-y-2.5">
            {[4.5, 4.0, 3.5].map((stars) => (
              <label
                key={stars}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                <input
                  type="radio"
                  name="rating"
                  checked={selectedRating === stars}
                  onChange={() => onRatingChange(selectedRating === stars ? 0 : stars)}
                  className="border-outline-variant text-primary focus:ring-primary w-4 h-4 bg-surface-container-lowest cursor-pointer"
                />
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      size={16}
                      fill={i < Math.floor(stars)}
                      className={i < Math.floor(stars) ? 'text-amber-500' : 'text-outline-variant'}
                    />
                  ))}
                  <span className="text-xs text-on-surface ml-2 font-medium">& Up</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
