export type AffiliateWelcomePayload = {
  name: string;
  code: string;
};

export function affiliateWelcomeEmail(payload: AffiliateWelcomePayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Selamat! Anda Terdaftar Sebagai Afiliasi',
    html: `<p>Halo ${payload.name},</p><p>Anda berhasil terdaftar sebagai afiliasi Gensa Berilmu Store dengan kode referral <strong>${payload.code}</strong>.</p><p>Silakan pilih produk yang ingin Anda promosikan di halaman afiliasi member.</p>`,
  };
}
