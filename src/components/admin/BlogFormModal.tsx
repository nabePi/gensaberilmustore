'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AdminModal } from '@/components/admin/AdminModal';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { SingleImageUpload } from '@/components/admin/SingleImageUpload';
import { btnOutline, btnSolid, inputBase } from '@/lib/styles';

const formSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi'),
  slug: z
    .string()
    .trim()
    .regex(
      /^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug hanya boleh huruf kecil, angka, dan tanda hubung',
    ),
  author: z.string().trim().min(1, 'Penulis wajib diisi'),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  coverImageUrl: z.string(),
  contentHtml: z.string().trim().min(1, 'Konten wajib diisi'),
});

type FormValues = z.infer<typeof formSchema>;

export type BlogPostFormTarget = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string | null;
  author: string;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
};

export function BlogFormModal({
  post,
  onClose,
  onSaved,
}: {
  post: BlogPostFormTarget | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: post?.title ?? '',
      slug: post?.slug ?? '',
      author: post?.author ?? 'Redaksi',
      status: post?.status ?? 'DRAFT',
      coverImageUrl: post?.coverImageUrl ?? '',
      contentHtml: post?.contentHtml ?? '',
    },
  });

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return;
    setTags([...tags, tag]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((existing) => existing !== tag));
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagInput);
    } else if (event.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      const lastTag = tags[tags.length - 1];
      if (lastTag) removeTag(lastTag);
    }
  }

  async function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      ...(values.slug ? { slug: values.slug } : {}),
      author: values.author,
      tags,
      status: values.status,
      coverImageUrl: values.coverImageUrl || null,
      contentHtml: values.contentHtml,
    };

    const url = post ? `/api/admin/blog/${post.id}` : '/api/admin/blog';
    const method = post ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const issues = (data.issues ?? {}) as Record<string, string[]>;
      if (issues.slug?.[0]) setError('slug', { message: issues.slug[0] });
      if (issues.title?.[0]) setError('title', { message: issues.title[0] });
      setError('root', { message: data.error ?? 'Gagal menyimpan artikel' });
      return;
    }

    onSaved();
  }

  return (
    <AdminModal
      title={post ? 'Edit Artikel' : 'Tambah Artikel'}
      onClose={onClose}
      widthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blog-title" className="text-sm font-semibold text-foreground">
            Judul
          </label>
          <input id="blog-title" {...register('title')} className={inputBase} />
          {errors.title ? <p className="text-xs text-red">{errors.title.message}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="blog-slug" className="text-sm font-semibold text-foreground">
              Slug <span className="font-normal text-neutral-400">(kosongkan untuk otomatis)</span>
            </label>
            <input id="blog-slug" {...register('slug')} className={inputBase} />
            {errors.slug ? <p className="text-xs text-red">{errors.slug.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="blog-author" className="text-sm font-semibold text-foreground">
              Penulis
            </label>
            <input id="blog-author" {...register('author')} className={inputBase} />
            {errors.author ? <p className="text-xs text-red">{errors.author.message}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="blog-tags" className="text-sm font-semibold text-foreground">
              Tag <span className="font-normal text-neutral-400">(tekan Enter untuk menambah)</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-neutral-200 bg-white px-2 py-1.5 focus-within:border-brand">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Hapus tag ${tag}`}
                    className="leading-none text-brand/60 hover:text-brand"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                id="blog-tags"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder={tags.length === 0 ? 'Resensi, Parenting' : ''}
                className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="blog-status" className="text-sm font-semibold text-foreground">
              Status
            </label>
            <select id="blog-status" {...register('status')} className={inputBase}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Terbit</option>
            </select>
          </div>
        </div>

        <Controller
          control={control}
          name="coverImageUrl"
          render={({ field }) => (
            <SingleImageUpload
              label="Cover Artikel"
              imageUrl={field.value}
              onChange={(url) => setValue('coverImageUrl', url, { shouldDirty: true })}
              placeholder="Upload gambar cover (opsional, tampil di halaman blog)."
            />
          )}
        />

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-foreground">Konten</p>
          <Controller
            control={control}
            name="contentHtml"
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={(html) => setValue('contentHtml', html, { shouldDirty: true })}
              />
            )}
          />
          {errors.contentHtml ? (
            <p className="text-xs text-red">{errors.contentHtml.message}</p>
          ) : null}
        </div>

        {errors.root ? <p className="text-sm text-red">{errors.root.message}</p> : null}

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
          <button type="button" onClick={onClose} className={btnOutline}>
            Batal
          </button>
          <button type="submit" disabled={isSubmitting} className={btnSolid}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
