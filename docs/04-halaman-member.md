# 04 — Halaman Member Area

Semua halaman di bab ini berada di `src/app/(store)/member/**`, sehingga **tetap mendapat SiteHeader & SiteFooter** dari route group `(store)`, ditambah sidebar member dari `member/layout.tsx`.

URL-nya `/member/...` (tanpa prefix `(store)` karena itu route group).

---

## 0. Kerangka Member Area

### `member/layout.tsx` (Server Component)

```
const user = await getSessionUser()
if (!user) redirect('/login')          ← jaring pengaman selain middleware
```

Lalu merender:

```
<MemberSessionProvider user={{ id, name, email, role, avatarUrl }}>
  <div class="container-prototype py-8">
    <details lg:hidden>   Menu Akun   →  <MemberSidebar/>     ← versi mobile
    <div class="grid lg:grid-cols-[260px_1fr]">
      <aside hidden lg:block sticky top-4>  <MemberSidebar/>  ← versi desktop
      <div>{children}</div>
    </div>
  </div>
</MemberSessionProvider>
```

Pola yang sama dipakai admin: satu komponen sidebar dirender dua kali — sekali di dalam `<details>` untuk mobile, sekali di `<aside>` sticky untuk desktop. Tidak ada drawer/JS toggle, cukup elemen HTML native.

### `MemberSessionContext`

Context React sederhana berisi `MemberSessionUser` = `{ id, name, email, role, avatarUrl }`. Data sesi diambil sekali di layout (server) lalu dibagikan ke seluruh subtree tanpa perlu fetch ulang. `useMemberSession()` melempar error bila dipakai di luar provider.

### `MemberSidebar` (Client Component)

**Kartu profil (atas):** avatar (`avatarUrl`) atau, bila kosong, bulatan `brand-50` berisi huruf pertama nama/email dalam kapital. Di sampingnya nama (fallback email) dan email, keduanya `truncate`.

**Navigasi (5 menu):**

| Label             | Href                |
| ----------------- | ------------------- |
| Dashboard         | `/member/dashboard` |
| Profil Saya       | `/member/profil`    |
| Riwayat Transaksi | `/member/transaksi` |
| Afiliasi          | `/member/afiliasi`  |
| Penerima          | `/member/penerima`  |

Penanda menu aktif: `pathname === item.href || pathname.startsWith(item.href + '/')`. Karena itu membuka `/member/transaksi/<id>` tetap menyorot "Riwayat Transaksi", dan `/member/afiliasi/produk` tetap menyorot "Afiliasi". Menu aktif berwarna `bg-brand-50 text-brand`.

**Tombol Keluar (bawah):** `POST /api/auth/logout` → `router.push('/')` + `router.refresh()`.

---

## 1. Dashboard — `/member/dashboard`

| Aspek | Detail                                      |
| ----- | ------------------------------------------- |
| File  | `src/app/(store)/member/dashboard/page.tsx` |
| Jenis | Server Component                            |
| Data  | Prisma langsung (bukan lewat API)           |
| Akses | Semua user login                            |

### Tujuan

Halaman pertama setelah login: ringkasan status afiliasi (bila relevan) dan 5 transaksi terakhir.

### Query yang dijalankan (paralel)

```ts
Promise.all([
  prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: orderListInclude,
  }),
  user.role === 'AFFILIATE' ? getAffiliateStats(user.id) : Promise.resolve(null),
]);
```

`getAffiliateStats` hanya dipanggil bila `role === 'AFFILIATE'` — BUYER tidak membayar biaya query afiliasi.

### Susunan

**1. Header** — `<h1>Dashboard</h1>` + "Selamat datang, `<nama atau email>`"

**2. Statistik afiliasi** — 4 kartu, **hanya bila `role === 'AFFILIATE'` dan `AffiliateProfile` ada**:

