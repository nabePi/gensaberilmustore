import type { MetadataRoute } from 'next';

import { IS_PRODUCTION, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

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
