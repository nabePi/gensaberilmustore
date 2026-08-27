'use client';

import { useEffect, useState } from 'react';

import { AdminModal } from '@/components/admin/AdminModal';
import { BlogFormModal, type BlogPostFormTarget } from '@/components/admin/BlogFormModal';
import { badgeBase, btnOutline, btnSolid, btnSolidSm, cardBase, inputBase } from '@/lib/styles';

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
  const [formTarget, setFormTarget] = useState<BlogPostListItem | 'new' | null>(null);
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

  async function openEdit(post: BlogPostListItem) {
    const response = await fetch(`/api/admin/blog/${post.id}`);
    if (response.ok) {
      setFormTarget(await response.json());
    }
  }

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Blog</h1>
          <p className="mt-1 text-sm text-neutral-500">{total} artikel</p>
        </div>
        <button type="button" onClick={() => setFormTarget('new')} className={btnSolid}>
          + Tambah Artikel
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder="Cari judul..."
          className={`${inputBase} max-w-xs`}
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          className={`${inputBase} max-w-[180px]`}
        >
          <option value="ALL">Semua Status</option>
          <option value="PUBLISHED">Terbit</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Memuat artikel...</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">Belum ada artikel.</p>
        </div>
      ) : (
        <div className={`overflow-x-auto ${cardBase}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3">Cover</th>
                <th className="px-4 py-3">Judul</th>
                <th className="px-4 py-3">Penulis</th>
                <th className="px-4 py-3">Terbit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3">
                    {post.coverImageUrl ? (
                      <div className="h-12 w-16 overflow-hidden rounded-sm border border-neutral-200 bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-16 rounded-sm bg-neutral-100" />
                    )}
                  </td>
                  <td className="max-w-[320px] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(post)}
                      className="line-clamp-2 text-left font-medium text-foreground hover:text-brand"
                    >
                      {post.title}
                    </button>
                    <p className="mt-0.5 truncate text-xs text-neutral-400">/blog/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{post.author}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(post.publishedAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`${badgeBase} ${
                        post.status === 'PUBLISHED'
                          ? 'bg-green/10 text-green'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {post.status === 'PUBLISHED' ? 'Terbit' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              className={btnOutline}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className={btnSolidSm}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      ) : null}

      {formTarget ? (
        <BlogFormModal
          post={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            loadPosts();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <AdminModal title="Hapus Artikel" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-neutral-600">
            Yakin ingin menghapus <strong>{deleteTarget.title}</strong>?
          </p>
          {deleteError ? <p className="mt-2 text-sm text-red">{deleteError}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={btnOutline}>
              Batal
            </button>
            <button type="button" disabled={deleting} onClick={handleDelete} className={btnSolidSm}>
              {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </AdminModal>
      ) : null}
    </div>
  );
}
