import Link from 'next/link';
import type { ReactNode } from 'react';

import { ProductCard } from '@/components/product/ProductCard';
import { prisma } from '@/lib/db';
import { btnOutline, btnSolid, inputBase } from '@/lib/styles';
import { listProducts } from '@/server/products/list';
import { listProductsQuerySchema } from '@/server/products/schema';

type SearchParams = Record<string, string | string[] | undefined>;

type ResolvedFilters = ReturnType<typeof listProductsQuerySchema.parse>;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
  { value: 'popular', label: 'Terpopuler' },
];

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

function getCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { position: 'asc' },
    select: { id: true, name: true, slug: true },
  });
}

function buildQueryString(filters: ResolvedFilters, overrides: Record<string, string | undefined>) {
  const base: Record<string, string> = {};
  if (filters.q) base.q = filters.q;
  if (filters.category) base.category = filters.category;
  if (filters.minPrice !== undefined) base.minPrice = String(filters.minPrice);
  if (filters.maxPrice !== undefined) base.maxPrice = String(filters.maxPrice);
  if (filters.inStock) base.inStock = filters.inStock;
  if (filters.sort !== 'newest') base.sort = filters.sort;

  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

function FilterForm({
  categories,
  filters,
}: {
  categories: { id: string; name: string; slug: string }[];
  filters: ResolvedFilters;
}) {
  return (
    <form method="get" action="/products" className="flex flex-col gap-6">
      {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}

      <div>
        <h3 className="mb-3 text-sm font-bold text-foreground">Kategori</h3>
        <div className="flex flex-col gap-2 text-sm text-neutral-600">
          <label className="flex items-center gap-2">
            <input type="radio" name="category" value="" defaultChecked={!filters.category} />
            Semua Kategori
          </label>
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="category"
                value={category.slug}
                defaultChecked={filters.category === category.slug}
              />
              {category.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-foreground">Rentang Harga</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="minPrice"
            min={0}
            placeholder="Min"
            defaultValue={filters.minPrice ?? ''}
            className={inputBase}
          />
          <span className="text-neutral-400">-</span>
          <input
            type="number"
            name="maxPrice"
            min={0}
            placeholder="Maks"
            defaultValue={filters.maxPrice ?? ''}
            className={inputBase}
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            name="inStock"
            value="true"
            defaultChecked={filters.inStock === 'true'}
          />
          Hanya yang tersedia
        </label>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-foreground">Urutkan</h3>
        <select name="sort" defaultValue={filters.sort} className={inputBase}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit" className={`${btnSolid} flex-1`}>
          Terapkan Filter
        </button>
        <Link
          href={filters.q ? `/products?q=${encodeURIComponent(filters.q)}` : '/products'}
          className={`${btnOutline} flex-1`}
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

function PaginationLink({
  page,
  disabled,
  href,
  children,
}: {
  page: number;
  disabled: boolean;
  href: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-sm border border-neutral-200 px-2 text-sm text-neutral-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-sm border border-neutral-200 px-2 text-sm text-foreground hover:border-brand hover:text-brand"
    >
      {children}
    </Link>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const parsed = listProductsQuerySchema.safeParse({
    page: first(params.page),
    limit: first(params.limit),
    q: first(params.q),
    category: first(params.category),
    minPrice: first(params.minPrice),
    maxPrice: first(params.maxPrice),
    inStock: first(params.inStock),
    sort: first(params.sort),
  });

  const filters = parsed.success ? parsed.data : listProductsQuerySchema.parse({});

  const [{ items, total, page, limit }, categories] = await Promise.all([
    listProducts(filters),
    getCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="container-prototype py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {filters.q ? `Hasil untuk "${filters.q}"` : 'Semua Produk'}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{total} produk ditemukan</p>
      </div>

      <details className="mb-6 rounded-lg border border-neutral-200 bg-white lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
          Filter &amp; Sortir
        </summary>
        <div className="border-t border-neutral-200 px-4 py-4">
          <FilterForm categories={categories} filters={filters} />
        </div>
      </details>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-lg border border-neutral-200 bg-white p-4">
            <FilterForm categories={categories} filters={filters} />
          </div>
        </aside>

        <div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white py-16 text-center">
              <p className="text-sm text-neutral-500">
                Tidak ada produk yang cocok dengan filter ini.
              </p>
              <Link href="/products" className={btnOutline}>
                Reset Filter
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-2">
              <PaginationLink
                page={page - 1}
                disabled={page <= 1}
                href={`/products?${buildQueryString(filters, { page: String(page - 1) })}`}
              >
                Sebelumnya
              </PaginationLink>
              <span className="px-2 text-sm text-neutral-500">
                Halaman {page} dari {totalPages}
              </span>
              <PaginationLink
                page={page + 1}
                disabled={page >= totalPages}
                href={`/products?${buildQueryString(filters, { page: String(page + 1) })}`}
              >
                Berikutnya
              </PaginationLink>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
