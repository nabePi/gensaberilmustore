# 03 — Halaman Publik (Storefront)

Semua halaman di bab ini berada dalam route group `(store)` (kecuali `/l` dan `/r/[code]`) sehingga otomatis mendapat **SiteHeader** dan **SiteFooter**.

---

## 0. Kerangka Bersama: Header & Footer

### `(store)/layout.tsx`

Server Component. Sebelum merender, ia mengambil dua hal secara paralel:

1. Kategori aktif tingkat atas (`parentId = null`, `isActive = true`, urut `position`) → dibentuk jadi pohon (`buildCategoryTree`) untuk dropdown "Kategori".
2. `getSessionUser()` → dikirim ke header sebagai `initialUser` agar tombol Masuk/Daftar vs nama user benar sejak render pertama (tanpa kedip).

Struktur: `<div flex-col min-h-screen>` → `<SiteHeader>` → `<main flex-1>{children}</main>` → `<SiteFooter>`.

### `SiteHeader` (Client Component)

Sticky di atas (`z-40`), tinggi 72px, di dalam `container-prototype`.

| Elemen                 | Perilaku                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Logo                   | `<img>` dari CDN eksternal, link ke `/`                                                                                                                                                                                                    |
| Nav desktop (≥lg)      | Beranda · Produk · Buku Anak · dropdown **Kategori** (muncul saat hover, tiap item → `/products?category=<slug>`)                                                                                                                          |
| Search bar (≥md)       | Input di dalam pill abu-abu. **Autocomplete**: debounce 250ms, minimal 2 karakter, `GET /api/search/suggest?q=`. Dropdown menampilkan thumbnail, judul, harga. Klik di luar menutup dropdown. Submit form → `router.push('/products?q=…')` |
| Ikon keranjang         | Badge jumlah item. Diambil dari `GET /api/cart` saat mount, lalu **di-refresh setiap kali event `gsb:cart-updated`** dibunyikan. Menampilkan `99+` bila > 99                                                                               |
| Area kanan (≥md)       | Bila belum login: tombol **Masuk** (outline) + **Daftar** (solid). Bila sudah login: tombol nama user → dropdown berisi **Dashboard** dan **Keluar**                                                                                       |
| Tombol hamburger (<lg) | Membuka panel mobile: search, nav utama, daftar kategori, lalu tombol Masuk/Daftar atau Dashboard/Keluar                                                                                                                                   |

Logout dari header: `POST /api/auth/logout` → `setUser(null)` → `router.push('/')` + `router.refresh()`.

**Pola sinkronisasi keranjang:** `src/lib/cart-events.ts` mendefinisikan event `gsb:cart-updated`. Setiap komponen yang mengubah keranjang (`ProductCard`, `AddToCartPanel`, halaman `/cart`) memanggil `dispatchCartUpdated()`; header mendengarkannya. Ini menghindari kebutuhan state manager global hanya untuk satu angka badge.

### `SiteFooter` (Server Component)

Grid 4 kolom (2 kolom di `sm`, 1 di mobile):

1. Logo + deskripsi perusahaan (PT. Generasi Shalahuddin Berilmu)
2. **MENU** — Terms & Conditions, Privacy Policy, Tentang Kami, Daftar Reseller (semuanya masih `href="#"`), My Account → `/member/dashboard`
3. **KONTAK KAMI** — WhatsApp `0812-3456-7890`, email `info@gensaberilmu.co.id`, alamat Cibinong Bogor
4. **SOSIAL MEDIA** — 4 ikon SVG inline (X, Instagram, Facebook, YouTube), semuanya masih `href="#"`

Bar bawah: `© 2025 PT. Generasi Shalahuddin Berilmu`.

> Data kontak dan sosial media di footer masih **hardcoded**, belum mengambil dari tabel `StoreSetting`.

---

## 1. Beranda — `/`

| Aspek | Detail                                                 |
| ----- | ------------------------------------------------------ |
| File  | `src/app/(store)/page.tsx`                             |
| Jenis | Server Component (async)                               |
| Data  | `getHomepageData()` dari `src/server/homepage/data.ts` |
| Akses | Publik                                                 |

### Tujuan

Pintu masuk utama toko: menampilkan banner promo, enam carousel produk yang dikurasi admin, dan blok blog.

### Susunan section (atas → bawah)

**1. Hero grid** — `lg:grid-cols-3`

- Kiri (2 kolom, tinggi 360px di desktop): `config.heroMainImageUrl`.
  _Fallback bila `HomepageConfig` belum diisi:_ blok gradien brand dengan teks "Selamat Datang di GenSa Berilmu".
