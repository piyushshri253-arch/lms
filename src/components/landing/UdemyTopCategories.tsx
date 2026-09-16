'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CategoryCardItem {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  pedagogy: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=600&auto=format&fit=crop',
  'early childhood': 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=600&auto=format&fit=crop',
  engineering: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop',
  design: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=600&auto=format&fit=crop',
  business: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop',
  science: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600&auto=format&fit=crop',
  ai: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=600&auto=format&fit=crop',
  python: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=600&auto=format&fit=crop'
};

function getCategoryImage(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, img] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (lower.includes(key)) return img;
  }
  return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop';
}

interface UdemyTopCategoriesProps {
  categories?: { id: string; name: string; slug: string }[];
}

export const UdemyTopCategories: React.FC<UdemyTopCategoriesProps> = ({ categories: initialCategories }) => {
  const [categories, setCategories] = useState<CategoryCardItem[]>([]);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(
        initialCategories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug || c.name,
          image: getCategoryImage(c.name)
        }))
      );
      return;
    }

    // Fetch live published categories
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories && data.categories.length > 0) {
          setCategories(
            data.categories.map((c: any) => ({
              id: c.id,
              name: c.name,
              slug: c.slug || c.name,
              image: getCategoryImage(c.name)
            }))
          );
        }
      })
      .catch(() => {});
  }, [initialCategories]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-[#2d2f31] tracking-tight mb-6">
          Top categories
        </h2>

        {/* Dynamic Responsive Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((item) => (
            <Link
              key={item.id}
              href={`/courses?category=${encodeURIComponent(item.name)}`}
              className="group cursor-pointer flex flex-col"
            >
              {/* Square Image Box with subtle hover zoom */}
              <div className="aspect-square w-full overflow-hidden bg-[#f7f9fa] border border-[#d1d7dc] mb-2.5">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <span className="font-bold text-base text-[#2d2f31] leading-snug group-hover:text-[#5022c3] transition-colors">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
