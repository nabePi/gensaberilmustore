# 01 — Arsitektur & Teknologi

## 1. Tech Stack

| Lapisan         | Teknologi                                           | Catatan                                                              |
| --------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| Framework       | **Next.js 16.3** (App Router)                       | Server Components default, Client Component ditandai `'use client'`  |
| Bahasa          | **TypeScript 5** (strict)                           | `pnpm typecheck` = `tsc --noEmit`                                    |
| UI              | **React 19.2** + **Tailwind CSS v4**                | Token desain di `src/app/globals.css` via `@theme`                   |
| Database        | **PostgreSQL** + **Prisma 6.19**                    | Preview feature `fullTextSearchPostgres` aktif                       |
| Autentikasi     | **Custom session** — JWT (`jose`) + tabel `Session` | Bukan NextAuth. Cookie httpOnly, password bcrypt cost 12             |
| Validasi        | **Zod 3**                                           | Dipakai di API route, form (`@hookform/resolvers`), dan `src/env.ts` |
| Form            | **react-hook-form 7**                               | + `zodResolver`                                                      |
| Pembayaran      | **Midtrans Snap** (`midtrans-client`)               | Sandbox default, webhook signature SHA512                            |
| Email           | **Resend**                                          | Template HTML inline di `src/server/notify/templates/`               |
| Object storage  | **Cloudflare R2** (S3-compatible) atau disk lokal   | Dipilih via `STORAGE_PROVIDER`                                       |
| Drag & drop     | **@dnd-kit/core**                                   | Dipakai hanya di Kanban board admin                                  |
| Testing         | **Vitest 4**                                        | `pnpm test` (`--run --passWithNoTests`)                              |
| Package manager | **pnpm 11.20**                                      | Node >= 20                                                           |

### Yang **tidak** dipakai (sengaja)

- Tidak ada state manager global (Redux/Zustand). Data diambil per halaman via `fetch` ke API route atau langsung Prisma di Server Component.
- Tidak ada library chart. Semua grafik di laporan adalah `div` dengan `height`/`width` persen (bar chart CSS).
- Tidak ada library komponen (shadcn/MUI). Komponen dibuat manual, style di-share via konstanta string Tailwind di `src/lib/styles.ts`.
- WhatsApp/Fonnte belum diintegrasikan (lihat catatan di `src/server/notify/transport.ts`).

---

## 2. Struktur Folder

```
prisma/
  schema.prisma          Sumber kebenaran skema database (33 model, 15 enum)
  migrations/            13 migrasi SQL
  seed.ts                Seed idempoten: admin, 6+4 kategori, 20 produk, 24 kota, 2 voucher

prototype/               Prototipe HTML/CSS/JS statis (referensi desain, bukan kode produksi)
  DOKUMEN-HALAMAN.md     Dokumen review 29 halaman prototipe
  style.css              Sumber design system yang diekstrak ke globals.css

public/uploads/          Target upload saat STORAGE_PROVIDER=local
  products/<productId>/
  avatars/<userId>/
  misc/

src/
  middleware.ts          Guard route /admin*, /api/admin*, /member*, /api/member*
  env.ts                 Validasi environment variable (Zod), gagal = app tidak boot

  app/
    layout.tsx           Root layout: font Source Sans 3, <html lang="id">
    globals.css          Token Tailwind v4 (@theme)

    (store)/             Route group storefront — pakai SiteHeader + SiteFooter
      layout.tsx         Ambil kategori aktif + session user untuk header
      page.tsx           Beranda
      products/          Katalog & detail
      kids/              Halaman Buku Anak
      cart/ checkout/ payment/success/
      login/ signup/ forgot-password/ reset-password/
      member/            Member area (nested layout dengan sidebar)

    (styleguide)/styleguide/   Halaman referensi visual design system

    admin/
      login/             Halaman login admin (di luar (dashboard) supaya tanpa sidebar)
      (dashboard)/       Route group admin — layout dengan AdminSidebar
      fulfillment/print/ Halaman cetak packing list (tanpa sidebar)
      pos/receipt/[id]/print/   Halaman cetak struk POS (tanpa sidebar)

    api/                 Semua REST endpoint (route handler)
    l/                   Halaman Linktree
    r/[code]/            Route handler redirect tracking afiliasi

  components/
    layout/              SiteHeader, SiteFooter
    ui/                  Carousel, SectionHead
    product/             ProductCard, ProductGallery, ProductTabs, AddToCartPanel
    member/              MemberSidebar, MemberSessionContext
    admin/               AdminSidebar, AdminModal, AdminSessionContext,
                         OrderDetailModal, ProductFormModal, VoucherFormModal, PrintTrigger

  lib/                   Utilitas yang boleh dipakai di client
    db.ts                Singleton PrismaClient (aman untuk HMR)
    format.ts            formatCurrency (Intl id-ID, IDR, tanpa desimal)
    order-status.ts      Label Indonesia + class badge + daftar tab filter status
    styles.ts            btnSolid, btnOutline, btnSolidSm, inputBase, cardBase, badgeBase
    cart-events.ts       Custom event 'gsb:cart-updated' untuk sinkron badge keranjang

  server/                Kode server-only (jangan diimpor dari Client Component)
    auth.ts              getSession, getAdminSession, requireUser, withAuth, error classes
    auth/session.ts      createSession, verifySessionToken, opsi cookie
    auth/password.ts     hashPassword, verifyPassword, DUMMY_PASSWORD_HASH
    auth/rate-limit.ts   Rate limiter in-memory (login, admin login, forgot password)
    http/client-ip.ts    Baca x-forwarded-for
    products/            list, detail, pricing, slug, text-search, schema
    cart/                resolveCart, merge guest→member, serializeCart, schema
    orders/              schema, serialize, status (state machine + side effect),
                         order-number, voucher (adapter validasi)
    payment/             midtrans (Snap/CoreApi/signature), apply-status, schema
    pos/schema.ts        Validasi transaksi POS
    vouchers/            validate (aturan + hitung diskon), schema
    affiliate/           code (generator kode), cookie, schema
    notify/              dispatch (kirim + retry), transport (Resend), templates/, schema
    reports/             summary, laporan, laporan-lengkap, top-products, sales-by-day,
                         revenue-by-month, revenue-by-category, payment-methods,
                         pos-vs-online, orders-by-status, period, csv
    homepage/data.ts     Agregasi 6 section beranda + fallback
    kids/data.ts         Agregasi 2 section halaman kids + fallback
    member/schema.ts     Validasi profil & penerima
    settings/schema.ts   Validasi pengaturan toko
    shipping/schema.ts   Validasi kota & ongkir
    categories/schema.ts Validasi kategori
    config/schema.ts     Validasi konfigurasi homepage & kids
    uploads/             image (magic byte sniffing), storage (router local/R2), r2

  types/                 Deklarasi tipe tambahan (mis. midtrans-client.d.ts)
```

