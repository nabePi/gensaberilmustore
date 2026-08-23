import type { Metadata } from 'next';
import Link from 'next/link';

import { BLOG_POSTS } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Kabar, tips, dan rekomendasi seputar buku Islam dan produk keluarga muslim dari GenSa Berilmu.',
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  return (
    <div className="container-prototype py-10">
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">Blog Kami</h1>
      <p className="mt-2 text-[15px] text-neutral-500">
        Kabar, tips, dan rekomendasi dari GenSa Berilmu
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="flex flex-col overflow-hidden rounded-sm border border-neutral-200"
          >
            <div className="relative aspect-[16/10] bg-neutral-100">
              <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                {post.tags[0]}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
              <h2 className="line-clamp-2 text-[15px] leading-[1.35] font-bold text-foreground">
                {post.title}
              </h2>
              <p className="line-clamp-3 text-[13px] text-neutral-500">{post.excerpt}</p>
              <div className="mt-auto flex gap-4 pt-1.5 text-xs text-neutral-400">
                <span>{post.author}</span>
                <span>{post.date}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
