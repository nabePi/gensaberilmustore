import { randomInt } from 'node:crypto';

function candidateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = randomInt(0, 1_000_000).toString().padStart(6, '0');
  return `ORD-${datePart}-${randomPart}`;
}

export async function generateUniqueOrderNumber(
  exists: (orderNumber: string) => Promise<boolean>,
): Promise<string> {
  let orderNumber = candidateOrderNumber();

  while (await exists(orderNumber)) {
    orderNumber = candidateOrderNumber();
  }

  return orderNumber;
}
