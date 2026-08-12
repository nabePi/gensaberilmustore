# 02 — Role & Hak Akses

## 1. Daftar Role

Enum `Role` di database punya **tiga** nilai. Di praktik ada satu kondisi lagi yang berperilaku seperti role, yaitu pengunjung tanpa sesi ("Guest"), sehingga total ada **empat aktor**.

| Aktor         | Nilai `User.role` | Punya baris `User`? | Cara mendapatkannya                                                                                          | Cookie sesi                                   |
| ------------- | ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **Guest**     | —                 | Tidak               | Default semua pengunjung                                                                                     | `gsb_cart_guest` (keranjang saja, bukan sesi) |
| **BUYER**     | `BUYER`           | Ya                  | Daftar via `/signup` (default semua pendaftar)                                                               | `session`                                     |
| **AFFILIATE** | `AFFILIATE`       | Ya                  | (a) BUYER mengisi form "Jadi Afiliasi" di `/member/afiliasi`, atau (b) admin mengubah role di Admin → Member | `session`                                     |
| **ADMIN**     | `ADMIN`           | Ya                  | Hanya lewat seed atau `UPDATE` langsung di database. **Tidak ada UI untuk membuat admin.**                   | `admin_session`                               |

### Catatan penting tentang role

1. **`ADMIN` tidak bisa login lewat `/login`.** `POST /api/auth/login` menolak user dengan `role === 'ADMIN'` dan mengembalikan pesan generik "Email atau password salah". Sebaliknya `POST /api/auth/admin/login` menolak semua yang bukan `ADMIN`. Ini memisahkan sesi toko dan sesi panel secara tegas.

2. **Sesi member dan sesi admin bisa aktif bersamaan** karena memakai nama cookie berbeda (`session` vs `admin_session`) dan keduanya bersumber dari tabel `Session` yang sama.

3. **Kasir POS = ADMIN.** Tidak ada role kasir terpisah. Kolom `Order.posCashierUserId` menunjuk ke user ADMIN yang membuat transaksi. Tabel `POSSession` (shift kasir) ada di skema tetapi belum dipakai oleh kode mana pun.

4. **Perbedaan BUYER vs AFFILIATE sangat tipis di lapisan otorisasi.** Semua halaman `/member/*` dan endpoint `/api/member/*` hanya memeriksa "ada sesi atau tidak", tidak memeriksa role. Yang membedakan:
   - Halaman `/member/afiliasi` dan `/member/afiliasi/produk` **bisa dibuka** BUYER, tetapi endpoint `/api/affiliate/stats` & `/api/affiliate/products` mengembalikan **404 `{"error":"Anda belum menjadi afiliasi"}`** bila `AffiliateProfile` belum ada. Halaman lalu menampilkan kartu onboarding "Jadi Afiliasi" alih-alih statistik.
   - Kartu statistik afiliasi di `/member/dashboard` hanya dirender bila `user.role === 'AFFILIATE'`.
   - Jadi **gerbang sebenarnya adalah keberadaan baris `AffiliateProfile`**, bukan nilai `role`. Nilai `role` dipakai untuk tampilan dan pelaporan.

5. **Menurunkan AFFILIATE → BUYER tidak menghapus data.** Admin → Member → "Jadikan Buyer" hanya menyetel `AffiliateProfile.isActive = false`. Klik, konversi, dan riwayat komisi tetap tersimpan; link afiliasi berhenti bekerja karena `/r/[code]` mengabaikan profil non-aktif. Menaikkan kembali ke AFFILIATE akan mengaktifkan ulang profil yang sama (kode afiliasi tidak berubah).

---

## 2. Cara Autentikasi Bekerja

### Pembuatan sesi

