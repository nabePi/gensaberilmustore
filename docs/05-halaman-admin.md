# 05 — Halaman Admin Panel

Admin panel terdiri dari **13 menu** di sidebar, ditambah 1 halaman login dan 2 halaman cetak.

Semua halaman `/admin/*` dilindungi ganda: `src/middleware.ts` dan pemeriksaan `getAdminSessionUser()` di layout/page. Yang bukan `role === 'ADMIN'` di-redirect ke `/admin/login`.

---

## 0. Kerangka Admin

### `admin/(dashboard)/layout.tsx` (Server Component)

```
const user = await getAdminSessionUser()
if (!user || user.role !== 'ADMIN') redirect('/admin/login')
```

Lalu merender `<AdminSessionProvider>` + banner peringatan + sidebar mobile (`<details>`) + sidebar desktop sticky + konten.

**Banner kredensial default.** Bila `user.email === 'admin@gensaberilmu.co.id'`, muncul kotak kuning di atas setiap halaman admin:

> Anda masih menggunakan kredensial admin default. Segera ganti password di halaman Pengaturan.

> ⚠️ Catatan jujur: halaman **Pengaturan** saat ini **tidak** memiliki form ganti password (kolom Nama/Email Admin bersifat read-only). Untuk menghilangkan banner ini, email admin perlu diubah langsung di database, atau alur "Lupa password" dipakai untuk mengganti password. Ini adalah celah antara pesan UI dan fitur yang tersedia.

### `AdminSidebar` (Client Component)

Struktur sama dengan `MemberSidebar` (kartu profil + nav + tombol Keluar), dengan 13 item:

| #   | Label           | Href                     | Fungsi singkat                                |
| --- | --------------- | ------------------------ | --------------------------------------------- |
| 1   | Dashboard       | `/admin`                 | Ringkasan toko + 5 pesanan terbaru            |
| 2   | Pesanan         | `/admin/pesanan`         | Tabel pesanan + filter + export CSV           |
| 3   | Board           | `/admin/board`           | Kanban drag-and-drop ubah status              |
| 4   | Fulfillment     | `/admin/fulfillment`     | Proses massal + cetak packing list            |
| 5   | Produk          | `/admin/produk`          | CRUD produk                                   |
| 6   | Member          | `/admin/member`          | Daftar member, ubah role, reset password      |
| 7   | POS             | `/admin/pos`             | Kasir offline                                 |
| 8   | Afiliasi        | `/admin/afiliasi`        | Performa afiliasi + tarif komisi per produk   |
| 9   | Voucher         | `/admin/voucher`         | CRUD voucher + statistik pemakaian            |
| 10  | Laporan         | `/admin/laporan`         | Laporan ringkas per periode                   |
| 11  | Laporan Lengkap | `/admin/laporan-lengkap` | Analisis mendalam per tahun/bulan/sumber      |
| 12  | Konfigurasi     | `/admin/konfigurasi`     | Isi banner & pilihan buku Beranda + Buku Anak |
| 13  | Pengaturan      | `/admin/pengaturan`      | Data toko, rekening, ongkir, data storage     |

Tombol **Keluar** → `POST /api/auth/admin/logout` → `router.push('/admin/login')` + `refresh()`.

### `AdminModal` (komponen bersama)

Overlay `bg-black/50` dengan scroll halaman, kartu putih yang lebarnya diatur prop `widthClassName` (`max-w-lg` default, `max-w-xl`, `max-w-2xl`, `max-w-3xl`). Header berisi judul + tombol tutup `×`; body `max-h-[75vh] overflow-y-auto`. Punya `role="dialog"` dan `aria-modal="true"`.

Dipakai oleh: OrderDetailModal, ProductFormModal, VoucherFormModal, modal detail member, modal detail/hapus voucher, modal tarif komisi afiliasi, modal detail afiliasi, modal struk POS, konfirmasi hapus produk.

---

## 1. Login Admin — `/admin/login`

| Aspek | Detail                                                                     |
| ----- | -------------------------------------------------------------------------- |
| File  | `src/app/admin/login/page.tsx` + `src/components/admin/AdminLoginForm.tsx` |
| Jenis | Server Component (guard) + Client Component (form)                         |

Berada di luar route group `(dashboard)` sehingga tampil sebagai halaman penuh tanpa sidebar.

- Bila sudah ada sesi admin valid → `redirect('/admin')`
- `src/middleware.ts` meng-whitelist path `/admin/login` supaya halaman login bisa dirender untuk guest; tanpa pengecualian ini matcher `/admin/:path*` menyebabkan redirect loop (`ERR_TOO_MANY_REDIRECTS`).
- Latar `bg-neutral-50`, kartu terpusat `max-w-sm` dengan shadow
- Judul **Admin Panel**, subjudul "Masuk ke panel manajemen GenSa Berilmu"
- Field Email + Password, keduanya wajib (Zod)
- Tombol **Masuk** (`Memproses...` saat submit)
- Hint di bawah form: "Gunakan email **admin@gensaberilmu.co.id** untuk demo"
- `POST /api/auth/admin/login` → sukses → `router.push('/admin')` + `refresh()`
- Rate limit **5 percobaan / 15 menit / IP** → `429` "Terlalu banyak percobaan login, coba lagi nanti"
- Pesan gagal selalu generik: "Email atau password salah"

---

## 2. Dashboard Admin — `/admin`

| Aspek | Detail                                                    |
| ----- | --------------------------------------------------------- |
| File  | `src/app/admin/(dashboard)/page.tsx`                      |
| Jenis | Server Component                                          |
| Data  | `getAdminSummary()` + 5 pesanan terbaru (Prisma langsung) |

**4 kartu statistik** (dari `getAdminSummary`, tanpa filter periode — seluruh riwayat):

| Kartu         | Perhitungan                                                              |
| ------------- | ------------------------------------------------------------------------ |
| Total Pesanan | `count(Order)` — **termasuk** yang dibatalkan                            |
| Pendapatan    | `sum(Order.total)` untuk status `PAID`, `PACKED`, `SHIPPED`, `COMPLETED` |
| Total Member  | `count(User WHERE role != 'ADMIN')`                                      |
| Total Produk  | `count(Product WHERE isActive = true)`                                   |

**Panel "Pesanan Terbaru"** — 5 pesanan terakhir (`createdAt DESC`), tiap baris adalah link ke `/admin/pesanan?openOrder=<id>` sehingga modal detail langsung terbuka di halaman Pesanan. Isi baris: nomor pesanan, `nama penerima · tanggal`, badge status, total.

Bila belum ada pesanan: "Belum ada pesanan masuk."

**4 quick card** — Kelola Pesanan · Kelola Produk · Lihat Member · Lihat Laporan.

---

## 3. Kelola Pesanan — `/admin/pesanan`

| Aspek | Detail                                       |
| ----- | -------------------------------------------- |
| File  | `src/app/admin/(dashboard)/pesanan/page.tsx` |
| Jenis | Client Component                             |
| Data  | `GET /api/admin/orders`                      |

### Header

`<h1>Kelola Pesanan</h1>` + "`<total>` pesanan ditemukan", dan tombol **Export CSV** di kanan.

Tombol Export mengarah ke `GET /api/admin/orders/export?<filter aktif>` sebagai `<a href>` biasa (unduhan langsung dari browser, bukan `fetch`). Filter yang sedang aktif ikut terkirim, jadi CSV mencerminkan apa yang terlihat di tabel (tanpa batas paging; maksimal 10.000 baris).

### Filter

**Tab status** — pill scrollable dari `ORDER_STATUS_FILTER_TABS` (Semua + 6 status). Ganti tab me-reset `page` ke 1.

**Tiga input** (`sm:grid-cols-3`):

