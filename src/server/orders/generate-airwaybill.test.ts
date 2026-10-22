import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOrder, updateOrder, generate } = vi.hoisted(() => ({
  findOrder: vi.fn(),
  updateOrder: vi.fn(),
  generate: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ prisma: { order: { findUnique: findOrder, update: updateOrder } } }));
vi.mock('@/server/shipping/jne-airwaybill', () => ({ generateJneAirwaybill: generate }));
const { generateAirwaybillForOrder } = await import('./generate-airwaybill');
function order(items: unknown[]) {
  return {
    id: 'order',
    orderNumber: 'ORD-1',
    shippingMethod: 'JNE',
    airwaybillNumber: null,
    shippingService: 'REG',
    status: 'PAID',
    items,
    weightKg: 1,
    subtotal: 100000,
    destination: {
      tariffCode: 'TEST',
      cityName: 'City',
      provinceName: 'Province',
      zipCode: '12345',
    },
    receiverName: 'Buyer',
    receiverAddress: 'Address',
    receiverPhone: '0812',
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  generate.mockResolvedValue('JNE-RESI');
});
describe('PO automatic airwaybill guard', () => {
  it('does not generate resi if an order was cancelled after payment', async () => {
    findOrder.mockResolvedValue({ ...order([]), status: 'CANCELLED' });
    expect(await generateAirwaybillForOrder('order')).toEqual({ ok: true });
    expect(generate).not.toHaveBeenCalled();
  });
  it('skips mixed orders with a PO snapshot even after the product stops being PO', async () => {
    findOrder.mockResolvedValue(
      order([
        { quantity: 1, isPreOrderSnapshot: false, product: { isPreOrderActive: false } },
        { quantity: 1, isPreOrderSnapshot: true, product: { isPreOrderActive: false } },
      ]),
    );
    expect(await generateAirwaybillForOrder('order')).toEqual({ ok: true, skipped: 'pre_order' });
    expect(generate).not.toHaveBeenCalled();
  });
  it('also protects legacy items whose product is currently PO', async () => {
    findOrder.mockResolvedValue(
      order([{ quantity: 1, isPreOrderSnapshot: false, product: { isPreOrderActive: true } }]),
    );
    expect(await generateAirwaybillForOrder('order')).toEqual({ ok: true, skipped: 'pre_order' });
    expect(generate).not.toHaveBeenCalled();
  });
  it('allows an explicit manual resi request for PO when the admin is ready', async () => {
    findOrder.mockResolvedValue(order([{ quantity: 1, isPreOrderSnapshot: true, product: null }]));
    expect(await generateAirwaybillForOrder('order', undefined, { allowPreOrder: true })).toEqual({
      ok: true,
    });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(updateOrder).toHaveBeenCalledWith({
      where: { id: 'order' },
      data: { airwaybillNumber: 'JNE-RESI' },
    });
  });
  it('automatically generates resi for ready-stock orders', async () => {
    findOrder.mockResolvedValue(
      order([{ quantity: 1, isPreOrderSnapshot: false, product: { isPreOrderActive: false } }]),
    );
    expect(await generateAirwaybillForOrder('order')).toEqual({ ok: true });
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
