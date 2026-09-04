import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Icon } from '@/components/ui/Icon';

export default async function OrganizationStorefrontPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      courses: {
        where: { status: 'PUBLISHED' },
        include: {
          category: true,
          instructor: { select: { id: true, name: true, avatar: true, bio: true } }
        }
      },
      websitePages: {
        where: { slug: 'home', status: 'PUBLISHED' },
        include: {
          sections: {
            where: { enabled: true },
            orderBy: { order: 'asc' }
          }
        }
      },
      navigationItems: {
        where: { enabled: true },
        orderBy: { order: 'asc' }
      },
      users: {
        where: { role: 'INSTRUCTOR' },
        select: { id: true, name: true, avatar: true, bio: true }
      }
    }
  });

  if (!org || org.status === 'SUSPENDED') {
    notFound();
  }

  // Increment website analytics in background
  try {
    await prisma.websiteAnalytics.create({
      data: {
        organizationId: org.id,
        eventType: 'PAGE_VIEW',
        pageSlug: 'home'
      }
    });
    await prisma.organization.update({
      where: { id: org.id },
      data: { websiteVisitors: { increment: 1 } }
    });
  } catch {}

  const primaryColor = org.primaryColor || '#4f46e5';
  const secondaryColor = org.secondaryColor || '#10b981';
  const buttonRadius =
    org.buttonStyle === 'pill' ? '9999px' : org.buttonStyle === 'square' ? '4px' : '14px';

  const homePage = org.websitePages[0];
  const sections = homePage?.sections || [];
  const navItems = org.navigationItems.length > 0
    ? org.navigationItems
    : [
        { id: '1', label: 'Home', url: `/org/${org.slug}` },
        { id: '2', label: 'Courses', url: `/org/${org.slug}/courses` },
        { id: '3', label: 'About', url: `/org/${org.slug}/about` },
        { id: '4', label: 'Contact', url: `/org/${org.slug}/contact` }
      ];

  let socialLinks: any = {};
  try {
    socialLinks = JSON.parse(org.socialLinks || '{}');
  } catch {}

  const headerBgClass =
    org.headerStyle === 'TRANSPARENT'
      ? 'bg-transparent'
      : org.headerStyle === 'SOLID'
      ? 'bg-[#060814]'
      : 'bg-[#080c1e]/90 backdrop-blur-xl';

  return (
    <div className="min-h-screen bg-[#060814] text-white flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
      {/* Dynamic Header */}
      <header
        className={`border-b border-white/10 ${headerBgClass} ${
          org.headerSticky ? 'sticky top-0' : 'relative'
        } z-40 px-6 py-4 transition-all`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org.logo ? (
              <img
                src={org.logo}
                alt={org.name}
                style={{ height: `${org.logoHeight || 36}px` }}
                className="w-auto object-contain rounded-lg"
              />
            ) : (
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg"
              >
                {org.name.charAt(0)}
              </div>
            )}
            <span className="font-extrabold text-lg text-white tracking-tight block">
              {org.name}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
            {navItems.map((item: any) => (
              <Link
                key={item.id}
                href={item.url.startsWith('/') ? `/org/${org.slug}${item.url === '/' ? '' : item.url}` : item.url}
                className="hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href={`/org/${org.slug}/login`}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all"
            >
              Sign In
            </Link>

            {org.allowStudentRegistration && (
              <Link
                href={`/org/${org.slug}/register`}
                style={{ backgroundColor: primaryColor, borderRadius: buttonRadius }}
                className="px-4 py-2 text-xs font-bold text-white shadow-lg hover:brightness-110 transition-all flex items-center gap-1.5"
              >
                <span>{org.headerCtaText || 'Get Started'}</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: Render Configured Sections or Fallback */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full space-y-16">
        {sections.length === 0 ? (
          /* Default Fallback Experience */
          <>
            {/* Hero */}
            <div className="text-center max-w-3xl mx-auto space-y-5 pt-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-indigo-300">
                <Icon name="verified" size={14} className="text-emerald-400" />
                <span>OFFICIAL ACADEMY STOREFRONT</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                {org.name}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {org.description ||
                  'Explore accredited curricula, hands-on masterclasses, and verified certifications.'}
              </p>
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link
                  href={`/org/${org.slug}/courses`}
                  style={{ backgroundColor: primaryColor, borderRadius: buttonRadius }}
                  className="px-6 py-3 text-xs font-extrabold text-white shadow-xl hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <span>Explore Masterclasses</span>
                  <Icon name="arrow_forward" size={16} />
                </Link>
                {org.allowStudentRegistration && (
                  <Link
                    href={`/org/${org.slug}/register`}
                    className="px-6 py-3 rounded-xl text-xs font-bold text-slate-300 bg-white/[0.05] hover:bg-white/10 border border-white/10 transition-all"
                  >
                    Create Account
                  </Link>
                )}
              </div>
            </div>

            {/* Courses Catalog Grid */}
            <div className="space-y-6 pt-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Icon name="menu_book" size={20} className="text-indigo-400" />
                  <span>Available Masterclasses ({org.courses.length})</span>
                </h2>
                <Link href={`/org/${org.slug}/courses`} className="text-xs font-mono font-bold text-indigo-400 hover:underline">
                  View Full Catalog →
                </Link>
              </div>

              {org.courses.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/10 space-y-3">
                  <Icon name="auto_stories" size={40} className="text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">No published courses available yet</p>
                  <p className="text-xs text-slate-500">
                    New cohorts and masterclasses are currently being scheduled.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {org.courses.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-3xl bg-[#0e1329] border border-white/10 overflow-hidden shadow-xl hover:border-white/20 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="h-44 bg-slate-900 relative overflow-hidden">
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
            </div>
          </>
        ) : (
          /* Render Configured Sections dynamically */
          sections.map((sec) => {
            let content: any = {};
            try {
              content = JSON.parse(sec.content || '{}');
            } catch {}

            if (sec.type === 'HERO') {
              const bgType = content.backgroundType || org.heroBackgroundType || 'GRADIENT';
              const bgImage = content.backgroundImage || org.heroBackgroundImage;
              const overlayOpacity = content.overlayOpacity ?? org.heroOverlayOpacity ?? 0.7;

              return (
                <div
                  key={sec.id}
                  className="relative rounded-3xl overflow-hidden p-8 sm:p-14 text-center space-y-6 border border-white/10 shadow-2xl"
                  style={{
                    backgroundImage: bgType === 'IMAGE' && bgImage ? `url(${bgImage})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Backdrop Overlay */}
                  {bgType === 'IMAGE' && (
                    <div
                      className="absolute inset-0 bg-[#060814]"
                      style={{ opacity: overlayOpacity }}
                    />
                  )}

                  {bgType === 'GRADIENT' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-[#070a1e] to-[#04060f]" />
                  )}

                  <div className="relative z-10 max-w-3xl mx-auto space-y-5">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-mono text-indigo-300">
                      <Icon name="verified" size={14} className="text-emerald-400" />
                      <span>{content.badgeText || org.name.toUpperCase()}</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                      {content.heading || sec.title}
                    </h1>

                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
                      {content.subheading || sec.subtitle}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                      <Link
                        href={content.primaryBtnUrl ? `/org/${org.slug}${content.primaryBtnUrl}` : `/org/${org.slug}/courses`}
                        style={{ backgroundColor: primaryColor, borderRadius: buttonRadius }}
                        className="px-6 py-3.5 text-xs font-extrabold text-white shadow-xl hover:brightness-110 transition-all flex items-center gap-2"
                      >
                        <span>{content.primaryBtnText || 'Explore Curricula'}</span>
                        <Icon name="arrow_forward" size={16} />
                      </Link>

                      {org.allowStudentRegistration && (
                        <Link
                          href={`/org/${org.slug}/register`}
                          className="px-6 py-3.5 rounded-xl text-xs font-bold text-slate-300 bg-white/[0.06] hover:bg-white/10 border border-white/15 transition-all"
                        >
                          {content.secondaryBtnText || 'Join as Student'}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            if (sec.type === 'STATISTICS') {
              const stats = content.stats || [];
              return (
                <div key={sec.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/10 text-center">
                  {stats.map((st: any, sIdx: number) => (
                    <div key={sIdx} className="space-y-1">
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono">{st.number}</span>
                      <p className="text-xs text-slate-400">{st.label}</p>
                    </div>
                  ))}
                </div>
              );
            }

            if (sec.type === 'FEATURED_COURSES' || sec.type === 'LATEST_COURSES' || sec.type === 'POPULAR_COURSES') {
              return (
                <div key={sec.id} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">{sec.title}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{sec.subtitle}</p>
                    </div>
                    <Link href={`/org/${org.slug}/courses`} className="text-xs font-mono font-bold text-indigo-400 hover:underline">
                      View All ({org.courses.length}) →
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {org.courses.map((course) => (
                      <div
                        key={course.id}
                        className="rounded-3xl bg-[#0e1329] border border-white/10 overflow-hidden shadow-xl hover:border-white/20 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="h-44 bg-slate-900 relative overflow-hidden">
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
                </div>
              );
            }

            if (sec.type === 'WHY_CHOOSE_US' || sec.type === 'BENEFITS') {
              const cards = content.cards || [];
              return (
                <div key={sec.id} className="space-y-6 p-8 rounded-3xl bg-white/[0.02] border border-white/10">
                  <div className="text-center max-w-2xl mx-auto space-y-1">
                    <h2 className="text-2xl font-black text-white">{sec.title}</h2>
                    <p className="text-xs text-slate-400">{sec.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    {cards.map((cd: any, cIdx: number) => (
                      <div key={cIdx} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                        <div style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }} className="w-10 h-10 rounded-xl flex items-center justify-center">
                          <Icon name={cd.icon || 'star'} size={22} />
                        </div>
                        <h3 className="font-extrabold text-sm text-white">{cd.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{cd.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (sec.type === 'INSTRUCTORS') {
              return (
                <div key={sec.id} className="space-y-6">
                  <div className="text-center max-w-2xl mx-auto space-y-1">
                    <h2 className="text-2xl font-black text-white">{sec.title}</h2>
                    <p className="text-xs text-slate-400">{sec.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                    {org.users.map((inst) => (
                      <div key={inst.id} className="p-6 rounded-3xl bg-[#0c1126] border border-white/10 text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 mx-auto flex items-center justify-center text-xl font-bold text-white border border-indigo-500/40">
                          {inst.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-white">{inst.name}</h3>
                          <p className="text-xs text-indigo-300 font-mono">Faculty Lead</p>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-3">{inst.bio || 'Seasoned practitioner and educator.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (sec.type === 'TESTIMONIALS') {
              const testimonials = content.testimonials || [];
              return (
                <div key={sec.id} className="space-y-6">
                  <div className="text-center max-w-2xl mx-auto space-y-1">
                    <h2 className="text-2xl font-black text-white">{sec.title}</h2>
                    <p className="text-xs text-slate-400">{sec.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {testimonials.map((t: any, tIdx: number) => (
                      <div key={tIdx} className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
                        <div className="flex items-center gap-1 text-amber-400">
                          {[...Array(t.rating || 5)].map((_, rIdx) => (
                            <Icon key={rIdx} name="star" fill size={16} />
                          ))}
                        </div>
                        <p className="text-xs text-slate-300 italic leading-relaxed">
                          &ldquo;{t.comment}&rdquo;
                        </p>
                        <div>
                          <p className="font-extrabold text-xs text-white">{t.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{t.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (sec.type === 'FAQ') {
              const faqs = content.faqs || [];
              return (
                <div key={sec.id} className="max-w-3xl mx-auto space-y-6">
                  <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black text-white">{sec.title}</h2>
                    <p className="text-xs text-slate-400">{sec.subtitle}</p>
                  </div>

                  <div className="space-y-3">
                    {faqs.map((f: any, fIdx: number) => (
                      <div key={fIdx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                        <h3 className="font-bold text-sm text-white flex items-center gap-2">
                          <Icon name="help" size={16} className="text-indigo-400 shrink-0" />
                          <span>{f.q}</span>
                        </h3>
                        <p className="text-xs text-slate-400 pl-6 leading-relaxed">{f.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (sec.type === 'CTA') {
              return (
                <div
                  key={sec.id}
                  style={{ borderColor: primaryColor }}
                  className="p-10 rounded-3xl bg-gradient-to-br from-indigo-950/80 via-[#0b0e22] to-slate-950 border text-center space-y-4 shadow-2xl"
                >
                  <h2 className="text-2xl sm:text-3xl font-black text-white">{content.heading || sec.title}</h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                    {content.description || sec.subtitle}
                  </p>
                  <Link
                    href={`/org/${org.slug}/courses`}
                    style={{ backgroundColor: primaryColor, borderRadius: buttonRadius }}
                    className="inline-flex items-center gap-2 px-6 py-3 text-xs font-extrabold text-white shadow-xl hover:brightness-110 transition-all"
                  >
                    <span>{content.buttonText || 'Enroll in Masterclass'}</span>
                    <Icon name="arrow_forward" size={16} />
                  </Link>
                </div>
              );
            }

            return null;
          })
        )}
      </main>

      {/* Dynamic White-Label Footer */}
      <footer className="border-t border-white/10 bg-[#04060f] py-10 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-extrabold text-sm text-slate-200">{org.name}</p>
            <p className="text-[11px] text-slate-500">
              {org.footerText || `© ${new Date().getFullYear()} ${org.name}. All rights reserved.`}
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4 text-slate-400">
            {socialLinks.linkedin && (
              <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                LinkedIn
              </a>
            )}
            {socialLinks.twitter && (
              <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                X / Twitter
              </a>
            )}
            {socialLinks.youtube && (
              <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                YouTube
              </a>
            )}
            {socialLinks.instagram && (
              <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Instagram
              </a>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            {org.contactEmail && <span>{org.contactEmail}</span>}
          </div>
        </div>
      </footer>
    </div>
  );
}
