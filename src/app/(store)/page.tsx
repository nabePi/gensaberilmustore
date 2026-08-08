import Link from 'next/link';

import { ProductCard } from '@/components/product/ProductCard';
import { Carousel } from '@/components/ui/Carousel';
import { SectionHead } from '@/components/ui/SectionHead';
import { getHomepageData } from '@/server/homepage/data';

const BLOG_POSTS = [
  {
    title: '5 Rekomendasi Buku Islami untuk Menemani Ramadhan',
    excerpt: 'Kumpulan buku terbaik untuk mengisi bulan penuh berkah dengan ilmu dan hikmah.',
  },
  {
    title: 'Tips Menumbuhkan Minat Baca pada Anak Sejak Dini',
    excerpt: 'Strategi sederhana orang tua agar si kecil jatuh cinta pada buku.',
  },
  {
    title: 'Mengenal Karya-Karya Ulama Klasik yang Wajib Dibaca',
    excerpt: 'Panduan memilih rujukan Islam klasik yang relevan untuk kehidupan modern.',
  },
];

export default async function HomePage() {
  const { config, sections } = await getHomepageData();

  return (
    <div className="container-prototype py-8 space-y-14">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="relative h-[220px] overflow-hidden rounded-lg bg-neutral-100 lg:col-span-2 lg:h-[360px]">
          {config?.heroMainImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.heroMainImageUrl}
              alt="Promo utama"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand to-brand-700 text-center text-white">
              <div>
                <p className="text-2xl font-bold">Selamat Datang di GenSa Berilmu</p>
                <p className="mt-2 text-sm">Toko buku Islam dan produk keluarga muslim</p>
              </div>
            </div>
          )}
        </div>
        <div className="grid gap-4">
          <div className="relative h-[100px] overflow-hidden rounded-lg bg-neutral-100 lg:h-[170px]">
            {config?.heroSideImage1Url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.heroSideImage1Url}
                alt="Promo samping 1"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-50 text-sm font-semibold text-brand">
                Promo Spesial
              </div>
            )}
          </div>
          <div className="relative h-[100px] overflow-hidden rounded-lg bg-neutral-100 lg:h-[170px]">
            {config?.heroSideImage2Url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.heroSideImage2Url}
                alt="Promo samping 2"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-neutral-50 text-sm font-semibold text-neutral-500">
                Koleksi Baru
              </div>
            )}
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.key}>
          <SectionHead
            title={section.title}
            subtitle={section.subtitle}
            viewAllHref={`/products?section=${section.key.toLowerCase()}`}
          />
          {section.promoImageUrl ? (
            <div className="mb-4 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={section.promoImageUrl}
                alt={section.title}
                className="h-24 w-full object-cover"
              />
            </div>
          ) : null}
          {section.products.length > 0 ? (
            <Carousel>
              {section.products.map((product) => (
                <div key={product.id} className="w-[180px] shrink-0 sm:w-[210px]">
                  <ProductCard product={product} />
                </div>
              ))}
            </Carousel>
          ) : (
            <p className="text-sm text-neutral-500">Belum ada produk untuk kategori ini.</p>
          )}
        </section>
      ))}

      <section>
        <SectionHead title="Blog Kami" subtitle="Kabar, tips, dan rekomendasi dari GenSa Berilmu" />
        <div className="grid gap-4 sm:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.title}
              href="#"
              className="flex flex-col bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-md"
            >
              <div className="h-32 bg-neutral-100" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-sm font-bold text-foreground">{post.title}</h3>
                <p className="text-sm text-neutral-500">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
