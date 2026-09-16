'use client';

import React from 'react';
import { Course } from '@/types';
import { UdemyCourseCard } from './UdemyCourseCard';

interface UdemyLearnersViewingProps {
  courses: Course[];
}

export const UdemyLearnersViewing: React.FC<UdemyLearnersViewingProps> = ({ courses }) => {
  // Sort courses by bestseller / highest rating / review count
  const topCourses = [...courses]
    .sort((a, b) => {
      if (a.bestseller && !b.bestseller) return -1;
      if (!a.bestseller && b.bestseller) return 1;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, 4);

  if (topCourses.length === 0) return null;

  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-[#2d2f31] tracking-tight mb-4">
          Learners are viewing
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {topCourses.map((course, idx) => (
            <UdemyCourseCard key={course.id} course={course} cardIndex={idx} />
          ))}
        </div>
      </div>
    </section>
  );
};
