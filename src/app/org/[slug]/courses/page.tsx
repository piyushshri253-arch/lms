import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Icon } from '@/components/ui/Icon';

export default async function OrgCoursesCatalogPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ q?: string; category?: string; level?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const query = sParams.q?.trim().toLowerCase();
  const categoryFilter = sParams.category;
  const levelFilter = sParams.level;

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      categories: true,
      courses: {
        where: {
          status: 'PUBLISHED',
          ...(categoryFilter ? { category: { slug: categoryFilter } } : {}),
          ...(levelFilter ? { level: levelFilter } : {}),
          ...(query
            ? {
                OR: [
                  { title: { contains: query } },
                  { description: { contains: query } }
                ]
              }
            : {})
        },
        include: {
          category: true,
          instructor: { select: { name: true, avatar: true } },
          reviews: { select: { rating: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!org || org.status === 'SUSPENDED') {
    notFound();
  }

  const primaryColor = org.primaryColor || '#4f46e5';
  const buttonRadius =
    org.buttonStyle === 'pill' ? '9999px' : org.buttonStyle === 'square' ? '4px' : '14px';

  return (
    <div className="min-h-screen bg-[#060814] text-white flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
      {/* Dynamic Header */}
      <header className="border-b border-white/10 bg-[#080c1e]/90 backdrop-blur-xl sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href={`/org/${org.slug}`} className="flex items-center gap-3">
            {org.logo ? (
              <img src={org.logo} alt={org.name} className="h-8 w-auto object-contain rounded" />
            ) : (
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md"
              >
                {org.name.charAt(0)}
              </div>
            )}
            <span className="font-extrabold text-base text-white tracking-tight">
              {org.name}
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href={`/org/${org.slug}`}
              className="text-xs font-bold text-slate-300 hover:text-white"
            >
              ← Back to Home
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/[0.04] border border-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Catalog */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full space-y-8 flex-1">
        <div className="space-y-3 border-b border-white/10 pb-6">
          <h1 className="text-3xl font-black text-white tracking-tight">
            Curricula &amp; Masterclasses
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Explore all published cohorts and masterclasses offered by {org.name}.
          </p>

          {/* Search & Categories Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <form method="GET" action={`/org/${org.slug}/courses`} className="flex-1 min-w-[240px] relative">
              <input
                type="text"
                name="q"
                defaultValue={query || ''}
                placeholder="Search masterclasses..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <Icon name="search" size={16} className="absolute left-3.5 top-3 text-slate-500" />
            </form>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Link
                href={`/org/${org.slug}/courses`}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  !categoryFilter ? 'bg-indigo-600 text-white' : 'bg-white/[0.04] text-slate-400 hover:text-white'
                }`}
              >
                All
              </Link>
              {org.categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/org/${org.slug}/courses?category=${cat.slug}`}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    categoryFilter === cat.slug ? 'bg-indigo-600 text-white' : 'bg-white/[0.04] text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {org.courses.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-white/[0.02] border border-white/10 space-y-3">
            <Icon name="school" size={48} className="text-slate-600 mx-auto" />
            <h3 className="font-bold text-sm text-slate-300">No courses match your criteria</h3>
            <p className="text-xs text-slate-500">Try adjusting your search query or category filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {org.courses.map((course) => (
              <div
                key={course.id}
                className="rounded-3xl bg-[#0e1329] border border-white/10 overflow-hidden shadow-xl hover:border-white/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="h-48 bg-slate-900 relative overflow-hidden">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Icon name="school" size={48} />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/20">
                      {course.category?.name || 'Curriculum'}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-extrabold text-base text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {course.shortDescription || course.description}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Icon name="schedule" size={13} />
                        {course.durationHours} hrs
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[11px] uppercase text-indigo-300">
                        {course.level}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-base font-black text-white font-mono">
                      {course.price === 0 ? 'FREE' : `₹${course.price.toLocaleString()}`}
                    </span>
                    {course.discountPrice && (
                      <span className="text-xs text-slate-500 line-through font-mono ml-2">
                        ₹{course.discountPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/org/${org.slug}/courses/${course.slug}`}
                    style={{ backgroundColor: primaryColor, borderRadius: buttonRadius }}
                    className="px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all flex items-center gap-1"
                  >
                    <span>Explore</span>
                    <Icon name="arrow_forward" size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Dynamic White-Label Footer */}
      <footer className="border-t border-white/10 bg-[#04060f] py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-bold text-slate-300">{org.name}</p>
          <p className="text-[11px] text-slate-500">
            {org.footerText || `© ${new Date().getFullYear()} ${org.name}. All rights reserved.`}
          </p>
        </div>
      </footer>
    </div>
  );
}
