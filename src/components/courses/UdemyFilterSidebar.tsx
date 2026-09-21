'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export interface FilterState {
  category: string;
  level: string;
  rating: number;
  duration: string;
  price: string;
  features: string[];
}

interface UdemyFilterSidebarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
  categoryCounts: Record<string, number>;
  availableCategories: { id: string; name: string; slug: string }[];
  priceCounts?: { paid: number; free: number };
}

export const UdemyFilterSidebar: React.FC<UdemyFilterSidebarProps> = ({
  filters,
  onChange,
  onReset,
  categoryCounts,
  availableCategories,
  priceCounts
}) => {
  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    ratings: true,
    duration: true,
    category: true,
    level: true,
    price: true,
    features: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.level !== 'all' ||
    filters.rating > 0 ||
    filters.duration !== 'all' ||
    filters.price !== 'all' ||
    filters.features.length > 0;

  const handleRatingSelect = (rating: number) => {
    onChange({ ...filters, rating: filters.rating === rating ? 0 : rating });
  };

  const handleDurationSelect = (dur: string) => {
    onChange({ ...filters, duration: filters.duration === dur ? 'all' : dur });
  };

  const handleCategorySelect = (catName: string) => {
    onChange({ ...filters, category: filters.category === catName ? 'all' : catName });
  };

  const handleLevelSelect = (lvl: string) => {
    onChange({ ...filters, level: filters.level === lvl ? 'all' : lvl });
  };

  const handlePriceSelect = (pr: string) => {
    onChange({ ...filters, price: filters.price === pr ? 'all' : pr });
  };

  const handleFeatureToggle = (feature: string) => {
    const exists = filters.features.includes(feature);
    const updated = exists
      ? filters.features.filter((f) => f !== feature)
      : [...filters.features, feature];
    onChange({ ...filters, features: updated });
  };

  return (
    <aside className="w-full md:w-[280px] shrink-0">
      {/* Active Filters Clear Button */}
      {hasActiveFilters && (
        <div className="pb-4 flex items-center justify-between border-b border-[#d1d7dc] mb-4">
          <span className="text-xs font-bold text-[#6a6f73] uppercase tracking-wider">
            Active Filters
          </span>
          <button
            onClick={onReset}
            className="text-xs font-bold text-[#5022c3] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* 1. Ratings Accordion */}
      <div className="border-b border-[#d1d7dc] py-4">
        <button
          onClick={() => toggleSection('ratings')}
          className="w-full flex items-center justify-between font-bold text-base text-[#2d2f31] py-1 text-left"
        >
          <span>Ratings</span>
          <Icon
            name={openSections.ratings ? 'expand_less' : 'expand_more'}
            size={20}
            className="text-[#6a6f73]"
          />
        </button>

        {openSections.ratings && (
          <div className="mt-3 space-y-2.5">
            {[
              { val: 4.5, label: '4.5 & up' },
              { val: 4.0, label: '4.0 & up' },
              { val: 3.5, label: '3.5 & up' },
              { val: 3.0, label: '3.0 & up' }
            ].map((r) => {
              const isChecked = filters.rating === r.val;
              return (
                <label
                  key={r.val}
                  className="flex items-center gap-2.5 cursor-pointer group select-none text-sm text-[#2d2f31]"
                >
                  <input
                    type="radio"
                    name="rating_filter"
                    checked={isChecked}
                    onChange={() => handleRatingSelect(r.val)}
                    className="w-4 h-4 text-[#2d2f31] border-[#2d2f31] focus:ring-0 cursor-pointer"
                  />
                  <div className="flex items-center text-[#b4690e]">
                    {[...Array(5)].map((_, i) => (
                      <Icon
                        key={i}
                        name="star"
                        size={15}
                        fill={i < Math.floor(r.val)}
                        className={i < Math.floor(r.val) ? 'text-[#b4690e]' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="font-normal">{r.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Video Duration Accordion */}
      <div className="border-b border-[#d1d7dc] py-4">
        <button
          onClick={() => toggleSection('duration')}
          className="w-full flex items-center justify-between font-bold text-base text-[#2d2f31] py-1 text-left"
        >
          <span>Video Duration</span>
          <Icon
            name={openSections.duration ? 'expand_less' : 'expand_more'}
            size={20}
            className="text-[#6a6f73]"
          />
        </button>

        {openSections.duration && (
          <div className="mt-3 space-y-2.5">
            {[
              { val: '0-1', label: '0-1 Hour' },
              { val: '1-3', label: '1-3 Hours' },
              { val: '3-6', label: '3-6 Hours' },
              { val: '6-17', label: '6-17 Hours' },
              { val: '17+', label: '17+ Hours' }
            ].map((d) => {
              const isChecked = filters.duration === d.val;
              return (
                <label
                  key={d.val}
                  className="flex items-center gap-2.5 cursor-pointer group select-none text-sm text-[#2d2f31]"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleDurationSelect(d.val)}
                    className="w-4 h-4 rounded text-[#2d2f31] border-gray-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-normal">{d.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Category / Topic Accordion */}
      <div className="border-b border-[#d1d7dc] py-4">
        <button
          onClick={() => toggleSection('category')}
          className="w-full flex items-center justify-between font-bold text-base text-[#2d2f31] py-1 text-left"
        >
          <span>Category</span>
          <Icon
            name={openSections.category ? 'expand_less' : 'expand_more'}
            size={20}
            className="text-[#6a6f73]"
          />
        </button>

        {openSections.category && (
          <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {availableCategories.map((cat) => {
              const isChecked = filters.category.toLowerCase() === cat.name.toLowerCase();
              const count = categoryCounts[cat.name] || 0;
              return (
                <label
                  key={cat.id}
                  className="flex items-center justify-between cursor-pointer group select-none text-sm text-[#2d2f31]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCategorySelect(cat.name)}
                      className="w-4 h-4 rounded text-[#2d2f31] border-gray-400 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-normal truncate">{cat.name}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-xs text-[#6a6f73] ml-2 shrink-0">({count})</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Level Accordion */}
      <div className="border-b border-[#d1d7dc] py-4">
        <button
          onClick={() => toggleSection('level')}
          className="w-full flex items-center justify-between font-bold text-base text-[#2d2f31] py-1 text-left"
        >
          <span>Level</span>
          <Icon
            name={openSections.level ? 'expand_less' : 'expand_more'}
            size={20}
            className="text-[#6a6f73]"
          />
        </button>

        {openSections.level && (
          <div className="mt-3 space-y-2.5">
            {['All Levels', 'Beginner', 'Intermediate', 'Expert'].map((lvl) => {
              const isChecked = filters.level.toLowerCase() === lvl.toLowerCase();
              return (
                <label
                  key={lvl}
                  className="flex items-center gap-2.5 cursor-pointer group select-none text-sm text-[#2d2f31]"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleLevelSelect(lvl)}
                    className="w-4 h-4 rounded text-[#2d2f31] border-gray-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-normal">{lvl}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Price Accordion */}
      <div className="border-b border-[#d1d7dc] py-4">
        <button
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between font-bold text-base text-[#2d2f31] py-1 text-left"
        >
          <span>Price</span>
          <Icon
            name={openSections.price ? 'expand_less' : 'expand_more'}
            size={20}
            className="text-[#6a6f73]"
          />
        </button>

        {openSections.price && (
          <div className="mt-3 space-y-2.5">
            {[
              { val: 'paid', label: 'Paid', count: priceCounts?.paid },
              { val: 'free', label: 'Free', count: priceCounts?.free }
            ].map((p) => {
              const isChecked = filters.price === p.val;
              return (
                <label
                  key={p.val}
                  className="flex items-center justify-between cursor-pointer group select-none text-sm text-[#2d2f31]"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handlePriceSelect(p.val)}
                      className="w-4 h-4 rounded text-[#2d2f31] border-gray-400 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-normal">{p.label}</span>
                  </div>
                  {p.count !== undefined && (
                    <span className={`text-xs ${p.val === 'free' ? 'font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-[#6a6f73]'}`}>
                      ({p.count})
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Features Accordion */}
      <div className="border-b border-[#d1d7dc] py-4">
        <button
          onClick={() => toggleSection('features')}
          className="w-full flex items-center justify-between font-bold text-base text-[#2d2f31] py-1 text-left"
        >
          <span>Features</span>
          <Icon
            name={openSections.features ? 'expand_less' : 'expand_more'}
            size={20}
            className="text-[#6a6f73]"
          />
        </button>

        {openSections.features && (
          <div className="mt-3 space-y-2.5">
            {[
              { val: 'quizzes', label: 'Quizzes & Assessments' },
              { val: 'certificate', label: 'Verified Certificate' },
              { val: 'practice', label: 'Lesson Plans & Materials' }
            ].map((f) => {
              const isChecked = filters.features.includes(f.val);
              return (
                <label
                  key={f.val}
                  className="flex items-center gap-2.5 cursor-pointer group select-none text-sm text-[#2d2f31]"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleFeatureToggle(f.val)}
                    className="w-4 h-4 rounded text-[#2d2f31] border-gray-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-normal">{f.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
