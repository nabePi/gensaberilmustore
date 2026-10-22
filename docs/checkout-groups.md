## Checkout PO dan non-PO

Keranjang dapat berisi produk PO dan non-PO. Status produk mengikuti flag `isPreOrderActive` yang sudah tersedia di admin produk, dan API keranjang mengirimkannya sebagai `isPreOrder`.

Pembeli memilih **Checkout barang ready** atau **Checkout barang PO** di keranjang. Membuka `/checkout` langsung dengan keranjang campuran menampilkan pilihan kelompok lebih dulu. Jika hanya satu kelompok tersedia, checkout langsung memakai kelompok tersebut. URL `/checkout?group=READY` dan `/checkout?group=PRE_ORDER` hanya menampilkan barang dalam kelompok pilihan; kelompok kosong tidak otomatis dialihkan ke kelompok lain.

Ringkasan, subtotal, berat kirim, voucher minimum belanja, dan diskon afiliasi dihitung untuk barang kelompok pilihan. Voucher dan form checkout direset ketika berpindah kelompok agar data pilihan sebelumnya tidak terbawa. Ongkir dan pembayaran terpisah untuk setiap pesanan.

`POST /api/orders` menerima `checkoutGroup` (`READY` atau `PRE_ORDER`). Server memfilter memakai flag produk dari database, bukan flag yang dikirim pembeli. Request lama tanpa kelompok tetap diterima untuk keranjang homogen, tetapi ditolak dengan HTTP 400 untuk keranjang campuran. Stok dan snapshot PO hanya dibuat untuk item yang terpilih. Perubahan flag PO saat pemrosesan menyebabkan checkout ditolak, bukan menghasilkan order campuran.

Setelah checkout berhasil, hanya item terpilih yang dihapus. Record keranjang dan cookie tamu dipertahankan, sehingga barang lainnya tetap dapat diakses dan dipesan terpisah. Cart item dikunci dalam transaksi dan jumlahnya dicek ulang untuk mencegah checkout bersamaan memesan item yang sama dua kali.

Preview ongkir (`POST /api/shipping/tariff`) dan diskon afiliasi (`GET /api/affiliate/discount`) juga menerima `checkoutGroup`. Request tanpa kelompok pada keranjang campuran ditolak jika memerlukan perhitungan kelompok. Preview voucher menerima subtotal kelompok dari checkout; validasi final tetap dihitung ulang di server saat membuat order.

Tidak ada migrasi tambahan untuk pemisahan checkout ini. Fitur ini memakai perubahan Moota/PO yang sudah masuk melalui PR #117, termasuk snapshot PO pada order item. Semua produk PO berada dalam satu kelompok; pengelompokan berdasarkan tanggal rilis belum menjadi bagian dari fitur ini.
