'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { CertificateModal } from '@/components/student/CertificateModal';
import { InvoiceModal } from '@/components/student/InvoiceModal';
import { useCoursesAutoRefresh } from '@/lib/courses-sync';

function StudentLearningContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, showToast } = useApp();

  const initialTab = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const [courses, setCourses] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [sortOption, setSortOption] = useState('recent');

  // Modals state
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Load student enrolled courses, certificates, and orders
  const loadStudentData = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      // 1. Fetch Enrolled Courses
      const coursesRes = await fetch('/api/student/courses');
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        if (data.courses) setCourses(data.courses);
      }

      // 2. Fetch Certificates
      const certsRes = await fetch('/api/student/certificates');
      if (certsRes.ok) {
        const data = await certsRes.json();
        if (data.certificates) setCertificates(data.certificates);
      }

      // 3. Fetch Orders & Invoices
      const ordersRes = await fetch('/api/student/orders');
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        if (data.orders) setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useCoursesAutoRefresh(loadStudentData, { intervalMs: 5000, enabled: true });

  useEffect(() => {
    loadStudentData();
  }, []);

  // Filtered and sorted courses
  const filteredCourses = courses
    .filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchFilter.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'in_progress') return c.progressPercent < 100;
      if (activeTab === 'completed') return c.progressPercent === 100;
      return true; // 'all' tab
    })
    .sort((a, b) => {
      if (sortOption === 'progress_desc') return b.progressPercent - a.progressPercent;
      if (sortOption === 'progress_asc') return a.progressPercent - b.progressPercent;
      if (sortOption === 'title') return a.title.localeCompare(b.title);
      return new Date(b.enrolledAt || 0).getTime() - new Date(a.enrolledAt || 0).getTime();
    });

  const inProgressCount = courses.filter((c) => c.progressPercent < 100).length;
  const completedCount = courses.filter((c) => c.progressPercent === 100).length;

  const handleOpenCertificate = (cert: any) => {
    setSelectedCertificate({
      ...cert,
      studentName: currentUser?.name || 'Verified Student'
    });
    setIsCertModalOpen(true);
  };

  const handleOpenInvoice = (ord: any) => {
    setSelectedOrder({
      ...ord,
      studentName: currentUser?.name || 'Registered Student',
      studentEmail: currentUser?.email || 'student@example.com'
    });
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col font-sans antialiased">
      <UdemyNavbar />

      {/* 1. Header Banner (Udemy-grade dark billboard) */}
      <section className="bg-[#1c1d1f] text-white pt-8 pb-0 px-4 sm:px-8 border-b border-[#3e4143]">
        <div className="max-w-[1340px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                My learning
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-1.5">
                {currentUser?.name ? `Welcome back, ${currentUser.name}!` : 'Track your active courses and certifications.'}
              </p>
            </div>

            {/* Quick Metrics Pills & Conditional Onboarded Instructor Login Button */}
            <div className="flex flex-wrap items-center gap-3">
              {currentUser?.hasOnboardedInstructorAccount && (
                <Link
                  href={
                    currentUser.instructorLoginUrl ||
                    `/instructor/login?email=${encodeURIComponent(currentUser.email)}`
                  }
                  className="bg-gradient-to-r from-[#a435f0] to-[#6d28d9] hover:from-[#8710d8] hover:to-[#5b21b6] text-white px-4 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-purple-900/40 border border-purple-400/30 transition-all hover:scale-[1.02]"
                >
                  <Icon name="cast_for_education" size={18} className="text-white" />
                  <span>Instructor Login</span>
                  <Icon name="arrow_forward" size={16} className="text-purple-200" />
                </Link>
              )}
              <div className="bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-white/10">
                <Icon name="play_lesson" size={16} className="text-purple-400" />
                <span>{courses.length} Enrolled</span>
              </div>
              <div className="bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-white/10">
                <Icon name="workspace_premium" size={16} className="text-amber-400" />
                <span>{certificates.length} Certified</span>
              </div>
            </div>
          </div>

          {/* Dedicated Onboarded Instructor Banner on Student Dashboard (ONLY visible if same email is Onboarded as Instructor) */}
          {currentUser?.hasOnboardedInstructorAccount && (
            <div className="mb-5 rounded-xl bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-purple-900/80 border border-purple-500/40 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                  <Icon name="verified" size={22} className="text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      Your Instructor Account is Onboarded &amp; Active!
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                      Onboarded
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-purple-200 mt-0.5">
                    Your Instructor profile ({currentUser.email}) has been verified and onboarded by our Course Auditor. You can log in to the Instructor Studio anytime.
                  </p>
                </div>
              </div>
              <Link
                href={
                  currentUser.instructorLoginUrl ||
                  `/instructor/login?email=${encodeURIComponent(currentUser.email)}`
                }
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1c1d1f] hover:bg-purple-50 font-extrabold text-xs sm:text-sm transition-colors shadow-sm"
              >
                <Icon name="login" size={16} className="text-[#5022c3]" />
                <span>Login as Instructor →</span>
              </Link>
            </div>
          )}

          {/* Navigation Tabs Bar */}
          <nav className="flex items-center gap-6 overflow-x-auto text-sm font-bold border-b border-transparent scrollbar-none">
            <button
              onClick={() => {
                setActiveTab('all');
                router.push('/student/learning?tab=all');
              }}
              className={`pb-3.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              All courses ({courses.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('in_progress');
                router.push('/student/learning?tab=in_progress');
              }}
              className={`pb-3.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'in_progress'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => {
                setActiveTab('completed');
                router.push('/student/learning?tab=completed');
              }}
              className={`pb-3.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'completed'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => {
                setActiveTab('certificates');
                router.push('/student/learning?tab=certificates');
              }}
              className={`pb-3.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'certificates'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Certificates ({certificates.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('orders');
                router.push('/student/learning?tab=orders');
              }}
              className={`pb-3.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Purchase History &amp; Invoices
            </button>
          </nav>
        </div>
      </section>

      {/* 2. Main Body Content Area */}
      <main className="flex-1 max-w-[1340px] mx-auto px-4 sm:px-8 py-8 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-3 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#6a6f73]">Loading your learning portal...</p>
          </div>
        ) : (
          <>
            {/* TABS 1, 2, 3: Course Grids (All, In Progress, Completed) */}
            {(activeTab === 'all' || activeTab === 'in_progress' || activeTab === 'completed') && (
              <div className="space-y-6">
                {/* Search & Sorting Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-[#d1d7dc]">
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search my courses..."
                      className="w-full h-10 pl-9 pr-4 border border-[#2d2f31] text-xs focus:outline-none focus:ring-1 focus:ring-[#5022c3] rounded"
                    />
                    <Icon
                      name="search"
                      size={18}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[#2d2f31]">
                    <span className="font-bold">Sort by:</span>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="h-10 px-3 border border-[#2d2f31] bg-white rounded text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="recent">Recently Enrolled</option>
                      <option value="progress_desc">Progress: High to Low</option>
                      <option value="progress_asc">Progress: Low to High</option>
                      <option value="title">Title: A to Z</option>
                    </select>
                  </div>
                </div>

                {/* Course Cards Grid */}
                {filteredCourses.length === 0 ? (
                  <div className="border border-[#d1d7dc] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-4 my-6 bg-[#f7f9fa]/60">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#6a6f73] border border-[#d1d7dc] shadow-xs">
                      <Icon name="school" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-[#1c1d1f]">
                      {searchFilter
                        ? 'No courses matching your search filter.'
                        : activeTab === 'completed'
                        ? 'No completed courses yet.'
                        : 'You are not enrolled in any courses yet.'}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#6a6f73] max-w-md leading-relaxed">
                      {activeTab === 'completed'
                        ? 'Watch lectures and complete assignments to finish courses and earn verified certificates!'
                        : 'Explore hundreds of masterclasses designed for teacher excellence and early childhood development.'}
                    </p>
                    <Link
                      href="/courses"
                      className="px-6 py-2.5 bg-[#a435f0] hover:bg-[#8710d8] text-white font-bold text-xs rounded transition-colors shadow-xs"
                    >
                      Browse Courses Catalog
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCourses.map((c) => (
                      <div
                        key={c.id}
                        className="border border-[#d1d7dc] bg-white rounded-lg overflow-hidden flex flex-col hover:shadow-lg transition-all duration-200 group"
                      >
                        {/* Thumbnail with Player Overlay */}
                        <Link
                          href={`/learn/${c.slug || c.id}`}
                          className="relative aspect-[16/9] w-full bg-gray-100 overflow-hidden block"
                        >
                          {c.thumbnail ? (
                            <img
                              src={c.thumbnail}
                              alt={c.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                              <Icon name="school" size={36} />
                              <span className="text-[11px] mt-1 font-semibold">
                                {typeof c.category === 'object' && c.category !== null ? (c.category.name || 'General') : (c.category || 'General')}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/90 text-[#1c1d1f] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                              <Icon name="play_arrow" fill size={28} className="ml-0.5 text-[#5022c3]" />
                            </div>
                          </div>
                        </Link>

                        {/* Card Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6f73]">
                              {typeof c.category === 'object' && c.category !== null ? (c.category.name || 'General') : (c.category || 'General')}
                            </span>
                            <Link
                              href={`/learn/${c.slug || c.id}`}
                              className="font-bold text-[15px] leading-snug text-[#1c1d1f] group-hover:text-[#5022c3] transition-colors line-clamp-2 mt-0.5 block"
                            >
                              {c.title}
                            </Link>
                            <p className="text-xs text-[#6a6f73] truncate mt-1">
                              {c.instructor?.name || 'Academic Faculty'}
                            </p>
                          </div>

                          {/* Progress Bar & Subtext */}
                          <div className="space-y-1.5 pt-2 border-t border-gray-100">
                            <div className="flex justify-between items-center text-[11px] font-bold">
                              <span className="text-[#2d2f31]">
                                {c.progressPercent}% complete
                              </span>
                              <span className="text-[#6a6f73] font-normal">
                                {c.completedLessons || 0} / {c.totalLessons || 20} lessons
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  c.progressPercent === 100 ? 'bg-emerald-600' : 'bg-[#5022c3]'
                                }`}
                                style={{ width: `${c.progressPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Action CTA Button */}
                          <div className="pt-2">
                            {c.progressPercent === 100 ? (
                              <div className="space-y-2">
                                <Link
                                  href={`/learn/${c.slug || c.id}`}
                                  className="w-full py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs rounded flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors"
                                >
                                  <Icon name="check_circle" fill size={16} className="text-emerald-700" />
                                  <span>Completed ✓ (Review)</span>
                                </Link>
                                <button
                                  onClick={() =>
                                    handleOpenCertificate({
                                      certificateNumber: c.certificateNumber,
                                      courseTitle: c.title,
                                      instructorName: c.instructor?.name
                                    })
                                  }
                                  className="w-full py-2 bg-[#5022c3] text-white font-bold text-xs rounded flex items-center justify-center gap-1.5 hover:bg-[#3b198f] transition-colors shadow-xs cursor-pointer"
                                >
                                  <Icon name="workspace_premium" fill size={16} />
                                  <span>View Certificate</span>
                                </button>
                              </div>
                            ) : (
                              <Link
                                href={`/learn/${c.slug || c.id}`}
                                className="w-full py-2.5 bg-[#a435f0] text-white font-bold text-xs rounded flex items-center justify-center gap-1.5 hover:bg-[#8710d8] transition-colors shadow-xs"
                              >
                                <Icon name="play_circle" size={16} />
                                <span>{c.progressPercent > 0 ? 'Continue Learning' : 'Start Course'}</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Certificates Screen */}
            {activeTab === 'certificates' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-[#1c1d1f]">
                    Verified Certificates
                  </h2>
                  <p className="text-xs text-[#6a6f73] mt-0.5">
                    Official verified certificates issued upon 100% completion of accredited courses.
                  </p>
                </div>

                {certificates.length === 0 ? (
                  <div className="border border-[#d1d7dc] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-4 my-6 bg-[#f7f9fa]/50">
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                      <Icon name="workspace_premium" size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-[#1c1d1f]">
                      No Certificates Earned Yet
                    </h3>
                    <p className="text-xs sm:text-sm text-[#6a6f73] max-w-md">
                      Certificates are automatically generated and awarded when you complete 100% of any enrolled curriculum.
                    </p>
                    <button
                      onClick={() => setActiveTab('in_progress')}
                      className="px-6 py-2.5 bg-[#5022c3] hover:bg-[#3b198f] text-white font-bold text-xs rounded transition-colors"
                    >
                      Resume In-Progress Courses
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="border border-[#d1d7dc] rounded-xl p-6 bg-white shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 border-t-4 border-t-amber-500"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              ACCREDITED
                            </span>
                            <h3 className="font-bold text-base text-[#1c1d1f] leading-snug mt-1">
                              {cert.course?.title || 'Masterclass Curriculum'}
                            </h3>
                            <p className="text-xs text-[#6a6f73]">
                              Instructor: {cert.course?.instructor?.name || 'Academic Faculty'}
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Icon name="workspace_premium" fill size={28} />
                          </div>
                        </div>

                        <div className="space-y-2 pt-3 border-t border-gray-100 text-xs">
                          <div className="flex justify-between text-gray-500">
                            <span>Issued Date:</span>
                            <span className="font-medium text-gray-700">{cert.issuedAt}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Credential ID:</span>
                            <span className="font-mono font-bold text-gray-800">{cert.certificateNumber}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenCertificate({
                            certificateNumber: cert.certificateNumber,
                            courseTitle: cert.course?.title,
                            instructorName: cert.course?.instructor?.name,
                            issuedAt: cert.issuedAt
                          })}
                          className="w-full py-2.5 bg-[#1c1d1f] hover:bg-black text-white font-bold text-xs rounded flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                        >
                          <Icon name="visibility" size={16} />
                          <span>View &amp; Download Certificate</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: Purchase History & Invoices */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-[#1c1d1f]">
                    Purchase History &amp; Receipts
                  </h2>
                  <p className="text-xs text-[#6a6f73] mt-0.5">
                    View transaction records, billing statements, and download GST tax invoices.
                  </p>
                </div>

                {orders.length === 0 ? (
                  <div className="border border-[#d1d7dc] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-4 my-6 bg-[#f7f9fa]/50">
                    <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                      <Icon name="receipt_long" size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-[#1c1d1f]">
                      No Transaction History Found
                    </h3>
                    <p className="text-xs text-[#6a6f73] max-w-sm">
                      When you purchase courses or enroll in programs, official invoices will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="border border-[#d1d7dc] rounded-lg overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#f7f9fa] text-[11px] font-bold text-[#6a6f73] uppercase tracking-wider border-b border-[#d1d7dc]">
                          <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Order / Invoice #</th>
                            <th className="p-4">Curriculum / Course</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Payment Method</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#d1d7dc]">
                          {orders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-[#f7f9fa]/50 transition-colors">
                              <td className="p-4 font-medium text-gray-600">
                                {ord.createdAt}
                              </td>
                              <td className="p-4 font-mono font-bold text-[#5022c3]">
                                {ord.invoiceNumber || ord.orderNumber || ord.id.slice(0, 10).toUpperCase()}
                              </td>
                              <td className="p-4 font-bold text-[#1c1d1f] max-w-xs truncate">
                                {ord.course?.title || (ord.items?.[0]?.productTitle) || 'Course Masterclass'}
                              </td>
                              <td className="p-4 font-mono font-bold text-[#1c1d1f]">
                                ${Number(ord.total || ord.amount || 0).toFixed(2)}
                              </td>
                              <td className="p-4 text-gray-600 capitalize">
                                {ord.provider || 'Stripe / Online'}
                              </td>
                              <td className="p-4">
                                <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {ord.status || 'PAID'}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleOpenInvoice(ord)}
                                  className="px-3 py-1.5 bg-white border border-[#2d2f31] hover:bg-[#f7f9fa] text-[#2d2f31] font-bold text-xs rounded transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                                >
                                  <Icon name="download" size={14} />
                                  <span>Download Invoice</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Verified Certificate Preview & Print Modal */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        certificate={selectedCertificate}
      />

      {/* GST Tax Invoice Preview & Print Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        order={selectedOrder}
      />

      <UdemyFooter />
    </div>
  );
}

export default function StudentLearningPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudentLearningContent />
    </Suspense>
  );
}