```
POST /api/auth/login  (atau /api/auth/admin/login)
  │
  ├─ Rate limit per IP (in-memory)
  ├─ Zod validate { email, password, remember? }
  ├─ Ambil user; bandingkan bcrypt terhadap passwordHash
  │    (jika email tidak ada → tetap bandingkan dengan DUMMY_PASSWORD_HASH
  │     agar durasi respons tidak membocorkan keberadaan email)
  ├─ Tolak bila role tidak sesuai kanal login
  ├─ INSERT Session { userId, expiresAt, ipAddress, userAgent }
  ├─ Tanda tangani JWT HS256 (jose) berisi { sid: session.id, sub: userId }
  └─ Set-Cookie: session=<jwt>   (atau admin_session=<jwt>)
       httpOnly, sameSite=lax, secure di production, path=/, expires=expiresAt
```

Durasi sesi:

| Kanal                       | Durasi                                    |
| --------------------------- | ----------------------------------------- |
| Login member biasa          | 1 hari (`DEFAULT_SESSION_DURATION_MS`)    |
| Login member + "Ingat saya" | 30 hari                                   |
| Registrasi (`/signup`)      | 1 hari                                    |
| Login admin                 | 1 hari (opsi "ingat saya" tidak tersedia) |

### Verifikasi sesi

Setiap pemeriksaan sesi melakukan **dua** langkah — token yang valid saja tidak cukup:

1. `jwtVerify` token dengan `JWT_SECRET`; ambil `sid` dan `sub`.
2. Query `Session` berdasarkan `sid`; **tolak bila baris tidak ada atau `expiresAt` sudah lewat**.

Konsekuensinya: menghapus baris `Session` langsung mencabut sesi tersebut, walau JWT-nya secara kriptografis masih sah. Ini dipakai pada logout dan pada reset password.

### Fungsi helper (`src/server/auth.ts`)

| Fungsi                        | Konteks            | Cookie yang dibaca | Kembalian                |
| ----------------------------- | ------------------ | ------------------ | ------------------------ |
| `getSession(request)`         | middleware / route | `session`          | `SessionUser \| null`    |
| `getAdminSession(request)`    | middleware / route | `admin_session`    | `SessionUser \| null`    |
| `getSessionUser()`            | Server Component   | `session`          | `SessionUser \| null`    |
| `getAdminSessionUser()`       | Server Component   | `admin_session`    | `SessionUser \| null`    |
| `requireUser(request, role?)` | route handler      | sesuai `role`      | `SessionUser` atau throw |
| `withAuth(handler, { role })` | pembungkus route   | sesuai `role`      | handler + `context.user` |

`SessionUser` = `{ id, email, name, role, avatarUrl }`.

`withAuth` menerjemahkan exception jadi respons:

- `UnauthorizedError` → `401 { "error": "Sesi tidak ditemukan" }`
- `ForbiddenError` → `403 { "error": "Akses ditolak" }`

### Logout

`POST /api/auth/logout` (dan `/api/auth/admin/logout`) menghapus baris `Session` berdasarkan `sid` dari token, lalu mengirim cookie kosong dengan `expires` epoch. Respons `204 No Content`.

---

## 3. Middleware (`src/middleware.ts`)

```ts
matcher: ['/admin/:path*', '/api/admin/:path*', '/member/:path*', '/api/member/:path*'];
runtime: 'nodejs'; // wajib nodejs karena melakukan query Prisma
```

Logika:

| Path                         | Pemeriksaan                                      | Bila gagal — halaman              | Bila gagal — API                  |
| ---------------------------- | ------------------------------------------------ | --------------------------------- | --------------------------------- |
| `/admin/login`               | dilewati (whitelist)                             | —                                 | —                                 |
| `/admin/*`, `/api/admin/*`   | `getAdminSession` ada **dan** `role === 'ADMIN'` | redirect `/admin/login`           | `401 { "error": "Unauthorized" }` |
| `/member/*`, `/api/member/*` | `getSession` ada (role apa pun)                  | redirect `/login?next=<pathname>` | `401 { "error": "Unauthorized" }` |
| lainnya                      | tanpa pemeriksaan                                | —                                 | —                                 |

