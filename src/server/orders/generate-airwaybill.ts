import { prisma } from '@/lib/db';
import { generateJneAirwaybill } from '@/server/shipping/jne-airwaybill';

/**
 * Best-effort side effect run after an order is marked PAID: generates a JNE
 * airwaybill (resi) and stores it on the order. Never throws, so a JNE
 * outage or missing config never blocks the admin's status-change action.
 */
export async function generateAirwaybillForOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, destination: true },
    });

    if (!order || !order.destination || order.airwaybillNumber) return;

    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

    const cnoteNo = await generateJneAirwaybill({
      orderNumber: order.orderNumber,
      service: order.shippingService,
      destinationTariffCode: order.destination.tariffCode,
      receiverName: order.receiverName,
      receiverAddress: order.receiverAddress,
      receiverCity: order.destination.cityName,
      receiverRegion: order.destination.provinceName,
      receiverZip: order.destination.zipCode,
      receiverPhone: order.receiverPhone,
      quantity,
      weightKg: order.weightKg,
      goodsValue: order.subtotal,
      goodsDesc: `Pesanan ${order.orderNumber}`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { airwaybillNumber: cnoteNo },
    });
  } catch (error) {
    console.error(
      `Gagal membuat airwaybill JNE untuk order ${orderId}:`,
      error instanceof Error ? error.message : error,
    );
  }
}