| Kontrol       | Param      | Yang dicari                                                                 |
| ------------- | ---------- | --------------------------------------------------------------------------- |
| search        | `q`        | `orderNumber`, `receiverName`, `receiverPhone` (contains, case-insensitive) |
| date (dari)   | `dateFrom` | `createdAt >= dateFrom`                                                     |
| date (sampai) | `dateTo`   | `createdAt <= dateTo`                                                       |

Semua perubahan me-reset `page` ke 1 dan memicu fetch ulang.

### Tabel

Kolom: **No. Pesanan** · **Penerima** (nama + telepon kecil) · **Tanggal** · **Sumber** (Online/POS) · **Status** (badge) · **Total** (kanan).

Seluruh baris bisa diklik → `router.push('/admin/pesanan?openOrder=<id>')`.

### Paginasi

`limit = 20` (tetap). Kontrol `Sebelumnya` / `Halaman X dari Y` / `Selanjutnya` hanya muncul bila `totalPages > 1`.

### Modal detail pesanan

Modal dikendalikan **URL** (`?openOrder=<id>`), bukan state lokal. Konsekuensi positif: URL detail pesanan bisa dibagikan/di-bookmark, dan tombol back browser menutup modal. Inilah yang dimanfaatkan Dashboard untuk membuka modal langsung dari kartu pesanan terbaru.

---

## 4. `OrderDetailModal` (dipakai 3 halaman)

Dipakai oleh **Pesanan**, **Board**, dan **Fulfillment**. `widthClassName="max-w-2xl"`.

Data: `GET /api/admin/orders/<id>` (bentuk `serializeOrderDetail`).

### Isi modal (atas → bawah)

1. **Header** — nomor pesanan, `tanggal · Online|POS`, badge status
2. **Grid 2 kolom**
   - **Penerima** — nama, telepon, alamat, kota
   - **Pembayaran** — "Metode: `<enum>`"; "Member: `<nama/email>`" atau **"Tamu (tanpa akun)"**; "Afiliasi: `<kode>` (`<nama afiliasi>`)" bila ada
3. **Item Pesanan** — thumbnail 40×32, judul, `qty x harga`, `lineTotal`
4. **Rincian harga** — Subtotal · Ongkos Kirim · Diskon (bila > 0) · **Total**
5. **Riwayat Status** — daftar ringkas: `<label status> · <tanggal> · oleh <nama admin> · <catatan>`. Ini satu-satunya tempat di aplikasi yang menampilkan **siapa** yang mengubah status.
6. **Ubah Status** — hanya dirender bila status sekarang punya transisi lanjutan. Tombol dibuat dinamis dari `NEXT_STATUS_OPTIONS`:

| Status sekarang    | Tombol yang muncul                         |
| ------------------ | ------------------------------------------ |
| `AWAITING_PAYMENT` | **Tandai Lunas** · **Tandai Dibatalkan**   |
| `PAID`             | **Tandai Dikemas** · **Tandai Dibatalkan** |
| `PACKED`           | **Tandai Dikirim** · **Tandai Dibatalkan** |
| `SHIPPED`          | **Tandai Selesai** · **Tandai Dibatalkan** |
| `COMPLETED`        | (tidak ada — section disembunyikan)        |
| `CANCELLED`        | (tidak ada — section disembunyikan)        |

Aksi: `PATCH /api/admin/orders/<id>/status` dengan `{ toStatus }`. Respons berupa detail terbaru → langsung dipakai memperbarui modal, lalu callback opsional `onStatusChanged(order)` diberitahu supaya halaman induk bisa menyegarkan datanya:

- **Board** → memperbarui posisi kartu di kolom yang benar
- **Fulfillment** → memuat ulang seluruh daftar
- **Pesanan** → tidak memberikan callback (tabel disegarkan saat filter berubah/navigasi)

Gagal (mis. transisi tidak valid) → pesan merah di atas tombol.

---

## 5. Order Board (Kanban) — `/admin/board`

| Aspek | Detail                                                    |
| ----- | --------------------------------------------------------- |
| File  | `src/app/admin/(dashboard)/board/page.tsx`                |
| Jenis | Client Component + `@dnd-kit/core`                        |
| Data  | `GET /api/admin/orders?limit=200&dateFrom=<14 hari lalu>` |

### Tujuan

Memantau alur pesanan secara visual dan mengubah status dengan drag-and-drop.

### Cakupan data

Sengaja dibatasi: **200 pesanan terakhir dalam 14 hari terakhir**, diambil satu kali saat mount. Alasannya papan Kanban akan sulit dibaca (dan berat) bila memuat seluruh riwayat. Untuk pesanan lama, gunakan halaman Pesanan.

### Filter (dijalankan di klien, tanpa request baru)

- **Search** — mencocokkan `orderNumber`, `receiverName`, `receiverPhone` (lowercase contains)
- **Select sumber** — Semua Sumber / Online / POS

Keduanya memakai `useMemo` atas array `orders` yang sudah ada di memori.

### Kolom (6, urutan tetap)

Menunggu Pembayaran · Lunas · Dikemas · Dikirim · Selesai · Dibatalkan

Setiap kolom: lebar 288px (`w-72`), header berisi label + badge jumlah, dan area kartu. Kolom kosong: "Tidak ada pesanan". Kolom yang sedang di-hover saat drag berubah jadi `border-brand bg-brand-50`.

### Kartu pesanan

Nomor pesanan (bold), nama penerima, badge sumber (Online/POS), total, dan tanggal. Kursor `grab` / `grabbing`. Kartu yang sedang di-drag `opacity-50`, dan `<DragOverlay>` menampilkan tiruannya mengikuti kursor.

Klik kartu (tanpa drag) → membuka `OrderDetailModal`.

### Aturan drag & optimistic update

```
onDragEnd:
  1. Tidak dilepas di atas kolom (over = null)  → abaikan
  2. Kolom asal == kolom tujuan                 → abaikan
  3. Transisi tidak valid menurut VALID_TRANSITIONS di klien
       → tampilkan error merah:
         "Transisi status dari <Label A> ke <Label B> tidak diizinkan"
       → kartu TIDAK dipindahkan
  4. Valid:
       a. Pindahkan kartu di state segera (optimistic)
       b. PATCH /api/admin/orders/<id>/status { toStatus }
       c. Bila gagal → kembalikan kartu ke kolom asal + tampilkan pesan
          "Gagal mengubah status, kartu dikembalikan" (atau error dari server)
```

Tabel `VALID_TRANSITIONS` di klien identik dengan `ORDER_STATUS_TRANSITIONS` di server (`src/server/orders/status.ts`). Duplikasi ini disengaja agar pengguna mendapat umpan balik instan tanpa round-trip; server tetap menjadi otoritas final.

Teks bantuan di atas papan: "Seret kartu pesanan antar kolom untuk mengubah status, atau klik kartu untuk detail."

---

## 6. Pusat Fulfillment — `/admin/fulfillment`

| Aspek | Detail                                           |
| ----- | ------------------------------------------------ |
| File  | `src/app/admin/(dashboard)/fulfillment/page.tsx` |
| Jenis | Client Component                                 |
| Data  | `GET /api/admin/orders?limit=100&...`            |

### Tujuan

Memproses **banyak pesanan sekaligus**: tandai dikemas/dikirim secara massal dan cetak packing list untuk beberapa pesanan dalam satu dokumen.

### Filter

| Kontrol       | Param                                            |
| ------------- | ------------------------------------------------ |
| Search        | `q`                                              |
| Select status | dikirim sebagai beberapa `status=` (multi-value) |
| Select sumber | `source` (Online/POS), diabaikan bila "Semua"    |

Opsi select status (perhatikan urutan yang disengaja — yang paling sering dipakai di atas):

