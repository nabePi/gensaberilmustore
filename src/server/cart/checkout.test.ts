import { describe, expect, it } from 'vitest';

import { CheckoutGroupError, selectCheckoutItems } from './checkout';

import { parseCheckoutGroup } from '@/lib/checkout-groups';

const ready = { id: 'ready', product: { isPreOrderActive: false } };
const po = { id: 'po', product: { isPreOrderActive: true } };

describe('checkout groups', () => {
  it('rejects mixed checkout without a group', () => {
    expect(() => selectCheckoutItems([ready, po])).toThrow(CheckoutGroupError);
  });
  it('selects only ready items from a mixed cart', () => {
    expect(selectCheckoutItems([ready, po], 'READY')).toEqual([ready]);
  });
  it('selects only PO items from a mixed cart', () => {
    expect(selectCheckoutItems([ready, po], 'PRE_ORDER')).toEqual([po]);
  });
  it.each([[ready], [po]])('keeps homogeneous checkout backwards compatible', (item) => {
    expect(selectCheckoutItems([item])).toEqual([item]);
  });
  it('does not silently switch to another group when the requested group is empty', () => {
    expect(() => selectCheckoutItems([po], 'READY')).toThrow(CheckoutGroupError);
  });
  it('leaves the original cart intact', () => {
    const items = [ready, po];
    selectCheckoutItems(items, 'READY');
    expect(items).toEqual([ready, po]);
  });
  it.each(['', 'ALL', 'ready', 'PO'])('does not accept an unknown group (%s)', (value) => {
    expect(parseCheckoutGroup(value)).toBeUndefined();
  });
});
