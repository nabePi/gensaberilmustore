import { describe, expect, it } from 'vitest';

import {
  isMootaBcaBankType,
  mootaMutationDate,
  mootaOrderCutoff,
  mootaPayloadSchema,
} from './moota-schema';

const mutation = {
  token: 'id',
  bank_id: 'bank',
  date: '2026-10-22 10:00:00',
  type: 'CR',
  amount: 150123,
};
describe('Moota payload', () => {
  it('interprets mutation dates as WIB', () => {
    expect(mootaMutationDate(mutation.date)?.toISOString()).toBe('2026-10-22T03:00:00.000Z');
  });
  it.each(['2026-02-30 10:00:00', '2026-13-01 10:00:00', '2026-10-22 24:01:00', 'invalid'])(
    'rejects invalid dates (%s)',
    (date) => expect(mootaMutationDate(date)).toBeNull(),
  );
  it.each([150123, '150123', '150123.00'])('accepts whole rupiah %s', (amount) => {
    expect(mootaPayloadSchema.parse([{ ...mutation, amount }])[0]?.amount).toBe(150123);
  });
  it.each([0, -1, 1.5, '150.123', 'Rp150123', '150123.50', Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid credit amounts (%s)',
    (amount) => {
      expect(mootaPayloadSchema.safeParse([{ ...mutation, amount }]).success).toBe(false);
    },
  );
});

describe('Moota order time cutoff', () => {
  const receivedAt = new Date('2026-10-22T05:20:00Z');
  function cutoff(date: string, created_at?: string) {
    const parsed = mootaPayloadSchema.parse([{ ...mutation, date, created_at }])[0]!;
    return mootaOrderCutoff(parsed, receivedAt).toISOString();
  }
  it('uses the discovery time for the QRIS date-only payload', () => {
    expect(cutoff('2026-10-22 00:00:00', '2026-10-22 12:19:21')).toBe('2026-10-22T05:19:21.999Z');
  });
  it('caps a date-only mutation at the end of its bank date', () => {
    expect(cutoff('2026-10-21 00:00:00', '2026-10-22 12:19:21')).toBe('2026-10-21T16:59:59.999Z');
  });
  it.each([undefined, 'invalid'])('falls back to receipt time for created_at=%s', (createdAt) => {
    expect(cutoff('2026-10-22 00:00:00', createdAt)).toBe('2026-10-22T05:20:00.000Z');
  });
  it('does not accept a discovery time later than webhook receipt', () => {
    expect(cutoff('2026-10-22 00:00:00', '2026-10-22 15:00:00')).toBe('2026-10-22T05:20:00.000Z');
  });
  it('preserves precise bank transaction times even when discovered later', () => {
    expect(cutoff('2026-10-22 10:00:00', '2026-10-22 12:19:21')).toBe('2026-10-22T03:00:00.999Z');
  });
  it('uses the bank day for a BCA Bisnis mutation discovered the next day', () => {
    const parsed = mootaPayloadSchema.parse([
      {
        ...mutation,
        date: '2026-10-18 00:00:00',
        created_at: '2026-10-19 11:37:37',
        bank: { bank_type: 'bcaGiroV2' },
      },
    ])[0]!;
    expect(mootaOrderCutoff(parsed, receivedAt).toISOString()).toBe('2026-10-18T16:59:59.999Z');
  });
});

describe('Moota BCA bank types', () => {
  it.each(['bca', 'BCA', 'bcaGiroV2'])('accepts %s', (value) =>
    expect(isMootaBcaBankType(value)).toBe(true),
  );
  it.each(['bri', 'interactiveQris', 'bca-unknown'])('rejects %s', (value) =>
    expect(isMootaBcaBankType(value)).toBe(false),
  );
});