- Kanan (1 kolom): dua banner bertumpuk, `heroSideImage1Url` & `heroSideImage2Url`.
  _Fallback:_ kotak "Promo Spesial" (brand-50) dan "Koleksi Baru" (neutral-50).

**2–7. Enam section produk** — dirender dari array, jadi urutannya pasti:

| Key             | Judul                    | Subjudul                           | Sumber gambar promo                 |
| --------------- | ------------------------ | ---------------------------------- | ----------------------------------- |
| `NEWEST`        | Buku Terbaru             | Rilisan terbaru dari GenSa Berilmu | `sectionNewestPromoImageUrl`        |
| `BESTSELLER`    | Bestseller               | Paling banyak dicari pembaca       | `sectionBestsellerPromoImageUrl`    |
| `INTERNATIONAL` | International Bestseller | Karya penulis dunia pilihan        | `sectionInternationalPromoImageUrl` |
| `KIWARI`        | Keislaman Kiwari         | Wawasan Islam kontemporer          | `sectionKiwariPromoImageUrl`        |
| `KLASIK`        | Rujukan Islam Klasik     | Karya ulama klasik terpercaya      | `sectionKlasikPromoImageUrl`        |
| `OTHERS`        | Lainnya                  | Koleksi pilihan lainnya            | — (tidak punya kolom gambar promo)  |

Tiap section terdiri dari:

- `<SectionHead>` — judul, subjudul, link **Lihat Semua** → `/products?section=<key lowercase>`
  > Catatan: parameter `section` **belum diproses** oleh `/products`; `listProductsQuerySchema` tidak mengenalnya sehingga diabaikan dan halaman menampilkan seluruh produk.
- Banner promo tipis (tinggi 96px) bila URL tersedia
- `<Carousel>` berisi `<ProductCard>` dengan lebar tetap 180px (mobile) / 210px (sm+)
- Bila section kosong: teks "Belum ada produk untuk kategori ini."

**8. Blog Kami** — grid 3 kolom, konten **hardcoded** di konstanta `BLOG_POSTS` (3 artikel dummy, `href="#"`, gambar placeholder abu-abu). Belum ada tabel/CMS untuk blog.

### Logika pemilihan produk per section (penting)

`getSectionProducts(key)` di `src/server/homepage/data.ts`:

```
1. Ambil HomepageSectionProduct WHERE sectionKey = key, ORDER BY position ASC
2. Buang produk dengan isActive = false
3. Bila hasilnya masih ada isinya  → pakai itu
4. Bila kosong (belum dikonfigurasi
   ATAU semua produknya sudah dinonaktifkan)
                                   → FALLBACK: 8 produk aktif terbaru (createdAt DESC)
```

Semua section diambil paralel (`Promise.all`) supaya waktu render tidak berbanding lurus dengan jumlah section.

---

## 2. Katalog Produk — `/products`

| Aspek | Detail                                                   |
| ----- | -------------------------------------------------------- |
| File  | `src/app/(store)/products/page.tsx`                      |
| Jenis | Server Component; filter memakai **form GET** (bukan JS) |
| Data  | `listProducts(filters)` + daftar kategori aktif          |
| Akses | Publik                                                   |

### Parameter query yang didukung

Divalidasi `listProductsQuerySchema`. Query yang tidak valid **tidak menampilkan error** — halaman jatuh ke nilai default (`listProductsQuerySchema.parse({})`).

| Param      | Tipe / nilai                                         | Default  |
| ---------- | ---------------------------------------------------- | -------- |
| `page`     | integer ≥ 1                                          | `1`      |
| `limit`    | integer 1–60                                         | `20`     |
| `q`        | teks pencarian (full-text)                           | —        |
| `category` | slug kategori                                        | —        |
| `tag`      | slug tag (didukung API, **tidak ada UI-nya**)        | —        |
| `minPrice` | integer ≥ 0                                          | —        |
| `maxPrice` | integer ≥ 0                                          | —        |
| `inStock`  | `'true'` \| `'false'`                                | —        |
| `sort`     | `newest` \| `price_asc` \| `price_desc` \| `popular` | `newest` |

Ada validasi silang: `minPrice` tidak boleh lebih besar dari `maxPrice`.

### Layout

- **Judul** — `Hasil untuk "<q>"` bila ada pencarian, jika tidak `Semua Produk`. Di bawahnya: `<total> produk ditemukan`.
- **Mobile (<lg)** — `<details>` "Filter & Sortir" yang bisa dibuka, berisi form filter yang sama.
- **Desktop (≥lg)** — sidebar 240px `sticky top-4` berisi form filter; sisanya grid produk.
- **Grid produk** — 2 kolom (mobile) / 3 (sm) / 4 (lg), memakai `<ProductCard>`.
- **Empty state** — "Tidak ada produk yang cocok dengan filter ini." + tombol **Reset Filter**.
- **Paginasi** — hanya muncul bila `totalPages > 1`: `Sebelumnya` · `Halaman X dari Y` · `Berikutnya`. Link dibangun oleh `buildQueryString()` yang mempertahankan seluruh filter aktif dan hanya mengganti `page`.