| Kartu          | Perhitungan                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| Total Klik     | `count(AffiliateClick)` untuk profil ini                                         |
| Total Konversi | `count(AffiliateConversion)`                                                     |
| Komisi Pending | jumlah `commissionAmount` untuk konversi berstatus `PENDING` **atau** `APPROVED` |
| Komisi Dibayar | jumlah `commissionAmount` untuk konversi berstatus `PAID`                        |

> Perhatikan: "Komisi Pending" menggabungkan `PENDING` dan `APPROVED` — dari sudut pandang afiliasi keduanya sama-sama "belum masuk rekening". Konversi `REJECTED` tidak dihitung di mana pun.

**3. Panel "Transaksi Terbaru"** — judul + link "Lihat Semua →" ke `/member/transaksi`

- Bila kosong: "Belum ada transaksi." + tombol **Mulai Belanja** → `/products`
- Bila ada: 5 kartu; setiap kartu adalah link ke `/member/transaksi/<id>` berisi nomor pesanan, tanggal (format `id-ID`: `12 Agustus 2026`), jumlah item, badge status berwarna, dan total

**4. Tiga quick card** — Lihat Transaksi · Kelola Afiliasi · Daftar Penerima

### Label & warna badge status

Dari `src/lib/order-status.ts` — dipakai konsisten di seluruh aplikasi (member maupun admin):

| Enum               | Label Indonesia     | Warna badge                       |
| ------------------ | ------------------- | --------------------------------- |
| `AWAITING_PAYMENT` | Menunggu Pembayaran | `bg-neutral-100 text-neutral-700` |
| `PAID`             | Lunas               | `bg-brand-50 text-brand`          |
| `PACKED`           | Dikemas             | `bg-brand-100 text-brand-700`     |
| `SHIPPED`          | Dikirim             | `bg-brand-100 text-brand-700`     |
| `COMPLETED`        | Selesai             | `bg-green/10 text-green`          |
| `CANCELLED`        | Dibatalkan          | `bg-red/10 text-red`              |

---

## 2. Profil Saya — `/member/profil`

| Aspek | Detail                                   |
| ----- | ---------------------------------------- |
| File  | `src/app/(store)/member/profil/page.tsx` |
| Jenis | Client Component (react-hook-form + Zod) |
| Data  | `GET /api/member/profile` saat mount     |
| Akses | Semua user login                         |

### Bagian foto profil (atas, dipisah garis)

- Preview: `<img>` bulat 80×80 bila `avatarUrl` ada; jika tidak, ikon orang abu-abu dalam bulatan `neutral-100`
- Tombol **Pilih Foto** → memicu `<input type="file" accept="image/*">` yang tersembunyi
- Tombol **Hapus Foto** (merah, hanya muncul bila avatar ada) → `DELETE /api/member/profile/avatar`
- Keterangan: "JPG atau PNG, maks. 2MB"
- Validasi klien: `file.size > 2MB` → error "Ukuran foto maksimal 2MB", input direset, request **tidak** dikirim
- Upload: `FormData` field `avatar` → `POST /api/member/profile/avatar` → respons `{ avatarUrl }` langsung dipakai untuk memperbarui preview
- Selama proses, tombol bertuliskan "Memproses..." dan disabled

### Form data profil

| Field        | Kontrol                                  | Validasi / perilaku                                                                                 |
| ------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Nama Lengkap | text                                     | wajib ("Nama wajib diisi")                                                                          |
| Email        | text **read-only**                       | latar `neutral-50`, keterangan "Email tidak dapat diubah"                                           |
| No. Telepon  | tel                                      | wajib ("Nomor telepon wajib diisi")                                                                 |
| No. WhatsApp | tel + checkbox "Sama dengan no. telepon" | wajib. Saat checkbox aktif, field jadi read-only dan **nilainya mengikuti No. Telepon secara live** |

Checkbox "sama dengan telepon" diinisialisasi `true` bila `whatsappNumber` kosong **atau** sama dengan `phone` saat data dimuat.

Tombol **Simpan Perubahan** → `PUT /api/member/profile` dengan `{ name, phone, whatsappNumber }`. Sukses → teks hijau "Profil berhasil disimpan." di samping tombol.

