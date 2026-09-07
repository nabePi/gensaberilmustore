import { randomInt } from 'node:crypto';

import type { Prisma, PrismaClient } from '@prisma/client';

const CODE_MIN = 1;
const CODE_MAX = 999;
const WINDOW_MS = 24 * 60 * 60 * 1000;

type Db = PrismaClient | Prisma.TransactionClient;

export async function generateUniqueManualPaymentCode(tx: Db): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS);
  const recent = await tx.order.findMany({
    where: { manualPaymentCode: { not: null }, createdAt: { gte: since } },
    select: { manualPaymentCode: true },
  });
  const used = new Set(recent.map((order) => order.manualPaymentCode!));

  if (used.size >= CODE_MAX - CODE_MIN + 1) {
    throw new Error('Semua kode unik pembayaran sedang terpakai, silakan coba lagi nanti');
  }

  let code = randomInt(CODE_MIN, CODE_MAX + 1);
  while (used.has(code)) {
    code = randomInt(CODE_MIN, CODE_MAX + 1);
  }

  return code;
}

export function formatManualPaymentCode(code: number): string {
  return code.toString().padStart(3, '0');
}

export function totalWithManualPaymentCode(total: number, code: number): number {
  return total + code;
}