### Isi form filter (`FilterForm`)

`<form method="get" action="/products">` — artinya filter bekerja **tanpa JavaScript**.

1. **Kategori** — radio: "Semua Kategori" + satu radio per kategori aktif (flat, semua level).
2. **Rentang Harga** — dua input number `minPrice` dan `maxPrice`.
3. **Ketersediaan** — checkbox "Hanya yang tersedia" (`inStock=true`).
4. **Urutkan** — select: Terbaru / Harga Terendah / Harga Tertinggi / Terpopuler.
5. Tombol **Terapkan Filter** (submit) dan link **Reset** (kembali ke `/products`, mempertahankan `q` bila ada).

`q` disisipkan sebagai `<input type="hidden">` agar pencarian tidak hilang saat filter diterapkan.

### Cara pencarian & pengurutan bekerja (`src/server/products/list.ts`)

- Selalu memfilter `isActive: true`.
- `q` → `buildTsQuery(q)`: setiap kata dibersihkan dari karakter non-alfanumerik lalu digabung dengan `&` (artinya **semua** kata harus cocok — AND, bukan OR). Dicocokkan ke `title`, `author`, `description` via `{ search: tsQuery }` (fitur full-text Prisma Postgres).
- `sort=popular` → `orderBy: { orderItems: { _count: 'desc' } }` — popularitas = banyaknya baris `OrderItem`, bukan jumlah kuantitas terjual.
- `minPrice`/`maxPrice` dibandingkan terhadap **`finalPrice`** (harga setelah diskon), bukan `price`.

---

## 3. Detail Produk — `/products/[slug]`

| Aspek | Detail                                                 |
| ----- | ------------------------------------------------------ |
| File  | `src/app/(store)/products/[slug]/page.tsx`             |
| Jenis | Server Component + `generateMetadata`                  |
| Data  | `getProductDetail(slug)` — dibungkus `cache()` React   |
| Akses | Publik. Produk `isActive = false` → `notFound()` (404) |

### SEO

`generateMetadata` menghasilkan `title: "<judul> - GenSa Berilmu"` dan `description` = 160 karakter pertama deskripsi. Bila produk tidak ada: `"Produk Tidak Ditemukan - GenSa Berilmu"`.

Karena `getProductDetail` di-`cache()`, `generateMetadata` dan komponen halaman berbagi satu query database dalam request yang sama.

### Layout

**Breadcrumb** — Beranda / Produk / `<judul produk>`.

**Grid 2 kolom (`lg:grid-cols-2`)**

Kiri — `<ProductGallery>` (Client Component):

- Gambar utama `aspect-square`, `object-cover`
- Baris thumbnail 64×64 (hanya muncul bila gambar > 1); thumbnail aktif diberi border brand
- Tanpa gambar: kotak abu-abu bertulis "Tanpa Gambar"
- Urutan gambar: `isPrimary DESC, position ASC`

Kanan — informasi & aksi:

1. Badge ribbon bila ada (`NEW` navy · `BEST` brand · `DISCOUNT` merah). Teksnya `ribbonText`, atau nama enum bila kosong.
2. `<h1>` judul · subjudul (bila ada) · "Oleh `<author>`"
3. Blok harga: `finalPrice` besar warna brand. Bila `discountPercent > 0`, tampil juga harga asli dicoret + badge merah `-<n>%`
4. Info stok: "Stok tersedia: **N**" atau teks merah "Stok Habis"
5. `<AddToCartPanel>` — lihat di bawah
6. Kartu **Spesifikasi** — grid 2 kolom: SKU, Halaman, Imprint (`publisher`, `-` bila kosong), Tahun, Berat (`<n> gr`), Jenis Cover (dilabeli Soft Cover / Hard Cover / E-Book)

**Section "Detail Produk"** — `<ProductTabs>` (Client Component), 4 tab:

| Tab        | Sumber           | Bila kosong                                                                                  |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------- |
| Deskripsi  | `description`    | selalu ada (kolom wajib)                                                                     |
| Daftar Isi | `tocText`        | "Daftar isi belum tersedia untuk produk ini."                                                |
| Keunggulan | `highlightsText` | "Keunggulan produk belum tersedia."                                                          |
| Ulasan     | —                | Selalu placeholder: "Belum ada ulasan…". **Fitur ulasan belum ada** (tidak ada tabel Review) |