> Email tidak bisa diubah karena email adalah kunci login dan penerima notifikasi. Perubahan email akan memerlukan alur verifikasi ulang yang belum ada.

---

## 3. Riwayat Transaksi — `/member/transaksi`

| Aspek | Detail                                                         |
| ----- | -------------------------------------------------------------- |
| File  | `src/app/(store)/member/transaksi/page.tsx`                    |
| Jenis | Client Component                                               |
| Data  | `GET /api/orders?limit=60[&status=…]`                          |
| Akses | Semua user login (hanya pesanan miliknya — difilter di server) |

### Susunan

**Header** — `<h1>Riwayat Transaksi</h1>` + "`<total>` transaksi ditemukan"

**Tab filter status** — baris pill yang bisa di-scroll horizontal, dari `ORDER_STATUS_FILTER_TABS`:

`Semua` · `Menunggu Pembayaran` · `Lunas` · `Dikemas` · `Dikirim` · `Selesai` · `Dibatalkan`

Tab aktif berwarna `bg-brand text-white`. Mengganti tab memicu fetch ulang (`useEffect` bergantung pada `status`). Tab "Semua" tidak mengirim parameter `status`.

**Daftar pesanan** — satu kartu per pesanan:

- Kiri: thumbnail produk pertama (56×44) atau kotak abu-abu; nomor pesanan; tanggal + jumlah item; badge status
- Kanan: total; link **Lihat Detail** → `/member/transaksi/<id>`

**State**

- Memuat → "Memuat transaksi..."
- Kosong → "Belum ada transaksi pada status ini." + tombol **Mulai Belanja**

> Halaman mengambil hingga **60** pesanan sekaligus dan tidak memiliki paginasi UI. API-nya mendukung `page`, jadi paginasi bisa ditambahkan tanpa mengubah backend.

Race condition saat berganti tab cepat ditangani dengan flag `active` dalam cleanup `useEffect` (respons yang datang terlambat diabaikan).

---

## 4. Detail Transaksi — `/member/transaksi/[id]`

| Aspek | Detail                                               |
| ----- | ---------------------------------------------------- |
| File  | `src/app/(store)/member/transaksi/[id]/page.tsx`     |
| Jenis | Client Component                                     |
| Data  | `GET /api/orders/<id>`                               |
| Akses | Hanya pemilik pesanan. Bukan pemilik → API balas 404 |

### State awal

- Memuat → "Memuat pesanan..."
- 404 / gagal → kartu "Pesanan tidak ditemukan." + tombol **Kembali ke Riwayat Transaksi**

### Susunan

**1. Header**

- Nomor pesanan (`<h1>`) + badge status
- Tanggal lengkap dengan jam (`12 Agustus 2026, 14.30`)
- **Bila `status === 'AWAITING_PAYMENT'`**, muncul dua aksi:
  - **Batalkan Pesanan** (outline) — `window.confirm('Batalkan pesanan ini?')` lalu `POST /api/orders/<id>/cancel`. Respons berupa detail pesanan terbaru yang langsung dipakai memperbarui state (tanpa reload). Gagal → teks merah.
  - **Bayar Sekarang** (solid) — link ke `/payment/success?orderId=<id>`

    > Ini bukan tombol yang membuka popup Snap lagi; ia mengarahkan ke halaman status. Untuk melanjutkan pembayaran yang tertunda, pengguna perlu memakai tautan/VA dari email atau melakukan checkout ulang. Melanjutkan pembayaran langsung dari sini memerlukan pemanggilan `POST /api/payment/create` (yang sudah menyimpan & meng-cache `snapToken` 24 jam) — belum dipasang di UI.

**2. Kartu "Item Pesanan"** — per item: thumbnail 64×48, judul, `qty x harga`, dan `lineTotal`. Semua nilai berasal dari **snapshot** (`titleSnapshot`, `priceSnapshot`), sehingga tetap benar walau produk aslinya berubah atau dihapus.

**3. Grid 2 kolom**

