import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: { absolute: 'GenSa Kids — Petualangan Kecil, Cerita Besar' },
  description:
    'Temukan buku hijaiyah, komik petualangan, dan boardgame edukatif GenSa Kids. Teman belajar, bermain, dan bertumbuh bersama si kecil.',
  alternates: { canonical: '/kids' },
};

export const viewport: Viewport = {
  themeColor: '#fff9ed',
};

export default function KidsPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900;1000&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/kids/styles.css" />

      <a className="skip" href="#main">
        Langsung ke konten
      </a>
      <div className="announcement">
        Dunia kecil, mimpi besar. Yuk, tumbuh bersama GenSa Kids! <span aria-hidden="true">✦</span>
      </div>
      <header className="header wrap">
        <a className="brand" href="#" aria-label="GenSa Kids, beranda">
          <img
            src="/kids/assets/logo.webp"
            alt="GenSa Kids — Remake Shalahuddin Generation"
            width="1400"
            height="497"
          />
        </a>
        <nav aria-label="Navigasi utama">
          <a href="#koleksi">Koleksi Kids</a>
          <a href="#cerita">Intip Keseruannya</a>
          <a className="parent-link" href="https://store.gensaberilmu.com">
            GenSa Berilmu <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <span className="eyebrow">
              <span aria-hidden="true">✦</span> SELAMAT DATANG DI GENSA KIDS
            </span>
            <h1>
              Remake <span className="green">Shalahuddin</span>
              <br />
              <span className="orange">Generation!</span>
              <span className="heading-star" aria-hidden="true">
                ✳
              </span>
            </h1>
            <p>Menjadi teman yang mewarnai keseharian generasi belia pecinta sejarah dan ilmu~</p>
            <a className="button primary" href="#koleksi">
              Yuk, jelajahi koleksinya! <span aria-hidden="true">↗</span>
            </a>
            <div className="hero-note">
              <span className="mini-stars" aria-hidden="true">
                ✦ ✦ ✦
              </span>{' '}
              Untuk momen seru bersama si kecil
            </div>
          </div>
          <div className="hero-art">
            <span className="sticker sticker-top">Baca. Main. Bertumbuh.</span>
            <img
              src="/kids/assets/reading-together-photo.webp"
              alt="Dua anak membaca buku bersama"
              width="1024"
              height="765"
              fetchPriority="high"
            />
            <span className="sticker sticker-bottom">
              <span aria-hidden="true">♡</span> Kecil-kecil, penuh rasa ingin tahu!
            </span>
          </div>
        </section>
        <div className="ribbon" aria-label="Belajar, bermain, dan bertumbuh">
          <div>
            MEMBACA JADI SERU <span>✦</span> BERMAIN SAMBIL BELAJAR <span>✦</span> KISAH PENUH MAKNA{' '}
            <span>✦</span> TUMBUH BERSAMA <span>✦</span>
          </div>
        </div>
        <section id="koleksi" className="collection wrap">
          <div className="section-top">
            <div>
              <span className="eyebrow">TEMAN BARU SI KECIL</span>
              <h2>
                Satu koleksi, <span className="purple">banyak cerita.</span>
              </h2>
            </div>
          </div>
          <div className="products">
            <article className="product peach">
              <div className="product-image">
                <span className="category">01 / BOARD BOOK</span>
                <img
                  src="/kids/assets/hijaiyah.webp"
                  alt="Katalog boardbook Belajar Hijaiyah dalam Sirah Nabawiyah"
                  width="600"
                  height="600"
                  loading="lazy"
                />
              </div>
              <div className="product-body">
                <span className="product-kicker">KENAL HURUF, KENAL KISAH</span>
                <h3>
                  Belajar Hijaiyah dalam
                  <br />
                  Sirah Nabawiyah
                </h3>
                <p>
                  Kenalkan huruf hijaiyah lewat kisah sirah yang menyenangkan dan ilustrasi penuh
                  warna.
                </p>
                <div className="tags">
                  <span>58 halaman</span>
                  <span>Boardbook</span>
                  <span>15 × 15 cm</span>
                </div>
                <a
                  className="product-cta"
                  href="https://store.gensaberilmu.com/products/boardbook-belajar-hijaiyah-dalam-sejarah-nabawiyah"
                >
                  Kenalan dengan bukunya <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
            <article className="product lavender">
              <div className="product-image">
                <span className="category">02 / KOMIK ISLAMI</span>
                <img
                  src="/kids/assets/ziyad.webp"
                  alt="Katalog komik The Chronicles of Ziyad"
                  width="1000"
                  height="1000"
                  loading="lazy"
                />
              </div>
              <div className="product-body">
                <span className="product-kicker">BUKA BUKU, MULAI PETUALANGAN</span>
                <h3>
                  The Chronicles
                  <br />
                  of Ziyad
                </h3>
                <p>
                  Ikuti kisah Ziyad, kesatria, dan brigade rahasia dalam komik yang penuh
                  petualangan.
                </p>
                <div className="tags">
                  <span>108 halaman</span>
                  <span>Full colour</span>
                  <span>Soft cover</span>
                </div>
                <a
                  className="product-cta"
                  href="https://store.gensaberilmu.com/products/komik-the-chronicles-of-ziyad-gsi-230"
                >
                  Ikuti petualangan Ziyad <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
            <article className="product mint">
              <div className="product-image">
                <span className="category">03 / BOARD GAME</span>
                <img
                  src="/kids/assets/palestine.webp"
                  alt="Katalog boardgame Treasure of Palestine"
                  width="600"
                  height="600"
                  loading="lazy"
                />
              </div>
              <div className="product-body">
                <span className="product-kicker">WAKTUNYA MAIN BARENG!</span>
                <h3>
                  Treasure
                  <br />
                  of Palestine
                </h3>
                <p>
                  Jelajahi Palestina lewat permainan edukatif. Buka kotaknya dan nikmati petualangan
                  bersama!
                </p>
                <div className="tags">
                  <span>4 pion karakter</span>
                  <span>30 kartu permainan</span>
                </div>
                <a
                  className="product-cta"
                  href="https://store.gensaberilmu.com/products/boardgame-treasure-of-palestine"
                >
                  Jelajahi permainannya <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          </div>
          <p className="catalog-note">
            Detail, harga terbaru, dan pembelian tersedia di halaman masing-masing produk.
          </p>
        </section>
        <section id="cerita" className="peek-section">
          <div className="wrap peek">
            <div className="peek-copy">
              <span className="eyebrow">COBA INTIP DULU, YUK!</span>
              <h2>
                Bukan sekadar
                <br />
                membuka <span className="green">halaman.</span>
              </h2>
              <p>
                Ada huruf untuk dikenali, tokoh untuk ditemui, dan cerita untuk dibicarakan bersama.
                Temukan keseruannya dari dalam buku.
              </p>
              <span className="hand-note">
                Klik gambarnya untuk lihat lebih dekat <span aria-hidden="true">↗</span>
              </span>
            </div>
            <div className="preview-cards">
              <button
                className="preview-card preview-one"
                data-preview="/kids/assets/hijaiyah-preview.webp"
                data-title="Intip Belajar Hijaiyah dalam Sirah Nabawiyah"
                aria-haspopup="dialog"
              >
                <img
                  src="/kids/assets/hijaiyah-preview.webp"
                  alt="Perbesar preview isi buku Hijaiyah"
                  width="999"
                  height="1000"
                  loading="lazy"
                />
                <span>
                  Kenalan dengan huruf hijaiyah <b aria-hidden="true">↗</b>
                </span>
              </button>
              <button
                className="preview-card preview-two"
                data-preview="/kids/assets/ziyad-preview.webp"
                data-title="Intip The Chronicles of Ziyad"
                aria-haspopup="dialog"
              >
                <img
                  src="/kids/assets/ziyad-preview.webp"
                  alt="Perbesar preview isi komik Ziyad"
                  width="999"
                  height="1000"
                  loading="lazy"
                />
                <span>
                  Masuk ke dunia Ziyad <b aria-hidden="true">↗</b>
                </span>
              </button>
            </div>
          </div>
        </section>
        <section className="brand-story wrap">
          <div className="story-heading">
            <span className="eyebrow">BELAJAR HARI INI, BERMAKNA ESOK HARI</span>
            <h2>
              Temani tumbuhnya <span className="orange">generasi berilmu.</span>
            </h2>
            <p>Buku, cerita, dan permainan untuk mengisi waktu bersama dengan hal-hal bermakna.</p>
          </div>
          <img
            className="supplied-banner"
            src="/kids/assets/hero-banner.webp"
            alt="GenSa Kids, koleksi buku dan permainan edukatif bersama anak-anak yang sedang membaca"
            width="1200"
            height="600"
            loading="lazy"
          />
          <a className="button primary" href="#koleksi">
            Pilih teman belajar si kecil <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <footer>
        <div className="wrap footer-inner">
          <a className="brand" href="#" aria-label="Kembali ke atas">
            <img
              src="/kids/assets/logo.webp"
              alt="GenSa Kids"
              width="1400"
              height="497"
              loading="lazy"
            />
          </a>
          <p>
            Bagian dari GenSa Berilmu.
            <br />
            Menumbuhkan cinta ilmu, sejak kecil.
          </p>
          <a href="https://store.gensaberilmu.com">
            Kunjungi GenSa Berilmu <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="wrap footer-bottom">
          <span>
            © <span id="year">2026</span> GenSa Kids
          </span>
          <span>
            Dibuat untuk rasa ingin tahu yang tak ada habisnya. <span aria-hidden="true">♡</span>
          </span>
        </div>
      </footer>
      <dialog id="preview-dialog" aria-labelledby="preview-title">
        <div className="dialog-header">
          <h2 id="preview-title">Preview buku</h2>
          <button className="close-dialog" aria-label="Tutup preview">
            ×
          </button>
        </div>
        <img id="preview-image" alt="" />
      </dialog>
      <Script src="/kids/script.js" strategy="afterInteractive" />
    </>
  );
}
