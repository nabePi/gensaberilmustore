import { SITE_URL } from '@/lib/site';
import { BRAND_COLOR, renderEmailLayout } from '@/server/notify/templates/layout';

export type OrderCompletedPayload = {
  orderNumber: string;
};

export function orderCompletedEmail(payload: OrderCompletedPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: `Pesanan Selesai [${payload.orderNumber}]`,
    html: renderEmailLayout(
      'Pesanan Selesai',
      `<p>Pesanan <strong>${payload.orderNumber}</strong> telah selesai. Terima kasih banyak sudah berbelanja dan mempercayakan bacaanmu pada Gensa Berilmu Store!</p>

       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
         <tr>
           <td style="background-color:#f9fafb;border-radius:8px;padding:20px;text-align:center;">
             <p style="margin:0;font-size:16px;font-weight:700;color:${BRAND_COLOR};">Selamat Membaca! 📖</p>
             <p style="margin:8px 0 0;font-size:13px;color:#4b5563;">
               Semoga buku yang kamu pesan bermanfaat dan makin menghidupkan semangat
               <em>Learn History, Repeat Victory</em>.
             </p>
           </td>
         </tr>
       </table>

       <p>Masih semangat menambah koleksi? Masih banyak kisah sejarah Islam menarik lainnya yang sayang untuk dilewatkan, lho!</p>

       <p style="text-align:center;margin:24px 0;">
         <a href="${SITE_URL}" style="display:inline-block;padding:12px 28px;background-color:${BRAND_COLOR};color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">
           Belanja Lagi di GenSa Berilmu
         </a>
       </p>

       <p style="font-size:13px;color:#4b5563;">
         Jangan lupa mampir rutin ke
         <a href="${SITE_URL}" style="color:${BRAND_COLOR};font-weight:700;text-decoration:none;">store.gensaberilmu.com</a>
         ya, ada buku baru, promo, dan konten seru seputar sejarah Islam yang kami update terus!
       </p>`,
    ),
  };
}
