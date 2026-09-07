'use client';

import { useRouter } from 'next/navigation';

import { BlogForm } from '@/components/admin/BlogForm';
import { PageHeader } from '@/components/admin/ui/PageHeader';

export default function AdminBlogBaruPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tambah Artikel"
        breadcrumb={[{ label: 'Blog', href: '/admin/blog' }, { label: 'Tambah Artikel' }]}
      />
      <BlogForm
        post={null}
        onCancel={() => router.push('/admin/blog')}
        onSaved={() => router.push('/admin/blog')}
      />
    </div>
  );
}
