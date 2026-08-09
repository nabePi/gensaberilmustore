import { randomInt } from 'node:crypto';

function candidateAffiliateCode(seed: string): string {
  const base =
    seed
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6) || 'AFF';
  const randomPart = randomInt(0, 10_000).toString().padStart(4, '0');
  return `${base}${randomPart}`;
}

export async function generateUniqueAffiliateCode(
  seed: string,
  exists: (code: string) => Promise<boolean>,
): Promise<string> {
  let code = candidateAffiliateCode(seed);

  while (await exists(code)) {
    code = candidateAffiliateCode(seed);
  }

  return code;
}
