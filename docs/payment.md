# Payment — Midtrans Snap

Integrasi pembayaran online menggunakan [Midtrans](https://midtrans.com) Snap (sandbox by default).

## Alur

1. **Checkout** — user mengisi form di `/checkout` dan submit. Frontend memanggil
   `POST /api/orders`, yang membuat `Order` dengan status `AWAITING_PAYMENT` dan mengunci stok.
2. **Buat transaksi Snap** — frontend memanggil `POST /api/payment/create` dengan `{ orderId }`.
   Endpoint ini memanggil Midtrans Snap API dan menyimpan `snapToken` + `snapRedirectUrl` di
   tabel `PaymentSession` (1-1 dengan `Order`).
3. **Popup Snap** — frontend memuat `snap.js` (di-load hanya di halaman checkout) lalu memanggil
   `window.snap.pay(snapToken, { onSuccess, onPending, onError, onClose })`. User memilih metode
   pembayaran (transfer bank, GoPay, QRIS, ShopeePay) di popup Midtrans.
4. **Redirect** — semua callback Snap (sukses, pending, error, ditutup) mengarahkan user ke
   `/payment/success?orderId=...`. Jika `snap.js` gagal dimuat, frontend fallback ke
   `snapRedirectUrl` (halaman Snap yang dihosting Midtrans).
5. **Webhook** — Midtrans mengirim notifikasi status transaksi ke
   `POST /api/webhooks/payment`. Endpoint ini:
   - Memverifikasi `signature_key` (SHA512 dari `order_id + status_code + gross_amount + SERVER_KEY`).
   - Mencatat setiap notifikasi di `WebhookLog` (unique per `transaction_id:transaction_status`)
     agar notifikasi yang dikirim berulang oleh Midtrans tidak diproses dua kali.
   - Memetakan `transaction_status` ke status `Order`:
     - `settlement` / `capture` (bukan fraud) → `PAID`
     - `pending` → tetap `AWAITING_PAYMENT` (nomor VA disimpan di `PaymentSession`)
     - `deny` / `cancel` / `expire` / `failure` → `CANCELLED` (stok dikembalikan otomatis)
6. **Polling** — halaman sukses/status dapat memanggil `GET /api/payment/status/[orderId]` untuk
   menyinkronkan status secara aktif (misal saat menunggu transfer VA) jika webhook belum masuk.

## Environment

```
MIDTRANS_SERVER_KEY=...
MIDTRANS_CLIENT_KEY=...
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=...
MIDTRANS_IS_PRODUCTION=false
```

`MIDTRANS_IS_PRODUCTION=false` menggunakan sandbox Midtrans
(`https://app.sandbox.midtrans.com/snap/snap.js`). Set ke `true` beserta server/client key
produksi untuk go-live.

## Kepemilikan order tanpa login (guest checkout)

`Order.userId` bernilai `null` untuk pesanan guest. Endpoint pembayaran (`create` dan `status`)
mengizinkan akses tanpa sesi selama `order.userId === null` — pola yang sama dengan
`/payment/success`, karena `orderId` (UUID) hanya diketahui oleh pemilik pesanan setelah checkout.
