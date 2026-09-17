'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sales/onboarding');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#060814] flex items-center justify-center text-white text-xs font-mono">
      <div className="flex items-center gap-3">
        <span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Redirecting to MORENA TEACH Sales Onboarding...</span>
      </div>
    </div>
  );
}