| Label                                           | Nilai                 |
| ----------------------------------------------- | --------------------- |
| **Status Aktif (Lunas & Setelahnya)** (default) | `PAID,PACKED,SHIPPED` |
| Lunas - Perlu Dikemas                           | `PAID`                |
| Dikemas - Siap Dikirim                          | `PACKED`              |
| Dikirim                                         | `SHIPPED`             |
| Semua Status                                    | `` (kosong)           |
| Menunggu Pembayaran                             | `AWAITING_PAYMENT`    |
| Selesai                                         | `COMPLETED`           |
| Dibatalkan                                      | `CANCELLED`           |

Nilai bertanda koma dipecah lalu dikirim sebagai `params.append('status', …)` berulang. Sisi server (`/api/admin/orders`) menerima keduanya: beberapa parameter `status`, atau satu parameter berisi daftar dipisah koma.

Setiap perubahan filter me-reset seleksi (`setSelected(new Set())`) supaya tidak ada aksi massal yang mengenai pesanan yang tidak terlihat.

### Bar aksi massal (sticky di atas tabel)

- Checkbox **select all** — mencentang/mengosongkan seluruh baris yang tampil
- Label "**`<n>`** pesanan dipilih"
- **Tandai Dikemas** → `POST /api/admin/orders/bulk-status` `{ orderIds, toStatus: 'PACKED' }`
- **Tandai Dikirim** → idem dengan `'SHIPPED'`
- **Cetak Packing List** → `window.open('/admin/fulfillment/print?ids=<id,id,id>', '_blank')`

Ketiganya disabled saat tidak ada yang terpilih.

### Perilaku aksi massal (parsial-sukses)

Endpoint memproses **satu per satu**, masing-masing dalam transaksi sendiri, dan mengembalikan:

```json
{ "success": ["id", "..."], "failed": [{ "id": "...", "reason": "..." }] }
```

Artinya sebagian pesanan bisa berhasil sementara sebagian gagal (mis. karena statusnya sudah berubah). UI menampilkan:

> `<n>` pesanan gagal diproses (transisi status tidak valid)

lalu **memuat ulang daftar** agar status yang tampil akurat.

Setiap pesanan yang berhasil juga menjalankan `dispatchPendingNotificationsForOrder`, sehingga email berpindah status ikut terkirim.

### Tabel

Kolom: checkbox · No. Pesanan (klik → modal detail) · Penerima · Tanggal · Sumber · Status · Total.

---

## 7. Cetak Packing List — `/admin/fulfillment/print?ids=<id,id>`

| Aspek | Detail                                                                |
| ----- | --------------------------------------------------------------------- |
| File  | `src/app/admin/fulfillment/print/page.tsx`                            |
| Jenis | Server Component, di luar route group `(dashboard)` (tanpa sidebar)   |
| Guard | `getAdminSessionUser()` → `redirect('/admin/login')` bila bukan admin |

### Perilaku

1. `ids` dipecah per koma, di-trim, item kosong dibuang
2. `prisma.order.findMany({ where: { id: { in: idList } }, include: orderDetailInclude })`
3. Hasil query **diurutkan ulang mengikuti urutan `ids` di URL** (memakai `Map` lookup), bukan urutan database
4. ID yang tidak ditemukan dilewati tanpa error
5. `<PrintTrigger>` memanggil `window.print()` otomatis setelah 300ms

### CSS cetak

```css
@page {
  size: A4;
  margin: 12mm;
}
@media print {
  .no-print {
    display: none;
  }
  .packing-slip {
    page-break-after: always;
  }
  .packing-slip:last-child {
    page-break-after: auto;
  }
}
```

Satu pesanan = satu halaman A4. Halaman terakhir tidak memaksa page-break agar tidak ada halaman kosong.

### Isi tiap packing slip

- **Kop** — kiri: "GenSa Berilmu" + "PT. Generasi Shalahuddin Berilmu" (hardcoded); kanan: "Packing List" + `nomor pesanan · tanggal`
- **Grid 2 kolom** — kiri: blok **Penerima** (nama, telepon, alamat, kota); kanan: **Status** (label Indonesia)
- **Tabel item** — Produk · Qty (tengah) · Harga (kanan) · Subtotal (kanan)
- **Total** di kanan bawah (bold)
- **Catatan** pengiriman bila `receiverNote` ada

Teks `.no-print`: "Gunakan Ctrl/Cmd+P untuk mencetak ulang".

Bila `ids` kosong atau tidak ada yang cocok: "Tidak ada pesanan untuk dicetak."

---

## 8. Kelola Produk — `/admin/produk`

| Aspek | Detail                                                                                |
| ----- | ------------------------------------------------------------------------------------- |
| File  | `src/app/admin/(dashboard)/produk/page.tsx` + `components/admin/ProductFormModal.tsx` |
| Jenis | Client Component                                                                      |
| Data  | `GET /api/admin/products` + `GET /api/categories`                                     |

### Header

`<h1>Kelola Produk</h1>` + "`<total>` produk ditemukan" + tombol **+ Tambah Produk**.

### Filter (`sm:grid-cols-3`)

| Kontrol         | Param        | Nilai                                                                                                  |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| Search          | `q`          | mencocokkan `title` atau `author` (contains, case-insensitive)                                         |
| Select kategori | `categoryId` | daftar kategori diratakan dengan indentasi `—` sesuai kedalaman                                        |
| Select stok     | `stock`      | Semua Stok / **Stok Aman** (`instock`) / **Stok Menipis** (`lowstock`) / **Stok Habis** (`outofstock`) |

Ambang stok di server (`LOW_STOCK_THRESHOLD = 10`):

| Nilai        | Kondisi Prisma              |
| ------------ | --------------------------- |
| `instock`    | `stock > 10`                |
| `lowstock`   | `stock > 0 AND stock <= 10` |
| `outofstock` | `stock <= 0`                |

> Endpoint admin produk **tidak** memfilter `isActive`, jadi produk nonaktif tetap terlihat di tabel admin (memang perlu, agar bisa diaktifkan kembali).

### Tabel

Kolom: **Produk** (thumbnail 48×36 + judul + `penulis · SKU`) · **Kategori** (nama digabung koma, `-` bila kosong) · **Harga** (kanan; harga asli dicoret di atas harga final bila ada diskon) · **Stok** (kanan) · **Status** (badge Aktif hijau / Nonaktif abu) · aksi **Hapus** (merah).

Klik kolom Produk → `GET /api/admin/products/<id>` untuk mengambil detail penuh, lalu membuka modal edit.

Paginasi `limit = 20`.

### Modal hapus (soft delete)

Judul "Hapus Produk". Teks: "Yakin ingin menghapus **`<judul>`**? Produk akan dinonaktifkan dan tidak tampil di toko."

`DELETE /api/admin/products/<id>` **tidak** menghapus baris — ia menyetel `isActive = false`. Ini penting karena `OrderItem` merujuk ke `Product` dengan `onDelete: SetNull`; menghapus produk akan memutus tautan pada pesanan historis. Soft delete menjaga jejak audit tetap utuh.

### `ProductFormModal` (`max-w-3xl`)

Judul "Tambah Produk" atau "Edit Produk".

**Grid 2 kolom:**

| Field          | Kontrol | Validasi klien (Zod)                                     |
| -------------- | ------- | -------------------------------------------------------- |
| SKU            | text    | wajib ("SKU wajib diisi")                                |
| Judul          | text    | wajib                                                    |
| Subjudul       | text    | opsional                                                 |
| Penulis        | text    | wajib                                                    |
| Penerbit       | text    | opsional (dipetakan ke kolom `imprint`)                  |
| Tipe Cover     | select  | `SOFTCOVER` / `HARDCOVER` / `EBOOK` (dari `COVER_TYPES`) |
| Harga (Rp)     | number  | integer > 0                                              |
| Diskon (%)     | number  | integer 0–90                                             |
| Stok           | number  | integer ≥ 0 ("Stok tidak boleh negatif")                 |
| Berat (gram)   | number  | integer > 0                                              |
| Jumlah Halaman | number  | integer > 0                                              |
| Tahun Terbit   | number  | integer ≥ 1900 (server juga membatasi ≤ tahun ini + 1)   |

