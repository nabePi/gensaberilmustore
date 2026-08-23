import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description:
    'GenSa Berilmu adalah toko buku Islam dan produk keluarga muslim milik PT. Generasi Shalahuddin Berilmu, berbasis di Depok, Jawa Barat.',
  alternates: { canonical: '/about' },
};

const VALUES = [
  {
    title: 'Kualitas Produk',
    desc: 'Setiap buku dan produk yang kami jual melalui proses kurasi agar sesuai dengan nilai-nilai keislaman dan layak untuk keluarga.',
  },
  {
    title: 'Edukasi Berkelanjutan',
    desc: 'Kami percaya belajar adalah proses seumur hidup, sehingga koleksi kami mencakup semua usia, dari board book anak hingga rujukan klasik ulama.',
  },
  {
    title: 'Pelayanan yang Amanah',
    desc: 'Pesanan diproses dan dikirim dengan teliti, serta status pesanan dapat dipantau langsung oleh pelanggan melalui halaman akun.',
  },
  {
    title: 'Bermanfaat untuk Sesama',
    desc: 'Melalui program afiliasi, kami membuka peluang bagi siapa pun untuk turut berdakwah sekaligus mendapatkan penghasilan tambahan.',
  },
];

export default function AboutPage() {
  return (
    <div className="container-prototype max-w-4xl py-10">
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">
        GenSa Berilmu, Teman Belajar Keluarga Muslim
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
        GenSa Berilmu adalah toko buku daring resmi milik{' '}
        <strong className="text-foreground">PT. Generasi Shalahuddin Berilmu</strong>, berdiri
        dengan satu tujuan sederhana: memudahkan keluarga muslim Indonesia mendapatkan buku dan
        produk edukasi berkualitas, dari buku bacaan dewasa, rujukan keislaman, hingga koleksi buku
        anak yang mendidik dan menghibur.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-foreground">Cerita Kami</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
          Berangkat dari keresahan sulitnya menemukan bacaan Islami yang mudah diakses dan
          terpercaya di satu tempat, GenSa Berilmu hadir sebagai etalase daring yang menghimpun
          buku-buku pilihan, mulai dari karya ulama klasik, buku pengembangan diri berlandaskan
          nilai Islam, hingga buku anak bergambar yang menanamkan akhlak sejak dini. Berbasis di
          Depok, Jawa Barat, kami terus berupaya menjangkau pembaca di seluruh Indonesia melalui
          layanan pengiriman ke seluruh kota.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-foreground">Visi &amp; Misi</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-bold text-brand">Visi</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Menjadi rujukan utama keluarga muslim Indonesia dalam mendapatkan bacaan dan produk
              edukasi yang berkualitas dan sesuai nilai-nilai keislaman.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-bold text-brand">Misi</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-600">
              <li>Menghadirkan koleksi buku Islam dan buku anak yang terkurasi dan terpercaya.</li>
              <li>Memberikan pengalaman berbelanja yang mudah, aman, dan transparan.</li>
              <li>
                Membuka peluang usaha bagi masyarakat melalui program afiliasi untuk turut
                menyebarkan bacaan yang bermanfaat.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-foreground">Apa yang Kami Tawarkan</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-brand-50 p-5">
            <h3 className="text-sm font-bold text-foreground">Buku Islam Dewasa</h3>
            <p className="mt-1.5 text-sm text-neutral-600">
              Rujukan klasik, pengembangan diri, hingga buku-buku kontemporer yang relevan untuk
              kehidupan sehari-hari.
            </p>
          </div>
          <div className="rounded-lg bg-brand-50 p-5">
            <h3 className="text-sm font-bold text-foreground">Buku Anak</h3>
            <p className="mt-1.5 text-sm text-neutral-600">
              Board book, dongeng, komik, hingga novel inspiratif yang dikelompokkan berdasarkan
              kelompok usia si kecil.
            </p>
          </div>
          <div className="rounded-lg bg-brand-50 p-5">
            <h3 className="text-sm font-bold text-foreground">Produk Keluarga Muslim</h3>
            <p className="mt-1.5 text-sm text-neutral-600">
              Perlengkapan dan produk pendukung lain yang mendukung tumbuh kembang keluarga muslim.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-foreground">Nilai-Nilai Kami</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div key={value.title} className="flex gap-3 rounded-lg border border-neutral-200 p-4">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
              <div>
                <h3 className="text-sm font-bold text-foreground">{value.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{value.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-neutral-200 bg-[#f4f5f7] p-6">
        <h2 className="text-lg font-bold text-foreground">Hubungi Kami</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Ada pertanyaan seputar produk atau pesanan Anda? Tim kami siap membantu.
        </p>
        <div className="mt-4 flex flex-col gap-2 text-sm text-neutral-600 sm:flex-row sm:gap-6">
          <a href="https://wa.me/6281384804494" className="hover:text-brand">
            WhatsApp: 0813-8480-4494
          </a>
          <a href="mailto:info@gensaberilmu.com" className="hover:text-brand">
            Email: info@gensaberilmu.com
          </a>
          <span>
            Jalan Margonda Raya Gang H. Fatimah Bawah Rt 02/014 No. 8, Kemiri Muka, Beji, Kota
            Depok, Jawa Barat 16423
          </span>
        </div>
        <Link
          href="/products"
          className="mt-5 inline-flex items-center justify-center rounded-sm bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          Jelajahi Produk Kami
        </Link>
      </section>
    </div>
  );
}
