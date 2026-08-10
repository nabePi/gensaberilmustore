import { Resend } from 'resend';

import { env } from '@/env';

// WhatsApp/Fonnte transport intentionally out of scope for now — email only.
export type SendEmailResult =
  { success: true; providerId: string } | { success: false; error: string };

export async function sendEmail(
  recipient: string,
  subject: string,
  html: string,
): Promise<SendEmailResult> {
  if (!env.resendApiKey) {
    return { success: false, error: 'RESEND_API_KEY belum diatur' };
  }

  try {
    const resend = new Resend(env.resendApiKey);
    const response = await resend.emails.send({
      from: env.notifyFromEmail,
      to: recipient,
      subject,
      html,
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true, providerId: response.data?.id ?? '' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
