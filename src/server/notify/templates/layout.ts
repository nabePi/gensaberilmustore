const LOGO_URL =
  'https://d33tu7komhhdsg.cloudfront.net/fL0bTwfYBTXRta-Ne8XDN_vScOqHAKlW4IHMcivnhbI/auto/0/250/no/1/bG9jYWw6Ly8vYnVzaW5lc3MvMjAyMS0xMi9neTZlZThjZWUwOTI0MGUyNmFhYWNlL2FsYnVtcy9wcm9maWxlL3BkZnRvanBnbWUtMS1jdXRvdXQucG5n.webp';

export const BRAND_COLOR = '#95271b';
const WHATSAPP_URL = 'https://wa.me/6281384804494';
const WHATSAPP_DISPLAY = '0813-8480-4494';

/**
 * Shared HTML shell for all notification emails: logo header, content slot,
 * and a footer with WhatsApp contact + no-reply notice. Uses table-based
 * layout and inline styles for compatibility across email clients.
 */
export function renderEmailLayout(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);"
          >
            <tr>
              <td style="padding:28px 32px;text-align:center;border-bottom:3px solid ${BRAND_COLOR};">
                <img src="${LOGO_URL}" alt="Gensa Berilmu Store" height="40" style="height:40px;width:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#111827;font-size:14px;line-height:1.7;">
                <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:${BRAND_COLOR};">${heading}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 8px;font-size:13px;color:#4b5563;">
                  Ada pertanyaan? Hubungi kami via WhatsApp
                </p>
                <p style="margin:0 0 16px;">
                  <a href="${WHATSAPP_URL}" style="color:${BRAND_COLOR};font-weight:700;font-size:14px;text-decoration:none;">
                    ${WHATSAPP_DISPLAY}
                  </a>
                </p>
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  Email ini dikirim otomatis, mohon tidak membalas ke alamat email ini.
                </p>
                <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                  &copy; ${new Date().getFullYear()} Gensa Berilmu Store
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
