import { safeDeliveryPhotoUrl, type DeliveryProof } from '@/lib/delivery-proof';
import { SITE_URL } from '@/lib/site';
import { BRAND_COLOR, renderEmailLayout } from '@/server/notify/templates/layout';

export type OrderCompletedPayload = {
  orderNumber: string;
  airwaybillNumber?: string | null;
  deliveryProof?: DeliveryProof | null;
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}

export function orderCompletedEmail(payload: OrderCompletedPayload): {
  subject: string;
  html: string;
} {
  const proof = payload.deliveryProof;
  const photoUrl = safeDeliveryPhotoUrl(proof?.photoUrl);
  const proofBlock = proof
    ? `<div style="margin:20px 0;padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
         <h2 style="margin:0 0 12px;font-size:15px;">Bukti Penerimaan JNE</h2>
         ${payload.airwaybillNumber ? `<p>No. resi: <strong>${escapeHtml(payload.airwaybillNumber)}</strong></p>` : ''}
         ${proof.receiverName ? `<p>Diterima oleh: <strong>${escapeHtml(proof.receiverName)}</strong></p>` : ''}
         ${proof.receiverRelation ? `<p>Hubungan penerima: ${escapeHtml(proof.receiverRelation)}</p>` : ''}
         ${
           photoUrl
             ? `<a href="${escapeHtml(photoUrl)}" style="color:${BRAND_COLOR};">Lihat foto bukti penerimaan</a>
           <p><img src="${escapeHtml(photoUrl)}" alt="Foto bukti penerimaan paket dari JNE" width="480" style="display:block;width:100%;max-width:480px;height:auto;border-radius:6px;" /></p>`
             : ''
         }
         <p style="font-size:12px;color:#6b7280;">Informasi penerimaan dikirim oleh JNE.</p>
       </div>`
    : '';
  return {
    subject: `Pesanan Selesai [${payload.orderNumber}]`,
    html: renderEmailLayout(
      'Pesanan Selesai',
      `<p>Pesanan <strong>${escapeHtml(payload.orderNumber)}</strong> telah selesai. Terima kasih banyak sudah berbelanja dan mempercayakan bacaanmu pada Gensa Berilmu Store!</p>

       ${proofBlock}

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
