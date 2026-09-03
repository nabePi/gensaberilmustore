import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/db';
import { getSession } from '@/server/auth';
import { createSnapTransaction } from '@/server/payment/midtrans';
import { createPaymentSchema } from '@/server/payment/schema';

const SNAP_TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validasi gagal', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await getSession(request);
  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { items: true },
  });

  if (!order || (order.userId !== null && order.userId !== user?.id)) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  if (order.status !== 'AWAITING_PAYMENT') {
    return NextResponse.json({ error: 'Order tidak menunggu pembayaran' }, { status: 400 });
  }

  const existingSession = await prisma.paymentSession.findUnique({
    where: { orderId: order.id },
  });

  if (existingSession && existingSession.expiresAt && existingSession.expiresAt > new Date()) {
    return NextResponse.json({
      snapToken: existingSession.snapToken,
      redirectUrl: existingSession.snapRedirectUrl,
    });
  }

  const { snapToken, redirectUrl } = await createSnapTransaction(order).catch((error) => {
    console.error('createSnapTransaction failed', error);
    return { snapToken: null, redirectUrl: null };
  });

  if (!snapToken || !redirectUrl) {
    return NextResponse.json(
      { error: 'Gagal membuat transaksi pembayaran. Silakan coba lagi.' },
      { status: 502 },
    );
  }
  const expiresAt = new Date(Date.now() + SNAP_TOKEN_VALIDITY_MS);

  await prisma.paymentSession.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, snapToken, snapRedirectUrl: redirectUrl, expiresAt },
    update: { snapToken, snapRedirectUrl: redirectUrl, expiresAt },
  });

  return NextResponse.json({ snapToken, redirectUrl });
}
