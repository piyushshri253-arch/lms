'use client';

import React from 'react';
import Link from 'next/link';

interface CategoryCardItem {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const TOP_CATEGORIES: CategoryCardItem[] = [
  {
    id: '1',
    name: 'Early Childhood Education',
    slug: 'Early Childhood Education',
    image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: '2',
    name: 'Pedagogy & Teaching Methods',
    slug: 'Pedagogy & Teaching Methods',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: '3',
    name: 'Montessori & Child Psychology',
    slug: 'Montessori & Child Psychology',
    image: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: '4',
    name: 'Special Needs & Inclusion',
    slug: 'Special Needs & Inclusion',
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: '5',
    name: 'Phonics & Language Arts',
    slug: 'Phonics & Language Arts',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: '6',
    name: 'STEM for Young Learners',
    slug: 'STEM for Young Learners',
    image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: '7',
    name: 'Classroom Leadership',
    slug: 'Pedagogy & Teaching Methods',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: '8',
    name: 'Creative Arts & Motor Skills',
    slug: 'Early Childhood Education',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop'
  }
];

export const UdemyTopCategories: React.FC = () => {
  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-[#2d2f31] tracking-tight mb-6">
          Top categories
        </h2>

        {/* Udemy 4-Column x 2-Row Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {TOP_CATEGORIES.map((item) => (
            <Link
              key={item.id}
              href={`/courses?category=${encodeURIComponent(item.slug)}`}
              className="group cursor-pointer flex flex-col"
            >
              {/* Square Image Box with subtle hover zoom */}
              <div className="aspect-square w-full overflow-hidden bg-[#f7f9fa] mb-2.5">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <span className="font-bold text-base text-[#2d2f31] leading-snug group-hover:text-[#2d2f31]">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
