import type { Metadata } from 'next';

import { LegalPage } from '@/components/ui/LegalPage';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description:
    'Syarat dan ketentuan penggunaan layanan GenSa Berilmu, meliputi akun, pemesanan, pembayaran, pengiriman, pengembalian, voucher, dan program afiliasi.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Syarat & Ketentuan"
      updatedAt="22 Agustus 2026"
      intro={
        <p>
          Selamat datang di GenSa Berilmu, toko daring milik PT. Generasi Shalahuddin Berilmu
          (&quot;GenSa Berilmu&quot;, &quot;kami&quot;). Dengan mengakses situs atau melakukan
          transaksi di GenSa Berilmu, Anda dianggap telah membaca, memahami, dan menyetujui seluruh
          syarat dan ketentuan berikut. Mohon baca dengan saksama sebelum menggunakan layanan kami.
        </p>
      }
      sections={[
        {
          heading: 'Akun Pengguna',
          body: (
            <>
              <p>
                Untuk berbelanja, Anda dapat membuat akun menggunakan alamat email dan nomor
                WhatsApp aktif. Anda bertanggung jawab penuh menjaga kerahasiaan kata sandi dan
                seluruh aktivitas yang terjadi pada akun Anda.
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Satu alamat email hanya dapat digunakan untuk satu akun.</li>
                <li>
                  Informasi yang Anda daftarkan (nama, nomor WhatsApp, alamat) harus benar dan dapat
                  diperbarui sewaktu-waktu melalui halaman profil akun.
                </li>
                <li>
                  Kami berhak menonaktifkan akun yang terindikasi digunakan untuk kecurangan,
                  penyalahgunaan voucher, atau pelanggaran syarat ini.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: 'Produk dan Harga',
          body: (
            <>
              <p>
                Seluruh harga produk yang tercantum di situs sudah dalam Rupiah (IDR) dan dapat
                berubah sewaktu-waktu tanpa pemberitahuan sebelumnya. Harga yang berlaku adalah
                harga yang tertera pada saat pesanan dibuat dan tersimpan di keranjang belanja.
              </p>
              <p>
                Kami berupaya menampilkan deskripsi, gambar, dan ketersediaan stok produk seakurat
                mungkin. Namun, karena keterbatasan stok fisik, kami berhak membatalkan sebagian
                atau seluruh pesanan apabila produk ternyata habis setelah pesanan dibuat, dan akan
                menginformasikan hal ini kepada Anda melalui email atau WhatsApp.
              </p>
            </>
          ),
        },
        {
          heading: 'Pemesanan dan Pembayaran',
          body: (
            <>
              <p>
                Pesanan diproses melalui tahapan status berikut: menunggu pembayaran, dibayar,
                dikemas, dikirim, dan selesai.
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  Pembayaran dapat dilakukan melalui transfer bank, e-wallet, atau QRIS sesuai
                  metode yang tersedia pada halaman checkout.
                </li>
                <li>
                  Pesanan dengan status &quot;menunggu pembayaran&quot; yang tidak dilunasi dalam
                  batas waktu yang ditentukan pada halaman pembayaran akan dibatalkan secara
                  otomatis.
                </li>
                <li>
                  Kode voucher/diskon hanya berlaku sesuai syarat yang tercantum pada voucher
                  tersebut (periode berlaku, minimum belanja, atau produk tertentu), tidak dapat
                  digabung dengan voucher lain kecuali dinyatakan lain, dan tidak dapat diuangkan.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: 'Pengiriman',
          body: (
            <>
              <p>
                Pesanan dikirim ke alamat penerima yang Anda cantumkan pada saat checkout. Pastikan
                nama, nomor telepon, dan alamat penerima sudah benar karena kesalahan data yang Anda
                berikan bukan tanggung jawab kami.
              </p>
              <p>
                Setelah pesanan dikirim, nomor resi pelacakan akan tersedia pada halaman riwayat
                transaksi akun Anda. Estimasi waktu pengiriman mengikuti kebijakan jasa ekspedisi
                pihak ketiga yang digunakan dan dapat dipengaruhi oleh faktor di luar kendali kami
                seperti cuaca, lokasi tujuan, atau kondisi operasional kurir.
              </p>
            </>
          ),
        },
        {
          heading: 'Pembatalan dan Pengembalian',
          body: (
            <>
              <p>
                Pembatalan pesanan dapat dilakukan selama status pesanan masih &quot;menunggu
                pembayaran&quot;. Pesanan yang sudah dibayar dan diproses tidak dapat dibatalkan
                secara sepihak oleh pembeli.
              </p>
              <p>
                Pengembalian atau penukaran barang dapat diajukan melalui layanan pelanggan maksimal
                2x24 jam setelah barang diterima, khusus untuk kondisi berikut:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Buku atau produk diterima dalam kondisi rusak akibat pengiriman.</li>
                <li>Produk yang diterima tidak sesuai dengan yang dipesan.</li>
                <li>Jumlah barang yang diterima tidak sesuai dengan pesanan.</li>
              </ul>
              <p>
                Produk yang sudah digunakan, dibaca hingga rusak, atau mengalami kerusakan akibat
                kelalaian pembeli tidak dapat dikembalikan. Biaya pengiriman pengembalian barang
                akibat kesalahan kami akan ditanggung oleh GenSa Berilmu.
              </p>
            </>
          ),
        },
        {
          heading: 'Program Afiliasi',
          body: (
            <>
              <p>
                GenSa Berilmu menyediakan program afiliasi bagi anggota yang ingin mendapatkan
                komisi dengan mempromosikan produk melalui tautan referral pribadi. Komisi dihitung
                berdasarkan persentase atau nominal tetap per produk yang berhasil terjual melalui
                tautan tersebut, dan dibayarkan ke rekening bank yang didaftarkan afiliasi.
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  Afiliasi dilarang menggunakan tautan referral miliknya sendiri untuk pembelian
                  pribadi guna memperoleh komisi.
                </li>
                <li>
                  Afiliasi dilarang melakukan promosi yang menyesatkan, spam, atau melanggar hukum
                  yang berlaku.
                </li>
                <li>
                  Kami berhak menahan atau membatalkan komisi apabila ditemukan indikasi kecurangan
                  pada transaksi terkait.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: 'Hak Kekayaan Intelektual',
          body: (
            <p>
              Seluruh konten pada situs GenSa Berilmu, termasuk namun tidak terbatas pada logo, nama
              merek, tata letak, foto produk, dan tulisan, merupakan hak milik PT. Generasi
              Shalahuddin Berilmu atau pemegang lisensinya. Dilarang menggandakan, mendistribusikan,
              atau menggunakan konten tersebut untuk kepentingan komersial tanpa izin tertulis.
            </p>
          ),
        },
        {
          heading: 'Batasan Tanggung Jawab',
          body: (
            <p>
              Kami tidak bertanggung jawab atas kerugian tidak langsung yang timbul akibat gangguan
              teknis di luar kendali kami, keterlambatan pihak ekspedisi, atau penyalahgunaan akun
              akibat kelalaian pengguna dalam menjaga kerahasiaan data login.
            </p>
          ),
        },
        {
          heading: 'Perubahan Syarat & Ketentuan',
          body: (
            <p>
              Kami dapat memperbarui syarat dan ketentuan ini sewaktu-waktu untuk menyesuaikan
              dengan kebijakan layanan terbaru. Perubahan berlaku sejak dipublikasikan di halaman
              ini, sehingga kami menyarankan Anda meninjau halaman ini secara berkala.
            </p>
          ),
        },
        {
          heading: 'Hukum yang Berlaku',
          body: (
            <p>
              Syarat dan ketentuan ini diatur dan ditafsirkan sesuai dengan hukum yang berlaku di
              Republik Indonesia. Segala perselisihan yang timbul akan diselesaikan secara
              musyawarah, atau melalui jalur hukum yang berlaku apabila diperlukan.
            </p>
          ),
        },
        {
          heading: 'Kontak',
          body: (
            <p>
              Untuk pertanyaan mengenai syarat dan ketentuan ini, silakan hubungi kami melalui
              WhatsApp 0813-8480-4494 atau email{' '}
              <a href="mailto:info@gensaberilmu.com" className="text-brand hover:underline">
                info@gensaberilmu.com
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