### Aturan penting struktur

- **`src/server/**` tidak boleh diimpor dari Client Component.** Satu pengecualian yang disengaja: `ProductFormModal.tsx` mengimpor konstanta `COVER_TYPES` dari `@/server/products/schema` (konstanta murni tanpa side effect).
- Halaman cetak (`/admin/fulfillment/print`, `/admin/pos/receipt/[id]/print`) sengaja ditaruh di **luar** route group `(dashboard)` agar tidak ikut sidebar & padding, sehingga hasil cetak bersih.
- Route group `(store)` dan `(styleguide)` tidak muncul di URL — hanya untuk berbagi layout.

---

## 3. Route Group & Layout Bertingkat

```
RootLayout (src/app/layout.tsx)
│  <html lang="id"> + font Source Sans 3 + globals.css
│
├── (store)/layout.tsx ── SiteHeader (kategori + user) + <main> + SiteFooter
│     ├── page.tsx, products, kids, cart, checkout, payment, login, signup, ...
│     └── member/layout.tsx ── redirect ke /login bila tanpa sesi
│            MemberSessionProvider + MemberSidebar (desktop) / <details> (mobile)
│              └── dashboard, profil, transaksi, transaksi/[id], afiliasi, afiliasi/produk, penerima
│
├── admin/login/page.tsx ── halaman penuh, redirect ke /admin bila sudah login admin
├── admin/(dashboard)/layout.tsx ── redirect ke /admin/login bila bukan ADMIN
│     AdminSessionProvider + AdminSidebar + banner peringatan kredensial default
│       └── 13 halaman admin
├── admin/fulfillment/print/page.tsx ── layout minimal untuk cetak A4
├── admin/pos/receipt/[id]/print/page.tsx ── layout minimal untuk cetak 80mm
│
├── (styleguide)/styleguide/page.tsx
├── l/page.tsx (Linktree)
└── api/** dan r/[code]/route.ts (route handler, tanpa layout)
```

Perhatikan bahwa proteksi terjadi **dua kali** dan itu memang disengaja:

1. `src/middleware.ts` — memblokir request sebelum mencapai halaman (redirect / 401 JSON).
2. Layout server (`member/layout.tsx`, `admin/(dashboard)/layout.tsx`) — `redirect()` sebagai jaring pengaman jika middleware tidak jalan (mis. saat pengembangan atau perubahan matcher).

---

## 4. Pola Data Fetching

Ada tiga pola yang dipakai, dan pemilihannya konsisten:

