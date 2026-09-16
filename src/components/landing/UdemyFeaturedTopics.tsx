'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface TopicItem {
  title: string;
  learners: string;
  categorySlug: string;
  isTrending?: boolean;
}

interface TopicCategoryColumn {
  categoryTitle: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  categorySlug: string;
  topics: TopicItem[];
}

const FEATURED_TOPIC_COLUMNS: TopicCategoryColumn[] = [
  {
    categoryTitle: 'Pedagogy & Teaching',
    subtitle: 'Instructional design & classroom leadership',
    icon: 'school',
    iconBg: 'bg-purple-50',
    iconColor: 'text-[#5624d0]',
    borderColor: 'group-hover:border-purple-300',
    categorySlug: 'Pedagogy & Teaching Methods',
    topics: [
      { title: 'Modern Classroom Pedagogy', learners: '18,420 learners', categorySlug: 'Pedagogy & Teaching Methods', isTrending: true },
      { title: 'Active Learning Protocols', learners: '12,190 learners', categorySlug: 'Pedagogy & Teaching Methods' },
      { title: 'Classroom Assessment & Rubrics', learners: '9,840 learners', categorySlug: 'Pedagogy & Teaching Methods' },
      { title: 'Inclusive Lesson Planning', learners: '14,600 learners', categorySlug: 'Pedagogy & Teaching Methods' }
    ]
  },
  {
    categoryTitle: 'Montessori & Psychology',
    subtitle: 'Child brain development & sensory discovery',
    icon: 'psychology',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-700',
    borderColor: 'group-hover:border-teal-300',
    categorySlug: 'Montessori & Child Psychology',
    topics: [
      { title: 'Sensory Regulation & Tools', learners: '15,200 learners', categorySlug: 'Montessori & Child Psychology', isTrending: true },
      { title: 'Child Brain Development', learners: '22,400 learners', categorySlug: 'Montessori & Child Psychology', isTrending: true },
      { title: 'Practical Life Apparatus', learners: '8,730 learners', categorySlug: 'Montessori & Child Psychology' },
      { title: 'Emotional Intelligence in Kids', learners: '11,200 learners', categorySlug: 'Montessori & Child Psychology' }
    ]
  },
  {
    categoryTitle: 'Phonics & Literacy Arts',
    subtitle: 'Early reading, speech & phonetic fluency',
    icon: 'menu_book',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-700',
    borderColor: 'group-hover:border-amber-300',
    categorySlug: 'Phonics & Language Arts',
    topics: [
      { title: 'Jolly Phonics Fluency', learners: '19,800 learners', categorySlug: 'Phonics & Language Arts', isTrending: true },
      { title: 'Early Speech Mastery', learners: '14,350 learners', categorySlug: 'Phonics & Language Arts' },
      { title: 'Multisensory Literacy', learners: '10,500 learners', categorySlug: 'Phonics & Language Arts' },
      { title: 'Storytelling Pedagogy', learners: '7,900 learners', categorySlug: 'Phonics & Language Arts' }
    ]
  },
  {
    categoryTitle: 'Special Needs & STEM',
    subtitle: 'Inclusive learning, sensory & hands-on science',
    icon: 'science',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-700',
    borderColor: 'group-hover:border-sky-300',
    categorySlug: 'Special Needs & Inclusion',
    topics: [
      { title: 'Neurodiversity & ADHD Support', learners: '16,400 learners', categorySlug: 'Special Needs & Inclusion', isTrending: true },
      { title: 'STEM Labs for Young Minds', learners: '13,800 learners', categorySlug: 'STEM for Young Learners' },
      { title: 'Speech Therapy Foundations', learners: '9,150 learners', categorySlug: 'Special Needs & Inclusion' },
      { title: 'Preschool Administration', learners: '6,500 learners', categorySlug: 'Early Childhood Education' }
    ]
  }
];

const POPULAR_TAGS = [
  'Montessori Philosophy',
  'Phonics Sounds',
  'Classroom Dynamics',
  'Child Psychology',
  'IEP Writing',
  'Sensory Activities',
  'Early Numeracy',
  'STEM Play',
  'Behavior Management'
];

