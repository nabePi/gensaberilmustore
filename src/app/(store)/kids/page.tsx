import Link from 'next/link';

import { KidsProductCard } from '@/components/kids/KidsProductCard';
import { BannerCarousel } from '@/components/ui/BannerCarousel';
import { getKidsData } from '@/server/kids/data';

const AGE_GROUPS = [
  {
    title: '0 - 2 Tahun',
    desc: 'Board book & sensory',
    image: '/kids/age-0-2.png',
    border: 'border-[#FFCCBC]',
    hoverBg: 'hover:bg-[#FFF3E0]',
  },
  {
    title: '3 - 6 Tahun',
    desc: 'Dongeng & aktivitas',
    image: '/kids/age-3-6.png',
    border: 'border-[#B2DFDB]',
    hoverBg: 'hover:bg-[#E0F7FA]',
  },
  {
    title: '7 - 9 Tahun',
    desc: 'Komik & pengetahuan',
    image: '/kids/age-7-9.png',
    border: 'border-[#C5CAE9]',
    hoverBg: 'hover:bg-[#E8EAF6]',
  },
  {
    title: '10 - 12 Tahun',
    desc: 'Novel & inspirasi',
    image: '/kids/age-10-12.png',
    border: 'border-[#E1BEE7]',
    hoverBg: 'hover:bg-[#F3E5F5]',
  },
];

const SECTION_THEMES: Record<string, string> = {
  CREAM: 'bg-[#FFFDE7]',
  MINT: 'bg-[#E0F7FA]',
  CORAL: 'bg-[#FFECB3]',
  YELLOW: 'bg-[#FFF176]',
  LAVENDER: 'bg-[#F3E5F5]',
};

const btnPill =
  'inline-flex items-center justify-center rounded-full px-7 py-3.5 text-[15px] font-bold transition-all duration-200 hover:-translate-y-0.5';
const btnPillSolid = `${btnPill} bg-brand text-white shadow-[0_8px_20px_rgba(149,39,27,0.3)] hover:bg-brand-700 hover:shadow-[0_12px_28px_rgba(149,39,27,0.35)]`;
const btnPillWhite = `${btnPill} bg-white text-[#0C4A6E] shadow-[0_8px_20px_rgba(12,74,110,0.18)] hover:shadow-[0_12px_28px_rgba(12,74,110,0.24)]`;

function SectionHead({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-[620px] text-center">
      {badge ? (
        <span className="font-display mb-3 inline-block rounded-full bg-brand/10 px-3.5 py-1.5 text-[13px] font-bold text-brand">
          {badge}
        </span>
      ) : null}
      <h2 className="font-display mb-2.5 text-[26px] font-bold text-foreground md:text-[32px]">
        {title}
      </h2>
      {subtitle ? <p className="text-[15px] text-neutral-500">{subtitle}</p> : null}
    </div>
  );
}