| Pola                                        | Dipakai di                                                                | Contoh                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Server Component → Prisma langsung**      | Halaman yang kontennya statis per-request dan butuh SEO/render awal cepat | Beranda, `/products`, `/products/[slug]`, `/kids`, `/member/dashboard`, `/admin`, halaman cetak |
| **Client Component → `fetch` ke API route** | Halaman dengan filter/paging/aksi interaktif                              | `/cart`, `/checkout`, `/member/transaksi`, semua halaman admin interaktif                       |
| **Route handler → Prisma**                  | Semua `src/app/api/**`                                                    | `GET /api/admin/orders`                                                                         |

Tidak ada Server Action yang dipakai — semua mutasi lewat route handler REST. Ini membuat kontrak antara frontend dan backend eksplisit dan mudah diuji.

### Caching

- `GET /api/shipping/cities` mengirim header `Cache-Control: public, max-age=300` (daftar kota jarang berubah).
- `getProductDetail` dibungkus `cache()` dari React sehingga `generateMetadata` dan komponen halaman berbagi satu query dalam satu request.
- `getReportsSummary` memakai cache in-memory per proses, TTL 60 detik, di-key per periode.

Selain itu tidak ada caching eksplisit; halaman admin selalu membaca data segar.

---

## 5. Environment Variable

Divalidasi di `src/env.ts` memakai Zod. **Jika validasi gagal, aplikasi tidak boot** dan menampilkan daftar variabel yang salah. Cek manual: `pnpm env:check`.

### Wajib

| Variabel                             | Aturan                                  | Fungsi                                          |
| ------------------------------------ | --------------------------------------- | ----------------------------------------------- |
| `NODE_ENV`                           | `development` \| `test` \| `production` | Menentukan cookie `secure`, izin reset pesanan  |
| `DATABASE_URL`                       | harus mulai `postgresql://`             | Koneksi Prisma                                  |
| `NEXTAUTH_SECRET` atau `AUTH_SECRET` | min 32 karakter (salah satu wajib ada)  | Secret auth (disimpan sebagai `env.authSecret`) |
| `JWT_SECRET`                         | min 32 karakter                         | Kunci HS256 untuk menandatangani token sesi     |

### Opsional (fitur mati kalau kosong)

| Variabel                                                                                  | Fitur yang terpengaruh                                                                                                       |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`                    | Pembuatan transaksi Snap & verifikasi webhook                                                                                |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`                                                         | `data-client-key` pada script Snap di halaman checkout                                                                       |
| `RESEND_API_KEY`                                                                          | Pengiriman email. Tanpa ini semua notifikasi jadi `FAILED` dengan pesan `RESEND_API_KEY belum diatur`                        |
| `NOTIFY_FROM_EMAIL`                                                                       | Alamat pengirim; default `no-reply@gensaberilmustore.com`                                                                    |
| `CRON_SECRET`                                                                             | Bila di-set, `POST /api/cron/retry-notifications` mewajibkan `Authorization: Bearer <secret>`. Bila kosong, endpoint terbuka |
| `STORAGE_PROVIDER` (`local` default \| `r2`)                                              | Lokasi penyimpanan gambar                                                                                                    |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | **Wajib semuanya** bila `STORAGE_PROVIDER=r2` (divalidasi silang)                                                            |
| `FONNTE_TOKEN`                                                                            | Placeholder — kanal WhatsApp belum diimplementasikan                                                                         |
| `SENTRY_DSN`                                                                              | Placeholder — belum dipakai di kode                                                                                          |

---

## 6. Penyimpanan Gambar

`src/server/uploads/storage.ts` bertindak sebagai router: kalau `STORAGE_PROVIDER=r2` upload ke R2, kalau tidak tulis ke disk lokal.

| Jenis         | Fungsi             | Key R2 / path lokal                 | Batas ukuran | Batas jumlah     |
| ------------- | ------------------ | ----------------------------------- | ------------ | ---------------- |
| Gambar produk | `saveProductImage` | `products/<productId>/<uuid>.<ext>` | 5 MB         | 8 per produk     |
| Avatar member | `saveAvatarImage`  | `avatars/<userId>/<uuid>.<ext>`     | 2 MB         | 1 (menimpa lama) |
| Gambar umum   | `saveGenericImage` | `misc/<uuid>.<ext>`                 | 5 MB         | —                |

Validasi tipe file **tidak** mempercayai `Content-Type` dari klien. `sniffImageMime()` membaca magic byte:

- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47`
- WebP: `RIFF....WEBP`

Ekstensi yang ditulis ke disk diambil dari hasil sniffing, bukan dari nama file. Penghapusan file bersifat _best-effort_ — file yang sudah hilang tidak dianggap error.

---

## 7. Konvensi Kode & Quality Gate

### Format respons API

Semua route handler konsisten:

```jsonc
// Sukses
{ ...data }                                   // 200 / 201
{ "items": [...], "total": 0, "page": 1, "limit": 20 }   // list + paging
// (204 No Content untuk DELETE yang berhasil)

