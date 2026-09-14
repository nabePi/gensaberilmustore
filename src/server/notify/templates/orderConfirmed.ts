import { renderEmailLayout } from '@/server/notify/templates/layout';

export type OrderConfirmedPayload = {
  orderNumber: string;
  receiverName: string;
  total: number;
};

export function orderConfirmedEmail(payload: OrderConfirmedPayload): {
  subject: string;
  html: string;
} {
  const totalFormatted = `Rp${payload.total.toLocaleString('id-ID')}`;

  return {
    subject: `Pesanan ${payload.orderNumber} Diterima`,
    html: renderEmailLayout(
      'Pesanan Diterima',
      `<p>Halo ${payload.receiverName},</p>
       <p>Pesanan <strong>${payload.orderNumber}</strong> kami terima dengan total <strong>${totalFormatted}</strong>. Silakan selesaikan pembayaran sesuai instruksi yang diberikan.</p>
       <p>Terima kasih telah berbelanja di Gensa Berilmu Store.</p>`,
    ),
  };
}
