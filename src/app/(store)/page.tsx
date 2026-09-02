import Link from 'next/link';

import { SpecialPromotionSection } from '@/components/home/SpecialPromotionSection';
import { ProductCard } from '@/components/product/ProductCard';
import { BannerCarousel } from '@/components/ui/BannerCarousel';
import { Carousel } from '@/components/ui/Carousel';
import { SectionHead } from '@/components/ui/SectionHead';
import { getPublishedBlogPosts } from '@/server/blog/data';
import { getHomepageData } from '@/server/homepage/data';

export default async function HomePage() {
  const [{ banners, sections }, blogPosts] = await Promise.all([
    getHomepageData(),
    getPublishedBlogPosts(),
  ]);
  const homepageBlogPosts = blogPosts.slice(0, 3);
  const heroMobileSlides = [...banners.HERO_MAIN, ...banners.HERO_SIDE_1, ...banners.HERO_SIDE_2];

  return (
    <>
      <section className="relative aspect-[2/1] lg:hidden">
        {heroMobileSlides.length > 0 ? (
          <BannerCarousel slides={heroMobileSlides} className="h-full" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand to-brand-700 text-center text-white">
            <div>
              <p className="text-2xl font-bold">Selamat Datang di GenSa Berilmu</p>
              <p className="mt-2 text-sm">Toko buku Islam dan produk keluarga muslim</p>
            </div>
          </div>
        )}
      </section>

      <div className="container-prototype py-8 space-y-14">
        <section className="hidden gap-4 lg:grid lg:grid-cols-3">
          <div className="relative aspect-[2/1] lg:col-span-2">
            {banners.HERO_MAIN.length > 0 ? (
              <BannerCarousel slides={banners.HERO_MAIN} className="h-full rounded-lg" />
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
            <div className="relative aspect-[2/1]">
              {banners.HERO_SIDE_1.length > 0 ? (
                <BannerCarousel slides={banners.HERO_SIDE_1} className="h-full rounded-lg" />
              ) : (
                <div className="flex h-full items-center justify-center bg-brand-50 text-sm font-semibold text-brand">
                  Promo Spesial
                </div>
              )}
            </div>
            <div className="relative aspect-[2/1]">
              {banners.HERO_SIDE_2.length > 0 ? (
                <BannerCarousel slides={banners.HERO_SIDE_2} className="h-full rounded-lg" />
              ) : (
                <div className="flex h-full items-center justify-center bg-neutral-50 text-sm font-semibold text-neutral-500">
                  Koleksi Baru
                </div>
              )}
            </div>
          </div>
        </section>

        {sections.map((section) =>
          section.backgroundColor ? (
            <SpecialPromotionSection
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              viewAllHref={`/products?section=${section.key}`}
              products={section.products}
              backgroundColor={section.backgroundColor}
              titleColor={section.titleColor ?? '#ffffff'}
            />
          ) : (
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
          ),
        )}

        {homepageBlogPosts.length > 0 ? (
          <section>
            <SectionHead
              title="Blog Kami"
              subtitle="Kabar, tips, dan rekomendasi dari GenSa Berilmu"
              viewAllHref="/blog"
              viewAllLabel="Baca Lainnya"
            />
            <div className="grid gap-5 sm:grid-cols-3">
              {homepageBlogPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="flex flex-col overflow-hidden rounded-sm border border-neutral-200"
                >
                  {post.coverImageUrl ? (
                    <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                        {post.tags[0] ?? 'Blog'}
                      </span>
                    </div>
                  ) : (
                    <div className="relative aspect-[16/10] bg-neutral-100">
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                        {post.tags[0] ?? 'Blog'}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
                    <h3 className="line-clamp-2 text-[15px] leading-[1.35] font-bold text-foreground">
                      {post.title}
                    </h3>
                    <p className="line-clamp-3 text-[13px] text-neutral-500">
                      {post.contentPreview}
                    </p>
                    <div className="mt-auto flex gap-4 pt-1.5 text-xs text-neutral-400">
                      <span>{post.author}</span>
                      <span>{post.date}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
