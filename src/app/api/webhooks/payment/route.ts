import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { applyMidtransTransactionStatus } from '@/server/payment/apply-status';
import { verifyWebhookSignature } from '@/server/payment/midtrans';
import { midtransWebhookSchema } from '@/server/payment/schema';

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = midtransWebhookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 });
  }

  const data = parsed.data;

  const signatureValid = verifyWebhookSignature({
    orderId: data.order_id,
    statusCode: data.status_code,
    grossAmount: data.gross_amount,
    signatureKey: data.signature_key,
  });

  if (!signatureValid) {
    return NextResponse.json({ error: 'Signature tidak valid' }, { status: 401 });
  }

  const providerEventId = `${data.transaction_id}:${data.transaction_status}`;

  try {
    await prisma.webhookLog.create({
      data: { provider: 'midtrans', providerEventId, payload: body as Prisma.InputJsonValue },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ received: true });
    }
    throw error;
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: data.order_id },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await applyMidtransTransactionStatus(tx, order, {
      transactionStatus: data.transaction_status,
      fraudStatus: data.fraud_status ?? null,
      vaNumber: data.va_numbers?.[0]?.va_number ?? null,
    });
  });

  await prisma.webhookLog.update({
    where: { providerEventId },
    data: { processedAt: new Date() },
  });

  return NextResponse.json({ received: true });
}
