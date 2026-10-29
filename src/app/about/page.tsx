import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = {
  title: 'About Us | Morena Teach – Teacher Excellence Hub',
  description:
    'Learn about Morena Teach – Teacher Excellence Hub, dedicated to empowering educators, early childhood teachers, and school leaders with master pedagogy and future-ready classroom strategies.'
};

export default function AboutPage() {
  return (
    <div className="bg-white text-[#1c1d1f] min-h-screen flex flex-col antialiased selection:bg-purple-100 selection:text-purple-900 font-sans">
      {/* 1. Header Navigation */}
      <UdemyNavbar />

      <main className="flex-grow">
        {/* 2. Hero Section */}
        <section className="bg-gradient-to-b from-[#f7f9fa] to-white border-b border-[#d1d7dc] py-14 sm:py-20">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-[#5022c3] text-xs font-bold uppercase tracking-wider mb-5">
              <Icon name="school" size={16} />
              <span>Teacher Excellence Hub</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black text-[#183257] tracking-tight leading-[1.15] max-w-4xl mx-auto">
              Empowering Educators, Transforming Future Classrooms
            </h1>

            <p className="text-base sm:text-lg text-[#4a5568] max-w-2xl mx-auto mt-6 leading-relaxed font-normal">
              Morena Teach is dedicated to revolutionizing educator pedagogy, early childhood care & education (ECCE), and continuous professional development through certified, practical programs.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8">
              <Link
                href="/courses"
                className="h-12 px-7 bg-[#5022c3] hover:bg-[#3f1b99] text-white text-sm font-bold rounded flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <span>Explore Certified Courses</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
              <Link
                href="/register"
                className="h-12 px-7 bg-white hover:bg-gray-50 border border-[#2d2f31] text-[#2d2f31] text-sm font-bold rounded flex items-center justify-center transition-colors"
              >
                <span>Join as Educator</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. Key Impact Metrics */}
        <section className="py-12 border-b border-[#d1d7dc] bg-white">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="p-4 border-r last:border-r-0 border-gray-100">
                <div className="text-3xl sm:text-4xl font-black text-[#5022c3]">15,000+</div>
                <div className="text-xs sm:text-sm text-[#6a6f73] font-semibold mt-1">Educators Trained</div>
              </div>
              <div className="p-4 border-r last:border-r-0 border-gray-100">
                <div className="text-3xl sm:text-4xl font-black text-[#5022c3]">120+</div>
                <div className="text-xs sm:text-sm text-[#6a6f73] font-semibold mt-1">Accredited Hours</div>
              </div>
              <div className="p-4 border-r last:border-r-0 border-gray-100">
                <div className="text-3xl sm:text-4xl font-black text-[#5022c3]">98%</div>
                <div className="text-xs sm:text-sm text-[#6a6f73] font-semibold mt-1">Satisfaction Rate</div>
              </div>
              <div className="p-4">
                <div className="text-3xl sm:text-4xl font-black text-[#5022c3]">4.9★</div>
                <div className="text-xs sm:text-sm text-[#6a6f73] font-semibold mt-1">Faculty Excellence</div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Mission & Vision */}
        <section className="py-16 sm:py-20 bg-[#f7f9fa] border-b border-[#d1d7dc]">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-stretch">
              {/* Mission Card */}
              <div className="bg-white p-8 sm:p-10 rounded border border-[#d1d7dc] shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-purple-50 text-[#5022c3] flex items-center justify-center mb-5">
                    <Icon name="flag" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#2d2f31] mb-3">Our Mission</h2>
                  <p className="text-sm sm:text-base text-[#4a5568] leading-relaxed">
                    To deliver accessible, research-grounded, and hands-on pedagogy training for teachers across early childhood and foundational schooling. We bridge the gap between educational theory and everyday classroom dynamics.
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-xs sm:text-sm text-[#2d2f31] font-medium">
                  <li className="flex items-center gap-2">
                    <Icon name="check_circle" size={16} className="text-emerald-600 shrink-0" />
                    <span>Evidence-based pedagogical strategies</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="check_circle" size={16} className="text-emerald-600 shrink-0" />
                    <span>Holistic, child-centric learning models</span>
                  </li>
                </ul>
              </div>

              {/* Vision Card */}
              <div className="bg-white p-8 sm:p-10 rounded border border-[#d1d7dc] shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                    <Icon name="visibility" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#2d2f31] mb-3">Our Vision</h2>
                  <p className="text-sm sm:text-base text-[#4a5568] leading-relaxed">
                    To establish a national benchmark in educator excellence, enabling every teacher to inspire curiosity, foster critical thinking, and build empathetic, resilient future generations.
                  </p>
                </div>
                <ul className="mt-6 space-y-2 text-xs sm:text-sm text-[#2d2f31] font-medium">
                  <li className="flex items-center gap-2">
                    <Icon name="check_circle" size={16} className="text-emerald-600 shrink-0" />
                    <span>Lifelong continuous professional development</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="check_circle" size={16} className="text-emerald-600 shrink-0" />
                    <span>Recognized certifications with verifiable credentials</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Core Pillars of Teacher Excellence */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#2d2f31] tracking-tight">
                Our Educational Pillars
              </h2>
              <p className="text-sm sm:text-base text-[#6a6f73] mt-2">
                Designed by senior educationists and classroom practitioners for real-world impact.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-[#d1d7dc] rounded bg-white hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4">
                  <Icon name="child_care" size={20} />
                </div>
                <h3 className="font-bold text-base text-[#2d2f31] mb-2">Early Childhood & ECCE</h3>
                <p className="text-xs sm:text-sm text-[#6a6f73] leading-relaxed">
                  Focusing on play-based frameworks, sensorial activities, and brain development in the foundational years.
                </p>
              </div>

              <div className="p-6 border border-[#d1d7dc] rounded bg-white hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <Icon name="auto_stories" size={20} />
                </div>
                <h3 className="font-bold text-base text-[#2d2f31] mb-2">Modern Pedagogy</h3>
                <p className="text-xs sm:text-sm text-[#6a6f73] leading-relaxed">
                  Inquiry-led learning, concept-based curriculum mapping, and differentiated instruction for diverse classrooms.
                </p>
              </div>

              <div className="p-6 border border-[#d1d7dc] rounded bg-white hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                  <Icon name="verified" size={20} />
                </div>
                <h3 className="font-bold text-base text-[#2d2f31] mb-2">Verified Certification</h3>
                <p className="text-xs sm:text-sm text-[#6a6f73] leading-relaxed">
                  Cryptographically secure, shareable certificates that advance educator credentials and school leadership careers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Call to Action Banner */}
        <section className="bg-[#183257] text-white py-14">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to Upgrade Your Teaching Career?
            </h2>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto mt-2 mb-6">
              Enroll in certified programs taught by distinguished faculty and elevate your classroom impact today.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 h-11 px-6 bg-white hover:bg-gray-100 text-[#183257] font-bold text-sm rounded transition-colors"
            >
              <span>Browse All Courses</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <UdemyFooter />
    </div>
  );
}
