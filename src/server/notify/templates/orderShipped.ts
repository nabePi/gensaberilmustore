export type OrderShippedPayload = {
  orderNumber: string;
  trackingNumber?: string | null;
};

export function orderShippedEmail(payload: OrderShippedPayload): { subject: string; html: string } {
  const trackingLine = payload.trackingNumber
    ? `<p>Nomor resi: <strong>${payload.trackingNumber}</strong></p>`
    : '';

  return {
    subject: `Pesanan ${payload.orderNumber} Sudah Dikirim`,
    html: `<p>Pesanan <strong>${payload.orderNumber}</strong> sudah dikirim.</p>${trackingLine}`,
  };
}
