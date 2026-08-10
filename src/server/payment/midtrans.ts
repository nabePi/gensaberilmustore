import { createHash } from 'node:crypto';

import type { Order, OrderItem } from '@prisma/client';
import { CoreApi, Snap } from 'midtrans-client';

import { env } from '@/env';

const clientOptions = {
  isProduction: env.midtransIsProduction,
  serverKey: env.midtransServerKey ?? '',
  clientKey: env.midtransClientKey ?? '',
};

const snap = new Snap(clientOptions);
const coreApi = new CoreApi(clientOptions);

const ENABLED_PAYMENTS = ['bank_transfer', 'gopay', 'qris', 'shopeepay'];

export type OrderForSnapTransaction = Order & { items: OrderItem[] };

export type SnapTransactionResult = {
  snapToken: string;
  redirectUrl: string;
};

export async function createSnapTransaction(
  order: OrderForSnapTransaction,
): Promise<SnapTransactionResult> {
  const response = await snap.createTransaction({
    transaction_details: {
      order_id: order.orderNumber,
      gross_amount: order.total,
    },
    customer_details: {
      first_name: order.receiverName,
      email: order.receiverEmail,
      phone: order.receiverPhone,
      shipping_address: {
        address: order.receiverAddress,
        city: order.receiverCity,
      },
    },
    item_details: order.items.map((item) => ({
      id: item.productId ?? item.id,
      price: item.priceSnapshot,
      quantity: item.quantity,
      name: item.titleSnapshot.slice(0, 50),
    })),
    enabled_payments: ENABLED_PAYMENTS,
  });

  return { snapToken: response.token, redirectUrl: response.redirect_url };
}

export type MidtransTransactionStatus = {
  transactionStatus: string;
  fraudStatus: string | null;
  vaNumber: string | null;
};

export async function getStatus(orderNumber: string): Promise<MidtransTransactionStatus> {
  const response = await coreApi.transaction.status(orderNumber);

  return {
    transactionStatus: response.transaction_status,
    fraudStatus: response.fraud_status ?? null,
    vaNumber: response.va_numbers?.[0]?.va_number ?? null,
  };
}

export function verifyWebhookSignature(body: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const expected = createHash('sha512')
    .update(`${body.orderId}${body.statusCode}${body.grossAmount}${env.midtransServerKey ?? ''}`)
    .digest('hex');

  return expected === body.signatureKey;
}
