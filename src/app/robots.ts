import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/member',
        '/cart',
        '/checkout',
        '/payment',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/styleguide',
        '/l',
        '/r/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
