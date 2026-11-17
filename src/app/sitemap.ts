import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Always use the official production domain for Google Search Console indexing
  const baseUrl = 'https://morenateach.com';

  // 1. Static Institutional & Admissions Pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7
    }
  ];

  try {
    // 2. Dynamic Published Courses for Google Search Console Indexing
    const publishedCourses = await prisma.course.findMany({
      where: {
        parentCourseId: null,
        status: 'PUBLISHED'
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true
      }
    });

    const coursePages: MetadataRoute.Sitemap = publishedCourses.map((c) => ({
      url: `${baseUrl}/courses/${c.slug || c.id}`,
      lastModified: c.updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.85
    }));

    return [...staticPages, ...coursePages];
  } catch (err) {
    console.error('[Sitemap Generation Error]:', err);
    return staticPages;
  }
}