> ⚠️ `/admin/login` **wajib** di-whitelist. Matcher `/admin/:path*` secara teknis juga mencakup `/admin/login`; tanpa pengecualian ini, pengguna yang belum login akan mengalami redirect loop (`/admin/login` → cek session → redirect `/admin/login` lagi) dan menghasilkan error `ERR_TOO_MANY_REDIRECTS`.

Deteksi "API" adalah `pathname.startsWith('/api/')`, sehingga endpoint mendapat JSON 401 (bukan redirect HTML yang akan merusak `fetch` di klien).

### Rute yang **tidak** dilindungi middleware

Middleware tidak mencakup semua endpoint sensitif. Perlindungan sisanya ada di level route handler:

| Rute                                | Pelindung                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `/api/orders`, `/api/orders/[id]`   | `withAuth` (GET/detail) — POST create sengaja publik untuk guest checkout                  |
| `/api/affiliate/*`                  | `withAuth` + cek `AffiliateProfile`                                                        |
| `/api/cart/merge`                   | `withAuth`                                                                                 |
| `/api/auth/admin/login` \| `logout` | tidak perlu (adalah pintu login)                                                           |
| `/api/cron/retry-notifications`     | `Bearer CRON_SECRET` (bila `CRON_SECRET` di-set)                                           |
| `/api/webhooks/payment`             | verifikasi signature SHA512 Midtrans                                                       |
| `/admin/fulfillment/print`          | `getAdminSessionUser()` + `redirect()` di dalam page ✅ (juga tercakup matcher `/admin/*`) |
| `/admin/pos/receipt/[id]/print`     | idem                                                                                       |

---

## 4. Matriks Hak Akses — Halaman

Legenda: ✅ boleh · ❌ tidak boleh (redirect) · ⚠️ boleh dibuka tapi isinya terbatas