export default async function KidsPage() {
  const { config, banners, sections } = await getKidsData();

  const heroImage = config?.heroImageUrl ?? '/kids/hero-kids.png';
  const promoImage = config?.promoImageUrl ?? '/kids/promo-gift.png';

  return (
    <div>
      <section className="relative overflow-hidden bg-[#7DD3FC] pb-24 pt-14 lg:pb-32 lg:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#FFD93D] opacity-80 blur-2xl" />
          <div className="absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
          <div className="animate-kids-float-slow absolute left-[12%] top-10 h-10 w-24 rounded-full bg-white/90 blur-[2px]" />
          <div className="animate-kids-float absolute right-[24%] top-16 h-12 w-28 rounded-full bg-white/80 blur-[2px]" />
          <div className="animate-kids-float absolute bottom-32 left-[4%] h-8 w-20 rounded-full bg-white/70 blur-[2px]" />
          <div className="animate-kids-float absolute bottom-40 right-[8%] h-16 w-16 rounded-full bg-[#4ECDC4]/60" />
          <div className="animate-kids-float-slow absolute bottom-52 left-[34%] h-12 w-12 rounded-full bg-[#FF9A62]/50" />
          <div className="animate-kids-float absolute right-[40%] top-1/4 h-8 w-8 rounded-full bg-[#A78BFA]/50" />
          <svg
            className="animate-kids-float absolute bottom-40 left-[16%] h-9 w-9 text-[#FFD93D]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l2.4 6.2 6.6.4-5.1 4.2 1.7 6.4L12 15.4 6.4 19.2l1.7-6.4L3 8.6l6.6-.4L12 2z" />
          </svg>
          <svg
            className="animate-kids-float-slow absolute right-[10%] top-24 h-7 w-7 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l2.4 6.2 6.6.4-5.1 4.2 1.7 6.4L12 15.4 6.4 19.2l1.7-6.4L3 8.6l6.6-.4L12 2z" />
          </svg>
          <svg
            className="animate-kids-float absolute left-[44%] top-8 h-5 w-5 text-[#FF6B9D]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l2.4 6.2 6.6.4-5.1 4.2 1.7 6.4L12 15.4 6.4 19.2l1.7-6.4L3 8.6l6.6-.4L12 2z" />
          </svg>
        </div>

        <div className="container-prototype relative grid items-center gap-12 lg:grid-cols-[1fr_1.25fr]">
          <div className="max-w-[560px] max-lg:order-2 max-lg:mx-auto max-lg:text-center">
            <span className="font-display mb-5 inline-flex -rotate-2 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand shadow-[0_6px_16px_rgba(12,74,110,0.15)]">
              <svg className="h-4 w-4 text-[#F59E0B]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 6.2 6.6.4-5.1 4.2 1.7 6.4L12 15.4 6.4 19.2l1.7-6.4L3 8.6l6.6-.4L12 2z" />
              </svg>
              {config?.heroBadge ?? 'Selamat Datang, Kecil!'}
            </span>
            <h1 className="font-display mb-4 text-[34px] font-bold leading-[1.12] text-[#0C4A6E] md:text-[48px]">
              {config?.heroTitle ?? 'Dunia Buku yang Ceria dan Penuh Warna'}
            </h1>
            <p className="mb-8 text-[17px] leading-relaxed text-[#0C4A6E]/75">
              {config?.heroDescription ??
                'Temukan ribuan buku edukatif, dongeng seru, dan aktivitas menyenangkan untuk si kecil. Belajar jadi lebih happy!'}
            </p>
            <div className="flex flex-wrap gap-3 max-lg:justify-center">
              <a href="#kategori" className={btnPillSolid}>
                Jelajahi Kategori
              </a>
              <a href="#buku" className={btnPillWhite}>
                Lihat Buku Populer
              </a>
            </div>
          </div>
          <div className="max-lg:order-1">
            <div className="rotate-[1.5deg] transition-transform duration-300 hover:rotate-0">
              {banners.length > 0 ? (
                <BannerCarousel
                  slides={banners.map((banner) => ({
                    imageUrl: banner.imageUrl,
                    linkUrl: banner.linkUrl,
                    alt: 'Buku Anak GenSa Berilmu',
                  }))}
                  className="mx-auto aspect-[4/3] w-full max-w-[640px] rounded-[32px] shadow-[0_24px_56px_rgba(12,74,110,0.3)] ring-8 ring-white/60 max-lg:max-w-[340px]"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt="Anak-anak Muslim membaca buku bersama"
                  className="mx-auto block aspect-[4/3] w-full max-w-[640px] rounded-[32px] object-cover shadow-[0_24px_56px_rgba(12,74,110,0.3)] ring-8 ring-white/60 max-lg:max-w-[340px]"
                />
              )}
            </div>
          </div>
        </div>

        <svg
          aria-hidden="true"
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-[56px] w-full lg:h-[72px]"
        >
          <path
            fill="#FFFDE7"
            d="M0,52 C180,88 420,12 720,42 C1020,72 1260,18 1440,50 L1440,90 L0,90 Z"
          />
        </svg>
      </section>

      <section id="kategori" className="bg-[#FFFDE7] py-16">
        <div className="container-prototype">
          <SectionHead
            badge="Pilih Sesuai Usia"
            title="Kategori Usia"
            subtitle="Buku terbaik untuk setiap tahap tumbuh kembang si kecil"
          />
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            {AGE_GROUPS.map((age) => (
              <Link
                key={age.title}
                href="/products"
                className={`group flex flex-col items-center gap-3 overflow-hidden rounded-lg border-2 bg-white px-3 pb-6 pt-3 text-center shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl ${age.border} ${age.hoverBg}`}
              >
                <span className="aspect-square w-full overflow-hidden rounded-sm bg-neutral-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={age.image}
                    alt={`Kategori ${age.title}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
                <span className="font-display text-lg font-bold text-foreground">{age.title}</span>
                <span className="text-[13px] text-neutral-500">{age.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {sections.map((section, index) => (
        <section
          key={section.id}
          id={index === 0 ? 'buku' : undefined}
          className={`${SECTION_THEMES[section.theme] ?? SECTION_THEMES.MINT} py-16`}
        >
          <div className="container-prototype">
            <SectionHead badge={section.badge} title={section.title} subtitle={section.subtitle} />
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
              {section.products.map((product) => (
                <KidsProductCard
                  key={product.id}
                  product={product}
                  showDiscountTag={section.showDiscountTag}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="bg-[#FFF176] py-16">
        <div className="container-prototype">
          <div className="grid items-center gap-10 rounded-lg bg-white p-10 shadow-lg lg:grid-cols-2">
            <div className="max-lg:text-center">
              <span className="font-display inline-block rounded-full bg-brand/10 px-3.5 py-1.5 text-[13px] font-bold text-brand">
                {config?.promoBadge ?? 'Spesial'}
              </span>
              <h2 className="font-display mb-3 mt-3.5 text-[28px] font-bold text-foreground">
                {config?.promoTitle ?? 'Paket Hadiah Si Kecil'}
              </h2>
              <p className="mb-6 text-[15px] leading-relaxed text-neutral-500">
                {config?.promoDescription ??
                  'Dapatkan bundling buku anak dengan harga spesial dan bonus sticker lucu. Cocok untuk kado ulang tahun atau hadiah prestasi!'}
              </p>
              <Link href="/products" className={btnPillSolid}>
                Lihat Paket Hadiah
              </Link>
            </div>
            <div className="max-lg:order-first">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={promoImage}
                alt="Paket Hadiah Buku Anak"
                className="mx-auto block w-full max-w-[320px] rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[420px] items-center overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kids/cta-kids-bg.png" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-white/55" />
        </div>
        <div className="container-prototype relative">
          <div className="mx-auto max-w-[640px] rounded-lg bg-white/70 px-8 py-12 text-center shadow-lg backdrop-blur-md">
            <h2 className="font-display mb-3 text-[26px] font-bold text-foreground md:text-[30px]">
              Yuk, Jelajahi Dunia Buku Bersama GenSa Berilmu!
            </h2>
            <p className="mb-6 text-base text-neutral-500">
              Setiap buku adalah petualangan baru untuk si kecil. Temukan koleksi lengkapnya
              sekarang.
            </p>
            <Link href="/" className={btnPillSolid}>
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
