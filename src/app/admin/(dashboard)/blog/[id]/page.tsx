'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BlogForm, type BlogPostFormTarget } from '@/components/admin/BlogForm';
import { PageHeader } from '@/components/admin/ui/PageHeader';

export default function AdminBlogEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPostFormTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/admin/blog/${params.id}`);
      if (response.ok) {
        setPost(await response.json());
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }

    load();
  }, [params.id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit Artikel"
        breadcrumb={[{ label: 'Blog', href: '/admin/blog' }, { label: 'Edit Artikel' }]}
      />
      {loading ? (
        <p className="text-sm text-neutral-500">Memuat artikel...</p>
      ) : notFound || !post ? (
        <p className="text-sm text-neutral-500">Artikel tidak ditemukan.</p>
      ) : (
        <BlogForm
          post={post}
          onCancel={() => router.push('/admin/blog')}
          onSaved={() => router.push('/admin/blog')}
        />
      )}
    </div>
  );
}