`tocText` dan `highlightsText` diperlakukan sebagai teks multi-baris: dipecah per `\n`, di-trim, baris kosong dibuang, lalu dirender sebagai `<ul>` bullet. Deskripsi dirender apa adanya dengan `whitespace-pre-line`.

Layout tab: sidebar tombol vertikal di `lg`, baris tombol horizontal yang bisa di-scroll di mobile.

**Section "Produk Terkait"** — carousel, hanya muncul bila ada isinya.

Cara memilih produk terkait (`src/server/products/detail.ts`): ambil sampai **8** produk aktif yang memiliki **minimal satu kategori yang sama** dengan produk ini, kecuali produk ini sendiri, urut `createdAt DESC`. Bila produk tidak punya kategori, daftar terkait kosong.

### `<AddToCartPanel>`

Stepper kuantitas (`-` / angka / `+`) dengan batas bawah 1 dan **batas atas = `stock`**, lalu tombol utama. Status tombol: `Tambah ke Keranjang` → `Menambahkan...` → `Ditambahkan ke Keranjang!` (kembali normal setelah 1,5s). Bila `stock <= 0` tombol disabled bertuliskan **Stok Habis**. Bila gagal: teks merah "Gagal menambahkan produk. Coba lagi."

Aksi: `POST /api/cart/items` dengan `{ productId, quantity }` → `dispatchCartUpdated()`.

### `<ProductCard>` (dipakai di beranda, katalog, kids, produk terkait)

Kartu vertikal: area gambar tinggi 176px (badge ribbon di kiri atas), judul (max 2 baris), nama penulis, harga final + harga coret bila diskon, lalu tombol kecil **Tambah ke Keranjang** yang menambahkan **1** item langsung dari kartu. Gambar dan judul keduanya link ke `/products/<slug>`. Bila `stock` diketahui dan ≤ 0, tombol jadi **Stok Habis** (disabled).

---

## 4. Buku Anak — `/kids`

| Aspek | Detail                                         |
| ----- | ---------------------------------------------- |
| File  | `src/app/(store)/kids/page.tsx`                |
| Jenis | Server Component                               |
| Data  | `getKidsData()` dari `src/server/kids/data.ts` |
| Akses | Publik                                         |

### Tujuan

Halaman kategori buku anak dengan nuansa lebih ceria, seluruh teks hero & promo bisa diubah admin.

### Susunan section

| #   | Section                  | Latar                      | Isi                                                                                                                                                                                                                                     |
| --- | ------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Hero**                 | gradien `brand-50` → putih | Badge, `<h1>`, deskripsi, dua CTA anchor (**Jelajahi Kategori** → `#kategori`, **Lihat Buku Populer** → `#buku`), gambar hero                                                                                                           |
| 2   | **Kategori Usia**        | putih                      | Grid 4 kolom (2 di mobile) — kartu **hardcoded**: 0-2 Tahun (Board book & sensory), 3-6 Tahun (Dongeng & aktivitas), 7-9 Tahun (Komik & pengetahuan), 10-12 Tahun (Novel & inspirasi). Semua kartu link ke `/products` **tanpa filter** |
| 3   | **Buku Populer Anak**    | `green/5`                  | Badge "Paling Disukai" + grid `<ProductCard>` dari section `POPULAR`                                                                                                                                                                    |
| 4   | **Buku Diskon**          | `red/5`                    | Badge "Murah Meriah" + grid `<ProductCard>` dari section `DISCOUNT`                                                                                                                                                                     |
| 5   | **Promo / Paket Hadiah** | `brand-50`                 | Badge, judul, deskripsi, gambar — semuanya dari `KidsConfig`. CTA **Lihat Paket Hadiah** → `/products`                                                                                                                                  |
| 6   | **CTA penutup**          | gradien brand → brand-700  | "Yuk, Jelajahi Dunia Buku Bersama GenSa Berilmu!" + tombol **Kembali ke Beranda**                                                                                                                                                       |

### Fallback teks

Semua field `KidsConfig` punya fallback hardcoded, jadi halaman tetap tampil rapi sebelum admin mengisi konfigurasi:

| Field              | Fallback                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `heroBadge`        | "Selamat Datang, Kecil!"                                                                 |
| `heroTitle`        | "Dunia Buku yang Ceria dan Penuh Warna"                                                  |
| `heroDescription`  | "Temukan ribuan buku edukatif, dongeng seru, dan aktivitas menyenangkan untuk si kecil…" |
| `heroImageUrl`     | tidak dirender (kotak `brand-100` kosong)                                                |
| `promoBadge`       | "Spesial"                                                                                |
| `promoTitle`       | "Paket Hadiah Si Kecil"                                                                  |
| `promoDescription` | "Dapatkan bundling buku anak dengan harga spesial dan bonus sticker lucu…"               |
| `promoImageUrl`    | tidak dirender                                                                           |

