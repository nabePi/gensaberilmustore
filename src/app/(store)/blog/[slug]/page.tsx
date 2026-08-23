import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductCard } from '@/components/product/ProductCard';
import { Carousel } from '@/components/ui/Carousel';
import { SectionHead } from '@/components/ui/SectionHead';
import { BLOG_POSTS, getBlogPostBySlug } from '@/lib/blog';
import { getHomepageData } from '@/server/homepage/data';

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

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
  const post = getBlogPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const otherPosts = BLOG_POSTS.filter((item) => item.slug !== post.slug).slice(0, 3);

  const { sections } = await getHomepageData();
  const sectionsWithProducts = sections.filter((section) => section.products.length > 0);
  const randomSection =
    sectionsWithProducts.length > 0
      ? sectionsWithProducts[hashStringToIndex(slug, sectionsWithProducts.length)]
      : null;

  return (
    <div className="container-prototype max-w-3xl py-10">
      <nav className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/" className="hover:text-brand">
          Beranda
        </Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-brand">
          Blog
        </Link>
        <span>/</span>
        <span className="text-foreground">{post.title}</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground md:text-3xl">{post.title}</h1>
      <div className="mt-3 flex gap-4 text-sm text-neutral-400">
        <span>{post.author}</span>
        <span>{post.date}</span>
      </div>

      <div className="mt-6 aspect-[16/8] rounded-lg bg-neutral-100" />

      <div
        className="mt-8 space-y-4 text-[15px] leading-relaxed text-neutral-600"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <div className="mt-8 flex flex-wrap gap-2 border-t border-neutral-200 pt-6">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-brand/10 px-3 py-1 text-[13px] font-bold text-brand"
          >
            {tag}
          </span>
        ))}
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
                <div className="relative aspect-[16/10] bg-neutral-100">
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                    {item.tags[0]}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
                  <h3 className="line-clamp-2 text-[15px] leading-[1.35] font-bold text-foreground">
                    {item.title}
                  </h3>
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
