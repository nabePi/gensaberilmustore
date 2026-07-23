# Dokumen Review Halaman Website GenSa Berilmu

Dokumen ini menjelaskan setiap halaman website **GenSa Berilmu** secara detail, mulai dari tujuan halaman, layout yang digunakan, elemen-elemen utama, hingga link yang bisa langsung diakses untuk review desain dan tampilan.

**Base URL:** `https://nabepi.github.io/gensaberilmustore/`

---

## Daftar Isi

1. [Halaman Publik / Toko](#1-halaman-publik--toko)
2. [Halaman Autentikasi](#2-halaman-autentikasi)
3. [Halaman Landing](#3-halaman-landing)
4. [Halaman Member Area](#4-halaman-member-area)
5. [Halaman Admin Panel](#5-halaman-admin-panel)

---

## 1. Halaman Publik / Toko

Halaman-halaman ini bisa diakses oleh semua pengunjung tanpa perlu login.

### 1.1 Beranda

| | |
|---|---|
| **Nama File** | `index.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/index.html |
| **Tujuan** | Halaman utama toko online yang menampilkan produk unggulan, kategori buku, dan akses ke seluruh fitur toko. |

**Layout & Elemen Utama:**
- **Header fixed** dengan logo, navigasi utama (Beranda, Produk, Buku Anak), search bar, ikon keranjang, dan tombol Masuk/Daftar.
- **Hero section** besar di bagian atas: banner utama di sebelah kiri dan dua banner promosi di sebelah kanan.
- **Section Produk** dalam bentuk carousel horizontal:
  - Buku Terbaru
  - Bestseller
  - International Bestseller
  - Keislaman Kiwari
  - Rujukan Islam Klasik
  - Lainnya
- **Section Blog** dengan grid 3 kolom.
- **Footer** 4 kolom: tentang toko, menu, kontak, dan sosial media.

---

### 1.2 Detail Produk

| | |
|---|---|
| **Nama File** | `product.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/product.html |
| **Tujuan** | Menampilkan informasi lengkap sebuah produk/buku beserta tombol beli dan deskripsi detail. |

**Layout & Elemen Utama:**
- **Breadcrumb** navigasi: Beranda > Produk > Nama Produk.
- **Bagian kiri:** Galeri gambar produk (gambar utama besar).
- **Bagian kanan:**
  - Judul produk
  - Nama penulis
  - Rating bintang dan jumlah ulasan
  - Harga final, harga coret, badge diskon
  - Informasi stok tersedia
  - Tombol Wishlist, Bagikan, dan Tambah ke Keranjang
  - Grid spesifikasi (SKU, halaman, imprint, tahun, berat, jenis cover)
- **Detail Tabs** (sidebar kiri + konten kanan):
  - Deskripsi / Blurb / Sinopsis
  - Daftar Isi
  - Keunggulan
  - Ulasan
- **Produk Terkait** dalam carousel horizontal.

---

### 1.3 Keranjang Belanja

| | |
|---|---|
| **Nama File** | `cart.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/cart.html |
| **Tujuan** | Halaman untuk mengelola item yang sudah dipilih sebelum checkout. |

**Layout & Elemen Utama:**
- **Header halaman:** judul "Keranjang Belanja" dan link "Lanjutkan Belanja".
- **State kosong:** ikon keranjang, pesan "Keranjang Anda Kosong", tombol "Mulai Belanja".
- **State berisi:** layout 2 kolom:
  - **Kiri:** daftar item keranjang. Setiap item menampilkan gambar, judul, brand, SKU, harga, quantity selector (+/-), dan tombol hapus.
  - **Kanan:** ringkasan pesanan (subtotal, diskon, total) dan tombol "Lanjutkan ke Pembayaran".

---

### 1.4 Checkout

| | |
|---|---|
| **Nama File** | `checkout.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/checkout.html |
| **Tujuan** | Halaman pengisian data penerima dan pembayaran sebelum pesanan diproses. |

**Layout & Elemen Utama:**
- **Layout 2 kolom:**
  - **Kiri (form card):** formulir data penerima
    - Nama Lengkap
    - Email
    - No. Telepon / WhatsApp
    - Kota / Kabupaten (dropdown dengan ongkos kirim)
    - Alamat Lengkap
    - Catatan Pengiriman
    - Pesan login notice jika belum login
  - **Kanan (summary card):**
    - Ringkasan item (gambar, judul, qty x harga)
    - Subtotal
    - Ongkos Kirim
    - Total Pembayaran
    - Tombol "Bayar Sekarang"
- **Modal Pembayaran** (snap modal) memilih metode pembayaran: GoPay, Transfer Bank, Kartu Kredit, ShopeePay.

---

### 1.5 Pembayaran Berhasil

| | |
|---|---|
| **Nama File** | `payment-success.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/payment-success.html |
| **Tujuan** | Halaman konfirmasi setelah pembayaran berhasil. |

**Layout & Elemen Utama:**
- **Success card** di tengah halaman:
  - Ikon centang besar
  - Judul "Pembayaran Berhasil!"
  - Pesan terima kasih
  - Informasi pesanan (No. Pesanan, Total Pembayaran)
  - Tombol "Kembali ke Beranda" dan "Lihat Pesanan Saya"

---

### 1.6 Buku Anak (Kids Store)

| | |
|---|---|
| **Nama File** | `kids.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/kids.html |
| **Tujuan** | Halaman khusus kategori buku anak dengan desain yang lebih ceria dan penuh warna. |

**Layout & Elemen Utama:**
- **Header khusus** dengan style kids (`kids-header`).
- **Hero section** dengan teks sambutan "Dunia Buku yang Ceria dan Penuh Warna" dan CTA.
- **Section Kategori Usia** dalam grid 4 kolom:
  - 0-2 Tahun
  - 3-6 Tahun
  - 7-9 Tahun
  - 10-12 Tahun
- **Section Buku Populer Anak** dengan grid produk.
- **Section Buku Diskon** dengan badge diskon.
- **Section Paket Hadiah** promosi bundling.
- **CTA Section** ajakan menjelajahi koleksi.

---

## 2. Halaman Autentikasi

### 2.1 Login Member

| | |
|---|---|
| **Nama File** | `login.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/login.html |
| **Tujuan** | Halaman login untuk member yang sudah memiliki akun. |

**Layout & Elemen Utama:**
- **Auth card** di tengah halaman:
  - Judul "Selamat Datang Kembali"
  - Form: Email, Password
  - Checkbox "Ingat saya" + link "Lupa password?"
  - Tombol "Masuk"
  - Divider "atau"
  - Link ke halaman Daftar

---

### 2.2 Daftar Member

| | |
|---|---|
| **Nama File** | `signup.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/signup.html |
| **Tujuan** | Halaman pendaftaran akun member baru. |

**Layout & Elemen Utama:**
- **Auth card** di tengah halaman:
  - Judul "Buat Akun Baru"
  - Form: Nama Lengkap, Email, Nomor WhatsApp, Password, Konfirmasi Password
  - Tombol "Daftar"
  - Link ke halaman Login

---

## 3. Halaman Landing

### 3.1 Linktree / Official Links

| | |
|---|---|
| **Nama File** | `landing.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/landing.html |
| **Tujuan** | Halaman landing seperti Linktree yang mengumpulkan semua link penting GenSa Berilmu. |

**Layout & Elemen Utama:**
- **Landing card** di tengah layar dengan background khusus (`landing-body`).
- **Brand section:** logo, nama toko, tagline.
- **Action buttons:** Simpan Kontak, Bagikan Kontak.
- **Link list** vertikal:
  - Beranda
  - Toko Online
  - Order Cepat Via Website (primary)
  - Pemesanan Via WhatsApp
  - Mau Jadi Reseller Dropship?
  - Undang Ustadz Edgar Hamas
  - Mau Jadi Marketing Affiliate Produk Gensa?
  - Official Instagram
  - Official YouTube

---

## 4. Halaman Member Area

Halaman-halaman ini memerlukan login member. Layout umum: sidebar kiri + konten kanan.

### 4.1 Redirect Akun Saya

| | |
|---|---|
| **Nama File** | `member.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/member.html |
| **Tujuan** | Halaman redirect otomatis ke `member-dashboard.html`. |

**Catatan:** Halaman ini hanya melakukan redirect, tidak memiliki tampilan sendiri.

---

### 4.2 Dashboard Member

| | |
|---|---|
| **Nama File** | `member-dashboard.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/member-dashboard.html |
| **Tujuan** | Halaman utama setelah member login, menampilkan ringkasan akun dan transaksi terbaru. |

**Layout & Elemen Utama:**
- **Sidebar kiri:** profil member, menu navigasi (Dashboard, Profil Saya, Riwayat Transaksi, Afiliasi, Penerima), tombol Keluar.
- **Konten kanan:**
  - Judul "Dashboard" dan sapaan selamat datang
  - Statistik singkat (affiliate stats)
  - Panel "Transaksi Terbaru" dengan list pesanan dan link "Lihat Semua"
  - **Quick cards:** Lihat Transaksi, Kelola Afiliasi, Daftar Penerima

---

### 4.3 Profil Saya

| | |
|---|---|
| **Nama File** | `member-profil.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/member-profil.html |
| **Tujuan** | Halaman untuk mengedit informasi profil member. |

**Layout & Elemen Utama:**
- **Sidebar kiri** sama dengan dashboard.
- **Konten kanan:**
  - Judul "Profil Saya"
  - **Profile card** berisi form:
    - Foto profil (preview, tombol pilih foto, hapus foto)
    - Nama Lengkap
    - Email (read-only)
    - No. Telepon
    - No. WhatsApp (dengan checkbox "Sama dengan no. telepon")
    - Tombol "Simpan Perubahan"

---

### 4.4 Riwayat Transaksi

| | |
|---|---|
| **Nama File** | `member-transaksi.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/member-transaksi.html |
| **Tujuan** | Halaman untuk melihat dan memfilter seluruh riwayat pembelian member. |

**Layout & Elemen Utama:**
- **Sidebar kiri** sama.
- **Konten kanan:**
  - Judul "Riwayat Transaksi"
  - Toolbar: jumlah pesanan + filter status (Semua, Pending, Lunas, Dikirim, Selesai, Dibatalkan)
  - **Orders list** menampilkan setiap pesanan dengan status badge.
  - State kosong jika tidak ada transaksi.

---

### 4.5 Program Afiliasi

| | |
|---|---|
| **Nama File** | `member-afiliasi.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/member-afiliasi.html |
| **Tujuan** | Halaman utama program afiliasi untuk member memantau komisi dan link afiliasi. |

**Layout & Elemen Utama:**
- **Sidebar kiri** sama.
- **Konten kanan:**
  - Judul "Program Afiliasi" dan deskripsi singkat
  - Tombol "Pilih Produk" di pojok kanan atas
  - **Statistik afiliasi** (jumlah klik, konversi, komisi, dsb.)
  - **Tabel Komisi per Produk** (produk, harga, komisi, penghasilan)
  - **Daftar link afiliasi** yang bisa disalin

---

### 4.6 Pilih Produk Afiliasi

| | |
|---|---|
| **Nama File** | `member-afiliasi-produk.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/member-afiliasi-produk.html |
| **Tujuan** | Halaman untuk memilih produk mana saja yang ingin dipromosikan oleh affiliate. |

**Layout & Elemen Utama:**
- **Sidebar kiri** sama, menu Afiliasi aktif.
- **Konten kanan:**
  - Breadcrumb: Afiliasi > Pilih Produk
  - Judul "Pilih Produk Afiliasi"
  - Counter "X dipilih" + tombol "Simpan Pilihan"
  - Info box tentang komisi
  - **Grid/list produk** dengan checkbox pilihan dan informasi komisi per produk

---

### 4.7 Daftar Penerima

| | |
|---|---|
| **Nama File** | `member-penerima.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/member-penerima.html |
| **Tujuan** | Halaman untuk mengelola daftar alamat penerima pengiriman. |

**Layout & Elemen Utama:**
- **Sidebar kiri** sama.
- **Konten kanan:**
  - Judul "Daftar Penerima"
  - Counter jumlah penerima + tombol "Tambah Penerima"
  - List penerima yang tersimpan
  - **Modal form** untuk tambah/edit penerima (nama, telepon, email, alamat)

---

## 5. Halaman Admin Panel

Halaman-halaman ini memerlukan login admin. Layout umum: sidebar kiri + konten kanan dengan navigasi admin.

**Demo Login Admin:**
- Email: `admin@gensaberilmu.co.id`
- Password: `admin123`

### 5.1 Login Admin

| | |
|---|---|
| **Nama File** | `admin-login.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-login.html |
| **Tujuan** | Halaman login khusus admin panel. |

**Layout & Elemen Utama:**
- **Full-screen login page** (`login-page`).
- **Login card** di tengah:
  - Ikon gembok
  - Judul "Admin Panel"
  - Form: Email, Password
  - Pesan error jika login gagal
  - Tombol "Masuk"
  - Hint demo login

---

### 5.2 Dashboard Admin

| | |
|---|---|
| **Nama File** | `admin.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin.html |
| **Tujuan** | Halaman utama panel admin dengan ringkasan toko dan pesanan terbaru. |

**Layout & Elemen Utama:**
- **Header** dengan navigasi Beranda / Admin.
- **Sidebar kiri:** profil admin, menu admin lengkap, tombol Keluar.
- **Konten kanan:**
  - Judul "Dashboard Admin"
  - **Admin stats** (jumlah pesanan, produk, member, pendapatan, dsb.)
  - Panel "Pesanan Terbaru"
  - **Quick cards:** Kelola Pesanan, Kelola Produk, Lihat Member, Lihat Laporan

---

### 5.3 Kelola Pesanan

| | |
|---|---|
| **Nama File** | `admin-pesanan.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-pesanan.html |
| **Tujuan** | Halaman untuk melihat, mencari, dan mengelola semua pesanan masuk. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Pesanan aktif.
- **Konten kanan:**
  - Judul "Kelola Pesanan" + jumlah pesanan
  - Toolbar: search, filter status, tombol Export CSV
  - **Tabel pesanan** dengan kolom ID, pelanggan, item, total, status, aksi
  - State kosong jika tidak ada pesanan
  - **Modal detail pesanan** besar (`admin-modal-content--lg`)

---

### 5.4 Order Board (Kanban)

| | |
|---|---|
| **Nama File** | `admin-board.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-board.html |
| **Tujuan** | Halaman papan Kanban untuk memantau dan mengubah status pesanan secara visual dengan drag-and-drop. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Board aktif.
- **Konten kanan:**
  - Judul "Order Board"
  - Search bar + filter sumber (Online/POS)
  - Help text cara drag-and-drop
  - **Board container** dengan kolom status:
    - Menunggu Pembayaran
    - Lunas
    - Dikemas
    - Dikirim
    - Selesai
    - Dibatalkan
  - **Modal detail pesanan** saat kartu diklik

---

### 5.5 Pusat Fulfillment

| | |
|---|---|
| **Nama File** | `admin-fulfillment.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-fulfillment.html |
| **Tujuan** | Halaman untuk memproses banyak pesanan sekaligus: bulk select, bulk update status, cetak packing list, export CSV. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Fulfillment aktif.
- **Konten kanan:**
  - Judul "Pusat Fulfillment" + jumlah pesanan
  - Toolbar: search, filter status, filter sumber, tombol Export CSV
  - **Bulk action bar:** checkbox "select all", counter "X pesanan dipilih", tombol:
    - Tandai Dikemas
    - Tandai Dikirim
    - Cetak Packing List
  - **Tabel pesanan** dengan checkbox per baris
  - **Modal detail pesanan** dengan tombol cetak packing list
  - **Print area** khusus untuk mencetak packing list

---

### 5.6 Kelola Produk

| | |
|---|---|
| **Nama File** | `admin-produk.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-produk.html |
| **Tujuan** | Halaman untuk mengelola katalog produk toko. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Produk aktif.
- **Konten kanan:**
  - Judul "Kelola Produk" + jumlah produk + tombol "+ Tambah Produk"
  - Toolbar: search, filter kategori, filter stok
  - **Tabel produk**
  - **Modal form produk** (`admin-modal-content--lg`) dengan field:
    - Nama Produk
    - Penulis
    - Harga
    - Diskon (%)
    - Stok
    - Kategori
    - URL Gambar
    - Deskripsi

---

### 5.7 Kelola Member

| | |
|---|---|
| **Nama File** | `admin-member.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-member.html |
| **Tujuan** | Halaman untuk melihat daftar member terdaftar. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Member aktif.
- **Konten kanan:**
  - Judul "Kelola Member" + jumlah member
  - Search bar
  - **Tabel member**
  - **Modal detail member**

---

### 5.8 Point of Sale (POS)

| | |
|---|---|
| **Nama File** | `admin-pos.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-pos.html |
| **Tujuan** | Halaman penjualan cepat untuk event offline/pameran buku. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu POS aktif.
- **Konten kanan:**
  - Judul "Point of Sale" + jumlah item di keranjang
  - **Layout 2 kolom:**
    - **Kiri (katalog):** search produk, filter kategori, grid produk POS
    - **Kanan (cart):** daftar item keranjang, total, metode pembayaran (Tunai/QRIS/Transfer), nama pelanggan, telepon, catatan, tombol Checkout
  - **Section Riwayat Transaksi POS** di bawah
  - **Modal struk POS** dengan tombol Cetak

---

### 5.9 Kelola Afiliasi

| | |
|---|---|
| **Nama File** | `admin-afiliasi.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-afiliasi.html |
| **Tujuan** | Halaman admin untuk mengatur program afiliasi dan komisi per produk. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Afiliasi aktif.
- **Konten kanan:**
  - Judul "Kelola Afiliasi" + jumlah afiliasi
  - **Statistik afiliasi**
  - **Section Performa Afiliasi** (tabel member affiliate)
  - **Section Tingkat Komisi per Produk**
  - **Section Kelola Produk Afiliasi** + tombol "+ Tambah Produk"
  - **Modal form produk afiliasi:** pilih produk, tingkat komisi (%), aktifkan/nonaktifkan

---

### 5.10 Laporan Penjualan

| | |
|---|---|
| **Nama File** | `admin-laporan.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-laporan.html |
| **Tujuan** | Halaman ringkasan performa toko dengan chart dan status pesanan. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Laporan aktif.
- **Konten kanan:**
  - Judul "Laporan Penjualan"
  - Filter periode (Semua Waktu/Hari Ini/7 Hari/Bulan Ini) + Export CSV
  - **Admin stats** ringkasan
  - **Section Status Pesanan** (breakdown)
  - **Section Top Produk Terjual**
  - **Section Pesanan per Hari** (chart batang)

---

### 5.11 Laporan Lengkap

| | |
|---|---|
| **Nama File** | `admin-laporan-lengkap.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-laporan-lengkap.html |
| **Tujuan** | Halaman analisis penjualan detail dengan filter tahun, bulan, dan sumber. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Laporan Lengkap aktif.
- **Konten kanan:**
  - Judul "Laporan Lengkap"
  - Toolbar filter: Tahun, Bulan, Sumber (Online/POS) + Export CSV
  - **Admin stats**
  - **Section Pendapatan per Bulan** (chart + tabel)
  - **Section Perbandingan POS vs Online**
  - **Section Pendapatan per Kategori**
  - **Section Metode Pembayaran**
  - **Section Produk Terlaris**

---

### 5.12 Konfigurasi Tampilan

| | |
|---|---|
| **Nama File** | `admin-konfigurasi.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-konfigurasi.html |
| **Tujuan** | Halaman admin untuk mengatur banner hero dan buku/produk yang tampil di halaman Beranda (`index.html`) dan halaman Buku Anak (`kids.html`). |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Konfigurasi aktif.
- **Konten kanan:**
  - Judul "Konfigurasi Tampilan"
  - **Tab Beranda:**
    - Banner Hero: URL gambar utama + 2 gambar samping
    - Gambar Promo per section: Buku Terbaru, Bestseller, International Bestseller, Keislaman Kiwari, Rujukan Islam Klasik
    - Pilih Buku per section dengan checklist produk + filter pencarian
  - **Tab Buku Anak:**
    - Hero: badge, judul, deskripsi, gambar hero
    - Promo: badge, judul, deskripsi, gambar promo
    - Pilih Buku untuk section Buku Populer Anak dan Buku Diskon
  - Tombol "Simpan Konfigurasi"

---

### 5.13 Pengaturan Toko

| | |
|---|---|
| **Nama File** | `admin-pengaturan.html` |
| **Link Review** | https://nabepi.github.io/gensaberilmustore/admin-pengaturan.html |
| **Tujuan** | Halaman konfigurasi data toko, rekening bank, pengiriman, dan admin. |

**Layout & Elemen Utama:**
- **Sidebar kiri** menu Pengaturan aktif.
- **Konten kanan:**
  - Judul "Pengaturan Toko"
  - Form terbagi dalam section:
    - **Informasi Toko:** nama, email, telepon, alamat
    - **Rekening Bank:** bank 1 & 2 beserta nomor rekening
    - **Pengiriman:** ongkos kirim default, minimum gratis ongkir
    - **Data Admin:** nama admin, email admin (read-only)
  - Tombol "Simpan Pengaturan"
  - **Section Data Storage:** info penyimpanan localStorage, tombol reset pesanan, tombol reset semua data

---

## Catatan Umum Desain

- **Font utama:** Source Sans 3 (Google Fonts)
- **Warna brand:** Oranye kemerahan (`#95271B`) sebagai warna aksen/tombol utama
- **Layout member & admin:** Sidebar kiri fixed + konten kanan, dengan navigasi ikon + teks
- **Responsif:** Header memiliki mobile toggle (hamburger menu) untuk tampilan mobile
- **Ikon:** Semua ikon menggunakan SVG inline, konsisten dengan stroke style
- **Data:** Saat ini menggunakan `localStorage` browser; beberapa halaman memerlukan data/login agar konten dinamis muncul

---

## Checklist Halaman

- [x] `index.html` - Beranda
- [x] `product.html` - Detail Produk
- [x] `cart.html` - Keranjang Belanja
- [x] `checkout.html` - Checkout
- [x] `payment-success.html` - Pembayaran Berhasil
- [x] `login.html` - Login Member
- [x] `signup.html` - Daftar Member
- [x] `landing.html` - Official Links
- [x] `kids.html` - Buku Anak
- [x] `member.html` - Redirect Akun Saya
- [x] `member-dashboard.html` - Dashboard Member
- [x] `member-profil.html` - Profil Saya
- [x] `member-transaksi.html` - Riwayat Transaksi
- [x] `member-afiliasi.html` - Program Afiliasi
- [x] `member-afiliasi-produk.html` - Pilih Produk Afiliasi
- [x] `member-penerima.html` - Daftar Penerima
- [x] `admin-login.html` - Login Admin
- [x] `admin.html` - Dashboard Admin
- [x] `admin-pesanan.html` - Kelola Pesanan
- [x] `admin-board.html` - Order Board
- [x] `admin-fulfillment.html` - Pusat Fulfillment
- [x] `admin-produk.html` - Kelola Produk
- [x] `admin-member.html` - Kelola Member
- [x] `admin-pos.html` - Point of Sale
- [x] `admin-afiliasi.html` - Kelola Afiliasi
- [x] `admin-laporan.html` - Laporan Penjualan
- [x] `admin-laporan-lengkap.html` - Laporan Lengkap
- [x] `admin-konfigurasi.html` - Konfigurasi Tampilan
- [x] `admin-pengaturan.html` - Pengaturan Toko

**Total: 29 halaman HTML**