Pemilihan produk section `POPULAR` / `DISCOUNT` memakai logika + fallback yang identik dengan beranda (8 produk aktif terbaru bila belum dikonfigurasi).

> Kartu "Kategori Usia" **belum** terhubung ke subkategori `buku-anak-0-2` … `buku-anak-10-12` yang dibuat oleh seed. Menghubungkannya hanya perlu mengubah `href` menjadi `/products?category=buku-anak-3-6` dan seterusnya.

---

## 5. Keranjang — `/cart`

| Aspek | Detail                          |
| ----- | ------------------------------- |
| File  | `src/app/(store)/cart/page.tsx` |
| Jenis | Client Component                |
| Data  | `GET /api/cart` saat mount      |
| Akses | Publik (guest & member)         |

### Tiga state halaman

1. **Memuat** — "Memuat keranjang..."
2. **Kosong** — judul "Keranjang Anda Kosong", teks ajakan, tombol **Mulai Belanja** → `/products`
3. **Berisi** — layout `lg:grid-cols-[1fr_320px]`

### Kolom kiri — daftar item

Satu kartu per item berisi: thumbnail (link ke produk), judul (link), harga satuan (`priceSnapshot`), stepper kuantitas, tombol **Hapus** merah, dan total baris (`lineTotal`) di kanan.

Tombol `-` disabled saat `quantity <= 1` (untuk mengurangi sampai nol, pakai Hapus). Selama request berjalan, hanya kontrol item tersebut yang disabled (`pendingItemId`).

### Penanda masalah item (`flag`)

Dihitung server di `serializeCart()`:

| `flag`          | Kondisi                                               | Pesan di UI                                                          |
| --------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `out_of_stock`  | produk `isActive = false` **atau** `stock < quantity` | "Stok tidak cukup untuk jumlah ini. Kurangi jumlah atau hapus item." |
| `price_changed` | `product.finalPrice !== item.priceSnapshot`           | "Harga produk ini telah berubah sejak ditambahkan ke keranjang."     |
| `null`          | aman                                                  | —                                                                    |

`out_of_stock` diprioritaskan di atas `price_changed`.

### Kolom kanan — Ringkasan Belanja

- `Subtotal (<n> barang)` → `formatCurrency(subtotal)`
- Bila ada item `out_of_stock`: kotak merah "Selesaikan masalah stok pada keranjang Anda sebelum melanjutkan ke pembayaran." dan **tombol checkout dinonaktifkan** (`pointer-events-none opacity-50` + `aria-disabled`)
- Tombol **Lanjutkan ke Pembayaran** → `/checkout`
- Tombol **Lanjutkan Belanja** → `/products`

> `price_changed` bersifat informatif saja dan **tidak** memblokir checkout. Harga yang dipakai saat pembuatan pesanan diambil ulang dari `product.finalPrice` di server, bukan dari `priceSnapshot`, sehingga tidak ada risiko harga lama tembus.

### Bagaimana keranjang guest dikenali

`resolveCart(request)` di `src/server/cart/cart.ts`:

```
Ada sesi member?
 ├─ Ya  → cart.upsert({ where: { userId } })          (satu keranjang tetap per member)
 └─ Tidak
      ├─ Cookie gsb_cart_guest ada & cart-nya ditemukan → pakai itu
      └─ Selain itu → buat Cart baru dengan guestToken = randomUUID()
                       dan kirim Set-Cookie gsb_cart_guest (30 hari, httpOnly)
```

Setiap route keranjang memakai helper `withGuestCookie()` agar cookie baru selalu ikut terkirim, termasuk pada respons error.

---

## 6. Checkout — `/checkout`

| Aspek | Detail                                   |
| ----- | ---------------------------------------- |
| File  | `src/app/(store)/checkout/page.tsx`      |
| Jenis | Client Component (react-hook-form + Zod) |
| Akses | Publik — **guest checkout didukung**     |

### Bootstrap (saat mount)

Tiga request paralel: `GET /api/cart`, `GET /api/shipping/cities`, `GET /api/auth/session`.

- **Keranjang kosong → `router.replace('/cart')`** (halaman checkout tidak bisa dibuka tanpa item).
- Bila ada sesi, ditambah `GET /api/member/receivers`. Bila member punya alamat tersimpan, mode otomatis di-set `receiver` dan alamat default (atau yang pertama) langsung terpilih.
- Script Snap Midtrans dimuat `strategy="afterInteractive"` dengan `data-client-key={NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}`. Kegagalan load dicatat di `snapFailedRef`.

