import { createHash } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { env } from '@/env';
import { prisma } from '@/lib/db';
import { dispatchPendingNotificationsForOrder } from '@/server/notify/dispatch';
import { generateAirwaybillForOrder } from '@/server/orders/generate-airwaybill';
import { applyOrderStatusTransition } from '@/server/orders/status';
import {
  mootaMutationSchema,
  mootaOrderCutoff,
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
    let pairingMutation = mutation;
    if (existing) {
      const payload = existing.payload as Prisma.JsonObject;
      const previous = resultSchema.parse(payload.result);
      const stored = mootaMutationSchema.safeParse(payload.mutation);
      // Retry the old midnight bug once, using the original event's identity,
      // amount and receipt time. Never reconsider a payment already matched.
      const retryDateOnly =
        channel === 'interactive-qris' &&
        previous.outcome === 'no_match' &&
        payload.matchingVersion === undefined &&
        payload.channel === channel &&
        stored.success &&
        stored.data.date.endsWith(' 00:00:00') &&
        stored.data.date === mutation.date &&
        stored.data.amount === mutation.amount &&
        stored.data.type === mutation.type;
      if (!retryDateOnly || !stored.success) return { ...previous, duplicate: true };
      pairingMutation = {
        ...stored.data,
        // Older schema stripped created_at. The first receipt still caps it.
        created_at: stored.data.created_at ?? mutation.created_at,
      };
    }

    let match: MatchResult;
    if (
      pairingMutation.type !== 'CR' ||
      (channel === 'bca' &&
        pairingMutation.bank &&
        pairingMutation.bank.bank_type.toLowerCase() !== 'bca')
    ) {
      match = { outcome: 'ignored' };
    } else {
      const method = channel === 'bca' ? 'BANK_TRANSFER' : 'QRIS';
      const latestCreatedAt = mootaOrderCutoff(
        pairingMutation,
        existing?.createdAt ?? new Date(),
        channel,
      );
      const candidates = await tx.$queryRaw<{ id: string }[]>`
        SELECT o.id FROM "Order" o
        WHERE o.status = 'AWAITING_PAYMENT' AND o.source = 'ONLINE'
          AND o."paymentMethod"::text = ${method}
          AND o.total::bigint + COALESCE(o."manualPaymentCode", 0) = ${pairingMutation.amount}::bigint
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

    const logData = {
      payload: JSON.parse(
        JSON.stringify({ channel, mutation: pairingMutation, result: match, matchingVersion: 2 }),
      ) as Prisma.InputJsonValue,
      processedAt: match.outcome === 'matched' ? null : new Date(),
    };
    if (existing) {
      await tx.webhookLog.update({ where: { providerEventId }, data: logData });
    } else {
      await tx.webhookLog.create({ data: { provider: 'moota', providerEventId, ...logData } });
    }
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