- **Ringkasan Pembayaran** — Subtotal · Ongkos Kirim · Diskon (hijau, bila > 0) · **Total** (bold, dipisah garis) · "Metode: `<paymentMethod>`"

  > Metode pembayaran ditampilkan sebagai nilai enum mentah (mis. `BANK_TRANSFER`). Pemetaan ke label Indonesia sudah ada di halaman Laporan Lengkap admin tetapi belum dipakai di sini.

- **Alamat Penerima** — nama (bold), telepon, `alamat, kota`, dan "Catatan: `<note>`" bila ada (italic)

**4. Kartu "Riwayat Status"** — timeline sederhana: titik brand + label status Indonesia + tanggal-jam + catatan (bila ada). Data dari `OrderStatusHistory` urut `createdAt ASC`.

> Riwayat versi member **tidak** menampilkan siapa yang mengubah status (`changedByUser`) — informasi itu hanya ada di modal admin.

### Aturan pembatalan

Klien hanya menampilkan tombol saat `AWAITING_PAYMENT`, tapi server juga menjaganya:

```
POST /api/orders/[id]/cancel
  ├─ Order tidak ada ATAU order.userId !== user.id → 404 "Order tidak ditemukan"
  ├─ status !== 'AWAITING_PAYMENT'                 → 400 "Order tidak bisa dibatalkan"
  └─ applyOrderStatusTransition(→ CANCELLED)
        + stok semua item dikembalikan (increment)
        + AffiliateConversion PENDING (bila ada) → REJECTED
```

---

## 5. Program Afiliasi — `/member/afiliasi`

| Aspek | Detail                                                     |
| ----- | ---------------------------------------------------------- |
| File  | `src/app/(store)/member/afiliasi/page.tsx`                 |
| Jenis | Client Component                                           |
| Data  | `GET /api/affiliate/stats`                                 |
| Akses | Semua user login — tetapi isinya bercabang, lihat di bawah |

### Dua wajah halaman

`GET /api/affiliate/stats` mengembalikan **404** bila user belum punya `AffiliateProfile`. Halaman memakai status itu sebagai penentu tampilan:

| Kondisi                   | Yang dirender                         |
| ------------------------- | ------------------------------------- |
| memuat                    | "Memuat..."                           |
| 404 (belum jadi afiliasi) | `<OnboardingCard>` — form pendaftaran |
| 200                       | Dashboard afiliasi lengkap            |

### 5a. Kartu Onboarding "Jadi Afiliasi"

Teks pengantar: "Bagikan link produk favorit Anda dan dapatkan komisi dari setiap pembelian yang berhasil."

Form (semua wajib):

| Field                 | Contoh     |
| --------------------- | ---------- |
| Nama Bank             | BCA        |
| Nomor Rekening        | 1234567890 |
| Nama Pemilik Rekening | Wahyu Said |

Tombol **Jadi Afiliasi Sekarang** → `POST /api/affiliate/join`.

Apa yang terjadi di server (satu transaksi):

```
1. Tolak 400 bila AffiliateProfile sudah ada ("Anda sudah terdaftar sebagai afiliasi")
2. Generate kode unik: 6 karakter A-Z0-9 pertama dari nama/email + 4 digit acak
     contoh: "WAHYUS4821"  (diulang sampai unik)
3. INSERT AffiliateProfile { userId, code, payoutBank* , isActive: true }
4. Bila role masih BUYER → UPDATE role = 'AFFILIATE'
5. INSERT Notification { template: 'AFFILIATE_JOIN', payloadJson: { name, code } }
6. (di luar transaksi) dispatchNotification → kirim email selamat datang
7. Respons 201 dengan profil
```

Setelah sukses, halaman menaikkan `reloadKey` sehingga stats diambil ulang dan tampilan berganti ke dashboard afiliasi.

### 5b. Dashboard Afiliasi

**Header** — `<h1>Program Afiliasi</h1>`, deskripsi, dan tombol **Pilih Produk** → `/member/afiliasi/produk`

**4 kartu statistik** — Total Klik · Total Konversi · Komisi Pending · Komisi Dibayar (perhitungan sama dengan dashboard member)

