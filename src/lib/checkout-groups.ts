export const CHECKOUT_GROUPS = ['READY', 'PRE_ORDER'] as const;
export type CheckoutGroup = (typeof CHECKOUT_GROUPS)[number];

export function checkoutGroupFor(isPreOrder: boolean): CheckoutGroup {
  return isPreOrder ? 'PRE_ORDER' : 'READY';
}

export function parseCheckoutGroup(value: string | null): CheckoutGroup | undefined {
  return CHECKOUT_GROUPS.find((group) => group === value);
}

export const CHECKOUT_GROUP_LABELS: Record<CheckoutGroup, string> = {
  READY: 'Barang ready',
  PRE_ORDER: 'Barang PO',
};