// Gagal validasi (Zod)
{ "error": "Validasi gagal", "issues": { "field": ["pesan"] } }   // 400

// Gagal lain
{ "error": "Pesan dalam bahasa Indonesia" }   // 401 / 403 / 404 / 409 / 429
```

Semua pesan error yang dilihat pengguna ditulis **dalam bahasa Indonesia**.

### Git hooks (Husky)

- **pre-commit** → `lint-staged` (`eslint --fix` + `prettier --write` pada file staged) lalu `pnpm typecheck`.
- **commit-msg** → Conventional Commits (`feat:`, `fix(auth):`, `docs:`, …).
- `--no-verify` / `HUSKY=0` **dilarang** untuk kontributor.

### Script

| Perintah               | Fungsi                                     |
| ---------------------- | ------------------------------------------ |
| `pnpm dev`             | Dev server                                 |
| `pnpm build` / `start` | Build & jalankan production                |
| `pnpm lint`            | ESLint                                     |
| `pnpm typecheck`       | `tsc --noEmit`                             |
| `pnpm format`          | Prettier seluruh repo                      |
| `pnpm test`            | Vitest                                     |
| `pnpm env:check`       | Validasi environment tanpa menjalankan app |
| `pnpm db:generate`     | Generate Prisma Client                     |
| `pnpm db:migrate:dev`  | Buat + apply migrasi (development)         |
| `pnpm db:migrate`      | `prisma migrate deploy` (production)       |
| `pnpm db:studio`       | Prisma Studio                              |
| `pnpm db:seed`         | Jalankan `prisma/seed.ts`                  |

### Testing

Test berdampingan dengan sumbernya (`*.test.ts`), dijalankan Vitest. Yang diuji terutama logika murni dan route handler: `auth.test.ts`, `products/pricing.test.ts`, `products/slug.test.ts`, `products/text-search.test.ts`, `notify/dispatch.test.ts`, `notify/transport.test.ts`, `middleware.test.ts`, serta beberapa route API.

---

## 8. Data Seed (`pnpm db:seed`)

Seed bersifat **idempoten** (memakai `upsert`), jadi aman dijalankan berulang.

| Yang dibuat             | Detail                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1 user ADMIN            | `admin@gensaberilmu.co.id` / `admin123` (bcrypt cost 10 di seed), nama "Admin Gensa Berilmu"                        |
| 6 kategori induk        | Buku Terbaru, Bestseller, International Bestseller, Keislaman Kiwari, Rujukan Islam Klasik, Buku Anak               |
| 4 subkategori Buku Anak | 0-2 Tahun, 3-6 Tahun, 7-9 Tahun, 10-12 Tahun (parent = Buku Anak)                                                   |
| 20 produk               | SKU `GSI-001`…`GSI-020`, slug otomatis, 1 gambar primary per produk (URL CDN eksternal), relasi kategori            |
| Tarif komisi afiliasi   | `AffiliateCommissionRate` untuk produk-produk seed                                                                  |
| 24 kota                 | Ongkir Rp9.000 (Jakarta) sampai Rp40.000 (Kupang)                                                                   |
| 2 voucher               | `WELCOME10` — 10% diskon, min belanja Rp20.000, kanal ALL · `POSGROSIR` — potong Rp15.000, min Rp100.000, kanal POS |

**Yang tidak diseed** (harus diisi manual lewat admin panel setelah instalasi):

- `StoreSetting` (id=1) — nama toko, email, telepon, alamat, ongkir default, rekening bank, persen komisi default. Diisi di **Admin → Pengaturan**.
- `HomepageConfig` (id=1) dan pilihan produk per section beranda. Diisi di **Admin → Konfigurasi → tab Beranda**.
- `KidsConfig` (id=1) dan pilihan produk section Buku Anak. Diisi di **Admin → Konfigurasi → tab Buku Anak**.

Sampai diisi, halaman beranda/kids tetap tampil dengan **fallback**: banner memakai placeholder gradien dan setiap section menampilkan 8 produk aktif terbaru. `defaultCommissionPercent` yang belum ada berarti produk tanpa `AffiliateCommissionRate` tidak menghasilkan komisi.

---

## 9. Migrasi Database

13 migrasi, dinamai per domain sehingga urutan pembangunan skema terbaca jelas:

```
20260806073859_init_users
20260806084045_init_products
20260806102128_init_cart
20260807043420_init_orders
20260807065431_init_receivers_cities
20260807065905_init_affiliate
20260807071051_init_store_settings
20260807071450_init_pos
20260807071823_init_notifications
20260807072257_init_vouchers
20260810044833_init_payment_sessions
20260810051129_add_default_commission_percent
20260810063037_add_notification_retry_fields
```

⚠️ Database development bersifat **bersama**. Jangan menjalankan `prisma migrate reset` terhadapnya.
