import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Icon } from '@/components/ui/Icon';

export default async function OrgCourseDetailsPage({
  params
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
}) {
  const { slug, courseSlug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug }
  });

  if (!org || org.status === 'SUSPENDED') {
    notFound();
  }

  const course = await prisma.course.findFirst({
    where: {
      slug: courseSlug,
      organizationId: org.id,
      status: 'PUBLISHED'
    },
    include: {
      category: true,
      instructor: { select: { id: true, name: true, avatar: true, bio: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } }
      },
      reviews: {
        where: { status: 'APPROVED' },
        include: { user: { select: { name: true, avatar: true } } }
      }
    }
  });

  if (!course) {
    notFound();
  }

  // Increment course view analytics in background
  try {
    await prisma.websiteAnalytics.create({
      data: {
        organizationId: org.id,
        eventType: 'COURSE_VIEW',
        courseId: course.id,
        pageSlug: `courses/${course.slug}`
      }
    });
  } catch {}

  const primaryColor = org.primaryColor || '#4f46e5';
  const buttonRadius =
    org.buttonStyle === 'pill' ? '9999px' : org.buttonStyle === 'square' ? '4px' : '14px';

  let whatYouWillLearn: string[] = [];
  try {
    whatYouWillLearn = JSON.parse(course.whatYouWillLearn || '[]');
  } catch {}

  let requirements: string[] = [];
  try {
    requirements = JSON.parse(course.requirements || '[]');
  } catch {}

  const totalLessons = course.sections.reduce((sum, sec) => sum + sec.lessons.length, 0);

  return (
    <div className="min-h-screen bg-[#060814] text-white flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
      {/* Header */}
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

          <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
            <Link href={`/org/${org.slug}/courses`} className="hover:text-white">
              ← All Courses
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full space-y-12 flex-1">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Title, Description, Outcomes, Syllabus */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono font-bold text-indigo-300">
                  {course.category?.name || 'Curriculum'}
                </span>
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">
                  {course.level} Level
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {course.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 pt-2 font-medium">
                <span className="flex items-center gap-1.5">
                  <Icon name="person" size={16} className="text-indigo-400" />
                  <span>Instructor: <strong className="text-white">{course.instructor.name}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="schedule" size={16} className="text-emerald-400" />
                  <span>{course.durationHours} Hours Content</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="video_library" size={16} className="text-amber-400" />
                  <span>{totalLessons} Video Lessons</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="language" size={16} className="text-purple-400" />
                  <span>{course.language}</span>
                </span>
              </div>
            </div>

            {/* What You'll Learn */}
            {whatYouWillLearn.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1126] border border-white/10 space-y-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Icon name="check_circle" size={20} className="text-emerald-400" />
                  <span>What You Will Master</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {whatYouWillLearn.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                      <Icon name="check" size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curriculum Breakdown */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Icon name="menu_book" size={22} className="text-indigo-400" />
                <span>Curriculum Syllabus ({course.sections.length} Modules • {totalLessons} Lessons)</span>
              </h2>

              <div className="space-y-3">
                {course.sections.map((sec, sIdx) => (
                  <div
                    key={sec.id}
                    className="p-5 rounded-2xl bg-[#0e1329] border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-white">
                        Module {sIdx + 1}: {sec.title}
                      </h3>
                      <span className="text-xs font-mono text-slate-400">
                        {sec.lessons.length} lessons
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      {sec.lessons.map((les) => (
                        <div
                          key={les.id}
                          className="flex items-center justify-between text-xs text-slate-400 py-1"
                        >
                          <span className="flex items-center gap-2">
                            <Icon
                              name={les.isFree ? 'play_circle' : 'lock'}
                              size={15}
                              className={les.isFree ? 'text-emerald-400' : 'text-slate-500'}
                            />
                            <span className="text-slate-200">{les.title}</span>
                          </span>
                          <span className="font-mono text-[11px]">{les.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructor Profile */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1126] border border-white/10 space-y-4">
              <h2 className="text-lg font-black text-white">Lead Instructor</h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 flex items-center justify-center font-bold text-xl text-white border border-indigo-500/40">
                  {course.instructor.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">{course.instructor.name}</h3>
                  <p className="text-xs text-indigo-300 font-mono">Distinguished Faculty Member</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {course.instructor.bio || 'Experienced engineering leader and course author.'}
              </p>
            </div>
          </div>

          {/* Right Column (4 cols): Sticky Enrollment & Checkout Card */}
          <div className="lg:col-span-4 sticky top-24 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1126] border border-white/15 shadow-2xl space-y-6">
              {/* Thumbnail */}
              <div className="h-44 rounded-2xl bg-slate-900 overflow-hidden relative border border-white/10">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Icon name="school" size={48} />
                  </div>
                )}
              </div>

              {/* Price & Guarantee */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-white font-mono">
                    {course.price === 0 ? 'FREE' : `₹${course.price.toLocaleString()}`}
                  </span>
                  {course.discountPrice && (
                    <span className="text-sm text-slate-500 line-through font-mono">
                      ₹{course.discountPrice.toLocaleString()}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                  Lifetime Access &amp; Future Updates
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <Link
                  href={`/login?redirect=/courses/${course.id}`}
                  style={{ backgroundColor: primaryColor, borderRadius: buttonRadius }}
                  className="w-full py-3.5 text-center text-xs font-extrabold text-white shadow-xl hover:brightness-110 transition-all block cursor-pointer"
                >
                  Enroll / Buy Now →
                </Link>

                <p className="text-[10px] text-center text-slate-400">
                  Secure checkout via {org.name}'s merchant gateway.
                </p>
              </div>

              {/* Included Benefits */}
              <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Icon name="workspace_premium" size={16} className="text-amber-400" />
                  <span>Accredited Certificate of Completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="devices" size={16} className="text-indigo-400" />
                  <span>Access on Mobile, Desktop, and Tablet</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="forum" size={16} className="text-teal-400" />
                  <span>Direct Instructor Discussion &amp; Notes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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
