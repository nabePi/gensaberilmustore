import { createHash, timingSafeEqual } from 'node:crypto';

import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

// A precomputed hash with no matching plaintext, used to keep bcrypt.compare timing
// consistent when a login is attempted for an email that doesn't exist.
export const DUMMY_PASSWORD_HASH = '$2b$12$2dZFulfu1dgJacBenxWlHudCruaxSJb0.pv6OJYdqgKcFPXGBKUH6';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// Legacy users imported from the previous store keep their password as a plain
// MD5 hash (column `passwordmd5`) until they log in or reset their password.
export function verifyMd5Password(password: string, md5Hash: string): boolean {
  const normalized = md5Hash.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) {
    return false;
  }

  const candidate = createHash('md5').update(password, 'utf8').digest();
  const stored = Buffer.from(normalized, 'hex');

  return timingSafeEqual(candidate, stored);
}
