'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Mail, Phone, MapPin, ExternalLink, Lock, FileText, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
      <div className="bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-bold mb-4">
            <Shield className="w-4 h-4 text-violet-300" />
            <span>Legal &amp; Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy &amp; Data Protection Policy
          </h1>
          <p className="mt-2 text-sm text-slate-300 font-medium">
            Effective Date: September 2026 • Morena Teach (Morena Technologies)
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <Link
              href="/terms"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Terms &amp; Conditions</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Policy Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 space-y-8 leading-relaxed text-sm text-slate-700">
          {/* Introduction */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Introduction</h2>
            <p>
              Morena Teach (&ldquo;Morena Teach&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or
              &ldquo;us&rdquo;) is committed to protecting the privacy, confidentiality, and
              security of personal information entrusted to us by educators, schools, educational
              institutions, organizations, partners, and website visitors.
            </p>
            <p>
              As an education-focused organization serving learners, educators, schools, and
              educational communities across multiple regions, we recognize the importance of
              responsible data practices and are committed to processing personal information in
              accordance with applicable privacy and data protection laws, including where
              applicable:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 font-medium text-slate-800">
              <li>General Data Protection Regulation (GDPR)</li>
              <li>ePrivacy Directive</li>
              <li>California Consumer Privacy Act (CCPA/CPRA)</li>
              <li>Information Technology Act, 2000 and SPDI Rules (India)</li>
              <li>Applicable privacy and data protection regulations within the GCC region</li>
            </ul>
            <p>
              This Privacy &amp; Data Protection Policy explains how we collect, use, store,
              disclose, and protect personal information when you access our website, participate in
              our programs, attend our events, subscribe to communications, or engage with our
              services.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="space-y-4 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Information We Collect
            </h2>
            <p>We may collect information that you voluntarily provide, including:</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-violet-700">
                  Personal Information
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                  <li>Name (First Name &amp; Last Name)</li>
                  <li>Email address</li>
                  <li>Telephone / Mobile number</li>
                  <li>Organization or school name</li>
                  <li>Job title or professional role</li>
                  <li>Country, state, city, and address</li>
                  <li>Information submitted through forms, registrations, surveys, or inquiries</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-violet-700">
                  Professional Information
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                  <li>Teaching experience &amp; summary</li>
                  <li>Professional interests &amp; LinkedIn profile</li>
                  <li>Educational qualifications, university &amp; passing years</li>
                  <li>Uploaded Resume / CV documents</li>
                  <li>Program participation records</li>
                  <li>Certification or learning activity records</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-violet-700">
                  Technical Information
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                  <li>IP address</li>
                  <li>Browser type</li>
                  <li>Device information</li>
                  <li>Operating system</li>
                  <li>Website usage information</li>
                  <li>Cookie and analytics data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              How We Use Information
            </h2>
            <p>We may use information to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Respond to inquiries and requests</li>
              <li>Deliver educational programs, courses, and LMS services</li>
              <li>Verify and onboard instructors and course auditors</li>
              <li>Manage event registrations and participation</li>
              <li>Issue certificates and participation records</li>
              <li>Communicate program updates and opportunities</li>
              <li>Provide newsletters and professional learning information</li>
              <li>Improve website performance and user experience</li>
              <li>Conduct analytics and service improvement activities</li>
              <li>Maintain website security</li>
              <li>Meet legal and regulatory obligations</li>
            </ul>
            <p className="font-semibold text-slate-800">
              We will only use personal information for legitimate educational, operational,
              business, or legal purposes.
            </p>
          </section>

          {/* Educational Content and Learning Activities */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Educational Content and Learning Activities
            </h2>
            <p>Participants may voluntarily provide information through:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Program registrations</li>
              <li>Professional learning activities</li>
              <li>Surveys and feedback forms</li>
              <li>Assignments and reflections</li>
              <li>Community discussions</li>
              <li>Certification programs</li>
            </ul>
            <p>
              Such information will be used solely for educational, administrative, certification,
              quality improvement, or program-related purposes unless otherwise communicated.
            </p>
          </section>

          {/* Student Information and Educational Data */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Student Information and Educational Data
            </h2>
            <p>
              Morena Teach primarily serves educators, schools, institutions, and adult learners.
            </p>
            <p>
              We do not knowingly collect personal information directly from children unless
              specifically authorized and required for a particular educational engagement.
            </p>
            <p>
              If you are an educator, school, institution, or organization using our services, you
              represent and warrant that you have obtained all necessary permissions, consents,
              authorizations, and approvals required under applicable laws, regulations, child
              protection requirements, and institutional policies before sharing any
              student-related information with Morena Teach.
            </p>
            <p>
              Any student information shared with Morena Teach will be processed only for the
              purposes authorized by the relevant institution or program and protected through
              appropriate administrative and technical safeguards.
            </p>
          </section>

          {/* Institutional Responsibilities */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Institutional Responsibilities
            </h2>
            <p>
              Where Morena Teach provides services to schools, educational institutions, NGOs,
              government bodies, or other organizations, the institution remains responsible for
              ensuring that any personal information shared with Morena Teach has been collected,
              processed, and disclosed in accordance with applicable privacy laws, child protection
              requirements, and institutional policies.
            </p>
          </section>

          {/* Legal Basis for Processing */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Legal Basis for Processing
            </h2>
            <p>
              Where GDPR or similar privacy laws apply, Morena Teach processes personal information
              based on:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Consent</li>
              <li>Contractual necessity</li>
              <li>Legitimate interests</li>
              <li>Legal obligations</li>
            </ul>
            <p>You may withdraw consent at any time where consent is the basis of processing.</p>
          </section>

          {/* Marketing Communications */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Marketing Communications
            </h2>
            <p>We may send information regarding:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Programs</li>
              <li>Events</li>
              <li>Workshops</li>
              <li>Professional learning opportunities</li>
              <li>Educational resources</li>
              <li>Organizational updates</li>
            </ul>
            <p>
              Marketing communications will only be sent where permitted by law or where appropriate
              consent has been obtained. You may unsubscribe at any time using the unsubscribe link
              included in communications or by contacting us directly.
            </p>
          </section>

          {/* Information Sharing */}
          <section className="space-y-3 border-t border-slate-100 pt-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Information Sharing
            </h2>
            <p className="font-bold text-slate-900">Morena Teach does not sell personal information.</p>
            <p>We may share information with trusted service providers supporting:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Website operations</li>
              <li>Event management</li>
              <li>Learning management systems</li>
              <li>Email communications</li>
              <li>Customer relationship management platforms</li>
              <li>Analytics services</li>
              <li>Legal and regulatory compliance</li>
            </ul>
            <p>
              These providers are expected to maintain appropriate confidentiality and security
              standards.
            </p>
          </section>

          {/* International Data Transfers & Retention */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900">
                International Data Transfers
              </h2>
              <p>
                Because Morena Teach serves educators and organizations across multiple countries,
                personal information may be processed or stored outside your country of residence.
                Where required by law, appropriate safeguards will be implemented to protect
                personal information during international transfers.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900">Data Retention</h2>
              <p>We retain personal information only for as long as necessary to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Deliver educational services</li>
                <li>Maintain learning records and certifications</li>
                <li>Fulfil legal and regulatory requirements</li>
                <li>Support legitimate business operations</li>
              </ul>
              <p>
                Information that is no longer required will be securely deleted, anonymized, or
                archived where appropriate.
              </p>
            </div>
          </section>

          {/* Your Privacy Rights & California Privacy Rights */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900">Your Privacy Rights</h2>
              <p>Subject to applicable laws, individuals may have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion</li>
                <li>Restrict processing</li>
                <li>Object to processing</li>
                <li>Withdraw consent</li>
                <li>Request data portability</li>
              </ul>
              <p>Requests may be submitted using the contact details provided below.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-slate-900">California Privacy Rights</h2>
              <p>
                California residents may have additional rights under the CCPA/CPRA, including the
                right to know, access, correct, or request deletion of personal information.
              </p>
              <p className="font-bold text-slate-900">
                Morena Teach does not sell personal information.
              </p>
            </div>
          </section>

          {/* Security, Third-Party Websites & Updates */}
          <section className="space-y-4 border-t border-slate-100 pt-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Security</h2>
              <p>
                We implement reasonable administrative, technical, and organizational safeguards
                designed to protect personal information from unauthorized access, disclosure,
                misuse, alteration, or destruction. However, no method of transmission or storage
                can be guaranteed to be completely secure.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Third-Party Websites</h2>
              <p>
                Our website may contain links to external websites or embedded third-party content.
                Morena Teach is not responsible for the privacy practices of external websites and
                encourages users to review their privacy policies.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Updates to This Policy</h2>
              <p>
                We may update this Privacy &amp; Data Protection Policy periodically to reflect
                changes in our services, technologies, legal requirements, or business practices.
                Updated versions will be posted on this page with a revised effective date.
              </p>
            </div>
          </section>

          {/* Contact Us Box */}
          <section className="p-6 rounded-2xl bg-violet-50/80 border border-violet-200 space-y-4">
            <h2 className="text-lg font-extrabold text-violet-950">Contact Us</h2>
            <p className="text-xs sm:text-sm text-slate-700">
              For privacy-related questions, requests, or concerns, please contact:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="space-y-2">
                <div className="font-extrabold text-slate-900">Morena Teach</div>
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
                  <span className="text-slate-400">|</span>
                  <a
                    href="mailto:privacy@morenateach.com"
                    className="text-violet-700 font-bold hover:underline"
                  >
                    privacy@morenateach.com
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
                <div className="font-extrabold text-slate-900">Connect With Us</div>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <a
                    href="https://www.morenateach.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-violet-400"
                  >
                    <span>www.morenateach.com</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://www.instagram.com/withmorenateach/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-pink-600 hover:border-pink-400"
                  >
                    <span>Follow on Instagram</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://web.whatsapp.com/send?phone=+919625972523"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                  >
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4 border-t border-slate-800 text-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-8 mb-8">
          <div className="space-y-2">
            <div className="text-white font-black text-base">MORENA TEACH</div>
            <p className="text-slate-400 leading-relaxed">
              A-28, Block A, Sector 57, Noida, Uttar Pradesh 201301
            </p>
            <p>Email: morena@morenateach.com</p>
            <p>Phone: +91 9625972523</p>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold uppercase tracking-wider">Quick Links</div>
            <ul className="space-y-1.5">
              <li>
                <a href="https://morenateach.com/" className="hover:text-white">
                  Home
                </a>
              </li>
              <li>
                <a href="https://morenateach.com/about-us/" className="hover:text-white">
                  About Us
                </a>
              </li>
              <li>
                <a href="https://morenateach.com/contact-us/" className="hover:text-white">
                  Write To Us
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold uppercase tracking-wider">Services</div>
            <ul className="space-y-1.5">
              <li>
                <a href="https://morenateach.com/teacher-education/" className="hover:text-white">
                  Teacher Education
                </a>
              </li>
              <li>
                <a href="https://morenateach.com/school-solutions/" className="hover:text-white">
                  School Solutions
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold uppercase tracking-wider">Legal</div>
            <ul className="space-y-1.5">
              <li>
                <Link href="/privacy" className="text-violet-400 font-bold hover:underline">
                  Privacy &amp; Data Protection Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-800 text-center text-slate-500">
          © 2026 Morena Teach | Morena Technologies. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
