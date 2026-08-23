import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AddToCartPanel } from '@/components/product/AddToCartPanel';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductTabs } from '@/components/product/ProductTabs';
import { Carousel } from '@/components/ui/Carousel';
import { ShareButton } from '@/components/ui/ShareButton';
import { formatCurrency } from '@/lib/format';
import { SITE_URL } from '@/lib/site';
import { badgeBase } from '@/lib/styles';
import { getProductDetail } from '@/server/products/detail';

const COVER_TYPE_LABELS: Record<string, string> = {
  SOFTCOVER: 'Soft Cover',
  HARDCOVER: 'Hard Cover',
  EBOOK: 'E-Book',
};

const RIBBON_STYLES: Record<string, string> = {
  NEW: 'bg-navy text-white',
  BEST: 'bg-brand text-white',
  DISCOUNT: 'bg-red text-white',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug);

  if (!product) {
    return { title: 'Produk Tidak Ditemukan', robots: { index: false } };
  }

  const description = product.description.replace(/\s+/g, ' ').trim().slice(0, 160);
  const primaryImage = product.images[0]?.url;
  const path = `/products/${product.slug}`;

  return {
    title: product.title,
    description,
    keywords: [
      product.author,
      product.publisher,
      ...product.categories.map((category) => category.name),
      ...product.tags.map((tag) => tag.name),
    ].filter((value): value is string => Boolean(value)),
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      url: path,
      images: primaryImage ? [{ url: primaryImage, alt: product.title }] : undefined,
    },
    twitter: {
      card: primaryImage ? 'summary_large_image' : 'summary',
      title: product.title,
      description,
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductDetail(slug);

  if (!product) {
    notFound();
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    sku: product.sku,
    image: product.images.map((image) => image.url),
    ...(product.author ? { author: { '@type': 'Person', name: product.author } } : {}),
    ...(product.publisher ? { brand: { '@type': 'Brand', name: product.publisher } } : {}),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: 'IDR',
      price: product.finalPrice,
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="container-prototype py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <nav className="mb-6 hidden items-center gap-2 text-sm text-neutral-500 lg:flex">
        <Link href="/" className="hover:text-brand">
          Beranda
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand">
          Produk
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} title={product.title} />

        <div className="flex flex-col gap-4">
          {product.ribbonType ? (
            <span
              className={`w-fit ${badgeBase} ${RIBBON_STYLES[product.ribbonType] ?? 'bg-neutral-700 text-white'}`}
            >
              {product.ribbonText ?? product.ribbonType}
            </span>
          ) : null}

          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">{product.title}</h1>
            <ShareButton title={product.title} text={product.subtitle ?? undefined} />
          </div>
          {product.subtitle ? <p className="text-sm text-neutral-500">{product.subtitle}</p> : null}
          {product.author ? (
            <p className="text-sm text-neutral-600">Oleh {product.author}</p>
          ) : null}

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-brand">
              {formatCurrency(product.finalPrice)}
            </span>
            {product.discountPercent > 0 ? (
              <>
                <span className="text-base text-neutral-400 line-through">
                  {formatCurrency(product.price)}
                </span>
                <span className={`${badgeBase} bg-red text-white`}>
                  -{product.discountPercent}%
                </span>
              </>
            ) : null}
          </div>

          <p className="text-sm text-neutral-600">
            {product.stock > 0 ? (
              <>
                Stok tersedia: <strong>{product.stock}</strong>
              </>
            ) : (
              <span className="font-semibold text-red">Stok Habis</span>
            )}
          </p>

          <AddToCartPanel
            productId={product.id}
            productTitle={product.title}
            imageUrl={product.images[0]?.url ?? null}
            stock={product.stock}
          />

          <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-foreground">Spesifikasi</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col">
                <span className="text-neutral-400">SKU</span>
                <strong className="text-foreground">{product.sku}</strong>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-400">Halaman</span>
                <strong className="text-foreground">{product.pageCount}</strong>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-400">Imprint</span>
                <strong className="text-foreground">{product.publisher ?? '-'}</strong>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-400">Tahun</span>
                <strong className="text-foreground">{product.publishYear}</strong>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-400">Berat</span>
                <strong className="text-foreground">{product.weightGram} gr</strong>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-400">Jenis Cover</span>
                <strong className="text-foreground">
                  {COVER_TYPE_LABELS[product.coverType] ?? product.coverType}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-foreground">Detail Produk</h2>
        <ProductTabs
          description={product.description}
          tocText={product.tocText}
          highlightsText={product.highlightsText}
        />
      </section>

      {product.relatedProducts.length > 0 ? (
        <section className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">Produk Terkait</h2>
            <p className="text-sm text-neutral-500">Produk lain yang mungkin Anda sukai</p>
          </div>
          <Carousel>
            {product.relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </Carousel>
        </section>
      ) : null}
    </div>
  );
}
