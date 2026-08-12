# 07 — Fungsi Tabel Database

Sumber kebenaran: `prisma/schema.prisma`. Database: **PostgreSQL** dengan preview feature `fullTextSearchPostgres`.

Total **33 tabel (model)** dan **15 enum**.

## Konvensi yang berlaku di seluruh skema

| Konvensi    | Detail                                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary key | `String @id @default(uuid())` untuk hampir semua tabel. Pengecualian: tabel singleton konfigurasi memakai `Int @id @default(1)`, dan tabel pivot memakai composite key |
| Uang        | Selalu **`Int` dalam rupiah utuh** (bukan `Decimal`, bukan sen). `Rp150.000` disimpan sebagai `150000`. Tidak ada pembagian 100 di mana pun                            |
| Persentase  | `Int` untuk diskon produk (`discountPercent`), `Decimal(5,2)` untuk komisi (`percent`, `defaultCommissionPercent`) karena butuh presisi pecahan                        |
| Timestamp   | `createdAt DateTime @default(now())` dan `updatedAt DateTime @updatedAt` pada tabel yang bisa berubah. Tabel append-only (log/riwayat) hanya punya `createdAt`         |
| Soft delete | Memakai flag `isActive` (`Product`, `Category`, `City`, `Voucher`, `AffiliateProfile`, `AffiliateCommissionRate`), bukan kolom `deletedAt`                             |
| Snapshot    | `Order` dan `OrderItem` menyimpan salinan datar dari data yang bisa berubah, bukan hanya FK — supaya pesanan historis tetap akurat                                     |
| Bahasa      | Nama tabel/kolom **bahasa Inggris**; nilai teks yang dilihat pengguna bahasa Indonesia                                                                                 |
| Index       | Dipasang eksplisit pada kolom yang dipakai untuk filter, sort, dan lookup — bukan hanya FK                                                                             |

### Ringkasan aturan `onDelete`

| Aturan           | Dipakai untuk                                                                                 | Artinya                                                   |
| ---------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `Cascade`        | Data yang tidak bermakna tanpa induknya (sesi, item keranjang, gambar produk, riwayat status) | Hapus induk → anak ikut terhapus                          |
| `SetNull`        | Referensi yang boleh hilang tanpa merusak baris (produk pada `OrderItem`, user pada `Order`)  | Hapus induk → kolom jadi `NULL`, baris tetap ada          |
| `Restrict`       | `Receiver.city`, `Voucher.createdByUser`                                                      | Induk **tidak boleh** dihapus selama masih dirujuk        |
| `SetNull` (self) | `Category.parent`                                                                             | Hapus kategori induk → anaknya jadi kategori tingkat atas |

---

# A. Enum

### `Role`

`BUYER` · `AFFILIATE` · `ADMIN`

Menentukan kanal login yang boleh dipakai dan tampilan yang muncul. Detail: [02-role-dan-hak-akses.md](./02-role-dan-hak-akses.md).

### `CoverType`

`SOFTCOVER` · `HARDCOVER` · `EBOOK`

Jenis penjilidan produk. Ditampilkan sebagai "Soft Cover" / "Hard Cover" / "E-Book" di halaman detail produk.

### `RibbonType`

`NEW` · `BEST` · `DISCOUNT`

Badge promosi pada kartu & detail produk. Warnanya: `NEW` navy, `BEST` brand, `DISCOUNT` merah. Teksnya bisa dikustomisasi lewat `ribbonText`.

### `OrderStatus`

`AWAITING_PAYMENT` · `PAID` · `PACKED` · `SHIPPED` · `COMPLETED` · `CANCELLED`

