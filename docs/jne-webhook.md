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
