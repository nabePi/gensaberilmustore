import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';

/** Match the payable amount shown in the admin table, including any unique code. */
export async function orderAmountFilter(amount: number): Promise<Prisma.OrderWhereInput> {
  const matches = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Order"
    WHERE "total"::bigint + COALESCE("manualPaymentCode", 0) = ${amount}::bigint
  `;
  return { id: { in: matches.map(({ id }) => id) } };
}
