import { renderEmailLayout } from '@/server/notify/templates/layout';

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
      `<p>Pesanan <strong>${payload.orderNumber}</strong> selesai. Terima kasih telah berbelanja di Gensa Berilmu Store.</p>`,
    ),
  };
}
