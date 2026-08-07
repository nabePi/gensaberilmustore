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
