export type PasswordResetPayload = {
  resetUrl: string;
};

export function passwordResetEmail(payload: PasswordResetPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Reset Password Gensa Berilmu Store',
    html: `<p>Kami menerima permintaan reset password untuk akun Anda.</p><p>Klik link berikut untuk membuat password baru (berlaku 1 jam): <a href="${payload.resetUrl}">${payload.resetUrl}</a></p><p>Jika Anda tidak meminta ini, abaikan email ini.</p>`,
  };
}