Enam status dengan state machine yang dijaga server. Lihat [06-flow-bisnis.md § 6](./06-flow-bisnis.md#6-flow-siklus-status-pesanan).

### `PaymentMethod`

`BANK_TRANSFER` · `EWALLET` · `QRIS` · `POS_CASH` · `POS_TRANSFER` · `POS_QRIS`

Tiga nilai pertama untuk kanal online, tiga terakhir untuk POS. Pemisahan ini membuat laporan "Metode Pembayaran" bisa membedakan QRIS online dari QRIS di kasir.

### `OrderSource`

`ONLINE` · `POS`

Kanal asal pesanan. Dipakai untuk filter di admin dan untuk laporan "POS vs Online".

### `AffiliateConversionStatus`

`PENDING` · `APPROVED` · `PAID` · `REJECTED`

Siklus hidup komisi. `PENDING` saat pesanan lunas → `APPROVED` saat pesanan selesai → `PAID` saat masuk batch payout. `REJECTED` bila pesanan dibatalkan.

### `AffiliatePayoutStatus`

`PENDING` · `PAID` · `CANCELLED`

Status batch pembayaran komisi. `CANCELLED` ada di enum tetapi belum ada endpoint yang menyetelnya.

### `HomepageSectionKey`

`NEWEST` · `BESTSELLER` · `INTERNATIONAL` · `KIWARI` · `KLASIK` · `OTHERS`

Enam section produk di beranda.

### `KidsSectionKey`

`POPULAR` · `DISCOUNT`

Dua section produk di halaman `/kids`.

### `NotificationChannel`

`EMAIL` · `WHATSAPP`

`WHATSAPP` belum diimplementasikan — notifikasi dengan kanal ini langsung ditandai `FAILED`.

### `NotificationTemplate`

`ORDER_CONFIRMED` · `PAYMENT_RECEIVED` · `ORDER_PACKED` · `ORDER_SHIPPED` · `ORDER_COMPLETED` · `PASSWORD_RESET` · `AFFILIATE_JOIN` · `AFFILIATE_PAYOUT`

`ORDER_PACKED` belum punya renderer template dan tidak diantrekan kode mana pun.

### `NotificationStatus`

`PENDING` · `SENT` · `FAILED`

### `VoucherType`

`PERCENT` · `FIXED`

`PERCENT` → `value` adalah persentase (maks 100), boleh dibatasi `maxDiscount`. `FIXED` → `value` adalah nominal rupiah, `maxDiscount` harus `null`.

### `VoucherChannel`

`ALL` · `ONLINE` · `POS`

Membatasi voucher agar hanya berlaku di kanal tertentu.

---

# B. Autentikasi & Pengguna

## `User`

**Fungsi:** akun untuk semua aktor manusia — pembeli, afiliasi, dan admin. Satu tabel untuk ketiganya, dibedakan kolom `role`.

| Kolom             | Tipe              | Keterangan                                                         |
| ----------------- | ----------------- | ------------------------------------------------------------------ |
| `id`              | uuid PK           |                                                                    |
| `email`           | String **unique** | Identitas login dan penerima notifikasi. Tidak bisa diubah dari UI |
| `passwordHash`    | String            | bcrypt cost 12. **Tidak pernah** dikirim ke klien                  |
| `name`            | String?           | Nama tampilan. Bila null, UI menampilkan email                     |
| `phone`           | String?           | Nomor telepon                                                      |
| `whatsappNumber`  | String?           | Nomor WhatsApp (wajib saat registrasi, tapi nullable di database)  |
| `avatarUrl`       | String?           | URL foto profil (lokal `/uploads/avatars/...` atau URL publik R2)  |
| `role`            | `Role` = `BUYER`  | Menentukan kanal login & tampilan                                  |
| `emailVerifiedAt` | DateTime?         | **Belum pernah diisi** — alur verifikasi email belum dibuat        |
| `createdAt`       | DateTime          | Tanggal bergabung, ditampilkan di Admin → Member                   |
| `updatedAt`       | DateTime          |                                                                    |

**Index:** `email`, `role`

**Relasi keluar:** `sessions`, `passwordResetTokens`, `cart` (1-1), `receivers`, `orders` (sebagai pembeli), `affiliateOrders` (sebagai afiliasi perujuk), `posCashierOrders` (sebagai kasir), `statusChanges`, `affiliateProfile` (1-1), `commissionRateUpdates`, `posSessions`, `notifications`, `createdVouchers`, `voucherRedemptions`

**Catatan desain:** satu `User` bisa muncul pada satu pesanan dalam **tiga** peran berbeda (pembeli, afiliasi perujuk, kasir). Itulah sebabnya `Order` punya tiga FK terpisah ke `User` dengan nama relasi eksplisit (`OrderToUser`, `OrderToAffiliateUser`, `OrderToPosCashierUser`) — Prisma mewajibkan penamaan bila ada lebih dari satu relasi antar dua model yang sama.

---

## `Session`

**Fungsi:** daftar sesi login aktif. Membuat sesi bisa **dicabut** — JWT saja tidak bisa dibatalkan sebelum kedaluwarsa.

| Kolom       | Tipe     | Keterangan                                       |
| ----------- | -------- | ------------------------------------------------ |
| `id`        | uuid PK  | Nilai ini yang masuk klaim `sid` di JWT          |
| `userId`    | FK User  | `onDelete: Cascade`                              |
| `expiresAt` | DateTime | Diperiksa pada **setiap** verifikasi sesi        |
| `ipAddress` | String?  | Dari header `x-forwarded-for` saat login (audit) |
| `userAgent` | String?  | Browser/perangkat saat login (audit)             |
| `createdAt` | DateTime |                                                  |
| `updatedAt` | DateTime |                                                  |

**Index:** `userId`, `expiresAt`

Cookie `session` dan `admin_session` sama-sama menunjuk ke tabel ini; yang membedakan hanya nama cookie tempat JWT disimpan.

Baris dihapus saat: logout, reset password (semua sesi user), atau penghapusan user. Tidak ada job pembersih untuk sesi yang sudah kedaluwarsa — index `expiresAt` memudahkan bila kelak ditambahkan.

---

## `PasswordResetToken`

**Fungsi:** token sekali pakai untuk alur lupa password.

| Kolom       | Tipe      | Keterangan                                                            |
| ----------- | --------- | --------------------------------------------------------------------- |
| `id`        | uuid PK   |                                                                       |
| `userId`    | FK User   | `onDelete: Cascade`                                                   |
| `tokenHash` | String    | **SHA-256 dari token mentah**. Token asli hanya ada di email pengguna |
| `expiresAt` | DateTime  | Dibuat `now + 1 jam`                                                  |
| `usedAt`    | DateTime? | Ditandai saat token dipakai — mencegah pemakaian kedua                |
| `createdAt` | DateTime  |                                                                       |
| `updatedAt` | DateTime  |                                                                       |

**Index:** `userId`, `tokenHash`

Query pemakaian: `WHERE tokenHash = ? AND usedAt IS NULL AND expiresAt > now()`. Baris tidak dihapus setelah dipakai — tetap tersimpan sebagai jejak audit.

---

# C. Katalog Produk

## `Category`

**Fungsi:** kategori produk **bertingkat** (self-referencing), dipakai untuk navigasi, filter, dan laporan pendapatan per kategori.

| Kolom      | Tipe              | Keterangan                                                       |
| ---------- | ----------------- | ---------------------------------------------------------------- |
| `id`       | uuid PK           |                                                                  |
| `name`     | String            | Nama tampilan                                                    |
| `slug`     | String **unique** | Untuk URL `/products?category=<slug>`. Dibuat otomatis dari nama |
| `parentId` | String?           | Self-FK. `null` = kategori tingkat atas                          |
| `position` | Int = 0           | Urutan tampil (menu navigasi diurutkan dengan ini)               |
| `isActive` | Boolean = true    | Soft delete / sembunyikan                                        |

**Index:** `slug`, `parentId`, `isActive`, `position`

**Relasi:** `parent`/`children` (self, `onDelete: SetNull`), `products` (via `CategoryProduct`)

`SetNull` pada `parent` berarti menghapus kategori induk **tidak** menghapus anaknya — anak-anaknya naik menjadi kategori tingkat atas. Ini lebih aman daripada cascade yang bisa menghapus seluruh cabang tanpa sengaja.

Contoh hierarki dari seed: `Buku Anak` → `0-2 Tahun`, `3-6 Tahun`, `7-9 Tahun`, `10-12 Tahun`.

Penghapusan kategori ditolak (`409`) bila masih ada `CategoryProduct` yang menautkannya.

---

## `Tag`

**Fungsi:** label bebas untuk produk, sebagai dimensi pengelompokan selain kategori.

| Kolom  | Tipe              | Keterangan                 |
| ------ | ----------------- | -------------------------- |
| `id`   | uuid PK           |                            |
| `name` | String            |                            |
| `slug` | String **unique** | Untuk filter `?tag=<slug>` |

**Index:** `slug`

**Status:** tabel dan dukungan API-nya sudah ada (`tagIds` pada create/update produk, filter `tag` pada listing), tetapi **belum ada UI** untuk mengelola tag maupun memfilter dengan tag, dan seed tidak membuat tag apa pun.

---

## `Product`

**Fungsi:** tabel inti katalog. Buku/produk yang dijual.

| Kolom             | Tipe              | Keterangan                                                                                     |
| ----------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| `id`              | uuid PK           |                                                                                                |
| `sku`             | String **unique** | Kode internal. Duplikat → `409` "SKU sudah digunakan"                                          |
| `slug`            | String **unique** | URL produk. Dibuat otomatis; **tidak** berubah saat judul diedit (kecuali `regenerateSlug`)    |
| `title`           | String            | Judul                                                                                          |
| `subtitle`        | String            | Subjudul. Wajib di database, default `''` di schema Zod                                        |
| `author`          | String            | Penulis. Ikut dicari dalam pencarian full-text                                                 |
| `imprint`         | String?           | Penerbit/imprint. **Diekspos ke API & UI sebagai `publisher`**                                 |
| `description`     | String            | Deskripsi panjang. Ikut dicari full-text. Dirender `whitespace-pre-line`                       |
| `tocText`         | String?           | Daftar isi, satu item per baris. Dirender jadi bullet list                                     |
| `highlightsText`  | String?           | Keunggulan, satu item per baris                                                                |
| `price`           | Int               | Harga sebelum diskon (rupiah)                                                                  |
| `discountPercent` | Int = 0           | 0–90 (dibatasi Zod)                                                                            |
| `finalPrice`      | Int               | **Kolom turunan** = `round(price − price × discountPercent / 100)`. Selalu dihitung server     |
| `stock`           | Int = 0           | Stok tersedia                                                                                  |
| `weightGram`      | Int               | Berat dalam gram (disiapkan untuk perhitungan ongkir berbasis berat, saat ini ongkir per kota) |
| `coverType`       | `CoverType`       |                                                                                                |
| `pageCount`       | Int               | Jumlah halaman                                                                                 |
| `publishYear`     | Int               | Dibatasi 1900 s.d. tahun ini + 1                                                               |
| `isActive`        | Boolean = true    | `false` = disembunyikan dari toko (ini yang dipakai "hapus produk")                            |
| `position`        | Int = 0           | Urutan manual. **Belum dipakai** oleh query mana pun                                           |
| `ribbonType`      | `RibbonType`?     | Badge promosi                                                                                  |
| `ribbonText`      | String?           | Teks badge; bila null, nama enum yang ditampilkan                                              |
| `createdAt`       | DateTime          | Dipakai untuk sort "Terbaru" dan fallback section                                              |
| `updatedAt`       | DateTime          |                                                                                                |

**Index:** `slug`, `sku`, `isActive`, `position`, `coverType`, `ribbonType`

**Relasi:** `images`, `tags`, `categories`, `cartItems`, `orderItems`, `affiliateSelections`, `commissionRate` (1-1), `affiliateClicks`, `homepageSectionProducts`, `kidsSectionProducts`

**Mengapa `finalPrice` disimpan (denormalisasi):** filter rentang harga, sort harga, dan tampilan semuanya butuh harga akhir. Menyimpannya membuat semua operasi itu bisa memakai index alih-alih menghitung ekspresi per baris. Konsistensinya dijaga karena hanya satu tempat yang menghitungnya (`computeFinalPrice`) dan klien tidak pernah mengirim nilai ini.

---

## `ProductImage`

**Fungsi:** galeri gambar produk (maksimal 8 per produk, dijaga di endpoint).

| Kolom       | Tipe            | Keterangan                                                          |
| ----------- | --------------- | ------------------------------------------------------------------- |
| `id`        | uuid PK         |                                                                     |
| `productId` | FK Product      | `onDelete: Cascade`                                                 |
| `url`       | String          | Path lokal `/uploads/products/<id>/<uuid>.<ext>` atau URL publik R2 |
| `altText`   | String?         | Teks alternatif (aksesibilitas)                                     |
| `position`  | Int = 0         | Urutan dalam galeri                                                 |
| `isPrimary` | Boolean = false | Gambar utama (thumbnail di kartu produk, keranjang, pesanan)        |

**Index:** `productId`, `position`

**Aturan yang dijaga endpoint** (bukan constraint database):

- Gambar pertama yang diunggah otomatis `isPrimary = true`
- Menyetel satu gambar jadi primary akan menyetel `isPrimary = false` pada semua gambar lain produk itu, dalam satu transaksi
- Menghapus gambar primary → gambar dengan `position` terkecil dipromosikan
- File fisiknya juga dihapus (best-effort)

Semua query gambar memakai `orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }]` sehingga `images[0]` selalu gambar utama.

---

## `ProductTag` (pivot)

**Fungsi:** relasi many-to-many `Product` ↔ `Tag`.

| Kolom       | Tipe       |
| ----------- | ---------- |
| `productId` | FK Product |
| `tagId`     | FK Tag     |

**PK:** composite `[productId, tagId]` — mencegah duplikat tanpa perlu unique index terpisah
**Index:** `tagId` (index untuk `productId` sudah tercakup PK)
**Cascade:** kedua sisi `Cascade`

Tanpa kolom tambahan (murni tabel penghubung).

---

## `CategoryProduct` (pivot)

**Fungsi:** relasi many-to-many `Product` ↔ `Category`. Satu produk bisa berada di beberapa kategori.

| Kolom        | Tipe        |
| ------------ | ----------- |
| `productId`  | FK Product  |
| `categoryId` | FK Category |

**PK:** composite `[productId, categoryId]`
**Index:** `categoryId`
**Cascade:** kedua sisi `Cascade`

Catatan yang mempengaruhi laporan: laporan "Pendapatan per Kategori" memakai `categories: { take: 1 }` — hanya kategori **pertama** setiap produk. Produk multi-kategori tidak dihitung ganda, tetapi juga tidak muncul di kategori lainnya.

---

# D. Keranjang

## `Cart`

**Fungsi:** kontainer keranjang, mendukung member maupun guest.

| Kolom        | Tipe               | Keterangan                                                           |
| ------------ | ------------------ | -------------------------------------------------------------------- |
| `id`         | uuid PK            |                                                                      |
| `userId`     | String? **unique** | Terisi untuk keranjang member. Unique = satu keranjang per member    |
| `guestToken` | String? **unique** | UUID acak untuk keranjang guest, disimpan di cookie `gsb_cart_guest` |
| `createdAt`  | DateTime           |                                                                      |
| `updatedAt`  | DateTime           | Diindeks — memudahkan pembersihan keranjang guest yang terbengkalai  |

**Index:** `guestToken`, `updatedAt`
**Cascade:** `user` `onDelete: Cascade`

Invarian: tepat satu dari `userId` / `guestToken` yang terisi. Ini dijaga di kode (`resolveCart`), bukan oleh check constraint database.

Keranjang **dihapus** (bukan dikosongkan) saat checkout berhasil dan saat penggabungan guest→member.

---

## `CartItem`

**Fungsi:** baris item di keranjang.

| Kolom           | Tipe       | Keterangan                                                          |
| --------------- | ---------- | ------------------------------------------------------------------- |
| `id`            | uuid PK    |                                                                     |
| `cartId`        | FK Cart    | `onDelete: Cascade`                                                 |
| `productId`     | FK Product | `onDelete: Cascade`                                                 |
| `quantity`      | Int        | Minimal 1 (dijaga Zod)                                              |
| `priceSnapshot` | Int        | `finalPrice` produk **saat item pertama ditambahkan**               |
| `createdAt`     | DateTime   | Dipakai untuk mengurutkan item keranjang (`orderBy: createdAt asc`) |
| `updatedAt`     | DateTime   |                                                                     |

**Unique:** `[cartId, productId]` — satu produk hanya satu baris; menambah lagi berarti menambah kuantitas (`upsert`)
**Index:** `cartId`, `productId`

`priceSnapshot` dipakai untuk **mendeteksi perubahan harga** (flag `price_changed`) dan menampilkan subtotal. Saat pesanan dibuat, harga diambil ulang dari `product.finalPrice`, jadi snapshot ini tidak pernah menjadi harga yang ditagih.

`productId` memakai `Cascade` (bukan `SetNull`) karena item keranjang tanpa produk tidak punya makna — beda dengan `OrderItem` yang harus tetap ada sebagai catatan historis.

---

# E. Pengiriman & Alamat

## `City`

**Fungsi:** daftar kota tujuan beserta tarif ongkir. Model ongkir aplikasi ini adalah **tarif flat per kota**.

| Kolom          | Tipe           | Keterangan                                                     |
| -------------- | -------------- | -------------------------------------------------------------- |
| `id`           | uuid PK        |                                                                |
| `name`         | String         | Nama kota                                                      |
| `province`     | String         | Provinsi (ditampilkan di dropdown: "Bandung, Jawa Barat")      |
| `shippingCost` | Int            | Tarif flat dalam rupiah                                        |
| `isActive`     | Boolean = true | Kota nonaktif tidak muncul di dropdown & ditolak saat checkout |

**Index:** `name`, `isActive`
**Relasi:** `receivers`

Seed mengisi 24 kota, dari Jakarta (Rp9.000) sampai Kupang (Rp40.000).

Penghapusan kota ditolak (`409`) bila masih ada `Receiver` yang memakainya, konsisten dengan `onDelete: Restrict` pada relasi tersebut.

> Kolom `Product.weightGram` dan `StoreSetting.defaultShippingCost` / `freeShippingMinTotal` menandakan rencana model ongkir yang lebih canggih (berbasis berat, gratis ongkir di atas nominal tertentu). Saat ini **hanya `City.shippingCost` yang benar-benar dipakai** dalam perhitungan.

---

## `Receiver`

**Fungsi:** buku alamat member — alamat pengiriman tersimpan untuk mempercepat checkout berikutnya.

| Kolom       | Tipe            | Keterangan                                                      |
| ----------- | --------------- | --------------------------------------------------------------- |
| `id`        | uuid PK         |                                                                 |
| `userId`    | FK User         | `onDelete: Cascade`                                             |
| `label`     | String          | Nama panggilan alamat: "Rumah", "Kantor"                        |
| `name`      | String          | Nama penerima                                                   |
| `phone`     | String          | Telepon/WhatsApp penerima                                       |
| `email`     | String?         | Opsional. Bila kosong, checkout memakai email dari body request |
| `address`   | String          | Alamat lengkap                                                  |
| `cityId`    | FK City         | **`onDelete: Restrict`**                                        |
| `isDefault` | Boolean = false | Alamat utama                                                    |
| `createdAt` | DateTime        |                                                                 |
| `updatedAt` | DateTime        | Dipakai memilih default pengganti saat default dihapus          |

**Index:** `[userId, isDefault]` (composite — query "alamat default milik user ini" langsung terlayani), `cityId`

Aturan `isDefault` dijaga transaksi di endpoint: menyetel satu default akan mematikan default lain; menghapus default akan mempromosikan alamat dengan `updatedAt` terbaru. Lihat [04-halaman-member.md § 7](./04-halaman-member.md#7-daftar-penerima--memberpenerima).

`Receiver` **tidak** direferensikan oleh `Order` — pesanan menyimpan salinan datar. Jadi mengubah atau menghapus alamat tidak pernah mengubah pesanan lama.

---

# F. Pesanan

## `Order`

**Fungsi:** tabel inti transaksi. Menampung pesanan online maupun POS.

### Identitas & kepemilikan

| Kolom         | Tipe                     | Keterangan                                                                                 |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `id`          | uuid PK                  | Dipakai di URL internal & sebagai kapabilitas akses pesanan guest                          |
| `orderNumber` | String **unique**        | Format `ORD-YYYYMMDD-NNNNNN`. **Nilai inilah yang dikirim ke Midtrans sebagai `order_id`** |
| `userId`      | FK User? (`OrderToUser`) | `null` untuk guest checkout & semua pesanan POS. `onDelete: SetNull`                       |

### Snapshot penerima (bukan FK)

| Kolom             | Tipe    | POS mengisi                              |
| ----------------- | ------- | ---------------------------------------- |
| `receiverName`    | String  | `customerName` atau `'Walk-in Customer'` |
| `receiverPhone`   | String  | `customerPhone` atau `'-'`               |
| `receiverEmail`   | String  | `'-'`                                    |
| `receiverAddress` | String  | `'-'`                                    |
| `receiverCity`    | String  | `'-'` (nama kota, bukan FK)              |
| `receiverNote`    | String? | catatan kasir                            |

Alasan disalin datar: pesanan adalah **dokumen historis**. Kota yang di-rename, alamat yang dihapus, atau akun yang ditutup tidak boleh mengubah isi pesanan yang sudah terjadi.

### Uang

| Kolom          | Tipe | Keterangan                                                                |
| -------------- | ---- | ------------------------------------------------------------------------- |
| `subtotal`     | Int  | Σ `lineTotal` semua item                                                  |
| `shippingCost` | Int  | Dari `city.shippingCost`. Selalu `0` untuk POS                            |
| `discount`     | Int  | **Total** diskon = `voucherDiscount + manualDiscount` (dibatasi subtotal) |
| `total`        | Int  | `max(0, subtotal + shippingCost − discount)`                              |

### Pembayaran & kanal

| Kolom           | Tipe                               | Keterangan                                |
| --------------- | ---------------------------------- | ----------------------------------------- |
| `paymentMethod` | `PaymentMethod`                    |                                           |
| `source`        | `OrderSource`                      | `ONLINE` atau `POS`                       |
| `status`        | `OrderStatus` = `AWAITING_PAYMENT` | POS menimpanya jadi `PAID` saat pembuatan |

### Afiliasi

| Kolom             | Tipe                              | Keterangan                                             |
| ----------------- | --------------------------------- | ------------------------------------------------------ |
| `affiliateUserId` | FK User? (`OrderToAffiliateUser`) | `onDelete: SetNull`                                    |
| `affiliateCode`   | String?                           | **Salinan kode** — tetap ada walau profil/akun dihapus |

### POS

| Kolom                 | Tipe                               | Keterangan                                        |
| --------------------- | ---------------------------------- | ------------------------------------------------- |
| `posCashierUserId`    | FK User? (`OrderToPosCashierUser`) | Admin yang membuat transaksi. `onDelete: SetNull` |
| `posReceiptPrintedAt` | DateTime?                          | Diisi setiap kali halaman cetak struk dibuka      |

### Voucher & diskon manual

| Kolom                  | Tipe        | Keterangan                                         |
| ---------------------- | ----------- | -------------------------------------------------- |
| `voucherId`            | FK Voucher? | `onDelete: SetNull`                                |
| `voucherCode`          | String?     | Salinan kode (tetap terbaca walau voucher dihapus) |
| `voucherDiscount`      | Int = 0     | Bagian diskon dari voucher                         |
| `manualDiscount`       | Int = 0     | Diskon kasir (POS). Selalu 0 untuk pesanan online  |
| `manualDiscountReason` | String?     | Alasan diskon manual (audit)                       |

Memisahkan `voucherDiscount` dan `manualDiscount` dari `discount` total membuat laporan bisa membedakan biaya promosi dari kebijaksanaan kasir.

**Index:** `createdAt`, `status`, `userId`, `posCashierUserId`, `voucherId`
**Relasi 1-1:** `affiliateConversion`, `voucherRedemption`, `paymentSession`
**Relasi 1-N:** `items`, `history`, `notifications`

---

## `OrderItem`

**Fungsi:** baris produk dalam pesanan, dengan snapshot lengkap.

| Kolom                     | Tipe        | Keterangan                                                          |
| ------------------------- | ----------- | ------------------------------------------------------------------- |
| `id`                      | uuid PK     |                                                                     |
| `orderId`                 | FK Order    | `onDelete: Cascade`                                                 |
| `productId`               | FK Product? | **`onDelete: SetNull`** — produk boleh hilang, barisnya harus tetap |
| `titleSnapshot`           | String      | Judul produk saat dibeli                                            |
| `priceSnapshot`           | Int         | `finalPrice` saat dibeli                                            |
| `discountPercentSnapshot` | Int         | Persen diskon saat dibeli (audit)                                   |
| `quantity`                | Int         |                                                                     |
| `lineTotal`               | Int         | `priceSnapshot × quantity`                                          |

**Index:** `orderId`, `productId`

Perbedaan `SetNull` (di sini) vs `Cascade` (di `CartItem`) adalah keputusan desain inti: keranjang bersifat sementara, pesanan bersifat permanen. Karena snapshot lengkap, laporan "Top Produk" tetap bisa menampilkan produk yang sudah dihapus — agregasinya jatuh ke `titleSnapshot` bila `productId` null.

`lineTotal` disimpan (bukan dihitung) agar laporan bisa `SUM` langsung tanpa ekspresi.

---

## `OrderStatusHistory`

**Fungsi:** jejak audit **append-only** setiap perubahan status pesanan.

| Kolom             | Tipe          | Keterangan                                                                    |
| ----------------- | ------------- | ----------------------------------------------------------------------------- |
| `id`              | uuid PK       |                                                                               |
| `orderId`         | FK Order      | `onDelete: Cascade`                                                           |
| `fromStatus`      | `OrderStatus` | Status sebelum perubahan                                                      |
| `toStatus`        | `OrderStatus` | Status sesudah perubahan                                                      |
| `changedByUserId` | FK User?      | `null` untuk perubahan otomatis (webhook/polling). `onDelete: SetNull`        |
| `note`            | String?       | Catatan: `"Order dibuat"`, `"Midtrans: settlement"`, `"Transaksi POS dibuat"` |
| `createdAt`       | DateTime      | Tidak ada `updatedAt` — baris tidak pernah diubah                             |

**Index:** `orderId`, `createdAt`

Baris pertama setiap pesanan adalah "self-transition" (`fromStatus == toStatus`) dengan catatan `"Order dibuat"` (online) atau `"Transaksi POS dibuat"` (POS) — supaya timeline selalu punya titik awal.

`changedByUserId = null` adalah cara membedakan perubahan otomatis dari perubahan manusia. Modal detail admin menampilkan "oleh `<nama>`" hanya bila kolom ini terisi.

---

# G. Afiliasi

## `AffiliateProfile`

**Fungsi:** menjadikan sebuah `User` sebagai afiliasi. **Keberadaan baris ini** — bukan nilai `User.role` — yang menjadi gerbang sebenarnya untuk fitur afiliasi.

| Kolom               | Tipe              | Keterangan                                                           |
| ------------------- | ----------------- | -------------------------------------------------------------------- |
| `id`                | uuid PK           |                                                                      |
| `userId`            | String **unique** | 1-1 dengan User. `onDelete: Cascade`                                 |
| `code`              | String **unique** | Kode referral, mis. `WAHYUS4821`. Dipakai di URL `/r/<code>`         |
| `payoutBankName`    | String            | Bank tujuan komisi                                                   |
| `payoutBankAccount` | String            | Nomor rekening                                                       |
| `payoutBankHolder`  | String            | Nama pemilik rekening                                                |
| `isActive`          | Boolean = true    | `false` → `/r/<code>` berhenti melacak & atribusi checkout diabaikan |
| `joinedAt`          | DateTime          | Tanggal jadi afiliasi                                                |

**Index:** `code`
**Relasi:** `productSelections`, `clicks`, `conversions`, `payouts`

Pembuatan kode: 6 karakter pertama nama/email (hanya A-Z0-9, fallback `'AFF'`) + 4 digit acak, diulang sampai unik.

Ketiga field bank **wajib** saat mendaftar lewat `/member/afiliasi`, tetapi diisi **string kosong** bila admin mempromosikan member lewat Admin → Member. Afiliasi tersebut perlu melengkapinya sendiri — dan saat ini **belum ada UI untuk mengedit data bank** setelah pendaftaran.

---

## `AffiliateProductSelection`

**Fungsi:** produk yang dipilih afiliasi untuk dipromosikan. Menentukan link mana yang muncul dan **kelayakan komisi** sebuah pesanan.

| Kolom                | Tipe                | Keterangan          |
| -------------------- | ------------------- | ------------------- |
| `id`                 | uuid PK             |                     |
| `affiliateProfileId` | FK AffiliateProfile | `onDelete: Cascade` |
| `productId`          | FK Product          | `onDelete: Cascade` |
| `createdAt`          | DateTime            |                     |

**Unique:** `[affiliateProfileId, productId]`
**Index:** `[affiliateProfileId, createdAt]`, `productId`

Karena `PUT /api/affiliate/products` menghapus semua lalu menyisipkan ulang, `createdAt` ter-reset setiap kali afiliasi menyimpan pilihan.

---

## `AffiliateCommissionRate`

**Fungsi:** tarif komisi **per produk**. Sekaligus penentu produk mana yang ikut program afiliasi.

| Kolom             | Tipe              | Keterangan                                                                  |
| ----------------- | ----------------- | --------------------------------------------------------------------------- |
| `id`              | uuid PK           |                                                                             |
| `productId`       | String **unique** | 1-1 dengan Product. `onDelete: Cascade`                                     |
| `percent`         | `Decimal(5,2)`    | Persentase komisi, mis. `10.00`. Presisi pecahan didukung                   |
| `fixedAmount`     | Int?              | Nominal per unit. **Bila terisi, mengalahkan `percent`**                    |
| `isActive`        | Boolean = true    | `false` → produk ini **tidak menghasilkan komisi** (bukan jatuh ke default) |
| `updatedByUserId` | FK User?          | Admin yang terakhir mengubah. `onDelete: SetNull`                           |
| `updatedAt`       | DateTime          | Dipakai untuk sort daftar tarif                                             |

**Index:** `productId`

`Decimal(5,2)` memberi rentang 0,00–999,99 — lebih dari cukup untuk persentase, dan menghindari galat floating point pada perhitungan uang.

Prioritas perhitungan komisi: `fixedAmount` → `percent` → `StoreSetting.defaultCommissionPercent` (hanya bila baris tarif **tidak ada** sama sekali). Rumus lengkap: [06-flow-bisnis.md § 7.2](./06-flow-bisnis.md#72-rumus-perhitungan-komisi).

---

## `AffiliateClick`

**Fungsi:** log setiap klik pada link afiliasi. Tabel append-only, berpotensi paling cepat bertumbuh.

| Kolom                | Tipe                | Keterangan                                                             |
| -------------------- | ------------------- | ---------------------------------------------------------------------- |
| `id`                 | uuid PK             |                                                                        |
| `affiliateProfileId` | FK AffiliateProfile | `onDelete: Cascade`                                                    |
| `productId`          | FK Product?         | `null` bila link tidak menyertakan `?p=`. `onDelete: SetNull`          |
| `sourceUrl`          | String?             | Header `Referer` — dari mana pengunjung datang                         |
| `ipAddress`          | String              | Dari `x-forwarded-for`, atau `'unknown'`                               |
| `userAgent`          | String              | Header User-Agent, atau `'unknown'`                                    |
| `cookieId`           | String              | Nilai cookie `gsb_cid` — mengelompokkan klik dari pengunjung yang sama |
| `createdAt`          | DateTime            |                                                                        |

**Index:** `[affiliateProfileId, createdAt]`, `productId`, `cookieId`

Pencatatan bersifat **best-effort**: `INSERT` dibungkus `.catch()` agar kegagalan tidak menghalangi redirect. Statistik "Total Klik" adalah `count` mentah tabel ini — **tidak** di-deduplikasi per `cookieId`. Index pada `cookieId` memungkinkan analisis unik-pengunjung bila dibutuhkan nanti.

---

## `AffiliateConversion`

**Fungsi:** satu pesanan yang menghasilkan komisi, beserta jumlah dan status pembayarannya.

| Kolom                | Tipe                                    | Keterangan                                                           |
| -------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `id`                 | uuid PK                                 |                                                                      |
| `affiliateProfileId` | FK AffiliateProfile                     | `onDelete: Cascade`                                                  |
| `orderId`            | String **unique**                       | **1-1 dengan Order** — satu pesanan maksimal satu komisi             |
| `commissionAmount`   | Int                                     | Hasil `computeCommissionAmount`, dihitung sekali saat pesanan `PAID` |
| `status`             | `AffiliateConversionStatus` = `PENDING` |                                                                      |
| `approvedAt`         | DateTime?                               | Diisi saat pesanan `COMPLETED`                                       |
| `paidAt`             | DateTime?                               | Diisi saat masuk batch payout                                        |
| `createdAt`          | DateTime                                |                                                                      |

**Index:** `[affiliateProfileId, createdAt]`, `status`

**Unique `orderId`** adalah pengaman ganda: bahkan bila transisi ke `PAID` entah bagaimana dijalankan dua kali, komisi kedua akan ditolak database.

`commissionAmount` **dibekukan** saat pembuatan. Mengubah tarif komisi setelahnya tidak mengubah konversi yang sudah ada — itulah yang membuat rekonsiliasi payout bisa diandalkan.

---

## `AffiliatePayout`

**Fungsi:** batch pembayaran komisi untuk satu afiliasi pada satu periode.

| Kolom                | Tipe                                | Keterangan                                          |
| -------------------- | ----------------------------------- | --------------------------------------------------- |
| `id`                 | uuid PK                             |                                                     |
| `affiliateProfileId` | FK AffiliateProfile                 | `onDelete: Cascade`                                 |
| `periodStart`        | DateTime                            | Awal periode (inklusif)                             |
| `periodEnd`          | DateTime                            | Akhir periode (inklusif)                            |
| `totalAmount`        | Int                                 | Σ `commissionAmount` konversi `APPROVED` di periode |
| `status`             | `AffiliatePayoutStatus` = `PENDING` |                                                     |
| `paidAt`             | DateTime?                           | Diisi saat ditandai `PAID`                          |
| `notes`              | String?                             | Catatan manual (bukti transfer, dsb.)               |
| `createdAt`          | DateTime                            |                                                     |

**Index:** `[affiliateProfileId, createdAt]`, `status`

Alur pembuatan batch (`POST /api/admin/affiliates/payouts`) menandai konversi yang diambil menjadi `PAID` **di transaksi yang sama**, sehingga satu konversi tidak bisa masuk dua batch. Ini disengaja walau berarti konversi bertanda `PAID` sebelum uangnya benar-benar ditransfer — `AffiliatePayout.status` yang melacak transfer sesungguhnya.

Belum ada UI untuk tabel ini (lihat [05-halaman-admin.md § 18](./05-halaman-admin.md#18-ringkasan-endpoint-admin-yang-belum-punya-ui)). Tidak ada FK dari `AffiliateConversion` ke `AffiliatePayout` — keterkaitannya implisit lewat `affiliateProfileId` + rentang tanggal + status.

---

# H. Konfigurasi (Tabel Singleton)

Tiga tabel berikut memakai pola **singleton**: `id Int @id @default(1)`, selalu diakses dengan `where: { id: 1 }` dan ditulis dengan `upsert`. Alasannya sederhana — konfigurasi global tidak butuh banyak baris, dan pola ini menjaga kueri tetap sepele.

## `StoreSetting`

**Fungsi:** identitas toko, rekening pembayaran, parameter pengiriman, dan tarif komisi default.

| Kolom                      | Tipe                 | Dipakai di                                                   |
| -------------------------- | -------------------- | ------------------------------------------------------------ |
| `id`                       | Int = 1              | —                                                            |
| `name`                     | String               | Kop struk POS                                                |
| `email`                    | String               | Admin → Pengaturan (belum dipakai di tampilan publik)        |
| `phone`                    | String               | Kop struk POS                                                |
| `address`                  | String               | Kop struk POS                                                |
| `defaultShippingCost`      | Int                  | **Belum dipakai dalam perhitungan** — ongkir memakai `City`  |
| `freeShippingMinTotal`     | Int                  | **Belum dipakai** — belum ada logika gratis ongkir           |
| `bank1Name/Number/Holder`  | String ×3            | **Belum dipakai** di tampilan (pembayaran lewat Midtrans)    |
| `bank2Name/Number/Holder`  | String ×3            | idem                                                         |
| `defaultCommissionPercent` | `Decimal(5,2)` = `5` | **Dipakai** — fallback komisi untuk produk tanpa baris tarif |
| `updatedAt`                | DateTime             |                                                              |

⚠️ **Tabel ini tidak diseed.** Pada instalasi baru barisnya belum ada, sehingga:

- Kop struk POS jatuh ke fallback hardcoded `'GenSa Berilmu'` tanpa alamat/telepon
- `defaultCommissionPercent` dibaca sebagai **0**, artinya produk tanpa `AffiliateCommissionRate` tidak menghasilkan komisi

Menyimpan form **Admin → Pengaturan** akan membuat barisnya (`upsert`). Namun `defaultCommissionPercent` **tidak ada input-nya** di form itu, jadi nilainya mengikuti default kolom (`5`) saat baris pertama dibuat dan setelah itu hanya bisa diubah lewat database.

---

## `HomepageConfig`

**Fungsi:** gambar banner beranda dan gambar promo per section.

| Kolom                               | Tipe     | Dipakai untuk                       |
| ----------------------------------- | -------- | ----------------------------------- |
| `id`                                | Int = 1  |                                     |
| `heroMainImageUrl`                  | String   | Banner besar kiri (2 kolom)         |
| `heroSideImage1Url`                 | String   | Banner kecil kanan atas             |
| `heroSideImage2Url`                 | String   | Banner kecil kanan bawah            |
| `sectionNewestPromoImageUrl`        | String   | Banner tipis section "Buku Terbaru" |
| `sectionBestsellerPromoImageUrl`    | String   | Section "Bestseller"                |
| `sectionInternationalPromoImageUrl` | String   | Section "International Bestseller"  |
| `sectionKiwariPromoImageUrl`        | String   | Section "Keislaman Kiwari"          |
| `sectionKlasikPromoImageUrl`        | String   | Section "Rujukan Islam Klasik"      |
| `updatedAt`                         | DateTime |                                     |

Section `OTHERS` **tidak** punya kolom gambar promo — hanya lima section pertama yang punya.

Semua kolom `String` non-nullable dan divalidasi `min(1)` di server, tetapi barisnya boleh tidak ada sama sekali (beranda memakai fallback gradien). Lihat [03-halaman-publik.md § 1](./03-halaman-publik.md#1-beranda--).

---

## `HomepageSectionProduct`

**Fungsi:** produk mana yang tampil di section beranda mana, dan dalam urutan apa.

| Kolom        | Tipe                 | Keterangan                                        |
| ------------ | -------------------- | ------------------------------------------------- |
| `id`         | uuid PK              |                                                   |
| `sectionKey` | `HomepageSectionKey` | Section tujuan                                    |
| `productId`  | FK Product           | `onDelete: Cascade`                               |
| `position`   | Int = 0              | Urutan dalam section (indeks array saat disimpan) |

**Index:** `[sectionKey, position]` (composite — persis pola query pembacaan), `productId`

Tabel ini **dihapus seluruhnya lalu diisi ulang** setiap kali admin menyimpan konfigurasi. Tidak ada unique constraint `[sectionKey, productId]`, jadi secara teori produk yang sama bisa muncul dua kali dalam satu section — tetapi UI (checkbox) mencegahnya.

`Cascade` pada `productId` berarti menghapus produk permanen otomatis mengeluarkannya dari beranda. Produk yang hanya dinonaktifkan tetap ada di tabel ini tetapi difilter saat render (`isActive`).

---

## `KidsConfig`

**Fungsi:** teks dan gambar hero + promo halaman `/kids`.

| Kolom              | Tipe     | Nilai contoh                            |
| ------------------ | -------- | --------------------------------------- |
| `id`               | Int = 1  |                                         |
| `heroBadge`        | String   | "Selamat Datang, Kecil!"                |
| `heroTitle`        | String   | "Dunia Buku yang Ceria dan Penuh Warna" |
| `heroDescription`  | String   | Paragraf pengantar                      |
| `heroImageUrl`     | String   | URL gambar hero                         |
| `promoBadge`       | String   | "Spesial"                               |
| `promoTitle`       | String   | "Paket Hadiah Si Kecil"                 |
| `promoDescription` | String   | Deskripsi promo bundling                |
| `promoImageUrl`    | String   | URL gambar promo                        |
| `updatedAt`        | DateTime |                                         |

Berbeda dari `HomepageConfig` yang hanya berisi URL gambar, tabel ini juga menyimpan **teks** — halaman `/kids` memang dirancang agar seluruh copy-nya bisa diubah admin. Semua field punya fallback hardcoded di halaman.

---

## `KidsSectionProduct`

**Fungsi:** produk untuk dua section halaman `/kids`.

| Kolom        | Tipe             | Keterangan             |
| ------------ | ---------------- | ---------------------- |
| `id`         | uuid PK          |                        |
| `sectionKey` | `KidsSectionKey` | `POPULAR` / `DISCOUNT` |
| `productId`  | FK Product       | `onDelete: Cascade`    |
| `position`   | Int = 0          | Urutan                 |

**Index:** `[sectionKey, position]`, `productId`

Struktur dan perilakunya identik dengan `HomepageSectionProduct` (delete-all lalu insert-ulang, fallback 8 produk terbaru). Dipisah menjadi dua tabel karena enum key-nya berbeda dan agar konfigurasi beranda dan kids bisa disimpan independen.

---

# I. POS

## `POSSession`

**Fungsi (rencana):** audit shift kasir — kapan buka, kapan tutup, uang kas awal & akhir.

| Kolom           | Tipe      | Keterangan                    |
| --------------- | --------- | ----------------------------- |
| `id`            | uuid PK   |                               |
| `cashierUserId` | FK User   | `onDelete: Cascade`           |
| `openedAt`      | DateTime  | Waktu buka shift              |
| `closedAt`      | DateTime? | `null` = shift masih berjalan |
| `openingCash`   | Int       | Kas awal                      |
| `closingCash`   | Int?      | Kas akhir saat tutup          |
| `notes`         | String?   | Catatan selisih, dsb.         |

**Index:** `[cashierUserId, openedAt]`

⚠️ **Tabel ini belum dipakai oleh kode mana pun.** Tidak ada endpoint, UI, maupun query yang menyentuhnya, dan `Order` tidak punya FK ke `POSSession` (hanya `posCashierUserId` langsung ke `User`). Komentar di `prisma/schema.prisma` menyatakan tabel ini boleh dihapus bila audit shift ternyata di luar cakupan:

> `// Optional: audit trail for POS cashier shifts. Can be dropped if shift auditing turns out to be out of scope.`

---

# J. Notifikasi

## `Notification`

**Fungsi:** antrean + jejak audit semua notifikasi keluar, dengan dukungan retry.

| Kolom              | Tipe                             | Keterangan                                                                     |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------ |
| `id`               | uuid PK                          |                                                                                |
| `channel`          | `NotificationChannel`            | `EMAIL` berfungsi; `WHATSAPP` langsung `FAILED`                                |
| `recipient`        | String                           | Alamat email tujuan (disalin, bukan FK — tetap benar walau email user berubah) |
| `template`         | `NotificationTemplate`           | Menentukan renderer subject + HTML                                             |
| `relatedOrderId`   | FK Order?                        | `onDelete: SetNull`                                                            |
| `relatedUserId`    | FK User?                         | `onDelete: SetNull`                                                            |
| `payloadJson`      | Json                             | Variabel template, mis. `{ orderNumber, receiverName, total }`                 |
| `status`           | `NotificationStatus` = `PENDING` |                                                                                |
| `providerId`       | String?                          | ID pesan dari Resend (untuk pelacakan di dashboard provider)                   |
| `providerResponse` | String?                          | Disiapkan untuk menyimpan respons mentah. **Belum diisi kode**                 |
| `error`            | String?                          | Pesan kegagalan terakhir                                                       |
| `attempts`         | Int = 0                          | Jumlah percobaan kirim. Maksimal 3                                             |
| `nextRetryAt`      | DateTime?                        | Jadwal percobaan berikutnya. `null` = tidak akan dicoba lagi                   |
| `sentAt`           | DateTime?                        | Waktu berhasil terkirim                                                        |
| `createdAt`        | DateTime                         |                                                                                |

**Index:** `[status, createdAt]` (daftar admin), `[status, nextRetryAt]` (query cron retry)

Kedua composite index dipilih persis mengikuti dua pola query yang ada: admin memfilter status lalu mengurutkan tanggal; cron memfilter `status = FAILED` lalu `nextRetryAt <= now`.

`payloadJson` memakai tipe `Json` supaya setiap template bisa punya bentuk data sendiri tanpa menambah kolom. Konsekuensinya tidak ada type-safety di level database — pemetaannya dijaga TypeScript di `renderEmail`.

Detail alur & jadwal retry: [06-flow-bisnis.md § 11](./06-flow-bisnis.md#11-flow-notifikasi-email).

---

# K. Voucher

## `Voucher`

**Fungsi:** kode promo dengan aturan yang lengkap: tipe, nilai, batas, kanal, kuota, periode.

| Kolom             | Tipe                     | Keterangan                                                             |
| ----------------- | ------------------------ | ---------------------------------------------------------------------- |
| `id`              | uuid PK                  |                                                                        |
| `code`            | String **unique**        | Selalu di-uppercase oleh Zod transform. Maks 30 karakter               |
| `description`     | String?                  | Keterangan internal, tampil di tabel admin                             |
| `type`            | `VoucherType`            | `PERCENT` atau `FIXED`                                                 |
| `value`           | Int                      | Persentase (≤100) atau nominal rupiah                                  |
| `maxDiscount`     | Int?                     | Batas atas diskon. **Hanya sah untuk `PERCENT`**                       |
| `minPurchase`     | Int = 0                  | Subtotal minimum agar voucher berlaku                                  |
| `channel`         | `VoucherChannel` = `ALL` | Membatasi ke online / POS / keduanya                                   |
| `quota`           | Int?                     | Total pemakaian maksimum. `null` = tanpa batas                         |
| `usedCount`       | Int = 0                  | Di-increment **di dalam transaksi pembuatan pesanan** setelah row lock |
| `perUserLimit`    | Int?                     | Batas per member. `null` = tanpa batas. **Tidak berlaku untuk guest**  |
| `startsAt`        | DateTime?                | `null` = berlaku sejak kapan pun                                       |
| `expiresAt`       | DateTime?                | `null` = tidak kedaluwarsa                                             |
| `isActive`        | Boolean = true           | Cara mematikan voucher yang sudah beredar                              |
| `createdByUserId` | FK User                  | **`onDelete: Restrict`** — admin pembuat tidak bisa dihapus            |
| `createdAt`       | DateTime                 |                                                                        |
| `updatedAt`       | DateTime                 |                                                                        |

**Relasi:** `orders`, `redemptions`

**Tanpa index tambahan.** `code` sudah unique (terindeks otomatis), dan volume voucher diasumsikan kecil sehingga filter admin (`channel`, `isActive`) cukup dilayani full scan.

`Restrict` pada `createdByUserId` memastikan riwayat "siapa membuat voucher ini" tidak pernah hilang.

Penghapusan ditolak `409` bila `usedCount > 0` — gunakan `isActive = false`.

---

## `VoucherRedemption`

**Fungsi:** catatan setiap pemakaian voucher, sekaligus dasar penegakan `perUserLimit` dan statistik voucher.

| Kolom            | Tipe              | Keterangan                                                |
| ---------------- | ----------------- | --------------------------------------------------------- |
| `id`             | uuid PK           |                                                           |
| `voucherId`      | FK Voucher        | `onDelete: Cascade`                                       |
| `orderId`        | String **unique** | **1-1 dengan Order** — satu pesanan maksimal satu voucher |
| `userId`         | FK User?          | `null` untuk guest & POS. `onDelete: SetNull`             |
| `discountAmount` | Int               | Nominal diskon yang benar-benar diberikan                 |
| `createdAt`      | DateTime          |                                                           |

**Index:** `[voucherId, userId]` — persis kebutuhan query `perUserLimit`

**Unique `orderId`** menegakkan aturan bisnis "satu voucher per pesanan" di level database, bukan hanya di kode.

Ada redundansi yang disengaja: `Order` juga menyimpan `voucherId`, `voucherCode`, dan `voucherDiscount`. `Order` menyimpannya untuk tampilan/laporan tanpa join; `VoucherRedemption` ada sebagai catatan pemakaian yang bisa di-`count`/`sum` per voucher dan per user secara efisien.

---

# L. Pembayaran

## `PaymentSession`

**Fungsi:** menyimpan token Snap Midtrans dan status transaksi terakhir untuk satu pesanan.

| Kolom                   | Tipe              | Keterangan                                                          |
| ----------------------- | ----------------- | ------------------------------------------------------------------- |
| `id`                    | uuid PK           |                                                                     |
| `orderId`               | String **unique** | 1-1 dengan Order. `onDelete: Cascade`                               |
| `snapToken`             | String            | Token untuk `window.snap.pay(token)`                                |
| `snapRedirectUrl`       | String            | URL halaman pembayaran Midtrans (fallback bila popup gagal)         |
| `vaNumber`              | String?           | Nomor Virtual Account, bila metodenya transfer bank                 |
| `lastTransactionStatus` | String?           | Nilai mentah dari Midtrans: `pending`, `settlement`, `expire`, dst. |
| `expiresAt`             | DateTime?         | Dibuat `now + 24 jam`. Menentukan apakah token boleh dipakai ulang  |
| `createdAt`             | DateTime          |                                                                     |
| `updatedAt`             | DateTime          |                                                                     |

**Tanpa index tambahan** — `orderId` unique sudah cukup, karena tabel ini selalu diakses lewat `orderId`.

`upsert` dipakai saat membuat sesi: bila token lama masih berlaku (`expiresAt > now`) endpoint mengembalikannya tanpa memanggil Midtrans lagi; bila kedaluwarsa, transaksi Snap baru dibuat dan barisnya diperbarui.

`lastTransactionStatus` **selalu** diperbarui oleh webhook/polling, bahkan ketika status pesanan tidak berubah — sehingga admin/developer bisa melihat kondisi terakhir di sisi Midtrans.

---

## `WebhookLog`

**Fungsi:** log webhook masuk + **mekanisme idempotensi**.

| Kolom             | Tipe              | Keterangan                                                                 |
| ----------------- | ----------------- | -------------------------------------------------------------------------- |
| `id`              | uuid PK           |                                                                            |
| `provider`        | String            | `'midtrans'`. Kolom teks agar provider lain bisa ditambahkan tanpa migrasi |
| `providerEventId` | String **unique** | `"<transaction_id>:<transaction_status>"`                                  |
| `payload`         | Json              | Body request mentah — untuk debugging & audit                              |
| `processedAt`     | DateTime?         | Diisi setelah pemrosesan selesai. `null` = gagal di tengah jalan           |
| `createdAt`       | DateTime          |                                                                            |

**Index:** `[provider, createdAt]`

**Cara idempotensi bekerja:** webhook mencoba `INSERT` baris ini **sebelum** memproses apa pun. Bila Prisma melempar `P2002` (pelanggaran unique), berarti event itu sudah pernah diproses, dan handler langsung membalas `200 { received: true }` tanpa efek samping. Midtrans boleh mengirim ulang notifikasi sebanyak apa pun tanpa risiko pesanan diproses ganda.

`providerEventId` menggabungkan `transaction_id` **dan** `transaction_status` karena satu transaksi mengirim beberapa notifikasi selama siklus hidupnya (`pending` → `settlement`); masing-masing perlu diproses tepat sekali.

Perbedaan `createdAt` dan `processedAt` menandai webhook yang gagal di tengah — berguna saat investigasi.

---

# M. Ringkasan Semua Tabel

| #   | Tabel                       | Domain          | Baris tumbuh seiring                     | Punya `updatedAt` |
| --- | --------------------------- | --------------- | ---------------------------------------- | :---------------: |
| 1   | `User`                      | Auth            | jumlah pendaftar                         |        ✅         |
| 2   | `Session`                   | Auth            | jumlah login                             |        ✅         |
| 3   | `PasswordResetToken`        | Auth            | permintaan reset                         |        ✅         |
| 4   | `Category`                  | Katalog         | dikelola admin (sedikit)                 |        ❌         |
| 5   | `Tag`                       | Katalog         | dikelola admin (belum dipakai)           |        ❌         |
| 6   | `Product`                   | Katalog         | ukuran katalog                           |        ✅         |
| 7   | `ProductImage`              | Katalog         | ≤ 8 × jumlah produk                      |        ❌         |
| 8   | `ProductTag`                | Katalog (pivot) | produk × tag                             |        ❌         |
| 9   | `CategoryProduct`           | Katalog (pivot) | produk × kategori                        |        ❌         |
| 10  | `Cart`                      | Keranjang       | pengunjung aktif (dihapus saat checkout) |        ✅         |
| 11  | `CartItem`                  | Keranjang       | item di keranjang aktif                  |        ✅         |
| 12  | `City`                      | Pengiriman      | jumlah kota terlayani                    |        ❌         |
| 13  | `Receiver`                  | Pengiriman      | alamat tersimpan member                  |        ✅         |
| 14  | `Order`                     | Pesanan         | **volume transaksi**                     |        ✅         |
| 15  | `OrderItem`                 | Pesanan         | **item per transaksi**                   |        ❌         |
| 16  | `OrderStatusHistory`        | Pesanan         | **perubahan status**                     |        ❌         |
| 17  | `AffiliateProfile`          | Afiliasi        | jumlah afiliasi                          |        ❌         |
| 18  | `AffiliateProductSelection` | Afiliasi        | afiliasi × produk pilihan                |        ❌         |
| 19  | `AffiliateCommissionRate`   | Afiliasi        | ≤ jumlah produk                          |        ✅         |
| 20  | `AffiliateClick`            | Afiliasi        | **traffic afiliasi (tercepat)**          |        ❌         |
| 21  | `AffiliateConversion`       | Afiliasi        | pesanan berkomisi                        |        ❌         |
| 22  | `AffiliatePayout`           | Afiliasi        | batch payout                             |        ❌         |
| 23  | `StoreSetting`              | Konfigurasi     | **selalu 1 baris**                       |        ✅         |
| 24  | `HomepageConfig`            | Konfigurasi     | **selalu 1 baris**                       |        ✅         |
| 25  | `HomepageSectionProduct`    | Konfigurasi     | 6 section × produk pilihan               |        ❌         |
| 26  | `KidsConfig`                | Konfigurasi     | **selalu 1 baris**                       |        ✅         |
| 27  | `KidsSectionProduct`        | Konfigurasi     | 2 section × produk pilihan               |        ❌         |
| 28  | `POSSession`                | POS             | **belum dipakai**                        |        ❌         |
| 29  | `Notification`              | Notifikasi      | **email keluar**                         |        ❌         |
| 30  | `Voucher`                   | Voucher         | kampanye promo                           |        ✅         |
| 31  | `VoucherRedemption`         | Voucher         | pemakaian voucher                        |        ❌         |
| 32  | `PaymentSession`            | Pembayaran      | ≤ jumlah pesanan online                  |        ✅         |
| 33  | `WebhookLog`                | Pembayaran      | **notifikasi Midtrans**                  |        ❌         |

Tabel yang **belum dipakai kode sama sekali:** `POSSession`. Tabel yang **ada tetapi belum ada UI/seed-nya:** `Tag`, `AffiliatePayout`, `StoreSetting` (tanpa seed).

Untuk diagram relasinya, lihat [08-erd.md](./08-erd.md).
