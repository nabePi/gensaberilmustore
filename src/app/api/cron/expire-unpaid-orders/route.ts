import { timingSafeEqual } from 'node:crypto';

import { env } from '@/env';
import { cancelExpiredUnpaidOrders } from '@/server/orders/expire-unpaid';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Unlike older cron endpoints, this destructive operation must fail closed.
  if (!env.cronSecret?.trim()) {
    return Response.json({ error: 'CRON_SECRET belum dikonfigurasi' }, { status: 503 });
  }
  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${env.cronSecret}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return Response.json(await cancelExpiredUnpaidOrders());
  } catch {
    return Response.json(
      { error: 'Gagal membatalkan pesanan kedaluwarsa. Coba lagi.' },
      { status: 500 },
    );
  }
}