**Full width:**

- **Deskripsi** — textarea 4 baris, wajib
- **Kategori** — daftar checkbox dalam kotak scroll `max-h-40`, indentasi sesuai kedalaman kategori (multi-select)
- **Gambar Produk** — `<input type="file" accept="image/png,image/jpeg,image/webp">`, satu file
- Checkbox **Aktif (ditampilkan di toko)**

**Alur submit (dua langkah):**

```
1. POST /api/admin/products          (tambah)
   PUT  /api/admin/products/<id>     (edit)
   body: { ...field, categoryIds }
   Gagal → tampilkan error, hentikan
2. Bila ada file gambar dipilih:
   POST /api/admin/products/<id>/images   (FormData field "image")
   → gambar pertama otomatis jadi isPrimary
3. onSaved() → tutup modal + muat ulang tabel
```

Gambar diunggah **setelah** produk tersimpan karena butuh `productId` sebagai bagian dari path penyimpanan. Kegagalan upload gambar tidak membatalkan penyimpanan produk.

**Nilai default saat tambah baru:** `discountPercent = 0`, `coverType = 'SOFTCOVER'`, `publishYear = tahun ini`, `isActive = true`.

### Yang diurus server saat menyimpan produk

- `finalPrice` **selalu dihitung server**: `computeFinalPrice(price, discountPercent) = round(price - price*discount/100)`. Klien tidak pernah mengirim `finalPrice`.
- `slug` dibuat otomatis dari judul (`slugify` + suffix hex acak bila bentrok). Saat edit, slug **tidak** berubah kecuali body memuat `regenerateSlug: true` (belum diekspos di UI) — ini menjaga URL/SEO produk tetap stabil saat judul diperbaiki.
- SKU duplikat → `409 { "issues": { "sku": ["SKU sudah digunakan"] } }` (dari kode Prisma `P2002`).
- `categoryIds` / `tagIds` diganti penuh (delete-all lalu create) dalam satu transaksi.
- Kategori/tag yang tidak ditemukan → `400` "Beberapa kategori tidak ditemukan".

**Field produk yang belum ada di form UI** (didukung API & database, tapi hanya bisa diisi via API): `tocText`, `highlightsText`, `ribbonType`, `ribbonText`, `tagIds`, `position`, `regenerateSlug`. Pengelolaan banyak gambar per produk (max 8) serta penghapusan gambar juga hanya lewat API (`POST`/`DELETE /api/admin/products/[id]/images`).

---

## 9. Kelola Member — `/admin/member`

| Aspek | Detail                                      |
| ----- | ------------------------------------------- |
| File  | `src/app/admin/(dashboard)/member/page.tsx` |
| Jenis | Client Component                            |
| Data  | `GET /api/admin/members`                    |

### Tabel

Header: `<h1>Kelola Member</h1>` + "`<total>` member ditemukan". Search tunggal (`q`) mencocokkan `name` atau `email`.

Kolom: **Nama** (nama + email kecil) · **Telepon** · **Role** (badge) · **Jumlah Order** (kanan) · **Total Belanja** (kanan) · **Bergabung**.

`orderCount` dan `totalSpend` dihitung dari **seluruh** pesanan milik member — termasuk yang dibatalkan (server mengambil `orders: { select: { total } }` lalu menjumlahkannya tanpa filter status).

Klik baris → modal detail member. Paginasi `limit = 20`.

> Semua endpoint member mengecualikan `role = 'ADMIN'` (`where: { role: { not: 'ADMIN' } }`), jadi akun admin tidak pernah muncul di daftar ini dan tidak bisa dimodifikasi lewat halaman ini.

### Modal Detail Member (`max-w-xl`)

Data: `GET /api/admin/members/<id>` (memuat 20 pesanan terakhir).

**Blok identitas** — nama, email, telepon, "Bergabung `<tanggal>`".

**Bar aksi** (dipisah garis atas-bawah):

- "Role saat ini:" + badge role
- Tombol toggle role:
  - Bila `BUYER` → **Jadikan Afiliasi**
  - Bila `AFFILIATE` → **Jadikan Buyer**
  - Aksi: `PATCH /api/admin/members/<id>` `{ role }`
- Tombol **Reset Password** → `POST /api/admin/members/<id>/reset-password`
  - Sukses → teks hijau "Link reset password telah dikirim ke member."
  - Server membuat `PasswordResetToken` (TTL 1 jam) dan mengirim email `PASSWORD_RESET` berisi tautan `/reset-password?token=<raw>`. Admin **tidak** melihat token maupun password baru.

**Riwayat Pesanan** — daftar nomor pesanan + tanggal + badge status + total. Bila kosong: "Belum ada pesanan."

### Efek samping perubahan role (dalam transaksi)

| Perubahan                       | Yang terjadi                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| → `AFFILIATE`, profil belum ada | Buat `AffiliateProfile` dengan kode unik baru dan **field bank kosong** (`''`). Afiliasi perlu melengkapinya sendiri nanti |
| → `AFFILIATE`, profil sudah ada | `AffiliateProfile.isActive = true` (kode afiliasi lama dipakai kembali)                                                    |
| → `BUYER`                       | `AffiliateProfile.isActive = false`. Data klik/konversi/komisi **tidak dihapus**                                           |

---

## 10. Point of Sale — `/admin/pos`

| Aspek | Detail                                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------- |
| File  | `src/app/admin/(dashboard)/pos/page.tsx`                                                                              |
| Jenis | Client Component                                                                                                      |
| Data  | `GET /api/admin/products?limit=60&stock=instock` + `GET /api/categories` + `GET /api/admin/pos/transactions?limit=10` |

### Tujuan

Kasir cepat untuk penjualan offline (event/pameran buku). Transaksi POS langsung berstatus **lunas** — tidak melewati alur pembayaran online.

### Layout `lg:grid-cols-[1fr_360px]`

**Kiri — katalog**

- Search produk (`q`) + select kategori (`categoryId`)
- Grid kartu produk (2/3 kolom) — setiap kartu adalah `<button>`: klik = **tambah 1 ke keranjang**
- Kartu berisi gambar (tinggi 128px), judul (max 2 baris), penulis, harga final, dan "Stok `<n>`"
- Katalog hanya memuat produk `stock=instock` (**stok > 10**) dan maksimal 60 item

  > Konsekuensi: produk dengan stok 1–10 **tidak muncul di POS**. Ini kemungkinan bukan yang diinginkan untuk kasir (yang biasanya ingin menjual sisa stok), dan patut ditinjau — filter `instock` di sini berarti "stok aman", bukan "tersedia".

**Kanan — panel pesanan (kartu sticky)**

- Header "Pesanan" + tombol **Kosongkan** (muncul bila keranjang berisi)
- Daftar baris: judul, harga satuan, stepper `−` / qty / `+`, tombol `×` hapus
  - `+` disabled saat `quantity >= stock`
  - `updateQuantity` selalu di-clamp: `max(1, min(qty, stock))`
- **Total** (besar, warna brand)
- **Metode Pembayaran** — select: **Tunai** (`POS_CASH`) / **QRIS** (`POS_QRIS`) / **Transfer** (`POS_TRANSFER`)
- **Nama Pelanggan** (opsional)
- **Telepon** (opsional)
- **Catatan** (opsional, textarea)
- Tombol **Checkout** (`Memproses...` saat submit), disabled bila keranjang kosong

Badge di header halaman menampilkan total item di keranjang.

### Checkout POS

`POST /api/admin/pos/transactions` dengan `{ items: [{ productId, quantity }], paymentMethod, customerName?, customerPhone?, note? }`.

Yang dilakukan server (satu transaksi):

