import { BRAND_COLOR, renderEmailLayout } from '@/server/notify/templates/layout';

export type PasswordResetPayload = {
  resetUrl: string;
};

export function passwordResetEmail(payload: PasswordResetPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Reset Password Gensa Berilmu Store',
    html: renderEmailLayout(
      'Reset Password',
      `<p>Kami menerima permintaan reset password untuk akun Anda.</p>
       <p style="text-align:center;margin:24px 0;">
         <a href="${payload.resetUrl}" style="display:inline-block;padding:12px 28px;background-color:${BRAND_COLOR};color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">
           Buat Password Baru
         </a>
       </p>
       <p style="font-size:12px;color:#6b7280;">Link berlaku selama 1 jam. Jika Anda tidak meminta ini, abaikan email ini.</p>`,
    ),
  };
}
