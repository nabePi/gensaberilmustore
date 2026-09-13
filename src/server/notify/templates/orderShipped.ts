export type OrderShippedPayload = {
  orderNumber: string;
  airwaybillNumber?: string | null;
};

export function orderShippedEmail(payload: OrderShippedPayload): { subject: string; html: string } {
  const trackingLine = payload.airwaybillNumber
    ? `<p>Nomor resi: <strong>${payload.airwaybillNumber}</strong></p>`
    : '';

  return {
    subject: `Pesanan ${payload.orderNumber} Sudah Dikirim`,
    html: `<p>Pesanan <strong>${payload.orderNumber}</strong> sudah dikirim.</p>${trackingLine}`,
  };
}
