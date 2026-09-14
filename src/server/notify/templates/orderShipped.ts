import { renderEmailLayout } from '@/server/notify/templates/layout';

export type OrderShippedPayload = {
  orderNumber: string;
  airwaybillNumber?: string | null;
};

export function orderShippedEmail(payload: OrderShippedPayload): { subject: string; html: string } {
  const trackingLine = payload.airwaybillNumber
    ? `<p style="margin:16px 0 0;padding:12px 16px;background-color:#f9fafb;border-radius:8px;">
         Nomor resi: <strong>${payload.airwaybillNumber}</strong>
       </p>`
    : '';

  return {
    subject: `Pesanan Sudah Dikirim [${payload.orderNumber}]`,
    html: renderEmailLayout(
      'Pesanan Dikirim',
      `<p>Pesanan <strong>${payload.orderNumber}</strong> sudah dikirim.</p>${trackingLine}`,
    ),
  };
}
