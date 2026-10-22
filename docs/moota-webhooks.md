## Pelunasan otomatis dari Moota

URL tetap:

- BCA: `POST /api/webhooks/moota/bca`
- Interactive QRIS: `POST /api/webhooks/moota/interactive-qris`

Atur `MOOTA_BCA_WEBHOOK_SECRET` dan `MOOTA_QRIS_WEBHOOK_SECRET` di Dokploy sesuai **Secret Token** pada masing-masing webhook Moota, lalu deploy ulang. Nilai dipakai sebagai string asli, termasuk karakter `=` bila ada. Endpoint memverifikasi header `Signature` dengan HMAC SHA-256 dari body asli; tidak ada lagi pembatasan IP. Secret belum diatur menghasilkan 503, signature salah/tidak ada 401, JSON atau payload salah 400. Endpoint ini sekarang memproses pembayaran, bukan hanya mencatat body.

Payload mengikuti contoh Moota: array mutasi berisi `mutation_id` (atau `token`), `bank_id`, `date` (`YYYY-MM-DD HH:mm:ss`, dianggap WIB), `amount`, dan `type`. Field tambahan diterima tanpa disimpan. Nominal harus rupiah utuh; nilai string seperti `150123.00` juga diterima. `CR` diproses, `DB` dilewati. Pada endpoint BCA, `bank.bank_type` selain `bca` dilewati jika field bank tersedia. QRIS memakai nominal `amount` dari mutasi tanpa penyesuaian biaya MDR.

Mutasi dipasangkan dengan tepat satu order `ONLINE` berstatus `AWAITING_PAYMENT`, tanpa sesi payment gateway. BCA hanya mencocokkan metode `BANK_TRANSFER`, QRIS hanya `QRIS`. Nominal wajib sama dengan **total bayar termasuk kode unik**, yaitu `total + COALESCE(manualPaymentCode, 0)`. Order tidak boleh dibuat setelah waktu mutasi (dengan toleransi presisi tanggal Moota satu detik).

Jika cocok, alur status yang sama dengan tombol Tandai Lunas mengubah order menjadi `PAID`, membuat riwayat, menjadwalkan dan mengirim email `PAYMENT_RECEIVED`, serta membuat konversi afiliasi pending bila memenuhi syarat. Pembuatan resi otomatis kemudian dicoba untuk pesanan JNE tanpa PO. Kegagalan email ditandai FAILED agar dapat dicoba ulang oleh mekanisme notifikasi yang sudah ada. Kegagalan JNE mengikuti perilaku tombol lunas: order tetap lunas dan admin dapat mencoba Generate Resi manual.

Kode unik memang mengurangi benturan, tetapi kode digunakan ulang setelah jendela 24 jam dan total dasar juga bisa berbeda. Jika lebih dari satu order cocok, hasil `ambiguous` dan tidak ada order dilunasi. Nominal tidak cocok menghasilkan `no_match`; bukan mutasi masuk menghasilkan `ignored`. Kasus-kasus tersebut tetap mendapat HTTP 200 agar mutasi yang tidak sesuai tidak terus dikirim ulang.

Setiap mutasi disimpan di `WebhookLog`, memakai gabungan bank ID + mutation ID sebagai identitas lintas endpoint. Pelunasan dan pencatatan event satu transaksi; callback berulang tidak dipakai untuk order lain. Penguncian database menserialkan pairing dan efek lanjutan callback yang sama. Gagal memproses menghasilkan 500 agar Moota dapat mencoba ulang; jika pelunasan sudah commit, retry melanjutkan efek lanjutan tanpa mengulang transisi. Pengiriman email/JNE ke layanan eksternal tetap bergantung pada layanan tersebut; kegagalan koneksi setelah layanan menerima request dapat memerlukan pemeriksaan admin.

Respons sukses berisi `received: true` dan daftar `results` (`mutationId`, `outcome`, `duplicate`, serta `orderId` jika cocok). Log server hanya mencatat ringkasan hasil tersebut, bukan body bank mentah atau secret. Mutasi yang diabaikan/tidak cocok sudah tercatat sebagai diterima; perubahan data order berikutnya tidak otomatis memproses ulang mutasi lama.

## Pesanan pre-order

Gunakan pengaturan **Tampilkan Harga PO / pre-order aktif** yang sudah tersedia pada produk. Status PO disalin ke `OrderItem.isPreOrderSnapshot` saat checkout maupun POS. Mengubah flag produk setelah checkout tidak menghilangkan status PO historis. Saat migrasi, order lama diisi berdasarkan flag produk saat migrasi; status historis yang sudah berubah sebelumnya tidak bisa direkonstruksi.

Satu barang PO di dalam pesanan campuran menahan seluruh pembuatan resi otomatis. Pembayaran dan email tetap berjalan normal. Tombol **Generate Resi** manual tetap dapat dipakai admin ketika barang sudah siap. Penahanan PO berlaku juga untuk resi otomatis dari tombol Tandai Lunas admin, sehingga konsisten dengan webhook. Label PO dan penjelasannya ditampilkan pada popup detail order.

Checkout baru memisahkan PO dan non-PO menjadi order berbeda; barang kelompok lain tetap tersimpan di keranjang. Guard pesanan campuran tetap berlaku untuk order lama. Lihat `docs/checkout-groups.md` untuk alur dan kontrak API.

Deployment memerlukan migrasi `20261022000000_order_item_pre_order_snapshot` (`pnpm db:migrate`) sebelum aplikasi baru berjalan; Compose yang ada menjalankan layanan migrate sebelum app. Untuk order lama, pastikan produk PO ditandai aktif sebelum migrasi agar backfill menangkapnya.