```
1. Validasi semua produk ada, aktif, dan stok cukup
2. Hitung subtotal dari product.finalPrice (server-side, bukan dari klien)
3. Validasi voucher bila voucherCode dikirim (channel: 'POS')
4. Tolak bila manualDiscount > subtotal
5. Kurangi stok: updateMany bersyarat stock >= quantity, cek count === 0
6. Bila ada voucher: SELECT ... FOR UPDATE, revalidasi, increment usedCount
7. discount = min(subtotal, voucherDiscount + manualDiscount)
   total    = max(0, subtotal - discount)      ← tanpa ongkir
8. Buat Order:
     source: 'POS'
     status: 'PAID'            ← langsung lunas
     shippingCost: 0
     receiverName: customerName ?? 'Walk-in Customer'
     receiverPhone: customerPhone ?? '-'
     receiverEmail / receiverAddress / receiverCity : '-'
     posCashierUserId: user.id  ← admin yang login
     + OrderItem snapshot
     + OrderStatusHistory { fromStatus: PAID, toStatus: PAID, note: 'Transaksi POS dibuat' }
9. Bila ada voucher → buat VoucherRedemption (userId: null)
10. Respons 201 { orderId, orderNumber }
```

**Konsekuensi penting** dari pembuatan langsung di status `PAID` (tidak melewati `applyOrderStatusTransition`): efek samping status `PAID` **tidak** dijalankan. Artinya transaksi POS **tidak** mengirim email dan **tidak** membuat `AffiliateConversion`. Ini memang wajar untuk penjualan tatap muka (tidak ada email pembeli — kolomnya `'-'`, dan tidak ada atribusi afiliasi), tetapi perlu disadari sebagai perilaku yang berbeda dari pesanan online.

Field `voucherCode`, `manualDiscount`, dan `manualDiscountReason` didukung API tetapi **belum ada kontrolnya di UI POS**.

### Setelah checkout

Muncul modal **Struk POS**: "Transaksi berhasil dibuat" + nomor transaksi, dengan tombol **Tutup** dan **Cetak** (`window.open('/admin/pos/receipt/<orderId>/print', '_blank')`). Keranjang dan field pelanggan dibersihkan, riwayat dimuat ulang.

### Section "Riwayat Transaksi POS"

Tabel 10 transaksi POS terakhir: No. Transaksi · Pelanggan · Total · Waktu (`toLocaleString('id-ID')`) · tombol **Cetak**.

---

## 11. Cetak Struk POS — `/admin/pos/receipt/[id]/print`

| Aspek | Detail                                              |
| ----- | --------------------------------------------------- |
| File  | `src/app/admin/pos/receipt/[id]/print/page.tsx`     |
| Jenis | Server Component, di luar `(dashboard)`             |
| Guard | `getAdminSessionUser()` → redirect bila bukan admin |

### Perilaku

1. Ambil order + `orderDetailInclude`
2. **Bila tidak ada atau `source !== 'POS'` → `notFound()` (404)** — struk 80mm hanya untuk transaksi POS
3. `UPDATE Order SET posReceiptPrintedAt = now()` — sebagai jejak audit bahwa struk pernah dicetak
4. Ambil `StoreSetting` (id=1) untuk kop struk
5. `<PrintTrigger>` otomatis memanggil `window.print()`

### CSS cetak

```css
@page {
  size: 80mm auto;
  margin: 4mm;
}
@media print {
  .no-print {
    display: none;
  }
}
```

Lebar 80mm dengan tinggi `auto` — format printer thermal.

### Isi struk

```
        <Nama Toko dari StoreSetting, fallback "GenSa Berilmu">
        <alamat toko>            ← bila ada
        <telepon toko>           ← bila ada
─────────── (garis putus-putus) ───────────
No. Transaksi      ORD-20260812-123456
Tanggal            12/8/2026, 14.30.00
Kasir              <nama atau email admin yang login>
Pembayaran         Tunai | QRIS | Transfer
────────────────────────────────────────────
<judul produk>
  2 x Rp75.000                  Rp150.000
<judul produk lain>
  1 x Rp98.000                   Rp98.000
────────────────────────────────────────────
Subtotal                        Rp248.000
Diskon                          -Rp15.000   ← bila > 0
Total                           Rp233.000
        Terima kasih atas kunjungan Anda
```

Perhatikan bahwa "Kasir" menampilkan **admin yang sedang login saat mencetak**, bukan `posCashierUserId` pesanan tersebut. Untuk cetak ulang oleh admin lain, nama yang muncul akan berbeda dari kasir aslinya.

---

## 12. Kelola Afiliasi — `/admin/afiliasi`

| Aspek | Detail                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------- |
| File  | `src/app/admin/(dashboard)/afiliasi/page.tsx`                                                                 |
| Jenis | Client Component                                                                                              |
| Data  | `GET /api/admin/affiliates?limit=50` · `GET /api/admin/commission-rates` · `GET /api/admin/products?limit=60` |

### 4 kartu statistik (dihitung di klien dari daftar afiliasi)

Total Afiliasi · Total Klik · Total Konversi · Komisi Pending — masing-masing menjumlahkan field dari array afiliasi yang dimuat.

### Section "Performa Afiliasi"

Tabel: **Member** (nama + email) · **Kode** (font mono) · **Klik** · **Konversi** · **Komisi Pending** · **Komisi Dibayar** · **Status** (Aktif/Nonaktif) · aksi **Detail**.

`totalClicks`/`totalConversions` dari `_count` Prisma; `commissionPending` = jumlah `PENDING` + `APPROVED`; `commissionPaid` = jumlah `PAID`.

### Modal Detail Afiliasi (`max-w-2xl`)

Data: `GET /api/admin/affiliates/<id>` (50 konversi terakhir).

- **Grid identitas** — Kode Afiliasi (mono) · Bergabung · **Rekening Pembayaran** (`<bank> · <nomor> (<pemilik>)`) · Telepon
- **Breakdown Komisi** — 4 kotak per status: `PENDING`, `APPROVED`, `PAID`, `REJECTED` (nilai rupiah). Diinisialisasi nol semua sehingga status tanpa data tetap tampil
- **Produk Pilihan** — daftar bullet judul produk yang dipilih afiliasi. Kosong → "Belum memilih produk."
- **Riwayat Konversi** — tabel: No. Pesanan · Komisi · Status · Tanggal. Kosong → "Belum ada konversi."

### Section "Tingkat Komisi per Produk"

Deskripsi: "Atur produk mana saja yang tersedia untuk program afiliasi beserta tingkat komisinya."

Tabel: **Produk** (judul + SKU) · **Komisi** (`<n>%`) · **Status** (Aktif/Nonaktif) · aksi **Edit**.
Tombol **+ Tambah Produk** di atas tabel. Kosong → "Belum ada produk afiliasi. Klik "Tambah Produk" untuk menambahkan."

### Modal tarif komisi

| Kontrol                     | Perilaku                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Pilih Produk** (select)   | Saat **tambah**: hanya produk yang **belum punya** tarif (`unratedProducts`). Saat **edit**: terkunci (`disabled`) pada produk tersebut |
| **Tingkat Komisi (%)**      | number 0–100. Validasi klien: "Persentase harus antara 0-100"                                                                           |
| **Aktifkan untuk afiliasi** | checkbox                                                                                                                                |

Aksi: `PUT /api/admin/commission-rates/<productId>` `{ percent, isActive }` — bersifat **upsert**, jadi endpoint yang sama dipakai untuk tambah maupun edit. Server juga mencatat `updatedByUserId`.

Karena select tambah hanya menampilkan produk tanpa tarif, tidak mungkin terjadi duplikasi tarif dari UI.

### Yang belum ada UI-nya di halaman ini

Manajemen **payout afiliasi**. Endpoint-nya sudah lengkap:

