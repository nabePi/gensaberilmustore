export type AffiliatePayoutPayload = {
  name: string;
  totalAmount: number;
};

export function affiliatePayoutEmail(payload: AffiliatePayoutPayload): {
  subject: string;
  html: string;
} {
  const totalFormatted = `Rp${payload.totalAmount.toLocaleString('id-ID')}`;

  return {
    subject: 'Komisi Afiliasi Anda Telah Dibayarkan',
    html: `<p>Halo ${payload.name},</p><p>Komisi afiliasi Anda sebesar <strong>${totalFormatted}</strong> telah kami bayarkan ke rekening yang terdaftar.</p><p>Terima kasih atas kerja sama Anda.</p>`,
  };
}