Selama bootstrap belum selesai: "Memuat checkout...".

### Dua mode pengisian penerima

| Mode       | Kapan                                                    | Field                                                                |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| `receiver` | member login & punya ≥1 `Receiver`                       | Daftar radio alamat tersimpan (label · nama, telepon, alamat + kota) |
| `manual`   | guest, atau member tanpa alamat, atau memilih ganti mode | Nama Penerima, Nomor Telepon, Email, Kota (select), Alamat Lengkap   |

Tautan pengalih di kanan atas kartu: "Gunakan alamat baru" ⇄ "Gunakan alamat tersimpan" (hanya tampil bila member punya alamat tersimpan).

Field **Catatan (opsional)** selalu ada, maksimal 500 karakter.

### Validasi klien (`checkoutSchema` + `superRefine`)

- Mode `receiver` → `receiverId` wajib ("Pilih alamat penerima").
- Mode `manual` → `receiverName`, `receiverPhone`, `receiverEmail` (format email), `receiverAddress`, `cityId` semuanya wajib, masing-masing dengan pesan Indonesia.
- `paymentMethod` wajib.

### Metode pembayaran

Radio: **Transfer Bank** (`BANK_TRANSFER`) · **E-Wallet** (`EWALLET`) · **QRIS** (`QRIS`). Default `BANK_TRANSFER`.

Metode `POS_CASH` / `POS_TRANSFER` / `POS_QRIS` sengaja tidak ada di sini — itu khusus kanal POS.

### Panel Ringkasan Pesanan (kanan)

1. Daftar item ringkas: `<judul> x<qty>` … `<lineTotal>`
2. **Input voucher** — input teks (otomatis di-uppercase) + tombol **Terapkan**.
   - `POST /api/vouchers/validate` dengan `{ code, subtotal, channel: 'ONLINE' }`
   - Valid → teks hijau "Voucher `<KODE>` berhasil diterapkan.", input dikunci, tombol berubah jadi **Hapus**
   - Tidak valid → pesan merah sesuai `reason`:

   | `reason`               | Pesan                                                            |
   | ---------------------- | ---------------------------------------------------------------- |
   | `NOT_FOUND`            | Kode voucher tidak ditemukan.                                    |
   | `INACTIVE`             | Voucher ini sudah tidak aktif.                                   |
   | `NOT_STARTED`          | Voucher ini belum berlaku.                                       |
   | `EXPIRED`              | Voucher ini sudah kedaluwarsa.                                   |
   | `WRONG_CHANNEL`        | Voucher ini tidak berlaku untuk transaksi online.                |
   | `MIN_PURCHASE_NOT_MET` | Belanja Anda belum memenuhi minimum pembelian untuk voucher ini. |
   | `QUOTA_EXCEEDED`       | Kuota voucher ini sudah habis.                                   |
   | `USER_LIMIT_REACHED`   | Anda sudah mencapai batas penggunaan voucher ini.                |

3. Rincian biaya: **Subtotal** · **Ongkos Kirim** · **Diskon Voucher** (hijau, hanya bila > 0) · **Total**
4. Tombol **Bayar Sekarang** (`Memproses...` saat submit) dan link **Kembali ke Keranjang**

### Perhitungan ongkir di klien

- Mode `receiver` → `receivers.find(id).city.shippingCost`
- Mode `manual` → `cities.find(cityId).shippingCost`
- `total = max(0, subtotal + shippingCost - diskon)`

Semua angka ini **dihitung ulang di server** saat pembuatan pesanan; nilai klien hanya untuk tampilan.

### Alur submit

```
1. Baca cookie gsb_aff (kode afiliasi) dari document.cookie — bila ada
2. POST /api/orders
     mode receiver → { useReceiverId, note?, paymentMethod, voucherCode?, affiliateCode? }
     mode manual   → { receiverName, receiverPhone, receiverEmail, receiverAddress,
                       cityId, note?, paymentMethod, voucherCode?, affiliateCode? }
   Gagal → tampilkan data.error di panel, submit dibuka lagi
3. POST /api/payment/create  { orderId }
     Gagal → langsung redirect ke /payment/success?orderId=… (pesanan sudah ada, hanya
             sesi pembayaran yang gagal dibuat)
4. Sukses → { snapToken, redirectUrl }
     Snap gagal load / window.snap tidak ada → window.location.href = redirectUrl
     Snap tersedia → window.snap.pay(snapToken, { onSuccess, onPending, onError, onClose })
                     KEEMPAT callback mengarah ke /payment/success?orderId=…
```

