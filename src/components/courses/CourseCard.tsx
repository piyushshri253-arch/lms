import React from 'react';
import Link from 'next/link';
import { Course } from '@/types';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';

interface CourseCardProps {
  course: Course;
  variant?: 'standard' | 'horizontal' | 'featured' | 'grid';
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, variant = 'standard' }) => {
  const discountPrice = course.originalPrice || (course as any).discountPrice;

  if (variant === 'featured') {
    return (
      <Link
        href={`/courses/${course.slug}`}
        className="lg:col-span-2 group cursor-pointer bg-surface rounded-xl border border-outline-variant overflow-hidden flex flex-col md:flex-row hover:shadow-md hover:border-primary/30 transition-all duration-300"
      >
        <div className="md:w-1/2 h-56 md:h-auto relative overflow-hidden bg-surface-container-high flex items-center justify-center">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <Icon name="school" size={48} className="text-outline" />
          )}
          {course.bestseller && (
            <div className="absolute top-4 left-4 bg-surface px-2.5 py-1 rounded text-xs font-bold text-primary uppercase tracking-wide shadow-sm border border-outline-variant/40">
              Bestseller
            </div>
          )}
        </div>
        <div className="p-6 md:p-8 flex flex-col justify-between md:w-1/2">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                {course.category}
              </span>
              <div className="flex items-center gap-1 text-on-surface">
                <Icon name="star" fill size={16} className="text-amber-500" />
                <span className="text-sm font-bold">{course.rating.toFixed(1)}</span>
                <span className="text-on-surface-variant text-xs">({course.reviewsCount >= 1000 ? `${(course.reviewsCount / 1000).toFixed(1)}k` : course.reviewsCount})</span>
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-on-surface mb-2.5 group-hover:text-primary transition-colors leading-tight">
              {course.title}
            </h3>
            <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
              {course.description}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-outline-variant pt-4">
            <div className="flex items-center gap-2.5">
              <UserAvatar
                avatar={course.instructor.avatar}
                name={course.instructor.name}
                size="sm"
                className="w-8 h-8"
              />
              <span className="text-xs font-semibold text-on-surface">
                {course.instructor.name}
              </span>
            </div>
            <span className="text-lg font-bold text-on-surface">${course.price}</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'horizontal') {
    return (
      <Link
        href={`/courses/${course.slug}`}
        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3.5 hover:border-primary/40 hover:shadow-sm transition-all flex gap-4 items-center cursor-pointer group"
      >
        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-surface-variant relative flex items-center justify-center">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Icon name="school" size={28} className="text-outline" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              {course.category}
            </span>
            <span className="flex items-center text-xs text-on-surface-variant">
              <Icon name="star" fill size={14} className="text-amber-500 mr-1" />
              {course.rating.toFixed(1)}
            </span>
          </div>
          <h4 className="font-bold text-sm text-on-surface mb-1 group-hover:text-primary transition-colors truncate">
            {course.title}
          </h4>
          <p className="text-xs text-on-surface-variant truncate">
            {course.subtitle || course.description}
          </p>
        </div>
      </Link>
    );
  }

  // Standard or Grid Card
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] hover:border-primary/30 hover:scale-[1.01] transition-all duration-300 group flex flex-col h-full cursor-pointer relative"
    >
      {course.bestseller && (
        <div className="absolute top-2.5 left-2.5 z-10 bg-surface-container-lowest/95 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-extrabold text-primary border border-outline-variant/30 tracking-wider">
          BESTSELLER
        </div>
      )}
      {course.isNew && (
        <div className="absolute top-2.5 left-2.5 z-10 bg-primary text-on-primary px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider">
          NEW
        </div>
      )}

      <div className="h-44 w-full overflow-hidden bg-surface-container-low relative flex items-center justify-center">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <Icon name="school" size={40} className="text-outline" />
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            {course.category}
          </span>
          <div className="flex items-center gap-1">
            <Icon name="star" fill size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-on-surface">{course.rating.toFixed(1)}</span>
            <span className="text-[11px] text-on-surface-variant">
              ({course.reviewsCount >= 1000 ? `${(course.reviewsCount / 1000).toFixed(1)}k` : course.reviewsCount})
            </span>
          </div>
        </div>

        <h3 className="font-bold text-sm text-on-surface mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {course.title}
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <UserAvatar
            avatar={course.instructor.avatar}
            name={course.instructor.name}
            size="xs"
            className="w-5 h-5"
          />
          <span className="text-xs text-on-surface-variant truncate">
            {course.instructor.name}
          </span>
        </div>

        <div className="mt-auto pt-3 border-t border-outline-variant/60 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-on-surface font-mono">
              ${course.price}
            </span>
            {discountPrice && (
              <span className="text-xs text-on-surface-variant line-through font-mono">
                ${discountPrice}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
            <Icon name="schedule" size={13} />
            <span>{course.durationHours}h</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