**Tabel "Komisi per Produk"** — satu baris per produk yang dipilih afiliasi:

| Kolom                | Isi                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Produk               | judul produk                                                                                                                 |
| Tarif Komisi         | `Rp<n>/item` bila `fixedAmount` di-set · `<n>%` bila persen · `-` bila tidak ada tarif atau tarif non-aktif                  |
| Pendapatan Bulan Ini | jumlah `lineTotal` dari `OrderItem` produk ini pada pesanan dengan `affiliateUserId = user.id` **sejak awal bulan berjalan** |

Bila belum memilih produk: "Belum ada produk dipilih. Klik "Pilih Produk" untuk memulai."

> "Pendapatan Bulan Ini" adalah **nilai penjualan**, bukan komisi. Angka ini tidak memfilter status pesanan, jadi pesanan yang dibatalkan pun ikut terhitung.

**Blok "Link Afiliasi"** — satu kartu per produk terpilih, masing-masing berisi judul produk dan `<CopyLinkInput>`:

```
<origin>/r/<kode-afiliasi>?p=<slug-produk>
```

Input read-only + tombol **Salin** yang berubah jadi **Tersalin** selama 1,5 detik (`navigator.clipboard.writeText`, gagal secara senyap bila clipboard tidak tersedia). `origin` dibaca dari `window.location.origin` sehingga link benar di localhost maupun production.

Bila belum memilih produk: kartu kosong + tombol **Pilih Produk Sekarang**.

---

## 6. Pilih Produk Afiliasi — `/member/afiliasi/produk`

| Aspek | Detail                                                                |
| ----- | --------------------------------------------------------------------- |
| File  | `src/app/(store)/member/afiliasi/produk/page.tsx`                     |
| Jenis | Client Component                                                      |
| Data  | `GET /api/affiliate/products[?q=]`                                    |
| Akses | User login yang sudah punya `AffiliateProfile` (jika belum → API 404) |

### Tujuan

Memilih produk mana saja yang ingin dipromosikan. Pilihan ini menentukan dua hal:

1. Link afiliasi mana yang muncul di `/member/afiliasi`
2. **Kelayakan komisi** — pesanan hanya menghasilkan komisi bila memuat minimal satu produk yang ada di daftar pilihan afiliasi tersebut (lihat `isOrderEligibleForCommission`)

### Susunan

- **Header** — `<h1>Pilih Produk Afiliasi</h1>` + tombol **Kembali** → `/member/afiliasi`
- **Search** — input teks, debounce 300ms, dikirim sebagai `?q=`. Server mencari `title contains q` (case-insensitive), urut `title ASC`
- **Grid kartu** 1/2/3 kolom — setiap kartu adalah `<label>` yang bisa diklik seluruh areanya:
  - checkbox
  - thumbnail 56×44
  - judul, harga final, dan "Komisi: `<tarif>`" (format sama seperti tabel afiliasi)
  - kartu terpilih diberi `border-brand ring-1 ring-brand`
- **Bar aksi sticky di bawah** — tombol **Simpan Pilihan (`<n>`)** menampilkan jumlah terpilih; sukses → teks hijau "Pilihan produk berhasil disimpan."

### Perilaku penting: pilihan tidak hilang saat mencari

`selectedIds` disimpan sebagai `Set<string>` di state komponen. Saat hasil pencarian dimuat, kode hanya **menambahkan** produk yang `isSelected` dari server ke set, tanpa membuang id yang sudah ada:

```ts
setSelectedIds((previous) => {
  const next = new Set(previous);
  for (const item of data.items) if (item.isSelected) next.add(item.id);
  return next;
});
```

Artinya afiliasi bisa mencari "psikologi", mencentang 3 produk, lalu mencari "tafsir" dan mencentang 2 lagi — kelima-limanya tetap terpilih saat Simpan.

### Penyimpanan (`PUT /api/affiliate/products`)

Bersifat **replace penuh**, dalam satu transaksi:

