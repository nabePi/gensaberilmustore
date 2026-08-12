# 09 — Referensi API

Semua endpoint adalah **Route Handler** Next.js di `src/app/api/**`, ditambah satu route handler di luar `/api` (`GET /r/[code]`).

## Konvensi Umum

### Format respons

```jsonc
// Sukses
{ ...data }                                                  // 200 / 201
{ "items": [...], "total": 0, "page": 1, "limit": 20 }        // list dengan paging
// 204 No Content — DELETE / logout yang berhasil

// Gagal validasi Zod
{ "error": "Validasi gagal", "issues": { "namaField": ["pesan"] } }   // 400

// Gagal lain
{ "error": "Pesan dalam bahasa Indonesia" }                   // 401 / 403 / 404 / 409 / 429
```

### Kode status yang dipakai

| Kode  | Kapan                                                                                   |
| ----- | --------------------------------------------------------------------------------------- |
| `200` | Sukses (GET, PUT, PATCH, POST non-create)                                               |
| `201` | Resource baru dibuat (POST create)                                                      |
| `204` | Sukses tanpa body (DELETE, logout)                                                      |
| `400` | Validasi gagal / aturan bisnis dilanggar (stok, voucher, transisi status)               |
| `401` | Tanpa sesi / sesi tidak valid / signature webhook salah / cron secret salah             |
| `403` | Sesi ada tetapi role tidak berhak; reset pesanan di production                          |
| `404` | Resource tidak ditemukan **atau** bukan milik pemanggil (disamarkan sengaja)            |
| `409` | Konflik: email/SKU/kode voucher duplikat, kategori/kota masih dipakai, voucher terpakai |
| `429` | Rate limit terlampaui (dengan header `Retry-After`)                                     |

Perhatikan pola **404 untuk resource yang bukan milik pemanggil** (mis. pesanan orang lain). Ini disengaja agar tidak membocorkan keberadaan resource tersebut.

### Kolom autentikasi pada tabel di bawah

| Label       | Artinya                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| **Publik**  | Tanpa sesi                                                              |
| **Member**  | Butuh cookie `session` (role apa pun)                                   |
| **Pemilik** | Butuh cookie `session` **dan** resource harus milik user tersebut       |
| **Admin**   | Butuh cookie `admin_session` **dan** `role === 'ADMIN'`                 |
| **Khusus**  | Mekanisme sendiri (signature webhook, cron secret, kepemilikan orderId) |

---

# A. Autentikasi

## `POST /api/auth/register`

**Auth:** Publik · **Rate limit:** — · Membuat sesi otomatis.

Request:

```json
{
  "name": "Wahyu",
  "email": "a@b.com",
  "phone": "0812...",
  "whatsappNumber": "08123456789",
  "password": "rahasia123",
  "confirmPassword": "rahasia123"
}
```

| Field             | Aturan                                            |
| ----------------- | ------------------------------------------------- |
| `name`            | min 3 karakter                                    |
| `email`           | format email valid, harus belum terdaftar         |
| `phone`           | opsional                                          |
| `whatsappNumber`  | wajib, regex `^(?:\+62\|62\|0)8[1-9][0-9]{6,10}$` |
| `password`        | min 8 karakter, mengandung huruf **dan** angka    |
| `confirmPassword` | harus sama dengan `password`                      |

Respons `201`: `{ "user": { "id", "email", "name" }, "token" }` + `Set-Cookie: session` (1 hari).
Error: `409 { "error": "Email sudah terdaftar" }`.

## `POST /api/auth/login`

**Auth:** Publik · **Rate limit:** 10 / 15 menit / IP

Request: `{ "email", "password", "remember"?: boolean }`

Respons `200`: `{ "user": { "id", "email", "name", "role" }, "token" }` + `Set-Cookie: session` (1 hari, atau 30 hari bila `remember: true`).

Error:

- `401 { "error": "Email atau password salah" }` — email tidak ada, password salah, **atau** `role === 'ADMIN'`
- `429 { "error": "Terlalu banyak percobaan login, coba lagi nanti" }` + `Retry-After`

## `POST /api/auth/logout`

**Auth:** Publik (idempoten)

Menghapus baris `Session` yang bersangkutan. Respons `204` + cookie `session` dikosongkan.

## `POST /api/auth/admin/login`

**Auth:** Publik · **Rate limit:** 5 / 15 menit / IP

Request: `{ "email", "password" }` (tidak ada opsi `remember`)

Respons `200` + `Set-Cookie: admin_session` (1 hari). Menolak `401` bila `role !== 'ADMIN'`.

## `POST /api/auth/admin/logout`

**Auth:** Publik (idempoten). Respons `204` + cookie `admin_session` dikosongkan.

## `GET /api/auth/session`

**Auth:** Publik

Respons `200`: `{ "user": { "id", "email", "name", "role", "avatarUrl" } | null }`.

Dipakai halaman checkout untuk mendeteksi apakah pengunjung login.

## `POST /api/auth/forgot-password`

**Auth:** Publik · **Rate limit:** 3 / 60 menit / **email**

Request: `{ "email" }`

Respons **selalu** `200 { "message": "Jika email terdaftar, tautan reset dikirim" }` — baik email ada, tidak ada, maupun rate limit terlampaui.

Bila email ada dan belum kena rate limit: membuat `PasswordResetToken` (TTL 1 jam, disimpan sebagai SHA-256) dan mengirim email berisi `/reset-password?token=<raw>`.

## `POST /api/auth/reset-password`

**Auth:** Publik

Request: `{ "token", "password", "confirmPassword" }`

Aturan password sama dengan registrasi.

Respons `200 { "message": "Password berhasil direset" }`. Dalam satu transaksi: memperbarui `passwordHash`, menandai token `usedAt`, dan **menghapus semua `Session` milik user**.

Error: `400 { "error": "Token invalid/expired" }` — token tidak ada, sudah dipakai, atau kedaluwarsa.

---

# B. Katalog & Pencarian

## `GET /api/products`

**Auth:** Publik

Query (`listProductsQuerySchema`):

| Param      | Tipe                                                 | Default  |
| ---------- | ---------------------------------------------------- | -------- |
| `page`     | int ≥ 1                                              | `1`      |
| `limit`    | int 1–60                                             | `20`     |
| `q`        | string (full-text, semua kata harus cocok / AND)     | —        |
| `category` | slug kategori                                        | —        |
| `tag`      | slug tag                                             | —        |
| `minPrice` | int ≥ 0 (dibandingkan ke `finalPrice`)               | —        |
| `maxPrice` | int ≥ 0                                              | —        |
| `inStock`  | `'true'` \| `'false'`                                | —        |
| `sort`     | `newest` \| `price_asc` \| `price_desc` \| `popular` | `newest` |

Validasi silang: `minPrice <= maxPrice`.

Respons `200`:

```json
{ "items": [{ "id", "sku", "slug", "title", "subtitle", "author", "price",
              "discountPercent", "finalPrice", "stock", "ribbonType", "ribbonText",
              "primaryImageUrl", "categories": ["Nama Kategori"] }],
  "total": 42, "page": 1, "limit": 20 }
```

Selalu memfilter `isActive: true`. `sort=popular` mengurutkan berdasarkan **jumlah baris `OrderItem`** (bukan total kuantitas).

## `GET /api/products/[slug]`

**Auth:** Publik

Respons `200`: objek produk lengkap — `images[]` (urut primary lalu position), `categories[]`, `tags[]`, `publisher` (alias `imprint`), `tocText`, `highlightsText`, dan `relatedProducts[]` (maks 8 produk aktif yang berbagi minimal satu kategori).

Error: `404 { "error": "Produk tidak ditemukan" }` — termasuk bila `isActive = false`.

## `GET /api/categories`

**Auth:** Publik

Respons `200`: `{ "categories": [...] }` dalam bentuk **pohon** — setiap node punya `{ id, name, slug, parentId, position, children: [...] }`. Hanya kategori `isActive: true`, urut `position`.

## `GET /api/search/suggest?q=<min 2 karakter>`

