## Pembatalan otomatis pesanan belum dibayar

Order online berstatus `AWAITING_PAYMENT` dibatalkan ketika usianya **24 jam atau lebih sejak `createdAt`**. Pemeriksaan dijalankan scheduler Dokploy setiap **15 menit**, bukan setiap 24 jam. Dengan scheduler normal, pembatalan terjadi pada umur 24 jam sampai kurang dari 24 jam 15 menit. Jika aplikasi/scheduler sempat mati, order yang terlewat ikut diproses pada eksekusi berikutnya.

Order dengan klaim pembayaran (`paymentClaimedAt`), bukti pembayaran (`paymentProofUrl`/`paymentProofUploadedAt`), atau sesi payment gateway (`PaymentSession`) dilewati. Klaim/bukti memerlukan pemeriksaan admin; sesi Midtrans tetap mengikuti status gateway. POS dan seluruh order berstatus selain `AWAITING_PAYMENT` tidak disentuh. Keranjang pembeli tidak diubah. Aturan berlaku juga untuk order tamu, member, serta PO.

Pembatalan memakai alur status order yang sudah ada. Stok yang dipesan dikembalikan dan riwayat mendapat catatan **“Dibatalkan oleh sistem karena melewati batas pembayaran 24 jam.”** dengan `changedByUserId: null`. Tidak ada email pembatalan baru. Kebijakan voucher tetap mengikuti alur pembatalan yang sudah ada.

Order dipilih dan dikunci di transaksi database. Scheduler bersamaan melewati row yang sedang dikunci, dan stok hanya dikembalikan sekali. Jika pembayaran lebih dulu mengubah status, scheduler tidak membatalkannya. Klaim/upload bukti memeriksa ulang status saat menyimpan sehingga tidak dapat berhasil pada snapshot lama setelah pembatalan commit. Jika database gagal, status, stok, dan riwayat dalam batch di-rollback.

Moota yang terlambat setelah pembatalan tidak otomatis mengaktifkan kembali pesanan. Payload Moota tetap mengikuti mekanisme arsip webhook yang ada dan perlu direkonsiliasi admin jika pembayaran memang sudah masuk. Pembatasan ini menjaga stok yang sudah dilepas agar tidak diambil lagi tanpa pemeriksaan.

## Konfigurasi di Dokploy

Fitur ini memakai [Schedule Jobs Dokploy](https://docs.dokploy.com/docs/core/schedule-jobs), bukan penjadwalan dalam proses Next.js. Job Compose mengeksekusi command di service/container tujuan. Karena deployment repo menggunakan Compose, pilih service **`app`**, bukan `migrate` atau `seed`.

1. Merge dan deploy aplikasi baru. Tidak ada migrasi database tambahan.
2. Isi environment **`CRON_SECRET`** dengan nilai acak panjang (misalnya hasil `openssl rand -hex 32`) lalu redeploy agar container mendapat nilai tersebut. Secret sudah diteruskan oleh `docker-compose.yml`. Endpoint baru wajib secret; tanpa secret mengembalikan HTTP 503 dan tidak memproses order.
3. Tambahkan Schedule Job pada Compose Gensa Berilmu Store:

   | Pengaturan | Nilai                                        |
   | ---------- | -------------------------------------------- |
   | Name       | Batalkan pesanan belum dibayar 24 jam        |
   | Type       | Compose                                      |
   | Service    | `app`                                        |
   | Cron       | `*/15 * * * *`                               |
   | Timezone   | `Asia/Jakarta`                               |
   | Command    | `node /app/scripts/expire-unpaid-orders.mjs` |
   | Enabled    | Aktif                                        |

4. Setelah deployment, jalankan sekali melalui **Run Manually**, lalu periksa execution logs. Eksekusi pertama juga membatalkan order lama yang memenuhi syarat; bukan hanya order yang dibuat setelah deployment.

Command membaca secret dari environment container dan mengirim `POST` ke `http://127.0.0.1:${PORT:-3000}/api/cron/expire-unpaid-orders` dengan header `Authorization: Bearer <CRON_SECRET>`. Tidak perlu melewati Cloudflare atau memasukkan secret ke URL/command scheduler. Script disertakan dalam image runner melalui Dockerfile; tidak memerlukan curl/pnpm/tsx di image produksi.

Endpoint memproses maksimal 50 order per batch dan mengembalikan `cancelled`, `hasMore`, serta `cutoffAt` (ISO UTC). Script melanjutkan maksimal 20 batch (1.000 order) per eksekusi. Sisa backlog diproses pada eksekusi berikutnya. Log script berisi total seperti `{"cancelled":12,"batches":1,"hasMore":false}` tanpa data pembeli atau secret. HTTP/timeout/error membuat exit code 1 agar kegagalan terlihat pada log Dokploy.

Tanpa header/secret salah endpoint membalas 401. Kegagalan database membalas 500 untuk dicoba pada jadwal berikutnya. `POST` tidak menerima parameter yang dapat mengubah batas 24 jam.

Contoh pengecekan HTTP terpisah (jalankan pada environment yang memang ingin diproses; request ini melakukan pembatalan nyata):

```sh
curl --fail-with-body --request POST \
  --header "Authorization: Bearer $CRON_SECRET" \
  https://gensaberilmu.xyz/api/cron/expire-unpaid-orders
```

Produksi menggunakan domain `store.gensaberilmu.com`. Aktifkan jadwal pada environment yang sesuai setelah secret dan deployment siap; pembuatan PR tidak otomatis menambahkan job di dashboard Dokploy.
