import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Icon } from '@/components/ui/Icon';

export default async function OrgAboutPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug }
  });

  if (!org || org.status === 'SUSPENDED') {
    notFound();
  }

  const primaryColor = org.primaryColor || '#4f46e5';

  return (
    <div className="min-h-screen bg-[#060814] text-white flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
      <header className="border-b border-white/10 bg-[#080c1e]/90 backdrop-blur-xl sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href={`/org/${org.slug}`} className="flex items-center gap-3">
            {org.logo ? (
              <img src={org.logo} alt={org.name} className="h-8 w-auto object-contain rounded" />
            ) : (
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md"
              >
                {org.name.charAt(0)}
              </div>
            )}
            <span className="font-extrabold text-base text-white tracking-tight">{org.name}</span>
          </Link>
          <Link href={`/org/${org.slug}`} className="text-xs font-bold text-slate-300 hover:text-white">
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 w-full space-y-8 flex-1">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase font-bold text-indigo-400">About Our Academy</span>
          <h1 className="text-3xl sm:text-5xl font-black text-white">{org.name}</h1>
        </div>

        <div className="p-8 sm:p-10 rounded-3xl bg-[#0c1126] border border-white/10 space-y-6 text-sm text-slate-300 leading-relaxed">
          <p>
            {org.description ||
              `${org.name} is dedicated to delivering high-impact technological education, practical cohort experiences, and industry-grade engineering mastery.`}
          </p>

          <h3 className="text-base font-extrabold text-white">Our Educational Mission</h3>
          <p>
            We bridge the gap between theoretical knowledge and real-world system architecture, providing aspiring engineers and seasoned professionals with the exact tools needed to build, scale, and lead complex software applications.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-xs font-mono uppercase font-bold text-indigo-300">Location</span>
              <p className="text-xs text-white">{org.address ? `${org.address}, ${org.country}` : org.country || 'Global Online Academy'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-xs font-mono uppercase font-bold text-emerald-300">Official Contact</span>
              <p className="text-xs text-white">{org.contactEmail || 'Available via student dashboard'}</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#04060f] py-6 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} {org.name}. Powered by AADHYARA Cloud.
      </footer>
    </div>
  );
}