**Auth:** Publik · **Rate limit:** 100 / menit / IP

Respons `200`: `{ "suggestions": [{ "id", "slug", "title", "price", "finalPrice", "imageUrl" }] }` — maksimal 8.

Implementasi memakai raw SQL Postgres: pencarian prefix (`term:*`) atas `to_tsvector(title) || to_tsvector(author)` dengan ranking `ts_rank`, lalu urutan hasil ranking dipertahankan saat mengambil detail produk.

Error: `400` bila `q` < 2 karakter · `429` bila rate limit terlampaui.

## `GET /api/shipping/cities?q=<opsional>`

**Auth:** Publik · **Cache:** `public, max-age=300`

Respons `200`: `{ "items": [{ "id", "name", "province", "shippingCost" }] }` — hanya `isActive: true`, urut nama.

---

# C. Keranjang

Semua endpoint keranjang bekerja untuk guest maupun member. Guest diidentifikasi cookie `gsb_cart_guest`, yang **selalu ikut dikirim** pada respons (termasuk respons error) agar keranjang tidak hilang.

## `GET /api/cart`

**Auth:** Publik

Respons `200`:

```json
{ "items": [{ "id", "productId", "slug", "title", "imageUrl", "priceSnapshot",
              "quantity", "lineTotal", "flag": "out_of_stock" | "price_changed" | null }],
  "subtotal": 150000, "itemCount": 2 }
```

## `POST /api/cart/items`

**Auth:** Publik

Request: `{ "productId": "<uuid>", "quantity": 1 }` (integer > 0)

Kuantitas bersifat **akumulatif** — bila produk sudah ada di keranjang, kuantitas ditambahkan.

Respons `201`: seluruh keranjang ter-serialisasi.

Error:

- `404 { "error": "Produk tidak ditemukan" }` — produk tidak ada atau `isActive = false`
- `400 { "issues": { "quantity": ["Stok tidak mencukupi"] } }` — dicek terhadap kuantitas total

## `PATCH /api/cart/items/[itemId]`

**Auth:** Publik

Request: `{ "quantity": 3 }` (minimal 1)

Respons `200`: keranjang lengkap.
Error: `404` bila item tidak ada **atau** bukan milik keranjang pemanggil · `400` bila stok kurang.

## `DELETE /api/cart/items/[itemId]`

**Auth:** Publik

Respons `200`: keranjang lengkap (bukan 204, agar klien bisa langsung memperbarui subtotal).
Error: `404` bila item tidak ada atau bukan milik keranjang pemanggil.

## `POST /api/cart/merge`

**Auth:** Member

Menggabungkan keranjang guest (dari cookie) ke keranjang member: kuantitas dijumlahkan lalu dibatasi stok, `priceSnapshot` disegarkan, keranjang guest dihapus, cookie dihapus.

Respons `200`: keranjang member yang sudah tergabung.

> Endpoint ini berfungsi penuh tetapi **belum dipanggil** dari halaman login/signup.

---

# D. Voucher (Publik)

## `POST /api/vouchers/validate`

**Auth:** Publik (sesi opsional — dipakai untuk memeriksa `perUserLimit`)

Request:

```json
{
  "code": "WELCOME10",
  "subtotal": 150000,
  "channel": "ONLINE",
  "items": [{ "productId": "<uuid>", "quantity": 1 }]
}
```

`code` otomatis di-uppercase. `channel` wajib: `ONLINE` atau `POS`. `items` opsional dan saat ini tidak dipakai logika validasi.

Respons valid `200`:

```json
{
  "valid": true,
  "voucherId": "...",
  "code": "WELCOME10",
  "type": "PERCENT",
  "discountAmount": 15000
}
```

Respons tidak valid `200` (bukan 4xx — ini hasil pemeriksaan, bukan error):

```json
{ "valid": false, "reason": "MIN_PURCHASE_NOT_MET" }
```

Nilai `reason` yang mungkin: `NOT_FOUND` · `INACTIVE` · `NOT_STARTED` · `EXPIRED` · `WRONG_CHANNEL` · `MIN_PURCHASE_NOT_MET` · `QUOTA_EXCEEDED` · `USER_LIMIT_REACHED`.

⚠️ Endpoint ini **tidak** memakai voucher — `usedCount` tidak berubah. Pemakaian nyata terjadi saat pembuatan pesanan.

---

# E. Pesanan (Member & Guest)

## `POST /api/orders`

**Auth:** Publik (guest checkout didukung)

Dua bentuk request:

```jsonc
// Mode alamat tersimpan (khusus member)
{ "useReceiverId": "<uuid>", "note": "...", "paymentMethod": "BANK_TRANSFER",
  "voucherCode": "WELCOME10", "affiliateCode": "WAHYUS4821" }

// Mode manual
{ "receiverName": "...", "receiverPhone": "...", "receiverEmail": "...",
  "receiverAddress": "...", "cityId": "<uuid>", "note": "...",
  "paymentMethod": "QRIS", "voucherCode": "...", "affiliateCode": "..." }
```

| Field           | Aturan                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| `paymentMethod` | wajib, salah satu dari `BANK_TRANSFER` \| `EWALLET` \| `QRIS`                   |
| `note`          | opsional, maks 500 karakter                                                     |
| `voucherCode`   | opsional                                                                        |
| `affiliateCode` | opsional; kode tidak valid **diabaikan tanpa error**                            |
| lainnya         | `useReceiverId` **atau** kelima field manual harus lengkap (validasi `.refine`) |

Respons `201`: `{ "orderId": "<uuid>", "orderNumber": "ORD-20260812-483920" }`

Error `400` yang mungkin (semuanya `{ "error": "..." }`):

| Pesan                                                 | Sebab                                      |
| ----------------------------------------------------- | ------------------------------------------ |
| `Keranjang Anda kosong`                               | Tidak ada `CartItem`                       |
| `useReceiverId hanya berlaku untuk member yang login` | Guest mengirim `useReceiverId`             |
| `Alamat penerima tidak ditemukan`                     | Receiver tidak ada / bukan milik user      |
| `Email penerima wajib diisi`                          | Receiver tanpa email & body tanpa email    |
| `Kota tujuan tidak valid`                             | City tidak ada atau `isActive = false`     |
| `Stok produk "<judul>" tidak mencukupi`               | Cek pra-transaksi atau race saat decrement |
| pesan alasan voucher                                  | Voucher gagal validasi                     |

