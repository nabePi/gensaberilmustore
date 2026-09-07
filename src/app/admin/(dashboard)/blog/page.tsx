'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import type { BlogPostFormTarget } from '@/components/admin/BlogForm';
import { Badge } from '@/components/admin/ui/Badge';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '@/components/admin/ui/Table';
import {
  adminBtnOutline,
  adminBtnPrimary,
  adminBtnPrimarySm,
  adminInputBase,
} from '@/lib/admin/styles';

type BlogPostListItem = BlogPostFormTarget & {
  publishedAt: string | null;
  createdAt: string;
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminBlogPage() {
  const [items, setItems] = useState<BlogPostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<BlogPostListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limit = 20;

  async function loadPosts() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.trim()) params.set('q', q.trim());
    if (status !== 'ALL') params.set('status', status);

    const response = await fetch(`/api/admin/blog?${params.toString()}`);
    if (response.ok) {
      const data: { items: BlogPostListItem[]; total: number } = await response.json();
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q.trim()) params.set('q', q.trim());
      if (status !== 'ALL') params.set('status', status);

      const response = await fetch(`/api/admin/blog?${params.toString()}`);
      if (response.ok) {
        const data: { items: BlogPostListItem[]; total: number } = await response.json();
        setItems(data.items);
        setTotal(data.total);
      }
      setLoading(false);
    }

    load();
  }, [page, q, status]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const response = await fetch(`/api/admin/blog/${deleteTarget.id}`, { method: 'DELETE' });

    setDeleting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setDeleteError(data.error ?? 'Gagal menghapus artikel');
      return;
    }

    setDeleteTarget(null);
    loadPosts();
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola Blog"
        description={`${total} artikel`}
        action={
          <Link href="/admin/blog/baru" className={adminBtnPrimary}>
            + Tambah Artikel
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder="Cari judul..."
          className={`${adminInputBase} max-w-xs`}
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          className={`${adminInputBase} max-w-[180px]`}
        >
          <option value="ALL">Semua Status</option>
          <option value="PUBLISHED">Terbit</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat artikel...</p>
      ) : items.length === 0 ? (
        <TableEmptyState>Belum ada artikel.</TableEmptyState>
      ) : (
        <Table>
          <Thead>
            <Th>Cover</Th>
            <Th>Judul</Th>
            <Th>Penulis</Th>
            <Th>Terbit</Th>
            <Th>Status</Th>
            <Th />
          </Thead>
          <Tbody>
            {items.map((post) => (
              <Tr key={post.id}>
                <Td>
                  {post.coverImageUrl ? (
                    <div className="h-12 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-16 rounded-lg bg-neutral-100" />
                  )}
                </Td>
                <Td className="max-w-[320px]">
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="line-clamp-2 font-medium text-foreground hover:text-brand"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-neutral-400">/blog/{post.slug}</p>
                </Td>
                <Td className="text-neutral-600">{post.author}</Td>
                <Td className="text-neutral-600">{formatDate(post.publishedAt)}</Td>
                <Td>
                  <Badge tone={post.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                    {post.status === 'PUBLISHED' ? 'Terbit' : 'Draft'}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(post);
                    }}
                    className="text-sm font-medium text-red hover:underline"
                  >
                    Hapus
                  </button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {total > limit ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
              className={adminBtnOutline}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className={adminBtnPrimarySm}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <AdminModal title="Hapus Artikel" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-neutral-600">
            Yakin ingin menghapus <strong>{deleteTarget.title}</strong>?
          </p>
          {deleteError ? <p className="mt-2 text-sm text-red">{deleteError}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={adminBtnOutline}>
              Batal
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className={adminBtnPrimarySm}
            >
              {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
