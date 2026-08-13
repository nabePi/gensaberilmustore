import Link from 'next/link';

import { ProductCard } from '@/components/product/ProductCard';
import { BannerCarousel } from '@/components/ui/BannerCarousel';
import { Carousel } from '@/components/ui/Carousel';
import { SectionHead } from '@/components/ui/SectionHead';
import { getHomepageData } from '@/server/homepage/data';

const BLOG_POSTS = [
  {
    tag: 'Resensi',
    title: '5 Rekomendasi Buku Islami untuk Menemani Ramadhan',
    excerpt: 'Kumpulan buku terbaik untuk mengisi bulan penuh berkah dengan ilmu dan hikmah.',
    author: 'Redaksi',
    date: '5 Jan 2026',
  },
  {
    tag: 'Resensi',
    title: 'Tips Menumbuhkan Minat Baca pada Anak Sejak Dini',
    excerpt: 'Strategi sederhana orang tua agar si kecil jatuh cinta pada buku.',
    author: 'Redaksi',
    date: '3 Jan 2026',
  },
  {
    tag: 'Resensi',
    title: 'Mengenal Karya-Karya Ulama Klasik yang Wajib Dibaca',
    excerpt: 'Panduan memilih rujukan Islam klasik yang relevan untuk kehidupan modern.',
    author: 'Redaksi',
    date: '17 Jan 2026',
  },
];

export default async function HomePage() {
  const { banners, sections } = await getHomepageData();

  return (
    <div className="container-prototype py-8 space-y-14">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="relative h-[220px] lg:col-span-2 lg:h-[360px]">
          {banners.HERO_MAIN.length > 0 ? (
            <BannerCarousel slides={banners.HERO_MAIN} className="h-full" />
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
          <div className="relative h-[100px] lg:h-[170px]">
            {banners.HERO_SIDE_1.length > 0 ? (
              <BannerCarousel slides={banners.HERO_SIDE_1} className="h-full" />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-50 text-sm font-semibold text-brand">
                Promo Spesial
              </div>
            )}
          </div>
          <div className="relative h-[100px] lg:h-[170px]">
            {banners.HERO_SIDE_2.length > 0 ? (
              <BannerCarousel slides={banners.HERO_SIDE_2} className="h-full" />
            ) : (
              <div className="flex h-full items-center justify-center bg-neutral-50 text-sm font-semibold text-neutral-500">
                Koleksi Baru
              </div>
            )}
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.id}>
          <SectionHead
            title={section.title}
            subtitle={section.subtitle}
            viewAllHref={`/products?section=${section.key}`}
          />
          {section.products.length > 0 ? (
            <Carousel>
              {section.promoImageUrl ? (
                <div className="overflow-hidden rounded-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={section.promoImageUrl}
                    alt={section.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              {section.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </Carousel>
          ) : (
            <p className="text-sm text-neutral-500">Belum ada produk untuk kategori ini.</p>
          )}
        </section>
      ))}

      <section>
        <SectionHead title="Blog Kami" subtitle="Kabar, tips, dan rekomendasi dari GenSa Berilmu" />
        <div className="grid gap-5 sm:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.title}
              href="#"
              className="flex flex-col overflow-hidden rounded-sm border border-neutral-200"
            >
              <div className="relative aspect-[16/10] bg-neutral-100">
                <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                  {post.tag}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
                <h3 className="line-clamp-2 text-[15px] leading-[1.35] font-bold text-foreground">
                  {post.title}
                </h3>
                <p className="line-clamp-3 text-[13px] text-neutral-500">{post.excerpt}</p>
                <div className="mt-auto flex gap-4 pt-1.5 text-xs text-neutral-400">
                  <span>{post.author}</span>
                  <span>{post.date}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
