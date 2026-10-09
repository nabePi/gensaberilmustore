import { describe, expect, it } from 'vitest';

import { summarizeConversions } from './stats';

describe('summarizeConversions with withdrawals', () => {
  const conversions = [
    { status: 'APPROVED', commissionAmount: 60700 },
    { status: 'PAID', commissionAmount: 10000 },
  ] as const;

  it('keeps totals unchanged without withdrawals', () => {
    const result = summarizeConversions([...conversions]);
    expect(result.commissionEarned).toBe(60700);
    expect(result.commissionPaid).toBe(10000);
  });

  it('reserves requested and in-progress amounts out of earned, but not into paid', () => {
    const result = summarizeConversions(
      [...conversions],
      [
        { status: 'REQUESTED', amount: 20000 },
        { status: 'IN_PROGRESS', amount: 10000 },
      ],
    );
    expect(result.commissionEarned).toBe(30700);
    expect(result.commissionPaid).toBe(10000);
  });

  it('moves completed withdrawals into paid', () => {
    const result = summarizeConversions([...conversions], [{ status: 'COMPLETED', amount: 50000 }]);
    expect(result.commissionEarned).toBe(10700);
    expect(result.commissionPaid).toBe(60000);
  });
});
