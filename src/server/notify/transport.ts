import { env } from '@/env';
import { SITE_NAME } from '@/lib/site';

const BREVO_SEND_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';

// WhatsApp/Fonnte transport intentionally out of scope for now — email only.
export type SendEmailResult =
  { success: true; providerId: string } | { success: false; error: string };

type BrevoSendEmailResponse = { messageId?: string };
type BrevoErrorResponse = { message?: string };

export async function sendEmail(
  recipient: string,
  subject: string,
  html: string,
): Promise<SendEmailResult> {
  if (!env.brevoApiKey) {
    return { success: false, error: 'BREVO_API_KEY belum diatur' };
  }

  let response: Response;
  try {
    response = await fetch(BREVO_SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': env.brevoApiKey,
      },
      body: JSON.stringify({
        sender: { email: env.notifyFromEmail, name: SITE_NAME },
        to: [{ email: recipient }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menghubungi layanan email Brevo',
    };
  }

  const data: (BrevoSendEmailResponse & BrevoErrorResponse) | null = await response
    .json()
    .catch(() => null);

  if (!response.ok || !data) {
    return { success: false, error: data?.message ?? `Brevo merespons status ${response.status}` };
  }

  return { success: true, providerId: data.messageId ?? '' };
}
