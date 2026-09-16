'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const orderNumber = searchParams.get('orderNumber') || `ORD-${new Date().getFullYear()}-MT`;

  return (
    <div className="min-h-screen bg-[#f7f9fa] text-[#1c1d1f] flex flex-col justify-between font-sans antialiased">
      <UdemyNavbar />

      <main className="flex-1 max-w-[800px] mx-auto px-4 sm:px-6 py-12 md:py-16 w-full text-center">
        {/* Celebration Badge */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-md border-2 border-emerald-200">
          <Icon name="check_circle" size={48} fill={true} />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1c1d1f] tracking-tight mb-2">
          Order Confirmed! You are Enrolled! 🎉
        </h1>
        <p className="text-[#6a6f73] text-sm sm:text-base max-w-lg mx-auto mb-8">
          Thank you for investing in your skills! Your enrollment is active and you have lifetime access to your course materials.
        </p>

        {/* Order Details Card */}
        <div className="bg-white border border-[#d1d7dc] rounded-2xl p-6 sm:p-8 text-left shadow-xs mb-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-gray-100 gap-2">
            <div>
              <span className="text-xs font-bold text-[#6a6f73] uppercase tracking-wider">
                Order Reference
              </span>
              <p className="font-mono text-base font-extrabold text-[#1c1d1f]">
                {orderNumber}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                <Icon name="verified" size={14} />
                <span>Payment Status: PAID</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[#6a6f73] block mb-1 font-medium">Payment Type:</span>
              <span className="font-bold text-[#1c1d1f] text-sm">Trial / Simulated Sandbox</span>
            </div>
            <div>
              <span className="text-[#6a6f73] block mb-1 font-medium">Date & Time:</span>
              <span className="font-bold text-[#1c1d1f] text-sm">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div>
              <span className="text-[#6a6f73] block mb-1 font-medium">Course Access:</span>
              <span className="font-bold text-emerald-700 text-sm">Immediate Lifetime</span>
            </div>
          </div>

          <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-100 flex items-start gap-3 mt-4">
            <Icon name="school" size={22} className="text-[#5624d0] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-[#5624d0]">
                All modules, videos & quizzes are now unlocked!
              </p>
              <p className="text-purple-900 mt-0.5">
                You can start watching lessons, track progress, download PDFs, and earn your verified certificate of completion.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/student/learning"
            className="w-full sm:w-auto px-8 py-4 bg-[#5624d0] hover:bg-[#401b9c] text-white font-extrabold text-sm rounded-lg shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Learning Now</span>
            <Icon name="arrow_forward" size={18} />
          </Link>

          <Link
            href="/courses"
            className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-gray-50 text-[#1c1d1f] font-bold text-sm rounded-lg border border-[#d1d7dc] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Browse More Courses</span>
          </Link>
        </div>
      </main>

      <UdemyFooter />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading confirmation...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