export const UdemyFeaturedTopics: React.FC = () => {
  return (
    <section className="w-full bg-[#f7f9fa] py-14 md:py-20 border-t border-[#d1d7dc]/70">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100/70 border border-purple-200/60 rounded-full text-xs font-bold text-[#5624d0] uppercase tracking-wider mb-3">
              <Icon name="trending_up" size={15} />
              <span>Trending Disciplines</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-[#1c1d1f] tracking-tight leading-tight">
              Featured topics by category
            </h2>
            <p className="text-[#6a6f73] text-sm sm:text-base mt-2 max-w-2xl">
              Explore high-demand educational domains, specialized certifications, and educator skills taught by verified faculty.
            </p>
          </div>

          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#5624d0] hover:text-[#401b9c] transition-colors self-start md:self-auto group"
          >
            <span>Explore all categories</span>
            <Icon name="arrow_forward" size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 4-Card Elevated Pillar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {FEATURED_TOPIC_COLUMNS.map((column, colIdx) => (
            <div
              key={colIdx}
              className={`flex flex-col bg-white rounded-xl p-6 border border-[#d1d7dc] shadow-[0_2px_4px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-300 group ${column.borderColor}`}
            >
              {/* Card Header with Icon Badge */}
              <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-gray-100">
                <div className={`w-11 h-11 rounded-xl ${column.iconBg} ${column.iconColor} flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105`}>
                  <Icon name={column.icon} size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1c1d1f] leading-snug group-hover:text-[#5624d0] transition-colors">
                    {column.categoryTitle}
                  </h3>
                  <p className="text-[11px] text-[#6a6f73] font-normal mt-0.5 line-clamp-1">
                    {column.subtitle}
                  </p>
                </div>
              </div>

              {/* Topics List */}
              <div className="flex-1 space-y-3.5 mb-6">
                {column.topics.map((topic, topicIdx) => (
                  <Link
                    key={topicIdx}
                    href={`/courses?category=${encodeURIComponent(topic.categorySlug)}`}
                    className="flex flex-col p-2.5 -mx-2.5 rounded-lg hover:bg-gray-50 transition-all duration-200 group/item cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#2d2f31] group-hover/item:text-[#5624d0] transition-colors leading-snug">
                        {topic.title}
                      </span>
                      <Icon
                        name="chevron_right"
                        size={16}
                        className="text-gray-400 group-hover/item:text-[#5624d0] group-hover/item:translate-x-0.5 transition-all shrink-0"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#6a6f73] font-medium">
                        {topic.learners}
                      </span>
                      {topic.isTrending && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                          Popular
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Card Footer Link */}
              <div className="pt-4 border-t border-gray-100 mt-auto">
                <Link
                  href={`/courses?category=${encodeURIComponent(column.categorySlug)}`}
                  className="flex items-center justify-between text-xs font-bold text-[#5624d0] hover:text-[#401b9c] transition-colors group/link cursor-pointer"
                >
                  <span>View all courses</span>
                  <Icon name="arrow_forward" size={14} className="transition-transform group-link:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Popular Topics Tag Strip */}
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#d1d7dc] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Icon name="verified" size={20} className="text-[#5624d0]" />
            <span className="text-xs sm:text-sm font-extrabold text-[#1c1d1f]">
              Popular Search Tags:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {POPULAR_TAGS.map((tag, idx) => (
              <Link
                key={idx}
                href={`/courses?search=${encodeURIComponent(tag)}`}
                className="text-xs font-semibold text-[#2d2f31] bg-[#f7f9fa] hover:bg-[#5624d0] hover:text-white px-3 py-1.5 rounded-full border border-[#d1d7dc] transition-all duration-200 cursor-pointer"
              >
                #{tag}
              </Link>
            ))}
          </div>

          <Link
            href="/courses"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-white bg-[#1c1d1f] hover:bg-[#2d2f31] px-4 py-2 rounded-md transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <span>Explore Library</span>
            <Icon name="arrow_forward" size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default UdemyFeaturedTopics;
