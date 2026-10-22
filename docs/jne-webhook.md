## Webhook status JNE

Endpoint: `POST /api/webhooks/jne?token=<JNE_WEBHOOK_SECRET>`.

Set `JNE_WEBHOOK_SECRET` ke nilai acak minimal 32 karakter di environment Dokploy, lalu deploy ulang. Buat nilai dengan `openssl rand -hex 32`. Gunakan secret yang berbeda untuk staging dan produksi; jangan commit nilai secret atau membagikan URL lengkap secara publik. Pastikan access log proxy menyamarkan parameter `token`.

- Staging: `https://gensaberilmu.xyz/api/webhooks/jne?token=<secret-staging>`
- Produksi: `https://store.gensaberilmu.com/api/webhooks/jne?token=<secret-produksi>`

Daftarkan URL lengkap pada JNE. Token wajib untuk mencegah perubahan status order oleh pengirim yang tidak berwenang; tanpa konfigurasi secret endpoint membalas HTTP 503, token salah/tidak ada membalas HTTP 401.

Payload mengikuti [JNE Webhook Status V2](https://quip.com/QT8hAgN8FueA): JSON object dengan `awb`, `order_id`, dan `status`. Field tambahan diterima. `order_id` harus sama dengan nomor order toko (`orderNumber`), yang dikirim sebagai `OLSHOP_ORDERID` saat pembuatan resi. `awb` harus sama dengan resi yang tersimpan dan metode pengiriman harus JNE. Field `signature` dalam dokumentasi adalah tautan tanda tangan penerima, bukan autentikasi webhook.

Status `DELIVERED` mengubah order `SHIPPED` menjadi `COMPLETED` melalui alur status yang sudah ada: mencatat riwayat, menjadwalkan email selesai jika tersedia, dan menyetujui komisi afiliasi yang masih pending. Pengiriman ulang untuk order yang sudah selesai tidak membuat riwayat atau komisi ganda. Transaksi mengunci order agar callback bersamaan tidak memproses penyelesaian dua kali.

Status JNE lainnya menerima respons sukses tanpa mengubah order. Order yang tidak cocok membalas HTTP 404; order yang belum berstatus `SHIPPED` (atau dibatalkan) membalas HTTP 409 agar statusnya dapat diperiksa admin. JSON tidak valid atau field wajib tidak valid membalas HTTP 400.

Respons sukses HTTP 200: `{"status":true}`. Respons gagal: `{"status":false,"reason":"..."}`. Endpoint tidak mencatat body, token, atau data pribadi penerima ke log aplikasi.

## Bukti penerimaan dan arsip payload

Pada status `DELIVERED`, field opsional `photo`, `receiver_name`, dan `receiver_relation` disimpan sebagai `deliveryPhotoUrl`, `deliveryReceiverName`, dan `deliveryReceiverRelation` pada order. Field kosong/null boleh dikirim dan payload lama tiga field tetap diterima. `deliveryConfirmedAt` menunjukkan waktu pertama sistem menerima konfirmasi JNE, bukan waktu serah terima paket yang sebenarnya.

Order harus memiliki nomor order/resi JNE yang sesuai dan berstatus `SHIPPED` atau `COMPLETED`. Pengiriman ulang hanya mengisi bukti yang belum tersedia; bukti pertama tidak ditimpa oleh field kosong atau perubahan berikutnya. Perubahan payload tetap dapat dilihat melalui arsip. Order selesai tidak dijalankan ulang transisinya, sehingga riwayat, email, dan komisi tidak dibuat dua kali. Dispatch email JNE dikunci per order untuk callback bersamaan.

Email `ORDER_COMPLETED` menyertakan bukti yang tersedia saat order pertama kali selesai: nomor resi, nama penerima, hubungan penerima, serta foto dan tautan fotonya. Detail `/member/transaksi/[id]` juga menampilkan bukti penerimaan melalui API detail order yang hanya dapat diakses pemiliknya. Jika bukti baru dikirim setelah email selesai sudah terkirim, detail member diperbarui tanpa mengirim email selesai kedua kali. Order lama tanpa bukti tidak menampilkan bagian bukti.

Semua payload dengan token benar dan struktur/status yang valid diarsipkan lengkap dalam `WebhookLog` (`provider: jne`, `createdAt` sebagai waktu penerimaan). Field tambahan dari JNE ikut disimpan, termasuk untuk status selain `DELIVERED` dan order/resi yang tidak cocok. Body JSON yang sama setelah parse disimpan sekali berdasarkan hash; perubahan isi membuat arsip baru. Token di query URL dan header request tidak disimpan. Payload tidak valid atau token salah tidak diarsipkan. Arsip dan perubahan order berada dalam satu transaksi; kegagalan database dibalas 500 agar JNE mencoba ulang.

`photo` disimpan sebagai **URL dari JNE**, bukan salinan berkas gambar. Hanya URL HTTP/HTTPS tanpa kredensial yang dipakai untuk tampilan/email. Jika URL tidak valid, penyelesaian order tetap diproses dan nilai aslinya tetap ada pada arsip. Ketersediaan foto mengikuti masa berlaku/hosting JNE; halaman menyediakan tautan pembuka foto jika pratinjau gagal. Teks penerima di email di-escape sebelum dimasukkan ke HTML.

Jalankan migrasi `20261022010000_order_delivery_proof` sebelum deploy aplikasi baru (`pnpm db:migrate`). Tidak ada environment baru. Order yang sudah selesai dapat dilengkapi buktinya dengan kirim ulang webhook `DELIVERED`; email yang sudah terkirim tidak otomatis dikirim ulang.
