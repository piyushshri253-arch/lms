import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://morenateach.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/courses',
          '/courses/*',
          '/about',
          '/contact',
          '/services'
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/super-admin/',
          '/instructor/',
          '/reviewer/',
          '/seo/'
        ]
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/courses',
          '/courses/*'
        ]
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
