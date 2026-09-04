import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { name: true, seoTitle: true, seoDescription: true, favicon: true, logo: true, ogImage: true }
  });

  if (!org) {
    return { title: 'Academy Portal' };
  }

  const title = org.seoTitle || `${org.name} | Online Learning Platform`;
  const description = org.seoDescription || `Welcome to ${org.name}. Explore world-class masterclasses, practical cohorts, and verified certificates.`;

  return {
    title,
    description,
    icons: {
      icon: org.favicon || '/favicon.ico',
      shortcut: org.favicon || '/favicon.ico',
      apple: org.logo || '/apple-touch-icon.png'
    },
    openGraph: {
      title,
      description,
      images: org.ogImage ? [{ url: org.ogImage }] : undefined
    }
  };
}

export default async function OrganizationStorefrontLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      name: true,
      primaryColor: true,
      secondaryColor: true,
      fontFamily: true,
      buttonStyle: true
    }
  });

  if (!org) {
    notFound();
  }

  const primaryColor = org.primaryColor || '#4f46e5';
  const secondaryColor = org.secondaryColor || '#10b981';
  const fontFamily = org.fontFamily || 'Plus Jakarta Sans';
  const buttonRadius =
    org.buttonStyle === 'pill' ? '9999px' : org.buttonStyle === 'square' ? '4px' : '14px';

  // Google Font URL mapping
  let fontHref = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap';
  if (fontFamily === 'Poppins') {
    fontHref = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap';
  } else if (fontFamily === 'Montserrat') {
    fontHref = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap';
  } else if (fontFamily === 'Roboto') {
    fontHref = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap';
  } else if (fontFamily === 'Inter') {
    fontHref = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap';
  }

  return (
    <div
      style={
        {
          '--brand-primary': primaryColor,
          '--brand-secondary': secondaryColor,
          '--brand-radius': buttonRadius,
          fontFamily: `'${fontFamily}', sans-serif`
        } as React.CSSProperties
      }
      className="w-full min-h-screen bg-[#060814] text-white flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 antialiased"
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={fontHref} rel="stylesheet" />
      {children}
    </div>
  );
}
