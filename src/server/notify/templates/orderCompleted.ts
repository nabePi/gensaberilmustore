export type OrderCompletedPayload = {
  orderNumber: string;
};

export function orderCompletedEmail(payload: OrderCompletedPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: `Pesanan ${payload.orderNumber} Selesai`,
    html: `<p>Pesanan <strong>${payload.orderNumber}</strong> selesai. Terima kasih telah berbelanja di Gensa Berilmu Store.</p>`,
  };
}
