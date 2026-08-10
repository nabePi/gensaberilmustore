export type PaymentReceivedPayload = {
  orderNumber: string;
};

export function paymentReceivedEmail(payload: PaymentReceivedPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: `Pembayaran Pesanan ${payload.orderNumber} Berhasil`,
    html: `<p>Pembayaran untuk pesanan <strong>${payload.orderNumber}</strong> berhasil kami terima. Kami akan segera memproses pengiriman.</p>`,
  };
}