Detail lengkap alur transaksinya: [06-flow-bisnis.md § 4](./06-flow-bisnis.md#4-flow-checkout--pembuatan-pesanan).

## `GET /api/orders`

**Auth:** Member (otomatis difilter `userId`)

Query: `page` (≥1, default 1) · `limit` (1–60, default 20) · `status` (salah satu `OrderStatus`)

Respons `200`:

```json
{ "items": [{ "id", "orderNumber", "status", "total", "itemCount", "thumbnailUrl", "createdAt" }],
  "total": 12, "page": 1, "limit": 20 }
```

## `GET /api/orders/[id]`

**Auth:** Pemilik

Respons `200`: bentuk `serializeOrderDetail` —

```jsonc
{ "id", "orderNumber", "status", "source", "createdAt", "updatedAt",
  "receiver": { "name", "phone", "email", "address", "city", "note" },
  "pricing": { "subtotal", "shippingCost", "voucherDiscount", "manualDiscount", "discount", "total" },
  "payment": { "method" },
  "voucher": { "code", "discount" } | null,
  "affiliate": { "code", "user": { "id", "name" } | null } | null,
  "member":   { "id", "name", "email" } | null,
  "items":   [{ "id", "productId", "title", "slug", "imageUrl", "priceSnapshot",
                "discountPercentSnapshot", "quantity", "lineTotal" }],
  "history": [{ "id", "fromStatus", "toStatus", "note", "createdAt",
                "changedByUser": { "id", "name" } | null }] }
```

Error: `404 { "error": "Order tidak ditemukan" }` — juga bila pesanan milik orang lain.

## `POST /api/orders/[id]/cancel`

**Auth:** Pemilik

Respons `200`: detail pesanan terbaru (bentuk sama dengan GET detail).

Error:

- `404 { "error": "Order tidak ditemukan" }`
- `400 { "error": "Order tidak bisa dibatalkan" }` — status bukan `AWAITING_PAYMENT`

Efek samping: stok dikembalikan, `AffiliateConversion` `PENDING` menjadi `REJECTED`, baris riwayat status dibuat dengan `changedByUserId` = member.

---

# F. Pembayaran

## `POST /api/payment/create`

**Auth:** Khusus — pemilik pesanan, **atau** siapa pun bila `order.userId === null` (pesanan guest)

Request: `{ "orderId": "<uuid>" }`

Respons `200`: `{ "snapToken": "...", "redirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/..." }`

Bila `PaymentSession` yang ada masih berlaku (`expiresAt > now`), token lama dikembalikan tanpa memanggil Midtrans. Bila tidak, transaksi Snap baru dibuat dan `PaymentSession` di-`upsert` dengan `expiresAt = now + 24 jam`.

Metode yang diaktifkan di Snap: `bank_transfer`, `gopay`, `qris`, `shopeepay`.

Error: `404 "Order tidak ditemukan"` · `400 "Order tidak menunggu pembayaran"`.

## `GET /api/payment/status/[orderId]`

**Auth:** Khusus (sama seperti di atas)

Bila status pesanan masih `AWAITING_PAYMENT`, endpoint **aktif menanyakan** status ke Midtrans CoreApi dan menerapkan hasilnya (bisa mengubah pesanan menjadi `PAID` atau `CANCELLED`). Kegagalan panggilan ke Midtrans ditangani `.catch(() => null)` dan tidak menghasilkan error.

Respons `200`:

```json
{
  "orderStatus": "PAID",
  "transactionStatus": "settlement",
  "vaNumber": "1234567890",
  "expireAt": "2026-08-13T07:00:00.000Z"
}
```

> Endpoint ini belum dipakai halaman mana pun — berguna bila kelak halaman `/payment/success` diberi polling.

## `POST /api/webhooks/payment`

**Auth:** Khusus — verifikasi signature SHA-512

Request (dari Midtrans):

```json
{
  "order_id": "ORD-20260812-483920",
  "status_code": "200",
  "gross_amount": "233000.00",
  "signature_key": "<sha512>",
  "transaction_status": "settlement",
  "transaction_id": "<uuid midtrans>",
  "fraud_status": "accept",
  "va_numbers": [{ "bank": "bca", "va_number": "1234567890" }]
}
```

Verifikasi: `sha512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY) === signature_key`.

Pemrosesan:

1. `INSERT WebhookLog` dengan `providerEventId = "<transaction_id>:<transaction_status>"`. Bila unique constraint dilanggar (`P2002`) → langsung `200 { "received": true }` (idempoten).
2. Cari `Order WHERE orderNumber = order_id`.
3. Terapkan status (`applyMidtransTransactionStatus`) dalam transaksi.
4. Kirim notifikasi pending untuk pesanan tersebut.
5. Tandai `WebhookLog.processedAt`.

Respons `200 { "received": true }`.
Error: `400 "Payload tidak valid"` · `401 "Signature tidak valid"` · `404 "Order tidak ditemukan"`.

Pemetaan status: `settlement`/`capture` (dan `fraud_status !== 'deny'`) → `PAID`; `deny`/`cancel`/`expire`/`failure` atau `fraud_status = 'deny'` → `CANCELLED`; status lain tidak mengubah pesanan.

---

# G. Member

Semua endpoint berikut dilindungi middleware (`/api/member/*`) **dan** `withAuth`.

## `GET /api/member/profile`

**Auth:** Member

Respons `200`: `{ "id", "name", "email", "phone", "whatsappNumber", "avatarUrl", "role", "createdAt" }`

## `PUT /api/member/profile`

**Auth:** Member

Request: `{ "name"?, "phone"?, "whatsappNumber"? }` — semuanya opsional, tetapi bila dikirim tidak boleh string kosong.

Respons `200`: profil terbaru. **`email` dan `role` tidak bisa diubah** lewat endpoint ini.

## `POST /api/member/profile/avatar`

**Auth:** Member · **Content-Type:** `multipart/form-data`

Field: `avatar` (File). Batas **2 MB**. Tipe harus JPEG/PNG/WebP (diverifikasi lewat magic byte, bukan `Content-Type`).

Respons `200`: `{ "avatarUrl": "/uploads/avatars/<userId>/<uuid>.jpg" }` (atau URL R2).

Avatar lama dihapus **setelah** yang baru tersimpan dan `User.avatarUrl` diperbarui.

Error `400`: `File foto wajib diunggah` · `Ukuran file maksimal 2MB` · `Tipe file harus JPEG, PNG, atau WEBP`.

## `DELETE /api/member/profile/avatar`

**Auth:** Member

Menghapus file (best-effort) dan menyetel `avatarUrl = null`. Respons `200 { "avatarUrl": null }`.

## `GET /api/member/receivers`

**Auth:** Member

Respons `200`: `{ "items": [...] }` — urut `isDefault DESC, updatedAt DESC`, masing-masing menyertakan `city: { name, shippingCost }`.

## `POST /api/member/receivers`

**Auth:** Member

Request:

```json
{
  "label": "Rumah",
  "name": "...",
  "phone": "...",
  "email": "...",
  "address": "...",
  "cityId": "<uuid>",
  "isDefault": true
}
```

`email` opsional; `label`, `name`, `phone`, `address`, `cityId` wajib.

Respons `201`: penerima baru + `city`.

Bila `isDefault: true`, semua penerima lain milik user di-set `false` dalam transaksi yang sama.

Error: `400 { "issues": { "cityId": ["Kota tidak ditemukan"] } }`.

## `PUT /api/member/receivers/[id]`

**Auth:** Pemilik

Request: semua field `POST` bersifat opsional (update parsial).

Respons `200`: penerima terbaru. Error `404 "Alamat tidak ditemukan"` bila bukan miliknya.

## `DELETE /api/member/receivers/[id]`

**Auth:** Pemilik

Respons `204`. Bila yang dihapus adalah default, penerima dengan `updatedAt` terbaru otomatis dipromosikan jadi default.

---

# H. Afiliasi (Member)

## `POST /api/affiliate/join`

**Auth:** Member

Request: `{ "payoutBankName", "payoutBankAccount", "payoutBankHolder" }` — ketiganya wajib.

Respons `201`: objek `AffiliateProfile` (termasuk `code`).

Efek samping dalam satu transaksi: buat profil dengan kode unik, promosikan `role` `BUYER` → `AFFILIATE`, antre notifikasi `AFFILIATE_JOIN`. Email dikirim setelah commit.

Error: `400 { "error": "Anda sudah terdaftar sebagai afiliasi" }`.

## `GET /api/affiliate/stats`

**Auth:** Member + harus punya `AffiliateProfile`

Respons `200`:

```json
{ "profile": { "code", "isActive" },
  "totalClicks": 120, "totalConversions": 8,
  "commissionPending": 250000, "commissionPaid": 100000,
  "productPerformance": [{ "productId", "title", "slug",
      "commissionRate": { "percent", "fixedAmount", "isActive" } | null,
      "revenueThisMonth": 750000 }] }
```

`commissionPending` = jumlah komisi berstatus `PENDING` **+** `APPROVED`. `revenueThisMonth` = jumlah `lineTotal` produk tersebut pada pesanan dengan `affiliateUserId = user.id` sejak awal bulan berjalan (tanpa filter status pesanan).

Error: `404 { "error": "Anda belum menjadi afiliasi" }` — dipakai halaman untuk menampilkan kartu onboarding.

## `GET /api/affiliate/products?q=<opsional>`

**Auth:** Member + harus punya `AffiliateProfile`

Respons `200`: `{ "items": [{ "id", "title", "slug", "finalPrice", "imageUrl", "commissionRate", "isSelected" }] }` — hanya produk `isActive`, urut judul.

## `PUT /api/affiliate/products` (alias: `POST`)

**Auth:** Member + harus punya `AffiliateProfile`

Request: `{ "productIds": ["<uuid>", "..."] }`

**Replace penuh:** dalam satu transaksi, semua `AffiliateProductSelection` milik profil dihapus lalu disisipkan ulang dari daftar yang dikirim. Mengirim array kosong menghapus semua pilihan.

Respons `200 { "success": true }`.

---

# I. Admin — Pesanan

## `GET /api/admin/orders`

**Auth:** Admin

Query (`listAdminOrdersQuerySchema` + penanganan `status` khusus):

| Param           | Tipe                                                                                                   | Default |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------- |
| `page`          | int ≥ 1                                                                                                | `1`     |
| `limit`         | int 1–100                                                                                              | `20`    |
| `q`             | cari `orderNumber` / `receiverName` / `receiverPhone`                                                  | —       |
| `status`        | **multi-value** — boleh diulang (`status=PAID&status=PACKED`) atau dipisah koma (`status=PAID,PACKED`) | —       |
| `source`        | `ONLINE` \| `POS` \| `ALL`                                                                             | `ALL`   |
| `dateFrom`      | date/datetime → `createdAt >=`                                                                         | —       |
| `dateTo`        | date/datetime → `createdAt <=`                                                                         | —       |
| `affiliateCode` | filter tepat pada `affiliateCode`                                                                      | —       |

Respons `200`:

```json
{ "items": [{ "id", "orderNumber", "status", "total", "itemCount", "thumbnailUrl",
              "createdAt", "receiverName", "receiverPhone", "source", "affiliateCode" }],
  "total": 340, "page": 1, "limit": 20,
  "aggregates": { "totalRevenue": 51200000, "totalOrders": 340 } }
```

`aggregates.totalRevenue` adalah `SUM(total)` atas **seluruh** hasil filter (bukan hanya halaman ini), termasuk pesanan `CANCELLED` bila tidak difilter keluar.

Error: `400 { "issues": { "status": ["Status tidak valid: XXX"] } }`.

## `GET /api/admin/orders/[id]`

**Auth:** Admin

Respons `200`: bentuk `serializeOrderDetail` yang sama dengan `GET /api/orders/[id]`, tetapi **tanpa** pembatasan kepemilikan.

## `PATCH /api/admin/orders/[id]/status`

**Auth:** Admin

Request: `{ "toStatus": "PACKED", "note": "opsional maks 500 karakter" }`

Respons `200`: detail pesanan terbaru.

Efek samping (dalam transaksi): update status + baris `OrderStatusHistory` dengan `changedByUserId` = admin + efek samping sesuai status (notifikasi, konversi afiliasi, pengembalian stok). Notifikasi dikirim setelah commit.

Error: `404 "Order tidak ditemukan"` · `400 "Transisi status dari X ke Y tidak diizinkan"`.

## `POST /api/admin/orders/bulk-status`

**Auth:** Admin

Request: `{ "orderIds": ["<uuid>", "..."], "toStatus": "SHIPPED" }` — 1 sampai **100** id.

Respons `200` (selalu, walau ada yang gagal):

```json
{
  "success": ["<uuid>", "..."],
  "failed": [
    { "id": "<uuid>", "reason": "Transisi status dari COMPLETED ke SHIPPED tidak diizinkan" }
  ]
}
```

Setiap pesanan diproses dalam transaksi tersendiri, sehingga kegagalan satu pesanan tidak menggagalkan lainnya.

## `GET /api/admin/orders/export`

**Auth:** Admin · **Respons:** `text/csv; charset=utf-8` + `Content-Disposition: attachment`

Query: sama dengan `GET /api/admin/orders`, **kecuali** `page` dan `limit` (di-`omit`). Batas keras **10.000 baris**.

Nama file: `orders-<YYYY-MM-DD>.csv`. Diawali **BOM UTF-8** agar Excel membaca karakter Indonesia dengan benar.

Kolom: `orderNumber, createdAt, status, source, receiverName, receiverPhone, receiverCity, subtotal, shippingCost, total, paymentMethod, affiliateCode, itemCount, itemsSummary`.

`itemsSummary` berformat `Judul A x2; Judul B x1`.

---

# J. Admin — Produk & Katalog

## `GET /api/admin/products`

**Auth:** Admin

| Param        | Tipe                                                      | Default |
| ------------ | --------------------------------------------------------- | ------- |
| `page`       | int ≥ 1                                                   | `1`     |
| `limit`      | int 1–60                                                  | `20`    |
| `q`          | cari `title` / `author` (contains, case-insensitive)      | —       |
| `categoryId` | uuid                                                      | —       |
| `stock`      | `instock` (>10) \| `lowstock` (1–10) \| `outofstock` (≤0) | —       |

Respons `200`: `{ "items": [{ "id", "sku", "slug", "title", "author", "price", "discountPercent", "finalPrice", "stock", "isActive", "primaryImageUrl", "categories": [{ "id", "name" }] }], "total", "page", "limit" }`

**Tidak memfilter `isActive`** — produk nonaktif ikut tampil agar bisa diaktifkan kembali.

## `POST /api/admin/products`

**Auth:** Admin

Request (`createProductSchema`):

| Field             | Aturan                                 |
| ----------------- | -------------------------------------- |
| `sku`             | wajib, unik                            |
| `title`           | wajib                                  |
| `subtitle`        | default `''`                           |
| `author`          | wajib                                  |
| `publisher`       | opsional → disimpan ke kolom `imprint` |
| `description`     | wajib                                  |
| `tocText`         | opsional (multi-baris)                 |
| `highlightsText`  | opsional (multi-baris)                 |
| `price`           | int > 0                                |
| `discountPercent` | int 0–90, default 0                    |
| `stock`           | int ≥ 0                                |
| `weightGram`      | int > 0                                |
| `pageCount`       | int > 0                                |
| `coverType`       | `SOFTCOVER` \| `HARDCOVER` \| `EBOOK`  |
| `publishYear`     | int 1900 – (tahun ini + 1)             |
| `categoryIds`     | array uuid, default `[]`               |
| `tagIds`          | array uuid, default `[]`               |
| `ribbonType`      | opsional `NEW` \| `BEST` \| `DISCOUNT` |
| `ribbonText`      | opsional                               |
| `isActive`        | boolean, default `true`                |

Server menghitung `finalPrice` dan `slug` sendiri; klien tidak boleh mengirimnya.

Respons `201`: produk lengkap dengan `categories[]`, `tags[]`, `images[]`.

Error: `409 { "issues": { "sku": ["SKU sudah digunakan"] } }` · `400 "Beberapa kategori tidak ditemukan"` / `"Beberapa tag tidak ditemukan"`.

## `GET /api/admin/products/[id]`

**Auth:** Admin

Respons `200`: produk lengkap (`images`, `categories`, `tags` sudah diratakan). Error `404 "Produk tidak ditemukan"`.

## `PUT /api/admin/products/[id]`

**Auth:** Admin

Request: semua field `POST` bersifat **opsional** (partial), ditambah:

| Field            | Fungsi                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `regenerateSlug` | `true` → slug dibuat ulang dari judul. Tanpa ini **slug tidak berubah** (menjaga URL/SEO stabil) |

`finalPrice` dihitung ulang bila `price` **atau** `discountPercent` dikirim. `categoryIds`/`tagIds` bila dikirim akan **menggantikan** seluruh relasi (delete-all lalu create) dalam satu transaksi.

Respons `200`: produk terbaru. Error `404` · `409` SKU duplikat · `400` kategori/tag tidak ditemukan.

## `DELETE /api/admin/products/[id]`

**Auth:** Admin

**Soft delete** — menyetel `isActive = false`, baris tidak dihapus. Respons `204`.

Ini penting karena `OrderItem.productId` memakai `SetNull`; menghapus permanen akan memutus tautan pesanan historis ke produk.

## `POST /api/admin/products/[id]/images`

**Auth:** Admin · **Content-Type:** `multipart/form-data`

Field: `image` (File, wajib) · `isPrimary` (`'true'` opsional) · `altText` (string opsional).

Batas: **5 MB** per file, maksimal **8 gambar per produk**. Tipe JPEG/PNG/WebP (magic byte).

Gambar pertama otomatis `isPrimary`. Menyetel primary akan mematikan primary lain dalam satu transaksi. `position` = jumlah gambar sebelumnya.

Respons `201`: objek `ProductImage`.
Error `400`: `File gambar wajib diunggah` · `Ukuran file maksimal 5MB` · `Maksimal 8 gambar per produk` · `Tipe file harus JPEG, PNG, atau WEBP`. Error `404`: produk tidak ditemukan.

## `DELETE /api/admin/products/[id]/images/[imageId]`

**Auth:** Admin

Menghapus baris + file fisik (best-effort). Bila yang dihapus adalah primary, gambar dengan `position` terkecil dipromosikan.

Respons `204`. Error `404 "Gambar tidak ditemukan"` (termasuk bila `imageId` bukan milik `productId` tersebut).

## `POST /api/admin/categories`

**Auth:** Admin

Request: `{ "name", "parentId"?: string|null, "position"?: number, "isActive"?: boolean }`

`slug` dibuat otomatis dari nama.

Respons `201`: kategori baru.
Error: `409 { "issues": { "name": ["Nama kategori sudah ada di level ini"] } }` — duplikat diperiksa **per level** (`parentId` yang sama), jadi "3-6 Tahun" boleh ada di bawah dua induk berbeda.

## `PUT /api/admin/categories/[id]`

**Auth:** Admin

Request: semua field opsional. Bila `name` atau `parentId` berubah, keunikan per level diperiksa ulang.

Respons `200`. Error `404 "Kategori tidak ditemukan"` · `409` duplikat nama.

## `DELETE /api/admin/categories/[id]`

**Auth:** Admin

Respons `204`.
Error: `409 { "error": "Kategori masih terhubung dengan <n> produk" }` — lepaskan produk dari kategori itu lebih dulu.

## `POST /api/admin/shipping/cities`

**Auth:** Admin

Request: `{ "name", "province", "shippingCost": number, "isActive"?: boolean }`

Respons `201`. (Pembacaan daftar kota memakai endpoint publik `GET /api/shipping/cities`.)

## `PUT /api/admin/shipping/cities/[id]`

**Auth:** Admin · Request: semua field opsional · Respons `200` · Error `404`.

## `DELETE /api/admin/shipping/cities/[id]`

**Auth:** Admin

Respons `204`.
Error: `409 { "error": "Kota masih digunakan pada alamat penerima yang tersimpan" }` — konsisten dengan `onDelete: Restrict` pada `Receiver.city`.

## `POST /api/admin/uploads`

**Auth:** Admin · **Content-Type:** `multipart/form-data`

Field: `image` (File). Batas 5 MB, tipe JPEG/PNG/WebP.

Respons `201`: `{ "url": "/uploads/misc/<uuid>.jpg" }` (atau URL R2). **Tidak** membuat baris database — dipakai untuk mendapatkan URL yang lalu disimpan di field konfigurasi.

---

# K. Admin — Member

## `GET /api/admin/members`

**Auth:** Admin

Query: `page` (≥1, default 1) · `limit` (1–60, default 20) · `q` (cari `name` / `email`)

Respons `200`: `{ "items": [{ "id", "name", "email", "phone", "role", "createdAt", "orderCount", "totalSpend" }], "total", "page", "limit" }`

Selalu mengecualikan `role = 'ADMIN'`. `orderCount`/`totalSpend` dihitung dari **seluruh** pesanan member (termasuk `CANCELLED`).

## `GET /api/admin/members/[id]`

**Auth:** Admin

Respons `200`: `{ "id", "name", "email", "phone", "whatsappNumber", "role", "createdAt", "orders": [20 pesanan terakhir] }`

Error `404 "Member tidak ditemukan"` — juga bila targetnya seorang ADMIN.

## `PATCH /api/admin/members/[id]`

**Auth:** Admin

Request: `{ "role": "BUYER" | "AFFILIATE" }` (tidak bisa menyetel `ADMIN`)

Respons `200`: `{ "id", "name", "email", "phone", "role", "createdAt" }`

Efek samping dalam transaksi:

| Perubahan                       | Yang terjadi                                                                |
| ------------------------------- | --------------------------------------------------------------------------- |
| → `AFFILIATE`, profil belum ada | Buat `AffiliateProfile` dengan kode unik baru, field bank **kosong** (`''`) |
| → `AFFILIATE`, profil sudah ada | `isActive = true` (kode lama dipakai kembali)                               |
| → `BUYER`                       | `isActive = false`; data klik/konversi tidak dihapus                        |

## `POST /api/admin/members/[id]/reset-password`

**Auth:** Admin

Membuat `PasswordResetToken` (TTL 1 jam) dan mengirim email `PASSWORD_RESET` ke member. Admin tidak melihat token maupun password.

Respons `200 { "message": "Tautan reset password telah dibuat" }`. Error `404 "Member tidak ditemukan"`.

---

# L. Admin — POS

## `POST /api/admin/pos/transactions`

**Auth:** Admin

Request:

```json
{
  "items": [{ "productId": "<uuid>", "quantity": 2 }],
  "paymentMethod": "POS_CASH",
  "customerName": "Budi",
  "customerPhone": "0812...",
  "note": "...",
  "voucherCode": "POSGROSIR",
  "manualDiscount": 5000,
  "manualDiscountReason": "Pelanggan tetap"
}
```

| Field                  | Aturan                                                 |
| ---------------------- | ------------------------------------------------------ |
| `items`                | minimal 1; `quantity` ≥ 1                              |
| `paymentMethod`        | `POS_CASH` \| `POS_QRIS` \| `POS_TRANSFER`             |
| `customerName`         | opsional → default `'Walk-in Customer'`                |
| `customerPhone`        | opsional → default `'-'`                               |
| `note`                 | opsional                                               |
| `voucherCode`          | opsional, otomatis uppercase, divalidasi channel `POS` |
| `manualDiscount`       | int ≥ 0, default 0; tidak boleh > subtotal             |
| `manualDiscountReason` | opsional                                               |

Respons `201`: `{ "orderId", "orderNumber" }`

Pesanan dibuat langsung dengan `status: 'PAID'`, `source: 'POS'`, `shippingCost: 0`, dan `posCashierUserId` = admin pemanggil. Karena tidak melewati `applyOrderStatusTransition`, **tidak** ada email dan **tidak** ada `AffiliateConversion`.

Error `400`: `Produk tidak ditemukan atau tidak aktif` · `Stok produk "<judul>" tidak mencukupi` · `Diskon manual tidak boleh melebihi subtotal` · pesan alasan voucher.

## `GET /api/admin/pos/transactions`

**Auth:** Admin

Query: `page` (≥1) · `limit` (1–60, default 20) · `dateFrom` (ISO datetime) · `dateTo` (ISO datetime) · `cashierId` (uuid)

Respons `200`: `{ "items": [bentuk serializeAdminOrderListItem], "total", "page", "limit" }` — selalu `source: 'POS'`.

## `GET /api/admin/pos/transactions/[id]/receipt?print=true`

**Auth:** Admin

Respons `200`:

```json
{ "order": { ...serializeOrderDetail },
  "store": { "name", "address", "phone" } | null }
```

Bila `?print=true`, kolom `Order.posReceiptPrintedAt` diperbarui.

Error `404 "Transaksi POS tidak ditemukan"` — juga bila `source !== 'POS'`.

> Versi JSON ini belum dipakai UI; halaman cetak `/admin/pos/receipt/[id]/print` membaca database langsung sebagai Server Component.

---

# M. Admin — Afiliasi

## `GET /api/admin/affiliates`

**Auth:** Admin

Query: `page` (≥1) · `limit` (1–60, default 20) · `q` (cari nama/email user)

Respons `200`: `{ "items": [{ "id", "code", "isActive", "joinedAt", "user": { "id", "name", "email" }, "totalClicks", "totalConversions", "commissionPending", "commissionPaid" }], "total", "page", "limit" }`

## `GET /api/admin/affiliates/[id]`

**Auth:** Admin

Respons `200`:

```json
{ "id", "code", "isActive", "joinedAt",
  "user": { "id", "name", "email", "phone" },
  "payout": { "bankName", "bankAccount", "bankHolder" },
  "products": [{ "productId", "title", "slug" }],
  "conversions": [{ "id", "orderNumber", "orderTotal", "commissionAmount", "status", "createdAt" }],
  "commissionByStatus": { "PENDING": 0, "APPROVED": 0, "PAID": 0, "REJECTED": 0 } }
```

`conversions` dibatasi 50 terbaru. `commissionByStatus` selalu memuat keempat kunci (diinisialisasi nol).

Error `404 "Afiliasi tidak ditemukan"`.

## `GET /api/admin/commission-rates`

**Auth:** Admin

Respons `200`: `{ "items": [{ "productId", "title", "sku", "finalPrice", "percent", "fixedAmount", "isActive", "updatedAt" }] }` — urut `updatedAt DESC`. `percent` dikonversi dari `Decimal` ke `number`.

## `PUT /api/admin/commission-rates/[productId]`

**Auth:** Admin

Request: `{ "percent": 10, "fixedAmount": null, "isActive": true }`

| Field         | Aturan                                                           |
| ------------- | ---------------------------------------------------------------- |
| `percent`     | number 0–100 (wajib)                                             |
| `fixedAmount` | int ≥ 0 atau `null`, opsional. Bila terisi mengalahkan `percent` |
| `isActive`    | boolean, default `true`                                          |

**Upsert** — endpoint yang sama untuk membuat maupun mengubah. `updatedByUserId` diisi otomatis.

Respons `200`: `{ "productId", "percent", "fixedAmount", "isActive", "updatedAt" }`. Error `404 "Produk tidak ditemukan"`.

## `GET /api/admin/affiliates/payouts`

**Auth:** Admin

Query: `page` · `limit` (1–60) · `status` (`PENDING`\|`PAID`\|`CANCELLED`) · `affiliateProfileId` (uuid)

Respons `200`: `{ "items": [{ "id", "affiliateProfileId", "affiliate": { "code", "name", "email" }, "periodStart", "periodEnd", "totalAmount", "status", "paidAt", "notes", "createdAt" }], "total", "page", "limit" }`

## `POST /api/admin/affiliates/payouts`

**Auth:** Admin

Request: `{ "affiliateProfileId": "<uuid>", "periodStart": "2026-08-01", "periodEnd": "2026-08-31" }`
Validasi: `periodStart <= periodEnd`.

Dalam satu transaksi: mengumpulkan `AffiliateConversion` berstatus `APPROVED` dalam periode itu, menjumlahkan komisinya, membuat `AffiliatePayout` (status `PENDING`), lalu **menandai konversi tersebut `PAID` + `paidAt`** sehingga tidak bisa masuk batch lain.

Respons `201`: objek payout.
Error: `404 "Afiliasi tidak ditemukan"` · `400 "Tidak ada komisi APPROVED pada periode ini"`.

## `PATCH /api/admin/affiliates/payouts/[id]`

**Auth:** Admin

Menandai payout `PAID` + `paidAt`, lalu mengirim email `AFFILIATE_PAYOUT` ke afiliasi.

Respons `200`: payout terbaru.
Error: `404 "Payout tidak ditemukan"` · `400 "Payout ini sudah diproses"` (status bukan `PENDING`).

---

# N. Admin — Voucher

## `GET /api/admin/vouchers`

**Auth:** Admin

Query: `page` · `limit` (1–60, default 20) · `q` (cari `code`) · `channel` (`ALL`\|`ONLINE`\|`POS`) · `isActive` (`'true'`\|`'false'`)

Respons `200`: `{ "items": [Voucher lengkap], "total", "page", "limit" }` — urut `createdAt DESC`.

## `POST /api/admin/vouchers`

**Auth:** Admin

Request:

```json
{
  "code": "welcome10",
  "description": "Diskon 10%",
  "type": "PERCENT",
  "value": 10,
  "maxDiscount": 50000,
  "minPurchase": 20000,
  "channel": "ALL",
  "quota": 100,
  "perUserLimit": 1,
  "startsAt": "2026-08-01T00:00:00.000Z",
  "expiresAt": "2026-08-31T23:59:59.000Z",
  "isActive": true
}
```

`code` otomatis di-uppercase (maks 30 karakter). `createdByUserId` diisi dari sesi admin.

Validasi tambahan di luar Zod:

| Aturan                             | Respons                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| `type = FIXED` + `maxDiscount` ada | `400 "maxDiscount hanya untuk tipe PERCENT"`                     |
| `type = PERCENT` + `value > 100`   | `400 "Persentase maksimal 100"`                                  |
| `startsAt >= expiresAt`            | `400 "Tanggal berakhir harus setelah tanggal mulai"`             |
| kode duplikat                      | `409 { "issues": { "code": ["Kode voucher sudah digunakan"] } }` |

Respons `201`: voucher baru.

## `GET /api/admin/vouchers/[id]`

**Auth:** Admin

Respons `200`: voucher + `{ "stats": { "redemptionCount", "totalDiscount" } }` (dari agregasi `VoucherRedemption`).

## `PUT /api/admin/vouchers/[id]`

**Auth:** Admin

Request: semua field opsional (partial). Validasi tambahan dijalankan atas **nilai gabungan** (field yang dikirim + nilai lama), sehingga update parsial tidak bisa menghasilkan kombinasi tidak sah.

Respons `200`: voucher terbaru. Error `404` · `400` (aturan di atas) · `409` kode duplikat.

## `DELETE /api/admin/vouchers/[id]`

**Auth:** Admin

Respons `204`.
Error: `404` · `409 { "error": "Voucher sudah pernah digunakan dan tidak bisa dihapus. Nonaktifkan voucher ini sebagai gantinya." }` bila `usedCount > 0`.

---

# O. Admin — Konfigurasi & Pengaturan

## `GET /api/admin/config/homepage`

**Auth:** Admin

Respons `200`:

```json
{ "config": { ...HomepageConfig } | null,
  "sections": { "NEWEST": ["<productId>"], "BESTSELLER": [], "INTERNATIONAL": [],
                "KIWARI": [], "KLASIK": [], "OTHERS": [] } }
```

`config` bernilai `null` bila barisnya belum ada. `sections` **selalu** memuat keenam kunci.

## `PUT /api/admin/config/homepage`

**Auth:** Admin

Request: kedelapan field URL (`heroMainImageUrl`, `heroSideImage1Url`, `heroSideImage2Url`, `sectionNewestPromoImageUrl`, `sectionBestsellerPromoImageUrl`, `sectionInternationalPromoImageUrl`, `sectionKiwariPromoImageUrl`, `sectionKlasikPromoImageUrl`) — **semuanya wajib, minimal 1 karakter** — plus `sections` dengan keenam kunci berisi array uuid.

Pemrosesan: verifikasi semua `productId` ada → `upsert HomepageConfig id=1` → **DELETE seluruh `HomepageSectionProduct`** → INSERT ulang dengan `position` = indeks array.

Respons `200`: `{ "config", "sections" }`.
Error: `400 { "issues": { "sections": ["Beberapa produk tidak ditemukan"] } }`.

## `GET /api/admin/config/kids` · `PUT /api/admin/config/kids`

**Auth:** Admin

Identik dengan endpoint homepage, tetapi untuk `KidsConfig` (8 field teks/URL: `heroBadge`, `heroTitle`, `heroDescription`, `heroImageUrl`, `promoBadge`, `promoTitle`, `promoDescription`, `promoImageUrl`) dan `sections` dengan dua kunci `POPULAR` & `DISCOUNT`.

## `GET /api/admin/settings/store`

**Auth:** Admin

Respons `200`:

```json
{ "setting": { ...StoreSetting } | null,
  "admin": { "name", "email" },
  "storage": { "orderCount", "productCount", "memberCount" },
  "canResetOrders": true }
```

`canResetOrders` = `NODE_ENV !== 'production'`.

## `PUT /api/admin/settings/store`

**Auth:** Admin

Request — **semua wajib**: `name`, `email` (format email), `phone`, `address`, `defaultShippingCost` (int ≥ 0), `freeShippingMinTotal` (int ≥ 0), `bank1Name`, `bank1Number`, `bank1Holder`, `bank2Name`, `bank2Number`, `bank2Holder`.

`defaultCommissionPercent` **tidak** termasuk dalam schema ini — nilainya mengikuti default kolom (`5`) saat baris pertama dibuat, dan setelah itu hanya bisa diubah lewat database.

Respons `200`: `{ "setting": { ... } }` (hasil `upsert` id=1).

## `POST /api/admin/settings/reset-orders`

**Auth:** Admin · **Hanya di non-production**

Request: `{ "confirm": "RESET SEMUA PESANAN" }` — harus persis (`z.literal`).

Menghapus dalam satu transaksi, urut sesuai ketergantungan: `OrderStatusHistory` → `AffiliateConversion` → `OrderItem` → `Order`.

Respons `200 { "success": true }`.
Error: `403 "Reset pesanan hanya diizinkan di lingkungan development"` · `400` bila `confirm` salah.

⚠️ Tidak mengembalikan stok, tidak menghapus `PaymentSession`/`VoucherRedemption`/`Notification`, dan tidak me-reset `Voucher.usedCount`.

---

# P. Admin — Notifikasi

## `GET /api/admin/notifications`

**Auth:** Admin

Query: `page` · `limit` (1–60, default 20) · `status` (`PENDING`\|`SENT`\|`FAILED`) · `channel` (`EMAIL`\|`WHATSAPP`)

Respons `200`: `{ "items": [Notification lengkap], "total", "page", "limit" }` — urut `createdAt DESC`.

## `POST /api/admin/notifications/[id]/retry`

**Auth:** Admin

Memanggil `dispatchNotification` segera, **mengabaikan** `nextRetryAt`.

Respons `200`: notifikasi terbaru (dengan `status`, `attempts`, `error` yang sudah diperbarui).
Error: `404 "Notifikasi tidak ditemukan"` · `400 "Notifikasi sudah terkirim"`.

## `POST /api/cron/retry-notifications`

**Auth:** Khusus — `Authorization: Bearer <CRON_SECRET>` bila `CRON_SECRET` di-set. **Bila variabel itu kosong, endpoint terbuka.**

Memproses semua notifikasi `FAILED` dengan `attempts < 3` dan `nextRetryAt <= now`.

Respons `200 { "retried": <jumlah> }`. Error `401 "Unauthorized"`.

---

# Q. Admin — Laporan

## `GET /api/admin/reports/laporan?period=`

**Auth:** Admin · Dipakai halaman `/admin/laporan`

`period`: `all` (default) \| `today` \| `week` (rolling 7 hari) \| `month` (sejak tanggal 1)

Respons `200`:

```json
{ "stats": { "totalRevenue", "totalOrders", "avgOrder", "completedRate" },
  "statusBreakdown": [{ "status": "PAID", "count": 12 }],
  "topProducts": [{ "productId", "title", "qty", "revenue" }],
  "salesByDay": [{ "date": "2026-08-12", "count": 5 }] }
```

`totalRevenue` & `topProducts` mengecualikan `CANCELLED`; `totalOrders`, `statusBreakdown`, dan `salesByDay` **memasukkan** semua status. `avgOrder = round(totalRevenue / totalOrders)`. `topProducts` dibatasi 10 dan dikelompokkan per `productId`, atau per `titleSnapshot` bila produk sudah dihapus.

## `GET /api/admin/reports/laporan-lengkap?year=&month=&source=`

**Auth:** Admin · Dipakai halaman `/admin/laporan-lengkap`

`year` (2000–3000, opsional) · `month` (1–12, opsional) · `source` (`ONLINE`\|`POS`, opsional)

Semua pesanan `CANCELLED` dikecualikan dari seluruh perhitungan.

Respons `200`:

```json
{ "stats": { "totalRevenue", "totalOrders", "avgOrder", "totalItems" },
  "revenueByMonth": [{ "year", "month", "revenue", "orders" }],
  "sourceComparison": { "ONLINE": { "orders", "revenue" }, "POS": { "orders", "revenue" } },
  "categoryRevenue": [{ "name", "revenue", "qty" }],
  "paymentMethods": [{ "method", "count", "revenue" }],
  "topProducts": [{ "title", "qty", "revenue" }] }
```

`categoryRevenue` memakai **kategori pertama** setiap produk; produk tanpa kategori masuk "Tanpa Kategori". `topProducts` dibatasi 10.

Catatan implementasi: `source` difilter di query database, sedangkan `year`/`month` difilter di memori setelah data diambil.

## Endpoint laporan granular

Delapan endpoint berikut memakai periode standar `reportPeriodSchema`: `today` \| `7d` \| `30d` \| `this_month` \| `all_time` (default `30d`). Semuanya **Auth: Admin** dan **belum dipakai halaman mana pun**.

| Endpoint                                     | Query tambahan                        | Respons                                                                                                           |
| -------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/reports/summary`             | `period`                              | `{ totalOrders, revenue, totalCustomers, totalProducts, totalPending }` — di-cache in-memory 60 detik per periode |
| `GET /api/admin/reports/orders-by-status`    | `period`, `source` (default `ALL`)    | Objek dengan keenam status sebagai kunci → jumlah                                                                 |
| `GET /api/admin/reports/top-products`        | `period`, `limit` (1–100, default 10) | `{ items: [{ productId, title, quantity, revenue }], totalQuantity, totalRevenue }`                               |
| `GET /api/admin/reports/sales-by-day`        | `period`                              | `{ items: [{ date, orders, revenue }] }`                                                                          |
| `GET /api/admin/reports/revenue-by-month`    | `year` (default tahun ini), `source`  | `{ items: [{ month, revenue, orders }] }` — selalu 12 baris                                                       |
| `GET /api/admin/reports/revenue-by-category` | `period`                              | `{ items: [{ categoryId, name, revenue, quantity }] }`                                                            |
| `GET /api/admin/reports/payment-methods`     | `period`                              | `{ items: [{ method, count, revenue }] }`                                                                         |
| `GET /api/admin/reports/pos-vs-online`       | `period`                              | `{ ONLINE: { orders, revenue }, POS: { orders, revenue } }`                                                       |

Perbedaan definisi "pendapatan" yang perlu diperhatikan:

- `summary`, `top-products` → hanya status `PAID`, `PACKED`, `SHIPPED`, `COMPLETED` (`REVENUE_ORDER_STATUSES`)
- `sales-by-day`, `revenue-by-month`, `revenue-by-category`, `payment-methods`, `pos-vs-online` → semua kecuali `CANCELLED`
- `orders-by-status` → semua status (memang menghitung per status)

## `GET /api/admin/reports/export.csv?report=&period=&source=&limit=&year=`

**Auth:** Admin · **Respons:** `text/csv; charset=utf-8` + BOM UTF-8 + `Content-Disposition: attachment`

`report` (wajib): `summary` \| `orders-by-status` \| `top-products` \| `sales-by-day` \| `revenue-by-month` \| `revenue-by-category` \| `payment-methods` \| `pos-vs-online`

Nama file mengikuti nilai `report` (mis. `top-products.csv`). Header kolom berbahasa Indonesia.

> Berbeda dengan export CSV di halaman Laporan (yang dibuat di klien tanpa BOM), endpoint ini server-side dan **menyertakan BOM** sehingga aman dibuka di Excel.

---

# R. Route Handler di Luar `/api`

## `GET /r/[code]?p=<slug>`

**Auth:** Publik · **Respons:** `302 Redirect`

Redirect tracking afiliasi.

```
1. Tujuan: /products/<slug> bila ada ?p=, jika tidak /
2. AffiliateProfile tidak ada / isActive = false → redirect saja (tanpa cookie, tanpa log)
3. cookieId = cookie gsb_cid yang ada, atau randomUUID() baru
4. INSERT AffiliateClick { affiliateProfileId, productId, sourceUrl (Referer),
                           ipAddress, userAgent, cookieId }   ← dibungkus .catch()
5. Set-Cookie gsb_cid (365 hari, httpOnly)
   Set-Cookie gsb_aff = code (30 hari, httpOnly: FALSE)
6. Redirect
```

Kegagalan pencatatan klik **tidak pernah** menghalangi redirect.

---

# S. Indeks Semua Endpoint

| Method   | Path                                        | Auth    |
| -------- | ------------------------------------------- | ------- |
| `POST`   | `/api/auth/register`                        | Publik  |
| `POST`   | `/api/auth/login`                           | Publik  |
| `POST`   | `/api/auth/logout`                          | Publik  |
| `POST`   | `/api/auth/admin/login`                     | Publik  |
| `POST`   | `/api/auth/admin/logout`                    | Publik  |
| `GET`    | `/api/auth/session`                         | Publik  |
| `POST`   | `/api/auth/forgot-password`                 | Publik  |
| `POST`   | `/api/auth/reset-password`                  | Publik  |
| `GET`    | `/api/products`                             | Publik  |
| `GET`    | `/api/products/[slug]`                      | Publik  |
| `GET`    | `/api/categories`                           | Publik  |
| `GET`    | `/api/search/suggest`                       | Publik  |
| `GET`    | `/api/shipping/cities`                      | Publik  |
| `GET`    | `/api/cart`                                 | Publik  |
| `POST`   | `/api/cart/items`                           | Publik  |
| `PATCH`  | `/api/cart/items/[itemId]`                  | Publik  |
| `DELETE` | `/api/cart/items/[itemId]`                  | Publik  |
| `POST`   | `/api/cart/merge`                           | Member  |
| `POST`   | `/api/vouchers/validate`                    | Publik  |
| `POST`   | `/api/orders`                               | Publik  |
| `GET`    | `/api/orders`                               | Member  |
| `GET`    | `/api/orders/[id]`                          | Pemilik |
| `POST`   | `/api/orders/[id]/cancel`                   | Pemilik |
| `POST`   | `/api/payment/create`                       | Khusus  |
| `GET`    | `/api/payment/status/[orderId]`             | Khusus  |
| `POST`   | `/api/webhooks/payment`                     | Khusus  |
| `GET`    | `/api/member/profile`                       | Member  |
| `PUT`    | `/api/member/profile`                       | Member  |
| `POST`   | `/api/member/profile/avatar`                | Member  |
| `DELETE` | `/api/member/profile/avatar`                | Member  |
| `GET`    | `/api/member/receivers`                     | Member  |
| `POST`   | `/api/member/receivers`                     | Member  |
| `PUT`    | `/api/member/receivers/[id]`                | Pemilik |
| `DELETE` | `/api/member/receivers/[id]`                | Pemilik |
| `POST`   | `/api/affiliate/join`                       | Member  |
| `GET`    | `/api/affiliate/stats`                      | Member+ |
| `GET`    | `/api/affiliate/products`                   | Member+ |
| `PUT`    | `/api/affiliate/products`                   | Member+ |
| `POST`   | `/api/affiliate/products` (alias PUT)       | Member+ |
| `POST`   | `/api/cron/retry-notifications`             | Khusus  |
| `GET`    | `/api/admin/orders`                         | Admin   |
| `GET`    | `/api/admin/orders/export`                  | Admin   |
| `GET`    | `/api/admin/orders/[id]`                    | Admin   |
| `PATCH`  | `/api/admin/orders/[id]/status`             | Admin   |
| `POST`   | `/api/admin/orders/bulk-status`             | Admin   |
| `GET`    | `/api/admin/products`                       | Admin   |
| `POST`   | `/api/admin/products`                       | Admin   |
| `GET`    | `/api/admin/products/[id]`                  | Admin   |
| `PUT`    | `/api/admin/products/[id]`                  | Admin   |
| `DELETE` | `/api/admin/products/[id]`                  | Admin   |
| `POST`   | `/api/admin/products/[id]/images`           | Admin   |
| `DELETE` | `/api/admin/products/[id]/images/[imageId]` | Admin   |
| `POST`   | `/api/admin/categories`                     | Admin   |
| `PUT`    | `/api/admin/categories/[id]`                | Admin   |
| `DELETE` | `/api/admin/categories/[id]`                | Admin   |
| `POST`   | `/api/admin/shipping/cities`                | Admin   |
| `PUT`    | `/api/admin/shipping/cities/[id]`           | Admin   |
| `DELETE` | `/api/admin/shipping/cities/[id]`           | Admin   |
| `POST`   | `/api/admin/uploads`                        | Admin   |
| `GET`    | `/api/admin/members`                        | Admin   |
| `GET`    | `/api/admin/members/[id]`                   | Admin   |
| `PATCH`  | `/api/admin/members/[id]`                   | Admin   |
| `POST`   | `/api/admin/members/[id]/reset-password`    | Admin   |
| `POST`   | `/api/admin/pos/transactions`               | Admin   |
| `GET`    | `/api/admin/pos/transactions`               | Admin   |
| `GET`    | `/api/admin/pos/transactions/[id]/receipt`  | Admin   |
| `GET`    | `/api/admin/affiliates`                     | Admin   |
| `GET`    | `/api/admin/affiliates/[id]`                | Admin   |
| `GET`    | `/api/admin/affiliates/payouts`             | Admin   |
| `POST`   | `/api/admin/affiliates/payouts`             | Admin   |
| `PATCH`  | `/api/admin/affiliates/payouts/[id]`        | Admin   |
| `GET`    | `/api/admin/commission-rates`               | Admin   |
| `PUT`    | `/api/admin/commission-rates/[productId]`   | Admin   |
| `GET`    | `/api/admin/vouchers`                       | Admin   |
| `POST`   | `/api/admin/vouchers`                       | Admin   |
| `GET`    | `/api/admin/vouchers/[id]`                  | Admin   |
| `PUT`    | `/api/admin/vouchers/[id]`                  | Admin   |
| `DELETE` | `/api/admin/vouchers/[id]`                  | Admin   |
| `GET`    | `/api/admin/config/homepage`                | Admin   |
| `PUT`    | `/api/admin/config/homepage`                | Admin   |
| `GET`    | `/api/admin/config/kids`                    | Admin   |
| `PUT`    | `/api/admin/config/kids`                    | Admin   |
| `GET`    | `/api/admin/settings/store`                 | Admin   |
| `PUT`    | `/api/admin/settings/store`                 | Admin   |
| `POST`   | `/api/admin/settings/reset-orders`          | Admin   |
| `GET`    | `/api/admin/notifications`                  | Admin   |
| `POST`   | `/api/admin/notifications/[id]/retry`       | Admin   |
| `GET`    | `/api/admin/reports/laporan`                | Admin   |
| `GET`    | `/api/admin/reports/laporan-lengkap`        | Admin   |
| `GET`    | `/api/admin/reports/summary`                | Admin   |
| `GET`    | `/api/admin/reports/orders-by-status`       | Admin   |
| `GET`    | `/api/admin/reports/top-products`           | Admin   |
| `GET`    | `/api/admin/reports/sales-by-day`           | Admin   |
| `GET`    | `/api/admin/reports/revenue-by-month`       | Admin   |
| `GET`    | `/api/admin/reports/revenue-by-category`    | Admin   |
| `GET`    | `/api/admin/reports/payment-methods`        | Admin   |
| `GET`    | `/api/admin/reports/pos-vs-online`          | Admin   |
| `GET`    | `/api/admin/reports/export.csv`             | Admin   |
| `GET`    | `/r/[code]`                                 | Publik  |

**Member+** = butuh sesi member **dan** `AffiliateProfile` (jika tidak → `404`).
