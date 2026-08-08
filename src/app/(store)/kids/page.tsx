import Link from 'next/link';

import { ProductCard } from '@/components/product/ProductCard';
import { btnSolid } from '@/lib/styles';
import { getKidsData } from '@/server/kids/data';

const AGE_GROUPS = [
  { title: '0 - 2 Tahun', desc: 'Board book & sensory' },
  { title: '3 - 6 Tahun', desc: 'Dongeng & aktivitas' },
  { title: '7 - 9 Tahun', desc: 'Komik & pengetahuan' },
  { title: '10 - 12 Tahun', desc: 'Novel & inspirasi' },
];

export default async function KidsPage() {
  const { config, popularProducts, discountProducts } = await getKidsData();

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-50 to-white">
        <div className="container-prototype grid items-center gap-8 py-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-brand text-white px-3 py-1 text-xs font-bold">
              {config?.heroBadge ?? 'Selamat Datang, Kecil!'}
            </span>
            <h1 className="mt-4 text-3xl font-bold text-foreground lg:text-4xl">
              {config?.heroTitle ?? 'Dunia Buku yang Ceria dan Penuh Warna'}
            </h1>
            <p className="mt-3 text-neutral-600">
              {config?.heroDescription ??
                'Temukan ribuan buku edukatif, dongeng seru, dan aktivitas menyenangkan untuk si kecil. Belajar jadi lebih happy!'}
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#kategori" className={btnSolid}>
                Jelajahi Kategori
              </a>
              <a
                href="#buku"
                className="inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-medium px-4 py-2 bg-white text-brand border border-brand hover:bg-brand-50 transition-colors"
              >
                Lihat Buku Populer
              </a>
            </div>
          </div>
          <div className="h-56 rounded-2xl bg-brand-100 lg:h-72">
            {config?.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.heroImageUrl}
                alt="Anak-anak membaca buku"
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : null}
          </div>
        </div>
      </section>

      <section id="kategori" className="bg-white py-12">
        <div className="container-prototype">
          <div className="mb-6 text-center">
            <span className="inline-flex rounded-full bg-green/10 text-green px-3 py-1 text-xs font-bold">
              Pilih Sesuai Usia
            </span>
            <h2 className="mt-3 text-2xl font-bold text-foreground">Kategori Usia</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Buku terbaik untuk setiap tahap tumbuh kembang si kecil
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {AGE_GROUPS.map((age) => (
              <Link
                key={age.title}
                href="/products"
                className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-brand-50 p-6 text-center transition-transform hover:-translate-y-1 hover:shadow-md"
              >
                <span className="text-lg font-bold text-brand">{age.title}</span>
                <span className="text-xs text-neutral-500">{age.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="buku" className="bg-green/5 py-12">
        <div className="container-prototype">
          <div className="mb-6 text-center">
            <span className="inline-flex rounded-full bg-brand text-white px-3 py-1 text-xs font-bold">
              Paling Disukai
            </span>
            <h2 className="mt-3 text-2xl font-bold text-foreground">Buku Populer Anak</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Koleksi cerita dan edukasi yang bikin si kecil semangat belajar
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-red/5 py-12">
        <div className="container-prototype">
          <div className="mb-6 text-center">
            <span className="inline-flex rounded-full bg-red text-white px-3 py-1 text-xs font-bold">
              Murah Meriah
            </span>
            <h2 className="mt-3 text-2xl font-bold text-foreground">Buku Diskon</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Dapatkan buku favorit si kecil dengan harga spesial, stok terbatas!
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {discountProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-50 py-12">
        <div className="container-prototype grid items-center gap-8 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-brand text-white px-3 py-1 text-xs font-bold">
              {config?.promoBadge ?? 'Spesial'}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-foreground">
              {config?.promoTitle ?? 'Paket Hadiah Si Kecil'}
            </h2>
            <p className="mt-2 text-neutral-600">
              {config?.promoDescription ??
                'Dapatkan bundling buku anak dengan harga spesial dan bonus sticker lucu. Cocok untuk kado ulang tahun atau hadiah prestasi!'}
            </p>
            <Link href="/products" className={`${btnSolid} mt-4 inline-flex`}>
              Lihat Paket Hadiah
            </Link>
          </div>
          <div className="h-48 rounded-2xl bg-brand-100">
            {config?.promoImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.promoImageUrl}
                alt="Paket hadiah"
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-brand to-brand-700 py-14 text-center text-white">
        <div className="container-prototype">
          <h2 className="text-2xl font-bold">Yuk, Jelajahi Dunia Buku Bersama GenSa Berilmu!</h2>
          <p className="mt-2 text-sm text-white/90">
            Setiap buku adalah petualangan baru untuk si kecil. Temukan koleksi lengkapnya sekarang.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-semibold px-4 py-2 bg-white text-brand hover:bg-neutral-100 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    </div>
  );
}
