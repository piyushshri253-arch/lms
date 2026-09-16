'use client';

import React from 'react';
import Link from 'next/link';

interface TopicItem {
  title: string;
  learners: string;
  categorySlug: string;
}

interface TopicCategoryColumn {
  categoryTitle: string;
  topics: TopicItem[];
}

const FEATURED_TOPIC_COLUMNS: TopicCategoryColumn[] = [
  {
    categoryTitle: 'Pedagogy & Teaching',
    topics: [
      { title: 'Modern Classroom Pedagogy', learners: '18,420 learners', categorySlug: 'Pedagogy & Teaching Methods' },
      { title: 'Active Learning Protocols', learners: '12,190 learners', categorySlug: 'Pedagogy & Teaching Methods' },
      { title: 'Classroom Assessment & Rubrics', learners: '9,840 learners', categorySlug: 'Pedagogy & Teaching Methods' },
      { title: 'Inclusive Lesson Planning', learners: '14,600 learners', categorySlug: 'Pedagogy & Teaching Methods' }
    ]
  },
  {
    categoryTitle: 'Montessori & Psychology',
    topics: [
      { title: 'Sensory Regulation & Tools', learners: '15,200 learners', categorySlug: 'Montessori & Child Psychology' },
      { title: 'Child Brain Development', learners: '22,400 learners', categorySlug: 'Montessori & Child Psychology' },
      { title: 'Practical Life Apparatus', learners: '8,730 learners', categorySlug: 'Montessori & Child Psychology' },
      { title: 'Emotional Intelligence in Kids', learners: '11,200 learners', categorySlug: 'Montessori & Child Psychology' }
    ]
  },
  {
    categoryTitle: 'Phonics & Literacy Arts',
    topics: [
      { title: 'Jolly Phonics Fluency', learners: '19,800 learners', categorySlug: 'Phonics & Language Arts' },
      { title: 'Early Speech Mastery', learners: '14,350 learners', categorySlug: 'Phonics & Language Arts' },
      { title: 'Multisensory Literacy', learners: '10,500 learners', categorySlug: 'Phonics & Language Arts' },
      { title: 'Storytelling Pedagogy', learners: '7,900 learners', categorySlug: 'Phonics & Language Arts' }
    ]
  },
  {
    categoryTitle: 'Special Needs & STEM',
    topics: [
      { title: 'Neurodiversity & ADHD Support', learners: '16,400 learners', categorySlug: 'Special Needs & Inclusion' },
      { title: 'STEM Labs for Young Minds', learners: '13,800 learners', categorySlug: 'STEM for Young Learners' },
      { title: 'Speech Therapy Foundations', learners: '9,150 learners', categorySlug: 'Special Needs & Inclusion' },
      { title: 'Preschool Administration', learners: '6,500 learners', categorySlug: 'Early Childhood Education' }
    ]
  }
];

export const UdemyFeaturedTopics: React.FC = () => {
  return (
    <section className="w-full bg-[#f7f9fa] py-12 md:py-16 border-t border-[#d1d7dc]/60">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1c1d1f] tracking-tight mb-8">
          Featured topics by category
        </h2>

        {/* 4-Column Directory Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {FEATURED_TOPIC_COLUMNS.map((column, colIdx) => (
            <div key={colIdx} className="flex flex-col">
              <h3 className="text-base font-extrabold text-[#1c1d1f] mb-4">
                {column.categoryTitle}
              </h3>
              <div className="space-y-4">
                {column.topics.map((topic, topicIdx) => (
                  <div key={topicIdx} className="flex flex-col group">
                    <Link
                      href={`/courses?category=${encodeURIComponent(topic.categorySlug)}`}
                      className="text-sm font-bold text-[#5624d0] hover:text-[#401b9c] underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      {topic.title}
                    </Link>
                    <span className="text-xs text-[#6a6f73] mt-0.5 font-normal">
                      {topic.learners}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Outline CTA Button */}
        <div>
          <Link
            href="/courses"
            className="inline-block px-5 py-2.5 text-sm font-bold text-[#1c1d1f] border border-[#1c1d1f] hover:bg-gray-100 rounded-md transition-all active:scale-[0.98] cursor-pointer"
          >
            Explore more topics
          </Link>
        </div>
      </div>
    </section>
  );
};

export default UdemyFeaturedTopics;