| Halaman                                       |                   Guest                   |            BUYER            | AFFILIATE |         ADMIN          |
| --------------------------------------------- | :---------------------------------------: | :-------------------------: | :-------: | :--------------------: |
| `/` Beranda                                   |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/products`, `/products/[slug]`               |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/kids`                                       |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/cart`                                       |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/checkout`                                   |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/payment/success?orderId=`                   | ✅ (hanya pesanan guest, `userId = null`) | ✅ (hanya pesanan miliknya) |    ✅     |           ✅           |
| `/l` Linktree                                 |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/r/[code]` redirect afiliasi                 |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/login`, `/signup`                           |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/forgot-password`, `/reset-password`         |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/styleguide`                                 |                    ✅                     |             ✅              |    ✅     |           ✅           |
| `/member/dashboard`                           |                    ❌                     |             ✅              |    ✅     |          ✅¹           |
| `/member/profil`                              |                    ❌                     |             ✅              |    ✅     |          ✅¹           |
| `/member/transaksi`, `/member/transaksi/[id]` |                    ❌                     |             ✅              |    ✅     |          ✅¹           |
| `/member/penerima`                            |                    ❌                     |             ✅              |    ✅     |          ✅¹           |
| `/member/afiliasi`                            |                    ❌                     |    ⚠️ (kartu onboarding)    |    ✅     |          ✅¹           |
| `/member/afiliasi/produk`                     |                    ❌                     | ⚠️ (daftar kosong / error)  |    ✅     |          ✅¹           |
| `/admin/login`                                |                    ✅                     |             ✅              |    ✅     | ↪ redirect ke `/admin` |
| `/admin` dan seluruh `/admin/*`               |                    ❌                     |             ❌              |    ❌     |           ✅           |
| `/admin/fulfillment/print`                    |                    ❌                     |             ❌              |    ❌     |           ✅           |
| `/admin/pos/receipt/[id]/print`               |                    ❌                     |             ❌              |    ❌     |           ✅           |

¹ Halaman member hanya memeriksa cookie `session`. Seorang ADMIN yang **juga** memegang cookie `session` (mis. login lewat `/login` — yang ditolak) tidak akan punya cookie itu. Dalam praktik, akun ADMIN tidak bisa masuk member area karena tidak bisa memperoleh cookie `session`.

---

## 5. Matriks Hak Akses — Endpoint API

| Endpoint                                                                           |              Guest               |      Member (sesi apa pun)      |   ADMIN    | Mekanisme                                                |
| ---------------------------------------------------------------------------------- | :------------------------------: | :-----------------------------: | :--------: | -------------------------------------------------------- |
| `GET /api/products`, `/api/products/[slug]`                                        |                ✅                |               ✅                |     ✅     | publik                                                   |
| `GET /api/categories`                                                              |                ✅                |               ✅                |     ✅     | publik                                                   |
| `GET /api/search/suggest`                                                          |                ✅                |               ✅                |     ✅     | publik + rate limit 100/menit/IP                         |
| `GET /api/shipping/cities`                                                         |                ✅                |               ✅                |     ✅     | publik + cache 5 menit                                   |
| `GET /api/cart`, `POST /api/cart/items`, `PATCH`/`DELETE /api/cart/items/[itemId]` |                ✅                |               ✅                |     ✅     | keranjang guest via cookie                               |
| `POST /api/cart/merge`                                                             |                ❌                |               ✅                |     ✅     | `withAuth`                                               |
| `POST /api/vouchers/validate`                                                      |                ✅                |               ✅                |     ✅     | publik (sesi opsional, dipakai untuk cek `perUserLimit`) |
| `POST /api/orders`                                                                 |                ✅                |               ✅                |     ✅     | publik — guest checkout                                  |
| `GET /api/orders`                                                                  |                ❌                |               ✅                |     ✅     | `withAuth`, difilter `userId`                            |
| `GET /api/orders/[id]`, `POST /api/orders/[id]/cancel`                             |                ❌                |       ✅ (hanya miliknya)       |     ✅     | `withAuth` + cek `order.userId === user.id`              |
| `POST /api/payment/create`, `GET /api/payment/status/[orderId]`                    | ✅ (hanya order `userId = null`) |       ✅ (hanya miliknya)       |     ✅     | cek kepemilikan manual                                   |
| `POST /api/webhooks/payment`                                                       |                ✅                |               ✅                |     ✅     | verifikasi signature SHA512                              |
| `POST /api/auth/register` \| `login` \| `forgot-password` \| `reset-password`      |                ✅                |               ✅                |     ✅     | publik + rate limit                                      |
| `GET /api/auth/session`                                                            |                ✅                |               ✅                |     ✅     | mengembalikan `{ user: null }` bila tanpa sesi           |
| `POST /api/auth/logout`                                                            |                ✅                |               ✅                |     ✅     | idempoten                                                |
| `GET`/`PUT /api/member/profile`                                                    |                ❌                |               ✅                |     —      | middleware + `withAuth`                                  |
| `POST`/`DELETE /api/member/profile/avatar`                                         |                ❌                |               ✅                |     —      | middleware + `withAuth`                                  |
| `GET`/`POST /api/member/receivers`, `PUT`/`DELETE /api/member/receivers/[id]`      |                ❌                |       ✅ (hanya miliknya)       |     —      | middleware + `withAuth` + cek `userId`                   |
| `POST /api/affiliate/join`                                                         |                ❌                |               ✅                |     ✅     | `withAuth`; tolak bila profil sudah ada                  |
| `GET /api/affiliate/stats`                                                         |                ❌                | ⚠️ 404 bila belum jadi afiliasi |     ✅     | `withAuth` + cek profil                                  |
| `GET`/`PUT`/`POST /api/affiliate/products`                                         |                ❌                | ⚠️ 404 bila belum jadi afiliasi |     ✅     | `withAuth` + cek profil                                  |
| **Seluruh `/api/admin/**`**                                                        |                ❌                |               ❌                |     ✅     | middleware + `withAuth(..., { role: 'ADMIN' })`          |
| `POST /api/cron/retry-notifications`                                               |            tergantung            |           tergantung            | tergantung | `Bearer CRON_SECRET` bila di-set; terbuka bila tidak     |

---

## 6. Rate Limiting

Implementasi in-memory (`Map`) di `src/server/auth/rate-limit.ts`.

| Aksi                             | Kunci             | Batas        | Jendela  | Efek                                                              |
| -------------------------------- | ----------------- | ------------ | -------- | ----------------------------------------------------------------- |
| `POST /api/auth/login`           | IP                | 10 percobaan | 15 menit | `429` + header `Retry-After`; direset saat login sukses           |
| `POST /api/auth/admin/login`     | IP                | 5 percobaan  | 15 menit | idem                                                              |
| `POST /api/auth/forgot-password` | email (lowercase) | 3 permintaan | 60 menit | Respons **tetap** `200` dengan pesan generik; email tidak dikirim |
| `GET /api/search/suggest`        | IP                | 100 request  | 1 menit  | `429` + `Retry-After`                                             |

⚠️ **Keterbatasan yang perlu diketahui:** counter disimpan di memori proses. Pada deployment multi-instance/serverless, batas berlaku per instance dan hilang saat cold start. Untuk produksi berskala, ini perlu dipindah ke penyimpanan bersama (Redis/Upstash).

---

## 7. Praktik Keamanan Lain yang Sudah Ada

| Area                      | Yang diterapkan                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hash password             | bcrypt cost **12** (`hashPassword`). Seed memakai cost 10.                                                                                               |
| Timing attack             | `DUMMY_PASSWORD_HASH` dibandingkan saat email tidak ditemukan, agar durasi respons seragam                                                               |
| Enumerasi akun            | Login selalu balas pesan generik "Email atau password salah". Forgot-password selalu balas "Jika email terdaftar, tautan reset dikirim"                  |
| Token reset password      | Yang disimpan adalah **SHA-256 hash**-nya (`tokenHash`), bukan token mentah. TTL 1 jam, sekali pakai (`usedAt`)                                          |
| Reset password            | Setelah sukses, **semua** `Session` milik user dihapus (memaksa login ulang di semua perangkat)                                                          |
| Cookie sesi               | `httpOnly`, `sameSite=lax`, `secure` di production                                                                                                       |
| Cookie afiliasi `gsb_aff` | `httpOnly: false` **secara sengaja**, karena halaman checkout membacanya dari `document.cookie`                                                          |
| Cookie klik `gsb_cid`     | `httpOnly: true` — hanya server yang perlu, untuk deduplikasi klik                                                                                       |
| Webhook Midtrans          | Signature SHA-512 dari `order_id + status_code + gross_amount + serverKey`. Idempoten via `WebhookLog.providerEventId` unik                              |
| Upload file               | Magic-byte sniffing, batas ukuran, batas jumlah, nama file di-generate `randomUUID()` (bukan nama dari klien)                                            |
| Race condition stok       | `updateMany` bersyarat `stock >= quantity` lalu cek `result.count === 0` di dalam transaksi                                                              |
| Race condition voucher    | `SELECT id FROM "Voucher" WHERE code = ... FOR UPDATE` sebelum revalidasi & increment `usedCount`                                                        |
| Reset data pesanan        | `POST /api/admin/settings/reset-orders` mengembalikan **403** bila `NODE_ENV === 'production'`, dan mewajibkan body `{ confirm: "RESET SEMUA PESANAN" }` |
| Kredensial default        | Layout admin menampilkan banner peringatan kuning selama email admin masih `admin@gensaberilmu.co.id`                                                    |

### Hal yang perlu diperhatikan (bukan bug, tapi keterbatasan yang disengaja/tertunda)

- **Verifikasi email belum aktif.** `User.emailVerifiedAt` ada di skema, tetapi `POST /api/auth/register` hanya menulis log `console.log('[auth] Verification email pending for ...')`.
- **Tidak ada UI ganti password untuk admin.** Peringatan kredensial default hanya bisa dihilangkan dengan mengubah email/password admin langsung di database, atau lewat alur "Lupa password" bila email admin valid.
- **Tidak ada UI membuat/menghapus admin.**
- Rate limiting in-memory (lihat bagian 6).