- `GET /api/admin/affiliates/payouts` — daftar batch payout
- `POST /api/admin/affiliates/payouts` — buat batch untuk satu afiliasi pada periode tertentu (mengumpulkan konversi `APPROVED`, menjumlahkannya, dan menandai konversi tersebut `PAID`)
- `PATCH /api/admin/affiliates/payouts/<id>` — tandai payout `PAID` + kirim email `AFFILIATE_PAYOUT`

Untuk saat ini payout hanya bisa dijalankan lewat pemanggilan API langsung. Field `fixedAmount` pada tarif komisi juga hanya bisa di-set via API (UI hanya menyediakan persen).

---

## 13. Kelola Voucher — `/admin/voucher`

| Aspek | Detail                                                                                 |
| ----- | -------------------------------------------------------------------------------------- |
| File  | `src/app/admin/(dashboard)/voucher/page.tsx` + `components/admin/VoucherFormModal.tsx` |
| Jenis | Client Component                                                                       |
| Data  | `GET /api/admin/vouchers?page=1&limit=60`                                              |

### Header & filter

`<h1>Kelola Voucher</h1>` + "`<total>` voucher ditemukan" + tombol **+ Tambah Voucher**.

| Kontrol       | Param      | Nilai                                    |
| ------------- | ---------- | ---------------------------------------- |
| Search        | `q`        | `code` contains (case-insensitive)       |
| Select kanal  | `channel`  | Semua Kanal / Semua (ALL) / Online / POS |
| Select status | `isActive` | Semua Status / Aktif / Nonaktif          |

### Tabel