```
DELETE semua AffiliateProductSelection milik profil ini
INSERT ulang seluruh productIds yang dikirim (createMany, skipDuplicates)
```

Konsekuensi (penting untuk diketahui): **mengirim daftar kosong akan menghapus semua pilihan**, dan `createdAt` seluruh baris ter-reset setiap kali menyimpan.

`POST` dialias ke `PUT` pada endpoint ini (`export const POST = PUT`) agar klien yang mengirim POST tetap bekerja.

---

## 7. Daftar Penerima — `/member/penerima`

| Aspek | Detail                                                   |
| ----- | -------------------------------------------------------- |
| File  | `src/app/(store)/member/penerima/page.tsx`               |
| Jenis | Client Component (modal + react-hook-form + Zod)         |
| Data  | `GET /api/member/receivers` + `GET /api/shipping/cities` |
| Akses | Semua user login (hanya milik sendiri)                   |

### Tujuan

Menyimpan alamat pengiriman agar checkout berikutnya bisa dipilih dengan satu klik.

### Susunan

- **Header** — `<h1>Daftar Penerima</h1>`, deskripsi "Kelola daftar penerima untuk mempermudah checkout berikutnya.", tombol **Tambah Penerima**
- **Grid kartu** (`sm:grid-cols-2`), setiap kartu berisi:
  - Label (mis. "Rumah") + tulisan kecil brand **Alamat Utama** bila `isDefault`
  - Aksi **Ubah** (brand) dan **Hapus** (merah)
  - Nama penerima (bold), telepon, email (bila ada), lalu `alamat, kota`
- **Empty state** — "Belum ada penerima tersimpan." + tombol **Tambah Penerima**

### Modal tambah/ubah

Judul "Tambah Penerima" atau "Ubah Penerima". Overlay `bg-black/40`, kartu `max-w-md` dengan scroll internal (`max-h-[90vh]`).

| Field                  | Kontrol                                 | Validasi                                                 |
| ---------------------- | --------------------------------------- | -------------------------------------------------------- |
| Label                  | text (placeholder "Rumah, Kantor, dll") | wajib                                                    |
| Nama Penerima          | text                                    | wajib                                                    |
| No. WhatsApp / Telepon | tel                                     | wajib                                                    |
| Email (opsional)       | email                                   | boleh string kosong; bila diisi harus format email valid |
| Kota                   | select (nama + provinsi)                | wajib, harus UUID valid                                  |
| Alamat Lengkap         | textarea 3 baris                        | wajib                                                    |
| Jadikan alamat utama   | checkbox                                | —                                                        |

Submit → `POST /api/member/receivers` (tambah) atau `PUT /api/member/receivers/<id>` (ubah). Email kosong dikirim sebagai `undefined`, bukan `''`.

### Aturan "alamat utama" (dijaga server, dalam transaksi)

- **Saat membuat** dengan `isDefault: true` → semua penerima lain milik user ini di-set `isDefault = false` lebih dulu
- **Saat mengubah** ke `isDefault: true` → semua penerima lain (kecuali yang sedang diubah) di-set `false`
- **Saat menghapus** penerima yang `isDefault` → penerima lain dengan `updatedAt` terbaru otomatis dipromosikan menjadi default

Jadi tidak mungkin ada dua alamat utama, dan member yang masih punya alamat selalu memiliki satu default.

### Hapus

`window.confirm('Hapus penerima "<nama>"?')` lalu `DELETE /api/member/receivers/<id>` (respons `204`). Gagal → teks merah di atas grid.

> Relasi `Receiver.city` memakai `onDelete: Restrict`, jadi kota yang masih dipakai penerima tidak bisa dihapus admin — endpoint kota membalas `409` dengan pesan "Kota masih digunakan pada alamat penerima yang tersimpan".

Perlu dicatat: menghapus penerima **tidak** mempengaruhi pesanan lama, karena `Order` menyimpan salinan datar (`receiverName`, `receiverPhone`, `receiverAddress`, `receiverCity`) alih-alih foreign key ke `Receiver`.
