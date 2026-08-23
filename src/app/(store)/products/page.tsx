import type { Metadata } from 'next';
import Link from 'next/link';

import { InfiniteProductGrid } from '@/components/product/InfiniteProductGrid';
import { prisma } from '@/lib/db';
import { btnOutline, btnSolid, inputBase } from '@/lib/styles';
import { listProducts } from '@/server/products/list';
import { listProductsQuerySchema } from '@/server/products/schema';

const PRODUCTS_DESCRIPTION =
  'Jelajahi koleksi lengkap buku Islam dan produk keluarga muslim GenSa Berilmu: buku dewasa, buku anak, dan merchandise.';

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

function buildFilterQueryString(filters: ResolvedFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStock) params.set('inStock', filters.inStock);
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = first(params.category);
  const q = first(params.q);
  const page = first(params.page);

  let title = 'Semua Produk';
  if (q) {
    title = `Hasil pencarian "${q}"`;
  } else if (categorySlug) {
    const category = await prisma.category.findFirst({
      where: { slug: categorySlug, isActive: true },
      select: { name: true },
    });
    if (category) title = category.name;
  }

  const canonical = categorySlug ? `/products?category=${categorySlug}` : '/products';
  const isFiltered = Boolean(
    q ||
    first(params.minPrice) ||
    first(params.maxPrice) ||
    first(params.sort) ||
    (page && page !== '1'),
  );

  return {
    title,
    description: PRODUCTS_DESCRIPTION,
    alternates: { canonical },
    robots: { index: !isFiltered, follow: true },
  };
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
            <InfiniteProductGrid
              key={buildFilterQueryString(filters)}
              initialItems={items}
              initialPage={page}
              initialTotal={total}
              limit={limit}
              queryString={buildFilterQueryString(filters)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
