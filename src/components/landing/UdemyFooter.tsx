'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export const UdemyFooter: React.FC = () => {
  return (
    <footer className="bg-[#1c1d1f] text-white border-t border-gray-800">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 py-12">
        {/* Top Links Grid (Udemy 4-Column Layout) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 font-mono">
              Explore Morena Teach
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/courses" className="hover:text-white hover:underline">
                  All Courses & Certifications
                </Link>
              </li>
              <li>
                <Link href="/courses?category=Early%20Childhood%20Education" className="hover:text-white hover:underline">
                  Early Childhood Care (ECCD)
                </Link>
              </li>
              <li>
                <Link href="/courses?category=Pedagogy%20%26%20Teaching%20Methods" className="hover:text-white hover:underline">
                  Classroom Pedagogy
                </Link>
              </li>
              <li>
                <Link href="/courses?category=Montessori%20%26%20Child%20Psychology" className="hover:text-white hover:underline">
                  Montessori Method
                </Link>
              </li>
              <li>
                <Link href="/courses?category=Special%20Needs%20%26%20Inclusion" className="hover:text-white hover:underline">
                  Special Needs & Inclusion
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 font-mono">
              Institutions & Educators
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/instructor" className="hover:text-white hover:underline">
                  Teach on Morena Teach
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-white hover:underline">
                  Morena Teach for Schools & Academies
                </Link>
              </li>
              <li>
                <Link href="/instructor" className="hover:text-white hover:underline">
                  Educator Faculty Hub
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white hover:underline">
                  Instructor Studio Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 font-mono">
              About & Support
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/courses" className="hover:text-white hover:underline">
                  About Our Mission
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-white hover:underline">
                  Help and Support
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-white hover:underline">
                  Accreditation & Partners
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-white hover:underline">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Language & Regional Selector */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 font-mono">
              Regional Settings
            </h4>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none sm:rounded-[4px] border border-white bg-transparent text-sm font-bold text-white hover:bg-[#2d2f31] transition-colors"
            >
              <Icon name="language" size={18} />
              <span>English (India)</span>
            </button>
            <p className="text-xs text-gray-400 leading-relaxed font-normal">
              Empowering teachers, preschool facilitators, and school leaders across India and worldwide.
            </p>
          </div>
        </div>

        {/* Bottom Bar: Logo, Brand & Copyright */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Morena Teach Logo"
              className="h-9 w-auto object-contain bg-white rounded p-0.5"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-white tracking-tight leading-none">
                MORENA TEACH
              </span>
              <span className="text-[10px] text-gray-400 mt-1">
                Learning Management System
              </span>
            </div>
          </div>

          {/* Legal / Copyright */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
            <span>© 2026 Morena Teach, Inc. All rights reserved.</span>
            <span className="hidden sm:inline">·</span>
            <Link href="/courses" className="hover:text-white hover:underline">
              Privacy Policy
            </Link>
            <span className="hidden sm:inline">·</span>
            <Link href="/courses" className="hover:text-white hover:underline">
              Terms of Use
            </Link>
            <span className="hidden sm:inline">·</span>
            <Link href="/courses" className="hover:text-white hover:underline">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
