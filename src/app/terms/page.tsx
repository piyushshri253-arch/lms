'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Shield, Mail, Phone, MapPin, ExternalLink, ArrowLeft } from 'lucide-react';

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2"
            >
              <span className="px-2.5 py-1 rounded-lg bg-violet-600 text-white text-sm font-black">
                MT
              </span>
              <span>MORENA TEACH</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="https://morenateach.com/" className="hover:text-violet-600 transition-colors">
              Home
            </a>
            <a
              href="https://morenateach.com/about-us/"
              className="hover:text-violet-600 transition-colors"
            >
              About us
            </a>
            <a
              href="https://morenateach.com/teacher-education/"
              className="hover:text-violet-600 transition-colors"
            >
              Teacher Education
            </a>
            <a
              href="https://morenateach.com/school-solutions/"
              className="hover:text-violet-600 transition-colors"
            >
              School Solutions
            </a>
            <a
              href="https://morenateach.com/contact-us/"
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Contact Now
            </a>
          </nav>

          <Link
            href="/"
            className="md:hidden inline-flex items-center gap-1.5 text-xs font-bold text-violet-600"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-bold mb-4">
            <FileText className="w-4 h-4 text-violet-300" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-slate-300 font-medium">
            Effective Date: September 2026 • Morena Teach (Morena Technologies)
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>View Privacy &amp; Data Protection Policy</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 space-y-8 leading-relaxed text-sm text-slate-700">
          {/* 1. Acceptance of Terms */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              1. Introduction &amp; Acceptance of Terms
            </h2>
            <p>
              Welcome to <strong>Morena Teach</strong> (&ldquo;Morena Teach&rdquo;, &ldquo;Morena
              Technologies&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). These
              Terms &amp; Conditions govern your access to and use of the Morena Teach Learning
              Management System (LMS), website, teacher education programs, school solutions,
              instructor studio, and course auditor portals.
            </p>
            <p>
              By creating an account as a <strong>Student / Learner</strong>,{' '}
              <strong>Instructor / Educator</strong>, or <strong>Course Auditor / Reviewer</strong>,
              or by accessing our services, you confirm that you have read, understood, and agreed
              to be bound by these Terms &amp; Conditions and our{' '}
              <Link href="/privacy" className="text-violet-700 font-bold underline">
                Privacy &amp; Data Protection Policy
              </Link>
              .
            </p>
          </section>

          {/* 2. Account Registration & Verification */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              2. Account Registration &amp; Eligibility
            </h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                You must provide accurate, complete, and current personal and professional
                information during signup, including your full name, verified email address, mobile
                number, and address where required.
              </li>
              <li>
                Every account requires email OTP verification before activation. You are responsible
                for maintaining the confidentiality of your login credentials and OTP codes.
              </li>
              <li>
                A user may register a Student account and an Instructor application using the same
                email address; however, duplicate registrations within the same role are strictly
                prohibited.
              </li>
            </ul>
          </section>

          {/* 3. Instructor & Course Auditor Onboarding */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              3. Instructor &amp; Course Auditor Onboarding Terms
            </h2>
            <p>
              If you apply to join Morena Teach as an <strong>Instructor</strong> or{' '}
              <strong>Course Auditor (Reviewer)</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                You warrant that all academic qualifications (Graduation, Post-Graduation, Ph.D.,
                and Professional Certifications), course names, university names, passing years,
                experience summaries, and uploaded Resume/CV documents are authentic and accurate.
              </li>
              <li>
                Submitting an Instructor registration places your profile under{' '}
                <strong>Course Auditor Review (24 - 48 hours onboarding process)</strong>. Morena
                Teach reserves the right to verify credentials, conduct an interview, or approve/decline
                onboarding at its sole discretion.
              </li>
              <li>
                Instructors may only publish original educational content or content for which they
                hold full legal rights and authorization.
              </li>
            </ul>
          </section>

          {/* 4. Student Enrollment, Courses & Certifications */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              4. Student Enrollment, Learning Access &amp; Certificates
            </h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                Course enrollments grant you a personal, non-transferable, non-exclusive license to
                view and complete the enrolled educational materials via the Morena Teach platform.
              </li>
              <li>
                Course videos, PDFs, assessments, and resources may not be redistributed, resold,
                pirated, or publicly shared without written authorization from Morena Teach.
              </li>
              <li>
                Certificates of completion are issued upon meeting the required lesson progress and
                assessment criteria defined for each program.
              </li>
            </ul>
          </section>

          {/* 5. Institutional & School Solutions */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              5. Institutional &amp; School Responsibilities
            </h2>
            <p>
              Where schools, educational institutions, NGOs, or organizations onboard educators or
              learners onto Morena Teach, the institution represents and warrants that all required
              consents, child protection clearances, and institutional approvals have been obtained
              in compliance with applicable laws (including the Information Technology Act, 2000,
              GDPR, CCPA/CPRA, and GCC data protection regulations).
            </p>
          </section>

          {/* 6. Payments, Pricing & Payouts */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              6. Payments, Subscriptions &amp; Instructor Payouts
            </h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                All course fees and institutional subscription charges are displayed prior to
                checkout and processed through authorized payment gateways.
              </li>
              <li>
                Instructor revenue sharing and payouts are subject to bank account verification,
                applicable taxes, and platform payout schedules.
              </li>
            </ul>
          </section>

          {/* 7. Intellectual Property */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              7. Intellectual Property Rights
            </h2>
            <p>
              All platform software, logos, trademarks, design systems, and proprietary educational
              frameworks belong to <strong>Morena Teach | Morena Technologies</strong>. Unauthorized
              reproduction or reverse engineering of the platform is prohibited.
            </p>
          </section>

          {/* 8. Governing Law */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              8. Limitation of Liability &amp; Governing Law
            </h2>
            <p>
              Morena Teach provides its educational platform and services on an &ldquo;as-is&rdquo;
              and &ldquo;as-available&rdquo; basis. These Terms &amp; Conditions shall be governed
              by and construed in accordance with the laws of India, with exclusive jurisdiction in
              the courts of Uttar Pradesh / Delhi NCR.
            </p>
          </section>

          {/* Contact Box */}
          <section className="p-6 rounded-2xl bg-violet-50/80 border border-violet-200 space-y-4">
            <h2 className="text-lg font-extrabold text-violet-950">Contact Us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="space-y-2">
                <div className="font-extrabold text-slate-900">
                  Morena Teach (Morena Technologies)
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                  <span>A-28, Block A, Sector 57, Noida, Uttar Pradesh 201301</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-violet-600 shrink-0" />
                  <a
                    href="mailto:morena@morenateach.com"
                    className="text-violet-700 font-bold hover:underline"
                  >
                    morena@morenateach.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-violet-600 shrink-0" />
                  <a href="tel:+919625972523" className="font-bold hover:underline">
                    +91 9625972523
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-extrabold text-slate-900">Related Policies</div>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <Link
                    href="/privacy"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Privacy &amp; Data Protection Policy</span>
                  </Link>
                  <a
                    href="https://www.morenateach.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-violet-400"
                  >
                    <span>www.morenateach.com</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 text-xs text-center">
        © 2026 Morena Teach | Morena Technologies. All Rights Reserved.
      </footer>
    </div>
  );
}