Keempat callback diarahkan ke halaman yang sama secara sengaja: halaman itulah yang membaca status pesanan **dari database** dan menampilkan pesan yang tepat, sehingga tampilan tidak bergantung pada callback klien yang bisa gagal.

---

## 7. Hasil Pembayaran — `/payment/success?orderId=<uuid>`

| Aspek | Detail                                     |
| ----- | ------------------------------------------ |
| File  | `src/app/(store)/payment/success/page.tsx` |
| Jenis | Server Component                           |
| Akses | Lihat aturan kepemilikan di bawah          |

### Aturan kepemilikan (`getVisibleOrder`)

```
orderId tidak ada di query      → notFound() 404
Order tidak ditemukan           → notFound() 404
Order.userId === null (guest)   → boleh dilihat siapa pun yang tahu orderId (UUID)
Order.userId !== null           → wajib ada sesi DAN session.user.id === order.userId
```

Untuk pesanan guest, UUID pesanan berfungsi sebagai kapabilitas — hanya pembeli yang mengetahuinya sesaat setelah checkout.

### Tiga variasi tampilan berdasarkan `order.status`

| Status                                          | Tampilan                                                                                                                                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AWAITING_PAYMENT`                              | Ikon jam brand · "Menunggu Pembayaran" · "Pesanan Anda telah dibuat dan sedang menunggu konfirmasi pembayaran." · kartu No. Pesanan + Total · tombol **Kembali ke Beranda**             |
| `CANCELLED`                                     | "Pesanan Dibatalkan" · "Pesanan `<nomor>` telah dibatalkan." · tombol **Kembali ke Beranda**                                                                                            |
| lainnya (`PAID`/`PACKED`/`SHIPPED`/`COMPLETED`) | Ikon centang hijau · "Pembayaran Berhasil!" · ucapan terima kasih · kartu No. Pesanan + Total Pembayaran · tombol **Kembali ke Beranda** + **Lihat Pesanan Saya** (`/member/dashboard`) |

> Halaman ini **tidak** melakukan polling. Bila webhook Midtrans belum masuk saat halaman dibuka, status masih `AWAITING_PAYMENT` dan pengguna diminta menunggu. Endpoint `GET /api/payment/status/[orderId]` — yang secara aktif menanyakan status ke Midtrans dan menerapkannya — tersedia tetapi belum dipakai oleh halaman ini.

---

## 8. Halaman Autentikasi

Keempatnya memakai kartu terpusat `max-w-md` di dalam `container-prototype`, react-hook-form + Zod, dan pesan error per-field dalam bahasa Indonesia.

### 8.1 `/login`

- Judul "Selamat Datang Kembali"
- Field: Email, Password
- Checkbox **Ingat saya** (→ sesi 30 hari) · link **Lupa password?** → `/forgot-password`
- Tombol **Masuk** (`Memproses...` saat submit)
- Link "Daftar sekarang" → `/signup`
- `POST /api/auth/login`. Sukses → redirect ke `?next=<path>` bila diawali `/`, jika tidak ke `/member/dashboard`; lalu `router.refresh()`
- Dibungkus `<Suspense>` karena memakai `useSearchParams`

**Catatan:** halaman login **tidak** memanggil `POST /api/cart/merge`, sehingga keranjang guest tidak otomatis digabung ke akun setelah login. Endpoint merge-nya sudah tersedia dan berfungsi, tinggal dipanggil.

### 8.2 `/signup`

- Judul "Buat Akun Baru"
- Field: Nama Lengkap, Email, Nomor WhatsApp, Password, Konfirmasi Password
- Aturan validasi:
  - Nama minimal 3 karakter
  - Email format valid
  - WhatsApp harus cocok regex `^(?:\+62|62|0)8[1-9][0-9]{6,10}$`
  - Password minimal 8 karakter **dan** mengandung huruf **dan** mengandung angka
  - Konfirmasi harus sama
- `POST /api/auth/register` → langsung membuat sesi (auto-login) → redirect `?next=` atau `/member/dashboard`
- Email duplikat → `409 { "error": "Email sudah terdaftar" }`

### 8.3 `/forgot-password`

- Field: Email
- `POST /api/auth/forgot-password`
- Setelah submit, form **diganti** kotak hijau berisi pesan dari server — selalu generik: "Jika email terdaftar, tautan reset dikirim". Tidak ada cara membedakan email terdaftar atau tidak (anti-enumerasi).
- Link "Kembali ke halaman masuk"

### 8.4 `/reset-password?token=<raw token>`

- Tanpa `token` di URL → kotak merah "Tautan reset password tidak valid atau sudah kedaluwarsa.", form tidak dirender
- Field: Password Baru, Konfirmasi Password (aturan sama dengan signup)
- `POST /api/auth/reset-password` dengan `{ token, password, confirmPassword }`
- Sukses → `router.push('/login')` (pengguna harus login ulang; semua sesi lama sudah dicabut server)
- Token invalid/expired/terpakai → `400 { "error": "Token invalid/expired" }`
- Dibungkus `<Suspense>`

---

## 9. Linktree — `/l`

| Aspek  | Detail                                                       |
| ------ | ------------------------------------------------------------ |
| File   | `src/app/l/page.tsx`                                         |
| Jenis  | Client Component                                             |
| Layout | Di **luar** route group `(store)` — tanpa header/footer toko |
| Akses  | Publik                                                       |

Halaman gaya Linktree: kartu `max-w-md` terpusat di atas latar gradien `brand-50` → putih.

- **Brand** — avatar bulat berinisial "GB", nama "GenSa Berilmu", tagline "Official Website Penerbit GenSa Berilmu"
- **Dua tombol aksi:**
  - **Simpan Kontak** — membuat file vCard 3.0 di sisi klien (`Blob` + `URL.createObjectURL`) dan mengunduhnya sebagai `gensa-berilmu.vcf`. Isi vCard di-hardcode (telepon `+6281234567890`, email `info@gensaberilmu.co.id`)
  - **Bagikan Kontak** — `navigator.share()` bila tersedia, jika tidak fallback menyalin URL ke clipboard
- **9 tautan** (masing-masing dengan ikon SVG inline):

  | Label                                      | Target                        |
  | ------------------------------------------ | ----------------------------- |
  | Beranda                                    | `/`                           |
  | Toko Online                                | `/products`                   |
  | **Order Cepat Via Website** (gaya primary) | `/products`                   |
  | Pemesanan Via WhatsApp                     | `https://wa.me/6281234567890` |
  | Mau Jadi Reseller Dropship?                | `#` (belum diisi)             |
  | Undang Ustadz Edgar Hamas                  | `#` (belum diisi)             |
  | Mau Jadi Marketing Affiliate Produk Gensa? | `#` (belum diisi)             |
  | Official Instagram                         | `#` (belum diisi)             |
  | Official YouTube                           | `#` (belum diisi)             |

