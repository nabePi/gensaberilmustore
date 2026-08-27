import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductCard } from '@/components/product/ProductCard';
import { Carousel } from '@/components/ui/Carousel';
import { SectionHead } from '@/components/ui/SectionHead';
import { ShareButton } from '@/components/ui/ShareButton';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { getPublishedBlogPostBySlug, getPublishedBlogPosts } from '@/server/blog/data';
import { getHomepageData } from '@/server/homepage/data';

export const dynamic = 'force-dynamic';

function hashStringToIndex(value: string, length: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) return {};

  const path = `/blog/${post.slug}`;
  const description = post.excerpt || post.title;

  return {
    title: post.title,
    description,
    keywords: post.tags,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: path,
      publishedTime: post.publishedAt.toISOString(),
      authors: [post.author],
      tags: post.tags,
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
    twitter: {
      card: post.coverImageUrl ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  const allPosts = await getPublishedBlogPosts();
  const otherPosts = allPosts.filter((item) => item.slug !== post.slug).slice(0, 3);

  const { sections } = await getHomepageData();
  const sectionsWithProducts = sections.filter((section) => section.products.length > 0);
  const randomSection =
    sectionsWithProducts.length > 0
      ? sectionsWithProducts[hashStringToIndex(slug, sectionsWithProducts.length)]
      : null;

  const publishedDate = post.publishedAt.toISOString();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.title,
    datePublished: publishedDate,
    dateModified: publishedDate,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: SITE_NAME, logo: `${SITE_URL}/icon.png` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
    keywords: post.tags.join(', '),
    ...(post.coverImageUrl ? { image: [post.coverImageUrl] } : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <div className="container-prototype py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl">{post.title}</h1>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex gap-4 text-sm text-neutral-400">
          <span>{post.author}</span>
          <span>{post.date}</span>
        </div>
        <ShareButton title={post.title} text={post.excerpt} />
      </div>

      <div className="mt-8 grid items-start gap-8 md:grid-cols-5 lg:gap-12">
        {post.coverImageUrl ? (
          <div className="overflow-hidden rounded-lg bg-neutral-100 md:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverImageUrl} alt={post.title} className="h-auto w-full" />
          </div>
        ) : (
          <div className="aspect-[4/5] rounded-lg bg-neutral-100 md:col-span-2" />
        )}

        <div className="md:col-span-3">
          <div
            className="space-y-4 text-[15px] leading-relaxed text-neutral-600 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-200 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-brand [&_a]:underline [&_img]:h-auto [&_img]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-400">Topik:</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand/10 px-3 py-1 text-[13px] font-bold text-brand"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {randomSection ? (
        <section className="mt-14">
          <SectionHead
            title={randomSection.title}
            subtitle={randomSection.subtitle}
            viewAllHref={`/products?section=${randomSection.key}`}
          />
          <Carousel>
            {randomSection.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Carousel>
        </section>
      ) : null}

      {otherPosts.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-lg font-bold text-foreground">Artikel Lainnya</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            {otherPosts.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="flex flex-col overflow-hidden rounded-sm border border-neutral-200"
              >
                {item.coverImageUrl ? (
                  <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.coverImageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                      {item.tags[0] ?? 'Blog'}
                    </span>
                  </div>
                ) : (
                  <div className="relative aspect-[16/10] bg-neutral-100">
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                      {item.tags[0] ?? 'Blog'}
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
                  <h3 className="line-clamp-2 text-[15px] leading-[1.35] font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="line-clamp-3 text-[13px] text-neutral-500">{item.contentPreview}</p>
                  <div className="mt-auto flex gap-4 pt-1.5 text-xs text-neutral-400">
                    <span>{item.author}</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
