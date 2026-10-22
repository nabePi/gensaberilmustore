import { describe, expect, it } from 'vitest';

import { getOrderDeliveryProof, safeDeliveryPhotoUrl } from './delivery-proof';

describe('Delivery proof', () => {
  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,AA',
    '/relative.jpg',
    'https://user:pass@example.com/p.jpg',
    'invalid',
    '',
  ])('does not expose unsafe photo URL %s', (url) => expect(safeDeliveryPhotoUrl(url)).toBeNull());
  it('accepts provider HTTP/HTTPS links including signed query strings', () => {
    expect(safeDeliveryPhotoUrl('https://example.com/photo.jpg?token=a&expires=123')).toBe(
      'https://example.com/photo.jpg?token=a&expires=123',
    );
    expect(safeDeliveryPhotoUrl('http://example.com/photo.jpg')).toBe(
      'http://example.com/photo.jpg',
    );
  });
  it('returns no evidence for old orders', () => expect(getOrderDeliveryProof({})).toBeNull());
  it('returns partial proof and an ISO confirmation time', () => {
    expect(
      getOrderDeliveryProof({
        deliveryReceiverName: 'Siti',
        deliveryConfirmedAt: new Date('2026-10-22T06:00:00Z'),
      }),
    ).toEqual({
      photoUrl: null,
      receiverName: 'Siti',
      receiverRelation: null,
      confirmedAt: '2026-10-22T06:00:00.000Z',
    });
  });
});
