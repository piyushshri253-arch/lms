'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function UserPublicProfilePage() {
  const { currentUser } = useApp();

  const fullName = currentUser?.name || 'Piyush Srivastava';
  const headline = 'Educator & Early Childhood Curriculum Specialist';
  const bio =
    currentUser?.bio ||
    'Dedicated to advancing progressive pedagogical approaches and early literacy development. Lifelong learner exploring modern web, AI, and classroom education.';

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-8 py-10">
      {/* Top Profile Summary Card */}
      <div className="bg-white border border-[#d1d7dc] rounded-[4px] p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xs">
        <div className="w-28 h-28 rounded-full bg-[#1c1d1f] text-white text-3xl font-bold flex items-center justify-center shrink-0 tracking-wider overflow-hidden">
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1d1f] tracking-tight">
                {fullName}
              </h1>
              <p className="text-sm text-[#6a6f73] mt-1 font-medium">{headline}</p>
            </div>

            <Link
              href="/user/edit-profile"
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 border border-[#2d2f31] text-xs font-bold text-[#2d2f31] hover:bg-[#f7f9fa] rounded-[2px] transition-colors"
            >
              <Icon name="edit" size={16} />
              <span>Edit profile</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-xs text-[#5022c3]">
            <a
              href="https://teachhub.org"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:underline font-semibold"
            >
              <Icon name="language" size={16} />
              <span>Website</span>
            </a>
            <span className="flex items-center gap-1 font-semibold text-[#2d2f31]">
              <Icon name="school" size={16} />
              <span>Student on T.E.A.C.H</span>
            </span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="mt-8 bg-white border border-[#d1d7dc] rounded-[4px] p-6 sm:p-8">
        <h2 className="text-lg font-bold text-[#1c1d1f] mb-3">About me</h2>
        <p className="text-sm text-[#2d2f31] leading-relaxed whitespace-pre-line">
          {bio}
        </p>
      </div>

      {/* Enrolled Courses Section */}
      <div className="mt-8 bg-white border border-[#d1d7dc] rounded-[4px] p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1c1d1f]">Courses enrolled</h2>
          <Link
            href="/student/learning"
            className="text-xs text-[#5022c3] font-bold hover:underline"
          >
            Go to My learning
          </Link>
        </div>
        <p className="text-xs text-[#6a6f73]">
          Active and completed courses are displayed according to your account privacy preferences.
        </p>
      </div>
    </div>
  );
}
