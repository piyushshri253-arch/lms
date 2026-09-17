'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentWishlistPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/courses');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-[#2d2f31]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-gray-500">Redirecting to courses...</p>
      </div>
    </div>
  );
}


