import { BRAND_COLOR, renderEmailLayout } from '@/server/notify/templates/layout';

const JNE_TRACKING_URL = 'https://jne.co.id/tracking-package';

export type OrderShippedPayload = {
  orderNumber: string;
  airwaybillNumber?: string | null;
};

export function orderShippedEmail(payload: OrderShippedPayload): { subject: string; html: string } {
  const trackingBlock = payload.airwaybillNumber
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
         <tr>
           <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;">
             <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">
               Nomor Resi JNE
             </p>
             <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;letter-spacing:0.06em;color:#111827;">
               ${payload.airwaybillNumber}
             </p>
           </td>
         </tr>
       </table>
       <p style="text-align:center;margin:0 0 20px;">
         <a href="${JNE_TRACKING_URL}" style="display:inline-block;padding:12px 28px;background-color:${BRAND_COLOR};color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">
           Lacak Pengiriman di JNE
         </a>
       </p>
       <p style="font-size:12px;color:#6b7280;">
         Caranya: salin nomor resi di atas, buka
         <a href="${JNE_TRACKING_URL}" style="color:${BRAND_COLOR};text-decoration:none;">${JNE_TRACKING_URL}</a>,
         lalu tempel nomor resi pada kolom pelacakan untuk melihat status pengiriman terkini.
       </p>`
    : '';

  return {
    subject: `Pesanan Sudah Dikirim [${payload.orderNumber}]`,
    html: renderEmailLayout(
      'Pesanan Dikirim',
      `<p>Pesanan <strong>${payload.orderNumber}</strong> sudah dikirim menggunakan jasa pengiriman <strong>JNE</strong>.</p>
       ${trackingBlock}`,
    ),
  };
}
