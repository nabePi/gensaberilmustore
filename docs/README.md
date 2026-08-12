# Dokumentasi Gensa Berilmu Store

Dokumentasi lengkap aplikasi **Gensa Berilmu Store** — toko buku online + POS (Point of Sale) + program afiliasi milik PT. Generasi Shalahuddin Berilmu.

Dokumen ini disusun berdasarkan kode yang benar-benar ada di repository (bukan rencana/roadmap), sehingga bisa dipakai sebagai acuan untuk onboarding developer baru, QA, maupun handover ke tim lain.

---

## Daftar Isi

| No  | Dokumen                                               | Isi                                                                                                                |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 01  | [Arsitektur & Teknologi](./01-arsitektur.md)          | Tech stack, struktur folder, route group, environment variable, konvensi kode, storage, testing                    |
| 02  | [Role & Hak Akses](./02-role-dan-hak-akses.md)        | Semua role (Guest, BUYER, AFFILIATE, ADMIN), matriks hak akses per halaman & endpoint, cara auth kerja             |
| 03  | [Halaman Publik (Storefront)](./03-halaman-publik.md) | Beranda, Produk, Detail Produk, Buku Anak, Keranjang, Checkout, Pembayaran, Linktree, Auth pages                   |
| 04  | [Halaman Member Area](./04-halaman-member.md)         | Dashboard, Profil, Riwayat Transaksi, Detail Transaksi, Afiliasi, Pilih Produk Afiliasi, Penerima                  |
| 05  | [Halaman Admin Panel](./05-halaman-admin.md)          | 13 menu admin + halaman cetak (packing list & struk POS), elemen UI, aksi, API yang dipanggil                      |
| 06  | [Flow / Alur Bisnis](./06-flow-bisnis.md)             | Semua alur end-to-end + diagram: auth, cart, checkout, payment, status pesanan, afiliasi, voucher, POS, notifikasi |
| 07  | [Fungsi Tabel Database](./07-tabel-database.md)       | Penjelasan per tabel, per kolom, index, aturan cascade, dan alasan desainnya                                       |
| 08  | [ERD (Entity Relationship Diagram)](./08-erd.md)      | Diagram ERD Mermaid (full + per-domain) dan daftar semua relasi                                                    |
| 09  | [Referensi API](./09-api-reference.md)                | Semua endpoint REST: method, auth, request, response, error                                                        |
| —   | [Design System](./design-system.md)                   | Token warna, tipografi, spacing, radius, shadow, breakpoint                                                        |
| —   | [Payment (Midtrans Snap)](./payment.md)               | Detail integrasi payment gateway                                                                                   |

---

## Ringkasan Aplikasi dalam 1 Halaman

### Apa yang dikerjakan aplikasi ini

1. **Toko online (storefront)** — katalog buku dengan pencarian full-text, filter, kategori bertingkat, keranjang untuk guest maupun member, checkout, dan pembayaran online via Midtrans Snap.
2. **Halaman khusus Buku Anak** (`/kids`) dengan hero, kategori usia, dan section produk yang bisa dikonfigurasi admin.
3. **Member area** — profil, riwayat transaksi, daftar alamat penerima tersimpan, dan program afiliasi.
4. **Program afiliasi** — member mendaftar jadi afiliasi, memilih produk untuk dipromosikan, mendapat link tracking (`/r/<kode>`), dan komisi otomatis dihitung saat pesanan lunas.
5. **Admin panel** — kelola pesanan (tabel, Kanban board, fulfillment massal), produk, member, voucher, afiliasi, konfigurasi tampilan homepage/kids, pengaturan toko, dan laporan penjualan.
6. **POS (Point of Sale)** — kasir offline untuk event/pameran buku, langsung berstatus lunas, dengan struk thermal 80mm.
7. **Notifikasi email** transaksional via Resend, dengan antrean + retry berjenjang.

### Peta URL tingkat atas

```
/                          Beranda
/products                  Katalog + filter
/products/[slug]           Detail produk
/kids                      Halaman Buku Anak
/cart                      Keranjang
/checkout                  Checkout
/payment/success           Hasil pembayaran
/login /signup             Autentikasi member
/forgot-password           Minta tautan reset
/reset-password?token=     Set password baru
/l                         Linktree / official links
/r/[code]?p=[slug]         Redirect tracking afiliasi

/member/dashboard          Member area (butuh login)
/member/profil
/member/transaksi
/member/transaksi/[id]
/member/afiliasi
/member/afiliasi/produk
/member/penerima

/admin/login               Login admin
/admin                     Dashboard admin (butuh login ADMIN)
/admin/pesanan             Kelola pesanan
/admin/board               Kanban board pesanan
/admin/fulfillment         Pusat fulfillment (bulk)
/admin/produk              Kelola produk
/admin/member              Kelola member
/admin/pos                 Point of Sale
/admin/afiliasi            Kelola afiliasi & tarif komisi
/admin/voucher             Kelola voucher
/admin/laporan             Laporan penjualan
/admin/laporan-lengkap     Laporan lengkap (analisis)
/admin/konfigurasi         Konfigurasi tampilan Beranda & Buku Anak
/admin/pengaturan          Pengaturan toko

/admin/fulfillment/print?ids=...        Cetak packing list A4
/admin/pos/receipt/[id]/print           Cetak struk POS 80mm

/styleguide                Referensi visual design system
```

### Angka kunci

- **33 tabel** database (PostgreSQL via Prisma) — lihat [07-tabel-database.md](./07-tabel-database.md)
- **15 enum** database
- **36 halaman** (storefront + member + admin + cetak + styleguide)
- **76 file route API** (≈100 kombinasi method + path) — lihat [09-api-reference.md](./09-api-reference.md)
- **13 migrasi** Prisma
- **3 role** aplikasi + 1 pseudo-role (Guest)
- **6 status pesanan** dengan state machine yang divalidasi di server

---

## Cara Mulai (ringkas)

```bash
pnpm install
cp .env.example .env          # isi DATABASE_URL, NEXTAUTH_SECRET, JWT_SECRET
pnpm db:migrate:dev
pnpm db:seed                  # bikin admin, kategori, 20 produk, kota, voucher
pnpm dev
```

Login admin hasil seed: **`admin@gensaberilmu.co.id`** / **`admin123`**.

Panduan setup lengkap ada di [`README.md`](../README.md) root repository.
