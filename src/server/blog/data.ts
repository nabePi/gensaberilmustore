import { prisma } from '@/lib/db';

export type StorefrontBlogPost = {
  slug: string;
  tags: string[];
  title: string;
  excerpt: string;
  contentPreview: string;
  author: string;
  date: string;
  publishedAt: Date;
  contentHtml: string;
  coverImageUrl: string | null;
};

function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateToCompleteSentence(text: string, maxLength = 200): string {
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
  );

  if (lastSentenceEnd > 0) return `${cut.slice(0, lastSentenceEnd + 1)} ...`;

  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)} ...`;
}

function formatPublishedDate(value: Date): string {
  return value.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type BlogPostRow = {
  slug: string;
  tags: string[];
  title: string;
  excerpt: string;
  author: string;
  publishedAt: Date | null;
  createdAt: Date;
  contentHtml: string;
  coverImageUrl: string | null;
};

function toStorefrontPost(post: BlogPostRow): StorefrontBlogPost {
  const publishedAt = post.publishedAt ?? post.createdAt;
  return {
    slug: post.slug,
    tags: post.tags,
    title: post.title,
    excerpt: post.excerpt,
    contentPreview: truncateToCompleteSentence(htmlToPlainText(post.contentHtml)),
    author: post.author,
    date: formatPublishedDate(publishedAt),
    publishedAt,
    contentHtml: post.contentHtml,
    coverImageUrl: post.coverImageUrl,
  };
}

export async function getPublishedBlogPosts(): Promise<StorefrontBlogPost[]> {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
  });

  return posts.map(toStorefrontPost);
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<StorefrontBlogPost | null> {
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: 'PUBLISHED' },
  });

  return post ? toStorefrontPost(post) : null;
}
