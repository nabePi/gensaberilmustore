import type { Metadata } from 'next';

import { LegalPage } from '@/components/ui/LegalPage';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description:
    'Kebijakan privasi GenSa Berilmu mengenai data pribadi yang kami kumpulkan, cara penggunaannya, dan hak Anda sebagai pengguna.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Kebijakan Privasi"
      updatedAt="22 Agustus 2026"
      intro={
        <p>
          PT. Generasi Shalahuddin Berilmu (&quot;GenSa Berilmu&quot;, &quot;kami&quot;) menghargai
          privasi setiap pengguna situs ini. Kebijakan ini menjelaskan data pribadi apa saja yang
          kami kumpulkan, bagaimana data tersebut digunakan, dan bagaimana kami melindunginya.
        </p>
      }
      sections={[
        {
          heading: 'Data yang Kami Kumpulkan',
          body: (
            <>
              <p>Kami mengumpulkan data berikut saat Anda menggunakan layanan kami:</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  Nama lengkap, alamat email, dan nomor WhatsApp/telepon saat pendaftaran akun.
                </li>
                <li>
                  Nama penerima, alamat, kota, dan nomor telepon penerima saat Anda melakukan
                  checkout atau menyimpan alamat penerima di profil.
                </li>
                <li>Riwayat pesanan, metode pembayaran yang dipilih, dan status transaksi.</li>
                <li>
                  Kata sandi akun, yang kami simpan dalam bentuk terenkripsi (hash) dan tidak pernah
                  kami simpan dalam bentuk teks biasa.
                </li>
                <li>
                  Untuk anggota program afiliasi: nama bank, nomor rekening, dan nama pemilik
                  rekening untuk keperluan pembayaran komisi.
                </li>
                <li>
                  Data teknis seperti alamat IP dan jenis perangkat/browser, khususnya untuk
                  mencatat klik pada tautan referral afiliasi.
                </li>
              </ul>
              <p>
                Kami tidak pernah menyimpan nomor kartu debit/kredit Anda. Detail pembayaran
                diproses langsung melalui rekening bank, e-wallet, atau penyedia QRIS yang Anda
                pilih sendiri.
              </p>
            </>
          ),
        },
        {
          heading: 'Bagaimana Kami Menggunakan Data Anda',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Memproses dan mengirimkan pesanan Anda, termasuk konfirmasi dan nomor resi.</li>
              <li>Mengirimkan notifikasi terkait status pesanan, pembayaran, dan pengiriman.</li>
              <li>Menghitung dan membayarkan komisi bagi anggota program afiliasi.</li>
              <li>
                Memverifikasi identitas akun dan mencegah penyalahgunaan voucher atau akun ganda.
              </li>
              <li>Menjawab pertanyaan atau keluhan yang Anda ajukan melalui layanan pelanggan.</li>
            </ul>
          ),
        },
        {
          heading: 'Cookie dan Sesi Login',
          body: (
            <p>
              Kami menggunakan cookie sesi untuk menjaga Anda tetap masuk ke akun selama berbelanja,
              serta cookie pelacakan referral untuk mencatat pesanan yang berasal dari tautan
              afiliasi tertentu. Cookie ini tidak digunakan untuk menampilkan iklan pihak ketiga.
              Anda dapat menghapus cookie melalui pengaturan browser, namun beberapa fitur situs
              (seperti tetap masuk ke akun) mungkin tidak berfungsi normal.
            </p>
          ),
        },
        {
          heading: 'Berbagi Data dengan Pihak Ketiga',
          body: (
            <>
              <p>Kami hanya membagikan data yang diperlukan kepada pihak berikut:</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Jasa ekspedisi/kurir, untuk keperluan pengiriman pesanan ke alamat Anda.</li>
                <li>
                  Penyedia layanan pembayaran (bank, e-wallet, atau penyedia QRIS), untuk memproses
                  transaksi pembayaran.
                </li>
              </ul>
              <p>
                Kami tidak menjual, menyewakan, atau membagikan data pribadi Anda kepada pihak
                ketiga untuk kepentingan pemasaran tanpa persetujuan Anda.
              </p>
            </>
          ),
        },
        {
          heading: 'Keamanan Data',
          body: (
            <p>
              Kami menerapkan langkah keamanan yang wajar untuk melindungi data Anda, termasuk
              enkripsi kata sandi dan pembatasan akses data pelanggan hanya kepada staf yang
              memerlukannya untuk memproses pesanan. Meski demikian, tidak ada sistem transmisi data
              melalui internet yang sepenuhnya bebas risiko, sehingga kami menganjurkan Anda turut
              menjaga kerahasiaan kata sandi akun Anda.
            </p>
          ),
        },
        {
          heading: 'Hak Anda atas Data Pribadi',
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Mengakses dan memperbarui data profil Anda kapan saja melalui halaman akun.</li>
              <li>
                Meminta penghapusan akun dan data pribadi terkait, dengan pengecualian data yang
                wajib kami simpan untuk keperluan pembukuan atau kewajiban hukum.
              </li>
              <li>
                Meminta salinan data pribadi yang kami simpan mengenai Anda dengan menghubungi
                layanan pelanggan kami.
              </li>
            </ul>
          ),
        },
        {
          heading: 'Penyimpanan Data',
          body: (
            <p>
              Data pribadi disimpan selama akun Anda masih aktif, atau selama diperlukan untuk
              memenuhi tujuan yang dijelaskan dalam kebijakan ini, termasuk kewajiban pencatatan
              transaksi sesuai peraturan perundang-undangan yang berlaku di Indonesia.
            </p>
          ),
        },
        {
          heading: 'Privasi Anak-Anak',
          body: (
            <p>
              Meskipun kami menjual produk buku dan perlengkapan anak, layanan pemesanan di situs
              ini ditujukan untuk digunakan oleh orang dewasa (orang tua/wali). Kami tidak dengan
              sengaja mengumpulkan data pribadi dari anak di bawah umur tanpa sepengetahuan orang
              tua atau wali yang sah.
            </p>
          ),
        },
        {
          heading: 'Perubahan Kebijakan Privasi',
          body: (
            <p>
              Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Setiap perubahan
              akan dipublikasikan di halaman ini beserta tanggal pembaruan terbaru.
            </p>
          ),
        },
        {
          heading: 'Kontak',
          body: (
            <p>
              Jika Anda memiliki pertanyaan mengenai kebijakan privasi ini atau ingin menggunakan
              hak Anda atas data pribadi, silakan hubungi kami melalui WhatsApp 0813-8480-4494 atau
              email{' '}
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
