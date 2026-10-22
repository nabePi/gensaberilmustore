import { describe, expect, it } from 'vitest';

import { orderCompletedEmail } from './orderCompleted';

describe('Order completed delivery proof email', () => {
  it('renders the receiver, relationship, airwaybill and photo', () => {
    const { html } = orderCompletedEmail({
      orderNumber: 'ORD-1',
      airwaybillNumber: 'JNE123',
      deliveryProof: {
        photoUrl: 'https://example.com/pod.jpg',
        receiverName: 'Siti',
        receiverRelation: 'Keluarga',
        confirmedAt: null,
      },
    });
    for (const value of [
      'Bukti Penerimaan JNE',
      'JNE123',
      'Siti',
      'Keluarga',
      'https://example.com/pod.jpg',
    ])
      expect(html).toContain(value);
  });
  it('keeps old completion emails working without proof', () => {
    const { html } = orderCompletedEmail({ orderNumber: 'OLD-ORDER' });
    expect(html).toContain('OLD-ORDER');
    expect(html).not.toContain('Bukti Penerimaan JNE');
  });
  it('escapes provider text and photo attributes and rejects unsafe photo schemes', () => {
    const { html } = orderCompletedEmail({
      orderNumber: '<ORDER>',
      deliveryProof: {
        photoUrl: 'javascript:alert(1)',
        receiverName: '<script>alert(1)</script>',
        receiverRelation: 'Ibu & Anak',
        confirmedAt: null,
      },
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Ibu &amp; Anak');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
  });
});
