import type { MetadataRoute } from 'next';

import { prisma } from '@/lib/db';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, blogPosts] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/kids`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/products?category=${category.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];
}
