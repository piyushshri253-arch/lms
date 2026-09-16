'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  institution: string;
  avatar: string;
  courseTitle: string;
  rating: number;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: 'Pooja Verma',
    role: 'Lead Kindergarten Educator',
    institution: 'Little Blooms Preschool',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop',
    courseTitle: 'Foundations of Early Childhood Care & Development (ECCD)',
    rating: 5,
    quote:
      'The milestone observation rubrics completely transformed our daily classroom rhythm. Parents are amazed at the emotional growth and focus we’ve cultivated.'
  },
  {
    id: 2,
    name: 'Rajesh Kulkarni',
    role: 'Primary Academic Coordinator',
    institution: 'Greenwood International',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    courseTitle: 'Modern Classroom Pedagogy: Active Learning',
    rating: 5,
    quote:
      'Morena Teach gave our teachers structured cooperative strategies that replaced monotonous lectures. Our student engagement rate surged past 90%.'
  },
  {
    id: 3,
    name: 'Ananya Sen',
    role: 'Special Educator & Consultant',
    institution: 'Horizon Inclusion Center',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
    courseTitle: 'Inclusive Classrooms: ADHD & Autism Support',
    rating: 5,
    quote:
      'Practical, compassionate, and evidence-backed. The visual schedules and sensory blueprints were implemented the very next morning in our academy.'
  }
];

export const UdemyTestimonials: React.FC = () => {
  return (
    <section className="py-12 bg-[#f7f9fa] border-t border-[#d1d7dc]">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#2d2f31] tracking-tight mb-2">
            How learners and educators achieve their goals with Morena Teach
          </h2>
          <p className="text-sm sm:text-base text-[#6a6f73]">
            Read firsthand experiences from teachers, coordinators, and school heads across the country.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.id}
              className="bg-white p-6 border border-[#d1d7dc] flex flex-col justify-between"
            >
              <div>
                {/* Quote Icon & Stars */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center text-[#b4690e]">
                    {[...Array(item.rating)].map((_, i) => (
                      <Icon key={i} name="star" size={16} fill className="text-[#b4690e]" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#6a6f73] font-mono">VERIFIED</span>
                </div>

                {/* Quote */}
                <p className="text-sm text-[#2d2f31] leading-relaxed mb-6 font-normal">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              {/* Author & Course info */}
              <div className="pt-4 border-t border-gray-100 flex items-center gap-3.5">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#d1d7dc]"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-[#2d2f31] leading-snug truncate">
                    {item.name}
                  </h4>
                  <p className="text-xs text-[#6a6f73] truncate">
                    {item.role}, {item.institution}
                  </p>
                  <p className="text-[11px] font-semibold text-[#5022c3] truncate mt-0.5">
                    Course: {item.courseTitle}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
