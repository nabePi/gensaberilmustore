import { describe, expect, it } from 'vitest';

import { sendEmail } from '@/server/notify/transport';

describe('sendEmail', () => {
  it('returns a failure result when RESEND_API_KEY is not configured', async () => {
    const result = await sendEmail('buyer@example.com', 'Subject', '<p>Body</p>');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('RESEND_API_KEY belum diatur');
    }
  });
});
