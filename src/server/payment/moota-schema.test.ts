import { describe, expect, it } from 'vitest';

import { mootaMutationDate, mootaPayloadSchema } from './moota-schema';

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