| Kolom   | Cara ditampilkan                                                                  |
| ------- | --------------------------------------------------------------------------------- |
| Kode    | kode (bold) + deskripsi kecil bila ada. Klik → modal edit                         |
| Tipe    | "Persentase" atau "Potongan Tetap"                                                |
| Nilai   | `PERCENT` → `<n>%` + `(maks Rp<n>)` bila `maxDiscount` di-set · `FIXED` → `Rp<n>` |
| Kanal   | Semua / Online / POS                                                              |
| Kuota   | `<usedCount>/<quota>` — memakai simbol `∞` bila `quota` null                      |
| Periode | "Selalu berlaku" bila kedua tanggal null, jika tidak `<mulai> – <berakhir>`       |
| Status  | badge Aktif (hijau) / Nonaktif (abu)                                              |
| Aksi    | **Detail** · **Nonaktifkan**/**Aktifkan** · **Hapus**                             |

- **Nonaktifkan/Aktifkan** — `PUT /api/admin/vouchers/<id>` `{ isActive: !isActive }` (toggle satu klik, tanpa modal)
- **Detail** — `GET /api/admin/vouchers/<id>` → modal
- **Hapus** — modal konfirmasi

Halaman memuat hingga 60 voucher tanpa paginasi UI.

### Modal Detail Voucher

Dua kotak statistik di atas:

- **Jumlah Digunakan** — `count(VoucherRedemption)`
- **Total Diskon Diberikan** — `sum(VoucherRedemption.discountAmount)`

Lalu daftar definition list: Tipe · Nilai · Minimal Belanja · Kanal · Kuota · Batas per Pengguna (`Tidak dibatasi` bila null) · Periode · Status.

### Modal Hapus

"Yakin ingin menghapus voucher **`<KODE>`**?"

Server menolak dengan **409** bila `usedCount > 0`:

> Voucher sudah pernah digunakan dan tidak bisa dihapus. Nonaktifkan voucher ini sebagai gantinya.

Ini melindungi integritas riwayat: `VoucherRedemption` memakai `onDelete: Cascade`, sehingga menghapus voucher terpakai akan menghapus catatan penukarannya juga.

### `VoucherFormModal` (`max-w-2xl`)

| Field                         | Kontrol          | Catatan                                                        |
| ----------------------------- | ---------------- | -------------------------------------------------------------- |
| Kode Voucher                  | text (uppercase) | wajib, maks 30 karakter. Server otomatis meng-uppercase        |
| Kanal                         | select           | `ALL` / `ONLINE` / `POS`                                       |
| Tipe                          | select           | `PERCENT` (Persentase) / `FIXED` (Potongan Tetap)              |
| Nilai                         | number           | integer > 0. Label ikut berubah: "Nilai (%)" atau "Nilai (Rp)" |
| Maks. Diskon (Rp, opsional)   | number           | **hanya dirender bila Tipe = PERCENT**                         |
| Minimal Belanja (Rp)          | number           | integer ≥ 0, default 0                                         |
| Kuota (opsional)              | number           | kosong = tanpa batas                                           |
| Batas per Pengguna (opsional) | number           | kosong = tanpa batas                                           |
| Mulai Berlaku (opsional)      | datetime-local   | dikirim sebagai ISO string                                     |
| Berakhir (opsional)           | datetime-local   | dikirim sebagai ISO string                                     |
| Deskripsi (opsional)          | textarea 2 baris | dikirim `null` bila kosong                                     |
| Aktif                         | checkbox         | default true                                                   |

Field numerik opsional yang kosong dinormalisasi jadi `null` (`toNullableInt`), bukan `0` — penting agar "tanpa kuota" tidak salah tersimpan sebagai kuota nol.

**Validasi tambahan di server** (POST & PUT):

| Aturan                                   | Respons                                              |
| ---------------------------------------- | ---------------------------------------------------- |
| `type = FIXED` tapi `maxDiscount` di-set | `400` "maxDiscount hanya untuk tipe PERCENT"         |
| `type = PERCENT` dan `value > 100`       | `400` "Persentase maksimal 100"                      |
| `startsAt >= expiresAt`                  | `400` "Tanggal berakhir harus setelah tanggal mulai" |
| Kode duplikat (`P2002`)                  | `409` "Kode voucher sudah digunakan"                 |

Pada `PUT`, validasi ini dijalankan terhadap **nilai gabungan** (field yang dikirim + nilai lama yang tidak dikirim), sehingga update parsial tidak bisa menghasilkan kombinasi yang tidak sah.

`createdByUserId` diisi otomatis dengan admin yang membuat, dan relasinya `onDelete: Restrict` — akun admin yang pernah membuat voucher tidak bisa dihapus dari database.

---

## 14. Laporan Penjualan — `/admin/laporan`

| Aspek | Detail                                       |
| ----- | -------------------------------------------- |
| File  | `src/app/admin/(dashboard)/laporan/page.tsx` |
| Jenis | Client Component                             |
| Data  | `GET /api/admin/reports/laporan?period=<p>`  |

### Filter periode

Select tunggal: **Semua Waktu** (`all`) · **Hari Ini** (`today`) · **7 Hari Terakhir** (`week`) · **Bulan Ini** (`month`).

Perhitungan batas awal (`src/server/reports/laporan.ts`):

| Nilai   | `createdAt >=`                              |
| ------- | ------------------------------------------- |
| `all`   | tanpa batas                                 |
| `today` | awal hari ini (00:00 waktu server)          |
| `week`  | `now - 7 hari` (rolling, bukan awal minggu) |
| `month` | tanggal 1 bulan ini                         |

### 4 kartu statistik

| Kartu                 | Perhitungan                                                    |
| --------------------- | -------------------------------------------------------------- |
| Total Pendapatan      | `sum(total)` pesanan **non-`CANCELLED`** dalam periode         |
| Total Pesanan         | `count` **semua** pesanan dalam periode (termasuk `CANCELLED`) |
| Rata-rata per Pesanan | `round(totalPendapatan / totalPesanan)`                        |
| Tingkat Selesai       | `count(COMPLETED) / totalPesanan` × 100, satu desimal          |

> Perhatikan asimetri yang disengaja pada "Rata-rata per Pesanan": pembilangnya mengecualikan pesanan dibatalkan tetapi penyebutnya tidak. Bila banyak pesanan dibatalkan, angka ini akan lebih rendah dari rata-rata nilai pesanan yang benar-benar terjadi.

### Section "Status Pesanan"

Grid 6 kartu (satu per status enum, selalu semua ditampilkan walau nol): badge status berwarna + jumlah + label "pesanan". Punya tombol **Export CSV** sendiri.

### Section "Top Produk Terjual"

Tabel 10 teratas berdasarkan pendapatan: **#** · **Produk** · **Terjual** (`<n> unit`) · **Pendapatan** · **Proporsi** (bar horizontal relatif terhadap produk dengan pendapatan tertinggi).

Agregasi dikelompokkan per `productId`, atau per `titleSnapshot` bila produknya sudah dihapus (`productId = null`) — jadi produk yang sudah tidak ada tetap muncul di laporan historis. Hanya pesanan non-`CANCELLED` dihitung.

### Section "Pesanan per Hari"

Bar chart CSS: satu batang per hari (lebar 64px, tinggi area 128px, minimum 4% agar hari dengan 1 pesanan tetap terlihat), dengan angka dan tanggal ringkas (`12 Agu`) di bawahnya. Bisa di-scroll horizontal. Menghitung **semua** pesanan (termasuk dibatalkan).

### Export CSV

Setiap section punya tombol **Export CSV** sendiri, dan semuanya diproses **di klien** (`downloadCsv` membangun string CSV lalu `Blob` + `<a download>`):

| Tombol           | File                    | Kolom                          |
| ---------------- | ----------------------- | ------------------------------ |
| Header halaman   | `laporan-penjualan.csv` | Metrik, Nilai (4 statistik)    |
| Status Pesanan   | `status-pesanan.csv`    | Status, Jumlah                 |
| Top Produk       | `top-produk.csv`        | #, Produk, Terjual, Pendapatan |
| Pesanan per Hari | `pesanan-per-hari.csv`  | Tanggal, Jumlah Pesanan        |

Berbeda dengan export pesanan (yang server-side dan menyertakan BOM UTF-8), export laporan ini murni klien dan **tanpa BOM** — Excel versi lama mungkin salah membaca karakter non-ASCII.

---

## 15. Laporan Lengkap — `/admin/laporan-lengkap`

| Aspek | Detail                                                        |
| ----- | ------------------------------------------------------------- |
| File  | `src/app/admin/(dashboard)/laporan-lengkap/page.tsx`          |
| Jenis | Client Component                                              |
| Data  | `GET /api/admin/reports/laporan-lengkap?year=&month=&source=` |

### Filter (3 select + export)

| Select | Opsi                                        |
| ------ | ------------------------------------------- |
| Tahun  | Semua Tahun / tahun ini / tahun−1 / tahun−2 |
| Bulan  | Semua Bulan / Januari … Desember            |
| Sumber | Semua Sumber / Online / POS                 |

Semua pesanan `CANCELLED` dikecualikan dari **seluruh** perhitungan di halaman ini.

Catatan implementasi: `source` difilter di query Prisma, sedangkan `year` dan `month` difilter **di memori aplikasi** setelah data diambil (`src/server/reports/laporan-lengkap.ts`). Untuk volume data yang besar, ini titik yang perlu dioptimalkan.

### 4 kartu statistik

Total Pendapatan · Total Pesanan · Rata-rata per Pesanan · **Total Unit Terjual** (jumlah `quantity` seluruh item).

### 5 section analisis

**1. Pendapatan per Bulan** — bar chart (batang lebar 80px dengan label rupiah dan `Agu 2026`) **dan** tabel (Bulan · Pesanan · Pendapatan). Diurutkan tahun lalu bulan. Nama bulan bahasa Indonesia dari konstanta `MONTH_NAMES`.

**2. Perbandingan POS vs Online** — dua kartu (pendapatan besar + jumlah pesanan) plus satu bar proporsi tunggal: "Online `<n>`%" di kiri, "POS `<100−n>`%" di kanan. Bar hanya dirender bila ada pendapatan.

**3. Pendapatan per Kategori** — tabel Kategori · Unit Terjual · Pendapatan · Kontribusi (bar relatif).
Kategori diambil dari **kategori pertama** produk (`categories: { take: 1 }`); produk tanpa kategori dikelompokkan sebagai **"Tanpa Kategori"**. Produk multi-kategori hanya dihitung di satu kategori.

**4. Metode Pembayaran** — grid kartu: label Indonesia, jumlah transaksi, pendapatan, dan persentase kontribusi. Pemetaan label:

| Enum            | Label          |
| --------------- | -------------- |
| `BANK_TRANSFER` | Transfer Bank  |
| `EWALLET`       | E-Wallet       |
| `QRIS`          | QRIS           |
| `POS_CASH`      | Tunai (POS)    |
| `POS_TRANSFER`  | Transfer (POS) |
| `POS_QRIS`      | QRIS (POS)     |

**5. Produk Terlaris** — tabel 10 teratas: # · Produk · Terjual · Pendapatan.

### Export CSV

Sama seperti halaman Laporan (klien-side): `laporan-lengkap.csv`, `pendapatan-per-bulan.csv`, `pendapatan-per-kategori.csv`, `metode-pembayaran.csv`, `produk-terlaris.csv`.

### Endpoint laporan granular (belum dipakai UI)

Selain dua endpoint agregat di atas, tersedia endpoint per-metrik dengan periode standar (`today`, `7d`, `30d`, `this_month`, `all_time`) yang belum dikonsumsi halaman mana pun:

`summary` · `orders-by-status` · `top-products` · `sales-by-day` · `revenue-by-month` · `revenue-by-category` · `payment-methods` · `pos-vs-online`, ditambah `GET /api/admin/reports/export.csv?report=<nama>&period=…` yang menghasilkan CSV **server-side lengkap dengan BOM UTF-8**. Endpoint ini cocok bila kelak dibuat dashboard baru atau integrasi BI.

---

## 16. Konfigurasi Tampilan — `/admin/konfigurasi`

| Aspek | Detail                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------- |
| File  | `src/app/admin/(dashboard)/konfigurasi/page.tsx`                                                     |
| Jenis | Client Component                                                                                     |
| Data  | `GET /api/admin/products?limit=60` · `GET /api/admin/config/homepage` · `GET /api/admin/config/kids` |

### Tujuan

Mengatur apa yang tampil di halaman **Beranda** (`/`) dan **Buku Anak** (`/kids`) tanpa deploy.

Halaman punya dua tab: **Beranda** dan **Buku Anak**.

### Tab Beranda

**1. Banner Hero Beranda** — 3 input URL teks: Gambar Banner Utama, Gambar Banner Samping 1, Gambar Banner Samping 2.

**2. Gambar Promo per Section** — 5 input URL: Buku Terbaru, Bestseller, International Bestseller, Keislaman Kiwari, Rujukan Islam Klasik.
(Section `OTHERS` tidak memiliki gambar promo — kolomnya tidak ada di `HomepageConfig`.)

**3. Pilih Buku per Section** — enam `<ProductPicker>`, satu untuk tiap section: Buku Terbaru, Bestseller, International Bestseller, Keislaman Kiwari, Rujukan Islam Klasik, Lainnya.

Keterangan: "Centang produk yang ingin ditampilkan. Urutan mengikuti urutan centang."

### Tab Buku Anak

**1. Hero Buku Anak** — Badge, Gambar Hero (URL), Judul, Deskripsi (textarea). Setiap field punya placeholder berisi nilai fallback yang dipakai halaman `/kids`.

**2. Promo Buku Anak** — Badge, Gambar Promo (URL), Judul, Deskripsi.

**3. Pilih Buku Buku Anak** — dua `<ProductPicker>`: **Buku Populer Anak** (`POPULAR`) dan **Buku Diskon** (`DISCOUNT`).

### Komponen `<ProductPicker>`

Kotak berisi: label section, input pencarian lokal (filter `title.toLowerCase().includes`, murni di klien atas 60 produk yang sudah dimuat), daftar checkbox yang bisa di-scroll (`max-h-48`) menampilkan judul + SKU, dan hitungan "`<n>` produk dipilih".

Sama seperti pemilih produk afiliasi, mencari **tidak** menghilangkan centang yang sudah ada karena state disimpan sebagai array id di komponen induk, bukan diturunkan dari hasil filter.

### Menyimpan

Satu tombol **Simpan Konfigurasi** menyimpan **kedua tab sekaligus** — dua request paralel:

```
PUT /api/admin/config/homepage  { ...8 field URL, sections: { NEWEST: [...], ... } }
PUT /api/admin/config/kids      { ...8 field teks/URL, sections: { POPULAR: [...], DISCOUNT: [...] } }
```

Pesan: "Konfigurasi berhasil disimpan!" bila **keduanya** sukses, atau "Gagal menyimpan konfigurasi. Periksa kembali data yang diisi." bila salah satu gagal.

⚠️ **Semua field URL/teks bersifat wajib di server** (`z.string().trim().min(1)`). Jadi menyimpan sementara dengan satu field kosong akan ditolak, dan karena tombol menyimpan kedua tab bersamaan, satu field kosong di tab Buku Anak akan menampilkan pesan gagal walau perubahan tab Beranda sebenarnya tersimpan. Isi semua field pada kedua tab sebelum menyimpan.

### Apa yang dilakukan server

`PUT /api/admin/config/homepage` (dalam satu transaksi):

```
1. Validasi Zod (semua URL wajib, sections berisi array UUID)
2. Verifikasi semua productId benar-benar ada
   (bandingkan count dengan jumlah id unik) → 400 "Beberapa produk tidak ditemukan"
3. upsert HomepageConfig id = 1
4. DELETE seluruh HomepageSectionProduct
5. INSERT ulang per section dengan position = indeks di array
```

Pola **delete-all lalu insert-ulang** membuat urutan produk selalu identik dengan urutan yang dikirim klien, tanpa perlu logika diff. `PUT /api/admin/config/kids` bekerja identik untuk `KidsConfig` + `KidsSectionProduct`.

### Keterbatasan yang perlu diketahui

- Gambar diisi sebagai **URL teks**, belum ada tombol upload di halaman ini — padahal endpoint `POST /api/admin/uploads` (yang menyimpan gambar ke `misc/` dan mengembalikan `{ url }`) sudah tersedia dan tinggal disambungkan.
- Pemilih produk hanya memuat **60 produk pertama** (`limit=60`) tanpa paginasi. Bila katalog melebihi 60 produk, sisanya tidak bisa dipilih dari UI ini.
- Urutan produk mengikuti urutan pencentangan dan tidak bisa diatur ulang dengan drag.

---

## 17. Pengaturan Toko — `/admin/pengaturan`

| Aspek | Detail                                          |
| ----- | ----------------------------------------------- |
| File  | `src/app/admin/(dashboard)/pengaturan/page.tsx` |
| Jenis | Client Component                                |
| Data  | `GET /api/admin/settings/store`                 |

### Grup form

**1. Informasi Toko** — Nama Toko · Email Toko · Telepon Toko · Alamat Toko

**2. Rekening Bank** (grid 3 kolom) — Nama Bank 1 · No. Rekening 1 · Atas Nama 1 · Nama Bank 2 · No. Rekening 2 · Atas Nama 2

**3. Pengiriman** — Ongkos Kirim Default (Rp) · Minimum Gratis Ongkir (Rp)

**4. Data Admin** — Nama Admin · Email Admin — keduanya **read-only** (latar `neutral-50`), diambil dari sesi admin yang login.

Tombol **Simpan Pengaturan** → `PUT /api/admin/settings/store` (upsert baris `StoreSetting` id=1). Pesan: "Pengaturan berhasil disimpan!" / "Gagal menyimpan pengaturan."

Semua field wajib di server; email harus format valid; kedua field ongkir harus integer ≥ 0.

### Section "Data Storage"

Tiga kotak jumlah data: **Pesanan** · **Produk** · **Member** (dari `count` masing-masing tabel; Member mengecualikan ADMIN).

**Reset Semua Pesanan** — alur konfirmasi **tiga langkah** yang sengaja dibuat menyulitkan:

```
Langkah 0: tombol merah "Reset Semua Pesanan"
Langkah 1: kotak merah — "Tindakan ini akan menghapus seluruh data pesanan secara
           permanen. Yakin ingin melanjutkan?"  [Ya, Lanjutkan] [Batal]
Langkah 2: input teks — ketik tepat "RESET SEMUA PESANAN"
           Tombol [Reset Sekarang] tetap disabled sampai teks cocok persis
```

Aksi: `POST /api/admin/settings/reset-orders` dengan body `{ confirm: "RESET SEMUA PESANAN" }`.

Pengaman di server:

- **`403` bila `NODE_ENV === 'production'`** — "Reset pesanan hanya diizinkan di lingkungan development"
- Body harus `z.literal('RESET SEMUA PESANAN')`, jika tidak `400`
- Menghapus dalam satu transaksi, urut sesuai ketergantungan: `OrderStatusHistory` → `AffiliateConversion` → `OrderItem` → `Order`

Bila `canResetOrders` dari server `false` (yakni di production), UI tidak menampilkan tombol sama sekali dan menulis: "Reset pesanan hanya tersedia di lingkungan development."

⚠️ Reset ini **tidak** mengembalikan stok produk yang sudah dikurangi, tidak menghapus `PaymentSession`/`VoucherRedemption`/`Notification`, dan tidak me-reset `Voucher.usedCount`. Fungsinya membersihkan data uji di development, bukan operasi bisnis.

### Yang belum ada di halaman ini

- **Form ganti password admin** (padahal banner di layout menyuruh mengganti password di sini)
- Field `defaultCommissionPercent` pada `StoreSetting` — dipakai perhitungan komisi afiliasi tetapi tidak ada input untuknya di UI mana pun (hanya bisa diubah via database)
- Tombol "reset semua data" yang ada di prototipe

---

## 18. Ringkasan: Endpoint Admin yang Belum Punya UI

Bagian ini berguna untuk perencanaan pengembangan lanjutan. Semua endpoint di bawah sudah berfungsi dan teruji, tetapi belum ada halaman yang memanggilnya.

| Domain               | Endpoint                                                                               | Butuh halaman apa                                         |
| -------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Kategori**         | `POST /api/admin/categories`, `PUT`/`DELETE /api/admin/categories/[id]`                | CRUD kategori (pohon, urutan, aktif/nonaktif)             |
| **Kota & ongkir**    | `POST /api/admin/shipping/cities`, `PUT`/`DELETE /api/admin/shipping/cities/[id]`      | CRUD kota + tarif ongkir                                  |
| **Notifikasi**       | `GET /api/admin/notifications`, `POST /api/admin/notifications/[id]/retry`             | Monitor antrean email + kirim ulang manual                |
| **Payout afiliasi**  | `GET`/`POST /api/admin/affiliates/payouts`, `PATCH /api/admin/affiliates/payouts/[id]` | Buat batch payout per periode + tandai terbayar           |
| **Upload gambar**    | `POST /api/admin/uploads`                                                              | Tombol upload di halaman Konfigurasi                      |
| **Gambar produk**    | `POST`/`DELETE /api/admin/products/[id]/images[/imageId]`                              | Galeri multi-gambar (max 8) + atur primary + hapus        |
| **Struk POS (JSON)** | `GET /api/admin/pos/transactions/[id]/receipt`                                         | Alternatif JSON dari halaman cetak (mis. untuk app kasir) |
| **Laporan granular** | 8 endpoint `/api/admin/reports/*` + `export.csv`                                       | Dashboard analitik baru / integrasi BI                    |

Detail request/response tiap endpoint ada di [09-api-reference.md](./09-api-reference.md).
