import { createHash } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { env } from '@/env';
import { prisma } from '@/lib/db';
import { dispatchPendingNotificationsForOrder } from '@/server/notify/dispatch';
import { generateAirwaybillForOrder } from '@/server/orders/generate-airwaybill';
import { applyOrderStatusTransition } from '@/server/orders/status';
import {
  mootaMutationDate,
  mootaPayloadSchema,
  verifyMootaSignature,
  type MootaChannel,
  type MootaMutation,
} from '@/server/payment/moota-schema';

const resultSchema = z.object({
  outcome: z.enum(['matched', 'no_match', 'ambiguous', 'ignored']),
  orderId: z.string().optional(),
});
type MatchResult = z.infer<typeof resultSchema>;

function eventId(mutation: MootaMutation) {
  // One physical mutation can only pay one order, even across the two endpoints.
  return `moota:${createHash('sha256')
    .update(JSON.stringify([mutation.bank_id, mutation.mutation_id ?? mutation.token]))
    .digest('hex')}`;
}

async function pairMutation(channel: MootaChannel, mutation: MootaMutation) {
  const providerEventId = eventId(mutation);
  const result = await prisma.$transaction(async (tx) => {
    // Serialize Moota matching across processes before checking duplicates/candidates.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(6422026)`;
    const existing = await tx.webhookLog.findUnique({ where: { providerEventId } });
    if (existing) {
      return {
        ...resultSchema.parse((existing.payload as Prisma.JsonObject).result),
        duplicate: true,
      };
    }

    let match: MatchResult;
    if (
      mutation.type !== 'CR' ||
      (channel === 'bca' && mutation.bank && mutation.bank.bank_type.toLowerCase() !== 'bca')
    ) {
      match = { outcome: 'ignored' };
    } else {
      const method = channel === 'bca' ? 'BANK_TRANSFER' : 'QRIS';
      const latestCreatedAt = new Date(mootaMutationDate(mutation.date)!.getTime() + 999);
      const candidates = await tx.$queryRaw<{ id: string }[]>`
        SELECT o.id FROM "Order" o
        WHERE o.status = 'AWAITING_PAYMENT' AND o.source = 'ONLINE'
          AND o."paymentMethod"::text = ${method}
          AND o.total::bigint + COALESCE(o."manualPaymentCode", 0) = ${mutation.amount}::bigint
          AND o."createdAt" <= ${latestCreatedAt}
          AND NOT EXISTS (SELECT 1 FROM "PaymentSession" p WHERE p."orderId" = o.id)
        ORDER BY o."createdAt", o.id
        LIMIT 2 FOR UPDATE OF o
      `;
      if (candidates.length === 0) {
        match = { outcome: 'no_match' };
      } else if (candidates.length > 1) {
        match = { outcome: 'ambiguous' };
      } else {
        const order = await tx.order.findUniqueOrThrow({
          where: { id: candidates[0]!.id },
          include: { items: true },
        });
        await applyOrderStatusTransition(tx, order, 'PAID', {
          note: `Moota ${channel}: ${mutation.mutation_id ?? mutation.token}`,
        });
        match = { outcome: 'matched', orderId: order.id };
      }
    }

    await tx.webhookLog.create({
      data: {
        provider: 'moota',
        providerEventId,
        payload: JSON.parse(
          JSON.stringify({ channel, mutation, result: match }),
        ) as Prisma.InputJsonValue,
        processedAt: match.outcome === 'matched' ? null : new Date(),
      },
    });
    return { ...match, duplicate: false };
  });

  if (result.orderId) {
    // A second transaction sees the committed PAID order. The event row lock
    // serializes post-payment effects for simultaneous deliveries/retries.
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT id FROM "WebhookLog" WHERE "providerEventId" = ${providerEventId} FOR UPDATE`;
        const log = await tx.webhookLog.findUniqueOrThrow({ where: { providerEventId } });
        if (log.processedAt) return;
        await dispatchPendingNotificationsForOrder(result.orderId!, tx);
        await generateAirwaybillForOrder(result.orderId!, tx);
        await tx.webhookLog.update({
          where: { providerEventId },
          data: { processedAt: new Date() },
        });
      },
      { timeout: 60_000 },
    );
  }
  return result;
}

export async function handleMootaWebhook(
  request: Request,
  channel: MootaChannel,
): Promise<Response> {
  const secret = channel === 'bca' ? env.mootaBcaWebhookSecret : env.mootaQrisWebhookSecret;
  if (!secret)
    return Response.json({ error: 'Secret webhook Moota belum dikonfigurasi' }, { status: 503 });
  const body = await request.text();
  if (!verifyMootaSignature(body, request.headers.get('signature'), secret)) {
    return Response.json({ error: 'Signature Moota tidak valid' }, { status: 401 });
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(body);
  } catch {
    return Response.json({ error: 'Payload Moota tidak valid' }, { status: 400 });
  }
  const parsed = mootaPayloadSchema.safeParse(decoded);
  if (!parsed.success)
    return Response.json({ error: 'Payload Moota tidak valid' }, { status: 400 });
  try {
    const results = [];
    for (const mutation of parsed.data) {
      const result = await pairMutation(channel, mutation);
      const summary = { mutationId: mutation.mutation_id ?? mutation.token, ...result };
      // eslint-disable-next-line no-console -- Operational result without raw banking payload or secrets.
      console.info('Moota payment matching', { channel, ...summary });
      results.push(summary);
    }
    return Response.json({ received: true, results });
  } catch {
    return Response.json(
      { error: 'Gagal memproses webhook Moota, silakan coba lagi' },
      { status: 500 },
    );
  }
}