Tautan eksternal (`http…`) otomatis mendapat `target="_blank"` + `rel="noopener noreferrer"`.

---

## 10. Redirect Tracking Afiliasi — `/r/[code]`

| Aspek | Detail                              |
| ----- | ----------------------------------- |
| File  | `src/app/r/[code]/route.ts`         |
| Jenis | Route handler `GET` (bukan halaman) |
| Akses | Publik                              |

URL yang dibagikan afiliasi: `https://domain/r/<kode>?p=<slug-produk>`.

```
1. Tentukan tujuan redirect:
     ada ?p= → /products/<slug>
     tidak   → /
2. Cari AffiliateProfile berdasarkan code
     tidak ada, atau isActive = false → redirect saja, tanpa mencatat apa pun & tanpa cookie
3. cookieId = cookie gsb_cid yang sudah ada, atau randomUUID() baru
4. Bila ada ?p=, cari productId dari slug (boleh null)
5. INSERT AffiliateClick { affiliateProfileId, productId, sourceUrl: header Referer,
                           ipAddress (x-forwarded-for), userAgent, cookieId }
     — dibungkus .catch() sehingga kegagalan pencatatan TIDAK memblokir redirect
6. Set cookie:
     gsb_cid = cookieId   (365 hari, httpOnly: true)
     gsb_aff = code       (30 hari,  httpOnly: false ← agar terbaca halaman checkout)
7. Redirect (302)
```

Prinsip desain: **tracking tidak boleh menghalangi pengalaman pengguna**. Semua kegagalan (profil tidak ada, insert gagal) tetap berujung pada redirect.

Atribusi berakhir di halaman checkout, yang membaca `gsb_aff` dan mengirimkannya sebagai `affiliateCode` saat membuat pesanan. Lihat [06-flow-bisnis.md](./06-flow-bisnis.md#7-flow-afiliasi) untuk alurnya sampai komisi terbentuk.

---

## 11. Styleguide — `/styleguide`

| Aspek | Detail                                     |
| ----- | ------------------------------------------ |
| File  | `src/app/(styleguide)/styleguide/page.tsx` |
| Akses | Publik (tetapi ber-`noindex`)              |

Halaman referensi internal: memperlihatkan seluruh token design system (palet warna, skala tipografi, spacing, radius, shadow) beserta contoh komponen. Dipakai saat mengembangkan UI agar tetap konsisten. Detail tokennya ada di [design-system.md](./design-system.md).
