export type AffiliateWelcomePayload = {
  name: string;
  code: string;
};

export function affiliateWelcomeEmail(payload: AffiliateWelcomePayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Pendaftaran Afiliasi Anda Sedang Ditinjau',
    html: `<p>Halo ${payload.name},</p><p>Terima kasih telah mendaftar sebagai afiliasi Gensa Berilmu Store dengan kode referral <strong>${payload.code}</strong>.</p><p>Pendaftaran Anda sedang kami tinjau dan akan disetujui maksimal 3x24 jam. Kami akan memberi kabar begitu akun afiliasi Anda aktif.</p>`,
  };
}
